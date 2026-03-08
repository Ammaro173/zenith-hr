import { ORPCError } from "@orpc/server";
import { AppError } from "../../shared/errors";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  requestIdSchema,
  requestNoteSchema,
  transitionSchema,
} from "./workflow.schema";

export const workflowRouter = o.router({
  transition: requireRoles([
    "EMPLOYEE",
    "MANAGER",
    "HOD",
    "HOD_HR",
    "HOD_FINANCE",
    "CEO",
    "HOD_IT",
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
        if (error instanceof AppError) {
          throw error.toORPCError();
        }

        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError("BAD_REQUEST");
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

  addRequestNote: requireRoles([
    "MANAGER",
    "HOD",
    "HOD_HR",
    "HOD_FINANCE",
    "HOD_IT",
    "CEO",
    "ADMIN",
  ])
    .input(requestNoteSchema)
    .handler(async ({ input, context }) => {
      try {
        const note = await context.services.workflow.addRequestNote(
          input.requestId,
          context.session.user.id,
          input.comment,
        );

        await context.cache.deletePattern("dashboard:stats:*");

        return note;
      } catch (error) {
        if (error instanceof AppError) {
          throw error.toORPCError();
        }

        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError("BAD_REQUEST");
      }
    }),
});
