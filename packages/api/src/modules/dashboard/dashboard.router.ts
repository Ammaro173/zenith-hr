import { ORPCError } from "@orpc/server";
import { get, set } from "../../shared/cache";
import { protectedProcedure } from "../../shared/middleware";

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

    // Get statistics from service
    const stats = await context.services.dashboard.getDashboardStats();
    const averageTimeToHire =
      await context.services.dashboard.getAverageTimeToHire();

    const result = {
      ...stats,
      averageTimeToHire,
    };

    // Cache for 1 hour
    await set(cacheKey, result, 3600);

    return result;
  }),

  getPendingCount: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const count = await context.services.dashboard.getPendingRequests();
    return { count };
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

    const averageTimeToHire =
      await context.services.dashboard.getAverageTimeToHire();

    // Cache for 1 hour
    await set(cacheKey, averageTimeToHire, 3600);

    return { averageDays: averageTimeToHire };
  }),
};
