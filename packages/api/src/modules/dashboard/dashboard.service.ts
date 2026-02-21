import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { businessTrip, tripExpense } from "@zenith-hr/db/schema/business-trips";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { performanceReview } from "@zenith-hr/db/schema/performance";
import { separationRequest } from "@zenith-hr/db/schema/separations";
import { and, count, eq, inArray, type SQL, sum } from "drizzle-orm";

// --- Strategies ---
// Open/Closed Principle: New roles can be added without modifying the base service logic significantly.

type RequestFilterStrategy = (userId: string) => SQL | undefined;

const EMPLOYEE_STRATEGY: RequestFilterStrategy = (userId) =>
  eq(manpowerRequest.requesterId, userId);

const REQUEST_FILTERS: Record<string, RequestFilterStrategy> = {
  EMPLOYEE: EMPLOYEE_STRATEGY,
  MANAGER: EMPLOYEE_STRATEGY, // Managers see their own + pending for them (handled separately in pending)
  // HR/Finance/CEO see all by default (strategies return undefined for no filter)
  HR: () => undefined,
  FINANCE: () => undefined,
  CEO: () => undefined,
};

type ActionFilterStrategy = (userId: string) => {
  where: SQL;
  title: string;
  link: string;
  type: "urgent" | "action" | "normal";
} | null;

const ACTION_STRATEGIES: Record<string, ActionFilterStrategy> = {
  MANAGER: () => ({
    where: eq(manpowerRequest.status, "PENDING_MANAGER"),
    title: "Manpower Requests",
    link: "/approvals",
    type: "urgent",
  }),
  HR: () => ({
    where: eq(manpowerRequest.status, "PENDING_HR"),
    title: "Action Required",
    link: "/approvals",
    type: "urgent",
  }),
  FINANCE: () => ({
    where: eq(manpowerRequest.status, "PENDING_FINANCE"),
    title: "Budget Approvals",
    link: "/approvals",
    type: "urgent",
  }),
  CEO: () => ({
    where: eq(manpowerRequest.status, "PENDING_CEO"),
    title: "Final Approvals",
    link: "/approvals",
    type: "urgent",
  }),
  EMPLOYEE: () => null,
};

