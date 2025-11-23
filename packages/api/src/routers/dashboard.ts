import { ORPCError } from "@orpc/server";
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
    const [
      [totalRequests],
      [pendingRequests],
      [approvedRequests],
      [signedContracts],
      completedContracts,
    ] = await Promise.all([
      context.db.select({ count: sql<number>`count(*)` }).from(manpowerRequest),
      context.db
        .select({ count: sql<number>`count(*)` })
        .from(manpowerRequest)
        .where(
          sql`${manpowerRequest.status} IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
        ),
      context.db
        .select({ count: sql<number>`count(*)` })
        .from(manpowerRequest)
        .where(eq(manpowerRequest.status, "APPROVED_OPEN")),
      context.db
        .select({ count: sql<number>`count(*)` })
        .from(contract)
        .where(eq(contract.status, "SIGNED")),
      context.db.select().from(contract).where(eq(contract.status, "SIGNED")),
    ]);

    let averageTimeToHire = 0;
    if (completedContracts.length > 0) {
      const times = completedContracts.map((c) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // days
      });
      averageTimeToHire = times.reduce((a, b) => a + b, 0) / times.length;
    }
    averageTimeToHire = Math.round(averageTimeToHire * 10) / 10;

    const stats = {
      totalRequests: Number(totalRequests?.count || 0),
      pendingRequests: Number(pendingRequests?.count || 0),
      approvedRequests: Number(approvedRequests?.count || 0),
      signedContracts: Number(signedContracts?.count || 0),
      averageTimeToHire,
    };

    // Cache for 1 hour
    await set(cacheKey, stats, 3600);

    return stats;
  }),

  getPendingCount: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Direct Repository access for specific query
    const [pendingRequests] = await context.db
      .select({ count: sql<number>`count(*)` })
      .from(manpowerRequest)
      .where(
        sql`${manpowerRequest.status} IN ('PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_CEO')`
      );

    return { count: Number(pendingRequests?.count || 0) };
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

    const completedContracts = await context.db
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
    averageTimeToHire = Math.round(averageTimeToHire * 10) / 10;

    // Cache for 1 hour
    await set(cacheKey, averageTimeToHire, 3600);

    return { averageDays: averageTimeToHire };
  }),
};
