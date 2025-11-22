import { ORPCError } from "@orpc/server";
import { db } from "@zenith-hr/db";
import { contract } from "@zenith-hr/db/schema/contracts";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { get, set } from "../services/cache";

export const dashboardRouter = {
  getStats: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Check cache first (1 hour TTL)
    const cacheKey = "dashboard:stats";
    const cached = await get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate statistics
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

    // Calculate average time to hire (simplified)
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

    const stats = {
      totalRequests: Number(totalRequests?.count || 0),
      pendingRequests: Number(pendingRequests?.count || 0),
      approvedRequests: Number(approvedRequests?.count || 0),
      signedContracts: Number(signedContracts?.count || 0),
      averageTimeToHire: Math.round(averageTimeToHire * 10) / 10, // Round to 1 decimal
    };

    // Cache for 1 hour
    await set(cacheKey, stats, 3600);

    return stats;
  }),

  getPendingCount: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest)
      .where(
        sql`${manpowerRequest.status} IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
      );

    return { count: Number(count?.count || 0) };
  }),

  getAverageTimeToHire: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Check cache
    const cacheKey = "dashboard:avg_time_to_hire";
    const cached = await get<number>(cacheKey);
    if (cached !== null) {
      return { averageDays: cached };
    }

    const completedContracts = await db
      .select()
      .from(contract)
      .where(eq(contract.status, "SIGNED" as never));

    let averageDays = 0;
    if (completedContracts.length > 0) {
      const times = completedContracts.map((c) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // days
      });
      averageDays = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // Cache for 1 hour
    await set(cacheKey, averageDays, 3600);

    return { averageDays: Math.round(averageDays * 10) / 10 };
  }),
};
