import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { o, protectedProcedure, requireRoles } from "../../shared/middleware";
import {
  createRequestSchema,
  getMyRequestsSchema,
  transitionSchema,
  updateRequestSchema,
} from "./requests.schema";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const create = requireRoles(["MANAGER", "ADMIN"])
  .input(createRequestSchema)
  .handler(async ({ input, context }) => {
    const newRequest = await context.services.requests.create(
      input,
      context.session.user.id,
    );

    if (!newRequest) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
    return newRequest;
  });

const getById = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) => {
    const request = await context.services.requests.getById(input.id);

    if (!request) {
      throw new ORPCError("NOT_FOUND");
    }

    return request;
  });

const getMyRequests = protectedProcedure
  .input(getMyRequestsSchema)
  .handler(async ({ input, context }) =>
    context.services.requests.getByRequester(
      context.session.user.id,
      context.session.user.role || "EMPLOYEE",
      input,
    ),
  );

const getPendingApprovals = protectedProcedure.handler(async ({ context }) =>
  context.services.requests.getPendingApprovals(context.session.user.id),
);

const update = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      data: updateRequestSchema,
      version: z.number(), // Optimistic locking version
    }),
  )
  .handler(async ({ input, context }) => {
    try {
      const updated = await context.services.requests.update(
        input.id,
        input.data,
        input.version,
        context.session.user.id,
      );

      if (!updated) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
      return updated;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND");
      }
      if (message === "CONFLICT") {
        throw new ORPCError("CONFLICT", {
          message: "Version mismatch. Please refresh and try again.",
        });
      }
      if (message === "FORBIDDEN") {
        throw new ORPCError("FORBIDDEN");
      }
      if (message === "REPLACEMENT_NEEDS_TARGET") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Replacement requests require a replacement user",
        });
      }
      throw error;
    }
  });

const getVersions = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .handler(async ({ input, context }) =>
    context.services.requests.getRequestVersions(input.id),
  );

const transition = protectedProcedure
  .input(transitionSchema)
  .handler(async ({ input, context }) => {
    try {
      const result = await context.services.workflow.transitionRequest(
        input.requestId,
        context.session.user.id,
        input.action,
        input.comment,
      );
      return {
        requestId: input.requestId,
        ...result,
      };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND");
      }
      if (message === "INVALID_TRANSITION") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid status transition for current state",
        });
      }
      throw error;
    }
  });

export const requestsRouter = o.router({
  create,
  getById,
  getMyRequests,
  getPendingApprovals,
  update,
  getVersions,
  transition,
});
