import { ORPCError } from "@orpc/server";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { createRequestSchema, updateRequestSchema } from "../schemas/request";

export const requestsRouter = {
  create: protectedProcedure
    .input(createRequestSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Generate request code
      const requestCode = `REQ-${Date.now()}`;

      const [newRequest] = await context.db
        .insert(manpowerRequest)
        .values({
          requesterId: context.session.user.id,
          requestCode,
          positionDetails: input.positionDetails,
          budgetDetails: input.budgetDetails,
          status: "PENDING_MANAGER", // Initial status
        })
        .returning();

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

  getMyRequests: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const requests = await context.db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.requesterId, context.session.user.id));

    return requests;
  }),

  getPendingApprovals: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Get requests pending approval based on user role
    const [userRecord] = await context.db
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

    const requests = await context.db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, statusFilter as "PENDING_MANAGER")); // Cast to specific enum member or let it infer if possible, but statusFilter is string.

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

      // Check existence and version
      const [existing] = await context.db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.id))
        .limit(1);

      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      if (existing.version !== input.version) {
        throw new ORPCError("CONFLICT", {
          message: "Version mismatch. Please refresh and try again.",
        });
      }

      // Check permissions (simplified)
      if (existing.requesterId !== context.session.user.id) {
        throw new ORPCError("FORBIDDEN");
      }

      // Save version history
      await context.db.insert(requestVersion).values({
        requestId: existing.id,
        versionNumber: existing.version,
        snapshotData: {
          positionDetails: existing.positionDetails,
          budgetDetails: existing.budgetDetails,
          status: existing.status,
        },
        createdAt: new Date(),
      });

      // Update
      const [updated] = await context.db
        .update(manpowerRequest)
        .set({
          ...input.data,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(
          eq(manpowerRequest.id, input.id)
          // We could add version check here too for extra safety: and(eq(id, input.id), eq(version, input.version))
        )
        .returning();

      if (!updated) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
      return updated;
    }),

  getVersions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const versions = await context.db
        .select()
        .from(requestVersion)
        .where(eq(requestVersion.requestId, input.id))
        .orderBy(requestVersion.versionNumber);

      return versions;
    }),
};
