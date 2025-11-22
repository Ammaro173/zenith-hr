import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { candidatesRouter } from "./candidates";
import { contractsRouter } from "./contracts";
import { dashboardRouter } from "./dashboard";
import { requestsRouter } from "./requests";
import { webhooksRouter } from "./webhooks";
import { workflowRouter } from "./workflow";

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