export const createDashboardService = (db: DbOrTx) => {
  return {
    async getTotalRequests(userId: string, role: string): Promise<number> {
      const strategy = REQUEST_FILTERS[role] || EMPLOYEE_STRATEGY;
      const filter = strategy(userId);

      const query = db.select({ count: count() }).from(manpowerRequest);
      if (filter) {
        query.where(filter);
      }

      const [result] = await query;
      return result?.count || 0;
    },

    async getPendingRequests(userId: string, role: string): Promise<number> {
      // This method had complex logic mixing "My Pending" vs "Pending Actions"
      // If we strictly follow the requirement that this is for "Dashboard Header Stats",
      // it usually means "My Requests that are Pending".
      // Actions are handled by getActionsRequired.

      // Re-using logic: Employees see their own pending.
      // Others might see what's pending for them?
      // Let's keep the previous logic but implemented cleanly.

      let whereClause: SQL | undefined;

      if (role === "EMPLOYEE") {
        whereClause = eq(manpowerRequest.requesterId, userId);
        // In a real scenario we'd add .and(status != CLOSED)
      } else if (role === "HR") {
        whereClause = eq(manpowerRequest.status, "PENDING_HR");
      } else {
        // For roles that approve, "Pending Requests" in stats usually implies "Items waiting for YOU"
        const strategy = ACTION_STRATEGIES[role];
        if (strategy) {
          whereClause = strategy(userId)?.where;
        }
      }

      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(whereClause);

      return result?.count || 0;
    },

    async getApprovedRequests(_userId: string, _role: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(eq(manpowerRequest.status, "HIRING_IN_PROGRESS"));
      return result?.count || 0;
    },

    async getHiringRequests(_userId: string, _role: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(eq(manpowerRequest.status, "HIRING_IN_PROGRESS"));
      return result?.count || 0;
    },

    async getTotalCandidates(): Promise<number> {
      const [result] = await db.select({ count: count() }).from(candidates);
      return result?.count || 0;
    },

    async getActiveContracts(): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(contract)
        .where(eq(contract.status, "SIGNED"));
      return result?.count || 0;
    },

    async getDashboardStats(userId: string, role: string) {
      // Base stats for all roles
      const [
        totalRequests,
        pendingRequests,
        approvedRequests,
        hiringRequests,
        totalCandidates,
        activeContracts,
      ] = await Promise.all([
        this.getTotalRequests(userId, role),
        this.getPendingRequests(userId, role),
        this.getApprovedRequests(userId, role),
        this.getHiringRequests(userId, role),
        this.getTotalCandidates(),
        this.getActiveContracts(),
      ]);

      const base = {
        totalRequests,
        pendingRequests,
        approvedRequests,
        hiringRequests,
        totalCandidates,
        activeContracts,
      };

      // Role-specific stats
      if (role === "EMPLOYEE" || role === "MANAGER") {
        const [
          myActiveTrips,
          myPendingSeparations,
          myActivePerformanceReviews,
        ] = await Promise.all([
          this.getMyActiveTrips(userId),
          this.getMyPendingSeparations(userId),
          this.getMyActivePerformanceReviews(userId),
        ]);

        const extra: Record<string, number> = {
          myActiveTrips,
          myPendingSeparations,
          myActivePerformanceReviews,
        };

        if (role === "MANAGER") {
          extra.teamPendingPerformanceReviews =
            await this.getTeamPendingPerformanceReviews(userId);
        }

        return { ...base, ...extra };
      }

      if (role === "CEO" || role === "FINANCE") {
        const [companyHeadcount, totalDepartmentExpenses] = await Promise.all([
          this.getCompanyHeadcount(),
          this.getTotalDepartmentExpenses(),
        ]);
        return { ...base, companyHeadcount, totalDepartmentExpenses };
      }

      return base;
    },

    async getMyActiveTrips(userId: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(businessTrip)
        .where(
          and(
            eq(businessTrip.requesterId, userId),
            inArray(businessTrip.status, [
              "APPROVED",
              "PENDING_MANAGER",
              "PENDING_HR",
              "PENDING_FINANCE",
              "PENDING_CEO",
            ]),
          ),
        );
      return result?.count || 0;
    },

    async getMyPendingSeparations(userId: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(separationRequest)
        .where(
          and(
            eq(separationRequest.employeeId, userId),
            inArray(separationRequest.status, [
              "REQUESTED",
              "PENDING_MANAGER",
              "PENDING_HR",
              "CLEARANCE_IN_PROGRESS",
            ]),
          ),
        );
      return result?.count || 0;
    },

    async getMyActivePerformanceReviews(userId: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(performanceReview)
        .where(
          and(
            eq(performanceReview.employeeId, userId),
            inArray(performanceReview.status, [
              "SELF_REVIEW",
              "MANAGER_REVIEW",
              "IN_REVIEW",
            ]),
          ),
        );
      return result?.count || 0;
    },

    async getTeamPendingPerformanceReviews(managerId: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(performanceReview)
        .where(
          and(
            eq(performanceReview.reviewerId, managerId),
            eq(performanceReview.status, "MANAGER_REVIEW"),
          ),
        );
      return result?.count || 0;
    },

    async getCompanyHeadcount(): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(user)
        .where(eq(user.status, "ACTIVE"));
      return result?.count || 0;
    },

    async getTotalDepartmentExpenses(): Promise<number> {
      const [result] = await db
        .select({ total: sum(tripExpense.amount) })
        .from(tripExpense)
        .innerJoin(businessTrip, eq(tripExpense.tripId, businessTrip.id))
        .where(inArray(businessTrip.status, ["APPROVED", "COMPLETED"]));
      return Number(result?.total) || 0;
    },

    async getActionsRequired(userId: string, role: string) {
      const strategy = ACTION_STRATEGIES[role];
      if (!strategy) {
        return [];
      }

      const config = strategy(userId);
      if (!config) {
        return [];
      }

      const [pendingCount] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(config.where);

      if ((pendingCount?.count ?? 0) > 0) {
        return [
          {
            title: config.title,
            count: pendingCount?.count ?? 0,
            type: config.type,
            link: config.link,
          },
        ];
      }

      return [];
    },

    async getAverageTimeToHire() {
      // Logic unchanged
      const completedContracts = await db
        .select()
        .from(contract)
        .where(eq(contract.status, "SIGNED"));

      let averageTimeToHire = 0;
      if (completedContracts.length > 0) {
        const times = completedContracts.map((c) => {
          const created = new Date(c.createdAt).getTime();
          const updated = new Date(c.updatedAt).getTime();
          return (updated - created) / (1000 * 60 * 60 * 24); // days
        });
        averageTimeToHire = times.reduce((a, b) => a + b, 0) / times.length;
      }
      return Math.round(averageTimeToHire * 10) / 10;
    },
  };
};

export type DashboardService = ReturnType<typeof createDashboardService>;
