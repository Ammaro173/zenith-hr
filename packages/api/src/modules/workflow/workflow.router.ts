import { ORPCError } from "@orpc/server";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import { requestIdSchema, transitionSchema } from "./workflow.schema";

export const workflowRouter = o.router({
  transition: requireRoles([
    "EMPLOYEE",
    "MANAGER",
    "HR",
    "FINANCE",
    "CEO",
    "IT",
    "ADMIN",
  ])
    .input(transitionSchema)
    .handler(async ({ input, context }) => {
      // Auth is already handled by protectedProcedure middleware
      const actorId = context.session.user.id;
      // Get IP from request headers (skip for now, can be added later)
      const ipAddress: string | undefined = undefined;

      try {
        const result = await context.services.workflow.transitionRequest(
          input.requestId,
          actorId,
          input.action,
          input.comment,
          ipAddress,
        );

        await context.cache.deletePattern("dashboard:stats:*");

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "FORBIDDEN") {
            throw new ORPCError("FORBIDDEN");
          }
          if (error.message === "Request not found") {
            throw new ORPCError("NOT_FOUND");
          }
          throw new ORPCError("BAD_REQUEST");
        }
        throw error;
      }
    }),

  getRequest: protectedProcedure
    .input(requestIdSchema)
    .handler(async ({ input, context }) => {
      const request = await context.services.workflow.getRequest(input.id);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      return request;
    }),

  getRequestHistory: protectedProcedure
    .input(requestIdSchema)
    .handler(async ({ input, context }) =>
      context.services.workflow.getRequestHistory(input.id),
    ),
});
