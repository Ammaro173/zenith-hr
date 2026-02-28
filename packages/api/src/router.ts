import type { RouterClient } from "@orpc/server";
import { businessTripsRouter } from "./modules/business-trips";
import { candidatesRouter } from "./modules/candidates";
import { contractsRouter } from "./modules/contracts";
import { dashboardRouter } from "./modules/dashboard";
import { departmentsRouter } from "./modules/departments";
import { importsRouter } from "./modules/imports";
import { performanceRouter } from "./modules/performance";
import { positionsRouter } from "./modules/positions";
import { requestsRouter } from "./modules/requests";
import { separationsRouter } from "./modules/separations";
import { usersRouter } from "./modules/users";
import { webhooksRouter } from "./modules/webhooks";
import { workflowRouter } from "./modules/workflow";
import { o, protectedProcedure, publicProcedure } from "./shared/middleware";

export const appRouter = o.router({
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  workflow: workflowRouter,
  requests: requestsRouter,
  contracts: contractsRouter,
  candidates: candidatesRouter,
  webhooks: webhooksRouter,
  dashboard: dashboardRouter,
  departments: departmentsRouter,
  imports: importsRouter,
  businessTrips: businessTripsRouter,
  performance: performanceRouter,
  positions: positionsRouter,
  separations: separationsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
