import type { db as _db } from "@zenith-hr/db";
import { candidates } from "@zenith-hr/db/schema/candidates";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { count, eq, sql } from "drizzle-orm";

/**
 * DashboardService handles dashboard statistics and analytics
 */
export class DashboardService {
  /**
   * Get total count of requests
   */
  static async getTotalRequests(db: typeof _db): Promise<number> {
    const [result] = await db.select({ count: count() }).from(manpowerRequest);
    return result?.count || 0;
  }

  /**
   * Get count of pending requests
   */
  static async getPendingRequests(db: typeof _db): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(manpowerRequest)
      .where(
        sql`${manpowerRequest.status}::text IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
      );
    return result?.count || 0;
  }

  /**
   * Get count of approved requests
   */
  static async getApprovedRequests(db: typeof _db): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, "APPROVED_OPEN"));
    return result?.count || 0;
  }

  /**
   * Get count of requests in hiring
   */
  static async getHiringRequests(db: typeof _db): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, "HIRING_IN_PROGRESS"));
    return result?.count || 0;
  }

  /**
   * Get total candidates count
   */
  static async getTotalCandidates(db: typeof _db): Promise<number> {
    const [result] = await db.select({ count: count() }).from(candidates);
    return result?.count || 0;
  }

  /**
   * Get active contracts count
   */
  static async getActiveContracts(db: typeof _db): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(contract)
      .where(eq(contract.status, "SIGNED"));
    return result?.count || 0;
  }

  /**
   * Get comprehensive dashboard stats
   */
  static async getDashboardStats(db: typeof _db) {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      hiringRequests,
      totalCandidates,
      activeContracts,
    ] = await Promise.all([
      DashboardService.getTotalRequests(db),
      DashboardService.getPendingRequests(db),
      DashboardService.getApprovedRequests(db),
      DashboardService.getHiringRequests(db),
      DashboardService.getTotalCandidates(db),
      DashboardService.getActiveContracts(db),
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      hiringRequests,
      totalCandidates,
      activeContracts,
    };
  }
}
