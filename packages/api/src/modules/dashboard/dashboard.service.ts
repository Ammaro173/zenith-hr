import type { db as _db } from "@zenith-hr/db";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { count, eq, type SQL } from "drizzle-orm";

// --- Strategies ---
// Open/Closed Principle: New roles can be added without modifying the base service logic significantly.

type RequestFilterStrategy = (userId: string) => SQL | undefined;

const REQUESTER_STRATEGY: RequestFilterStrategy = (userId) =>
  eq(manpowerRequest.requesterId, userId);

const REQUEST_FILTERS: Record<string, RequestFilterStrategy> = {
  REQUESTER: REQUESTER_STRATEGY,
  MANAGER: REQUESTER_STRATEGY, // Managers see their own + pending for them (handled separately in pending)
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
    title: "Requests Review",
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
  REQUESTER: () => null,
};

export const createDashboardService = (db: typeof _db) => {
  return {
    async getTotalRequests(userId: string, role: string): Promise<number> {
      const strategy = REQUEST_FILTERS[role] || REQUESTER_STRATEGY;
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

      // Re-using logic: Requesters see their own pending.
      // Others might see what's pending for them?
      // Let's keep the previous logic but implemented cleanly.

      let whereClause: SQL | undefined;

      if (role === "REQUESTER") {
        whereClause = eq(manpowerRequest.requesterId, userId);
        // In a real scenario we'd add .and(status != CLOSED)
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
        .where(eq(manpowerRequest.status, "APPROVED_OPEN"));
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

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        hiringRequests,
        totalCandidates,
        activeContracts,
      };
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
