import { ORPCError } from "@orpc/server";
import { GetDashboardStatsUseCase } from "@zenith-hr/application/dashboard/use-cases/get-stats";
import { DrizzleDashboardRepository } from "@zenith-hr/infrastructure/dashboard/drizzle-dashboard-repository";
import { protectedProcedure } from "../index";
import { get, set } from "../services/cache";

// Composition Root (Manual DI)
const dashboardRepository = new DrizzleDashboardRepository();
const getDashboardStatsUseCase = new GetDashboardStatsUseCase(
  dashboardRepository
);

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

    // Calculate statistics using Use Case
    const stats = await getDashboardStatsUseCase.execute();

    // Cache for 1 hour
    await set(cacheKey, stats, 3600);

    return stats;
  }),

  getPendingCount: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Direct Repository access for specific query
    const count = await dashboardRepository.getPendingRequestsCount();

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

    // Direct Repository access
    const averageDays = await dashboardRepository.getAverageTimeToHire();

    // Cache for 1 hour
    await set(cacheKey, averageDays, 3600);

    return { averageDays };
  }),
};
