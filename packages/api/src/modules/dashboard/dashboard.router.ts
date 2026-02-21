import { o, protectedProcedure } from "../../shared/middleware";

export const dashboardRouter = o.router({
  getStats: protectedProcedure.handler(async ({ context }) => {
    const { cache, session } = context;
    const { user } = session;

    // Check cache first (1 hour TTL) - Scope cache by user/role!
    const cacheKey = `dashboard:stats:${user.id}`;
    const cached = await cache.get<{
      totalRequests: number;
      pendingRequests: number;
      approvedRequests: number;
      hiringRequests: number;
      totalCandidates: number;
      activeContracts: number;
      averageTimeToHire: number;
      myActiveTrips: number;
      myPendingSeparations: number;
      myActivePerformanceReviews: number;
      teamPendingPerformanceReviews: number;
      totalDepartmentExpenses: number;
      companyHeadcount: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get statistics from service
    // Default to EMPLOYEE if no role (shouldn't happen with typed auth)
    // Default to EMPLOYEE if no role or invalid
    const role = user.role || "EMPLOYEE";

    const stats = await context.services.dashboard.getDashboardStats(
      user.id,
      role,
    );
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
    const { user } = context.session;
    const role = user.role || "EMPLOYEE";
    const count = await context.services.dashboard.getPendingRequests(
      user.id,
      role,
    );
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

  getActionsRequired: protectedProcedure.handler(async ({ context }) => {
    const { user } = context.session;
    const role = user.role || "EMPLOYEE";

    const actions = await context.services.dashboard.getActionsRequired(
      user.id,
      role,
    );
    return actions;
  }),
});
