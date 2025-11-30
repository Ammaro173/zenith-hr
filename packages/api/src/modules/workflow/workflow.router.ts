import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../shared/middleware";
import { requestIdSchema, transitionSchema } from "./workflow.schema";

export const workflowRouter = {
  transition: protectedProcedure
    .input(transitionSchema)
    .handler(async ({ input, context }) => {
      // Auth is already handled by protectedProcedure middleware
      const actorId = context.session.user.id;
      // Get IP from request headers (skip for now, can be added later)
      const ipAddress: string | undefined = undefined;

      try {
        const newStatus = await context.services.workflow.transitionRequest(
          input.requestId,
          actorId,
          input.action,
          input.comment,
          ipAddress
        );

        return {
          success: true,
          newStatus,
        };
      } catch (error) {
        if (error instanceof Error) {
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
      context.services.workflow.getRequestHistory(input.id)
    ),
};
