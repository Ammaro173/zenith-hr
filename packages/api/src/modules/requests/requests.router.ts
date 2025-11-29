import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../shared/middleware";
import { createRequestSchema, updateRequestSchema } from "./requests.schema";

export const requestsRouter = {
  create: protectedProcedure
    .input(createRequestSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const newRequest = await context.services.requests.create(
        input,
        context.session.user.id
      );

      if (!newRequest) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
      return newRequest;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const request = await context.services.requests.getById(input.id);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      return request;
    }),

  getMyRequests: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return context.services.requests.getByRequester(context.session.user.id);
  }),

  getPendingApprovals: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return context.services.requests.getPendingApprovals(
      context.session.user.id
    );
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateRequestSchema,
        version: z.number(), // Optimistic locking version
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        const updated = await context.services.requests.update(
          input.id,
          input.data,
          input.version,
          context.session.user.id
        );

        if (!updated) {
          throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
        return updated;
      } catch (error: any) {
        if (error.message === "NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (error.message === "CONFLICT") {
          throw new ORPCError("CONFLICT", {
            message: "Version mismatch. Please refresh and try again.",
          });
        }
        if (error.message === "FORBIDDEN") {
          throw new ORPCError("FORBIDDEN");
        }
        throw error;
      }
    }),

  getVersions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      return context.services.requests.getRequestVersions(input.id);
    }),
};
