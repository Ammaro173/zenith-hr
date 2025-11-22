import { ORPCError } from "@orpc/server";
import { CreateRequestUseCase } from "@zenith-hr/application/requests/use-cases/create-request";
import { UpdateRequestUseCase } from "@zenith-hr/application/requests/use-cases/update-request";
import { db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { DrizzleRequestRepository } from "@zenith-hr/infrastructure/requests/drizzle-request-repository";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { createRequestSchema, updateRequestSchema } from "../schemas/request";

// Composition Root (Manual DI)
const requestRepository = new DrizzleRequestRepository();
const createRequestUseCase = new CreateRequestUseCase(requestRepository);
const updateRequestUseCase = new UpdateRequestUseCase(requestRepository);

export const requestsRouter = {
  create: protectedProcedure
    .input(createRequestSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const result = await createRequestUseCase.execute({
        requesterId: context.session.user.id,
        positionDetails: input.positionDetails,
        budgetDetails: input.budgetDetails,
      });

      // Return full object to match previous behavior if needed, or just the result
      // The previous implementation returned the full inserted object.
      // The use case returns { id, requestCode, status }.
      // If the frontend needs more, we might need to fetch it or adjust the use case.
      // For now, let's fetch it to be safe and match the return type expected by the frontend.
      const newRequest = await requestRepository.findById(result.id);
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

      const request = await requestRepository.findById(input.id);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      return request;
    }),

  getMyRequests: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const requests = await requestRepository.findByRequesterId(
      context.session.user.id
    );

    return requests;
  }),

  getPendingApprovals: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Get requests pending approval based on user role
    // Need to fetch user from DB to get role
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, context.session.user.id))
      .limit(1);

    const userRole = (userRecord?.role || "REQUESTER") as string;

    let statusFilter: string;
    if (userRole === "MANAGER") {
      statusFilter = "PENDING_MANAGER";
    } else if (userRole === "HR") {
      statusFilter = "PENDING_HR";
    } else if (userRole === "FINANCE") {
      statusFilter = "PENDING_FINANCE";
    } else if (userRole === "CEO") {
      statusFilter = "PENDING_CEO";
    } else {
      return [];
    }

    const requests = await requestRepository.findByStatus(statusFilter);

    return requests;
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
        const result = await updateRequestUseCase.execute({
          id: input.id,
          requesterId: context.session.user.id,
          version: input.version,
          data: input.data,
        });

        // Fetch full object to return
        const updated = await requestRepository.findById(result.id);
        if (!updated) {
          throw new ORPCError("INTERNAL_SERVER_ERROR");
        }
        return updated;
      } catch (error: any) {
        if (error.message === "REQUEST_NOT_FOUND") {
          throw new ORPCError("NOT_FOUND");
        }
        if (error.message === "FORBIDDEN") {
          throw new ORPCError("FORBIDDEN");
        }
        if (error.message === "BAD_REQUEST") {
          throw new ORPCError("BAD_REQUEST");
        }
        if (error.message === "CONFLICT") {
          throw new ORPCError("CONFLICT");
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

      // This is a specific query for versions, maybe not worth putting in the main repository
      // unless we want a "RequestVersionRepository".
      // For now, keeping direct DB access for this auxiliary data seems fine or we can add it to IRequestRepository.
      // Let's keep it direct for now as it's read-only and specific.
      const versions = await db
        .select()
        .from(requestVersion)
        .where(eq(requestVersion.requestId, input.id))
        .orderBy(requestVersion.versionNumber);

      return versions;
    }),
};
