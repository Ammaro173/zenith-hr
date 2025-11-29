import type { RouterClient } from "@orpc/server";
import { candidatesRouter } from "./modules/candidates";
import { contractsRouter } from "./modules/contracts";
import { dashboardRouter } from "./modules/dashboard";
import { requestsRouter } from "./modules/requests";
import { webhooksRouter } from "./modules/webhooks";
import { workflowRouter } from "./modules/workflow";
import { protectedProcedure, publicProcedure } from "./shared/middleware";

export const appRouter = {
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
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
