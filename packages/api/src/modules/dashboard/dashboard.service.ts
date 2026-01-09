import type { db as _db } from "@zenith-hr/db";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { count, eq, sql } from "drizzle-orm";

export const createDashboardService = (db: typeof _db) => {
  return {
    async getTotalRequests(): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest);
      return result?.count || 0;
    },

    async getPendingRequests(): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(
          sql`${manpowerRequest.status}::text IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`,
        );
      return result?.count || 0;
    },

    async getApprovedRequests(): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(manpowerRequest)
        .where(eq(manpowerRequest.status, "APPROVED_OPEN"));
      return result?.count || 0;
    },

    async getHiringRequests(): Promise<number> {
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

    async getDashboardStats() {
      const [
        totalRequests,
        pendingRequests,
        approvedRequests,
        hiringRequests,
        totalCandidates,
        activeContracts,
      ] = await Promise.all([
        this.getTotalRequests(),
        this.getPendingRequests(),
        this.getApprovedRequests(),
        this.getHiringRequests(),
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

    async getAverageTimeToHire() {
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
