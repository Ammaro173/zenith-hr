import { ORPCError } from "@orpc/server";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { transitionSchema } from "../schemas/request";
import { WorkflowService } from "../services/workflow.service";

export const workflowRouter = {
  transition: protectedProcedure
    .input(transitionSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const actorId = context.session.user.id;
      // Get IP from request headers (skip for now, can be added later)
      const ipAddress: string | undefined = undefined;

      try {
        const newStatus = await WorkflowService.transitionRequest(
          context.db,
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
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [request] = await context.db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.id))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      return request;
    }),

  getRequestHistory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const logs = await context.db
        .select()
        .from(approvalLog)
        .where(eq(approvalLog.requestId, input.id))
        .orderBy(approvalLog.performedAt);

      return logs;
    }),
};
