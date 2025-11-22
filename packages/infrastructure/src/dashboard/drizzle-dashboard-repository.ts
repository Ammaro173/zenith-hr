import { db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import type {
  DashboardStats,
  IDashboardRepository,
} from "@zenith-hr/domain/dashboard/repositories";
import { eq, sql } from "drizzle-orm";

export class DrizzleDashboardRepository implements IDashboardRepository {
  async getStats(): Promise<DashboardStats> {
    const [totalRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest);

    const [pendingRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest)
      .where(
        sql`${manpowerRequest.status} IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
      );

    const [approvedRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, "APPROVED_OPEN" as never));

    const [signedContracts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contract)
      .where(eq(contract.status, "SIGNED" as never));

    const averageTimeToHire = await this.getAverageTimeToHire();

    return {
      totalRequests: Number(totalRequests?.count || 0),
      pendingRequests: Number(pendingRequests?.count || 0),
      approvedRequests: Number(approvedRequests?.count || 0),
      signedContracts: Number(signedContracts?.count || 0),
      averageTimeToHire,
    };
  }

  async getPendingRequestsCount(): Promise<number> {
    const [pendingRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest)
      .where(
        sql`${manpowerRequest.status} IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
      );
    return Number(pendingRequests?.count || 0);
  }

  async getAverageTimeToHire(): Promise<number> {
    const completedContracts = await db
      .select()
      .from(contract)
      .where(eq(contract.status, "SIGNED" as never));

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
  }
}
