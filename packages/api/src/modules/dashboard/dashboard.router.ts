import { o, protectedProcedure } from "../../shared/middleware";

export const dashboardRouter = o.router({
  getStats: protectedProcedure.handler(async ({ context }) => {
    const { cache } = context;

    // Check cache first (1 hour TTL)
    const cacheKey = "dashboard:stats";
    const cached = await cache.get<{
      totalRequests: number;
      pendingRequests: number;
      approvedRequests: number;
      hiringRequests: number;
      totalCandidates: number;
      activeContracts: number;
      averageTimeToHire: number;
    }>(cacheKey);
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
    await cache.set(cacheKey, result, 3600);

    return result;
  }),

  getPendingCount: protectedProcedure.handler(async ({ context }) => {
    const count = await context.services.dashboard.getPendingRequests();
    return { count };
  }),

  getAverageTimeToHire: protectedProcedure.handler(async ({ context }) => {
    const { cache } = context;

    // Check cache
    const cacheKey = "dashboard:avg_time_to_hire";
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null) {
      return { averageDays: cached };
    }

    const averageTimeToHire =
      await context.services.dashboard.getAverageTimeToHire();

    // Cache for 1 hour
    await cache.set(cacheKey, averageTimeToHire, 3600);

    return { averageDays: averageTimeToHire };
  }),
});
