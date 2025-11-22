import { ORPCError } from "@orpc/server";
import { db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { createRequestSchema, updateRequestSchema } from "../schemas/request";

function generateRequestCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `REQ-${year}-${random}`;
}

export const requestsRouter = {
  create: protectedProcedure
    .input(createRequestSchema)
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const requestCode = generateRequestCode();
      const [newRequest] = await db
        .insert(manpowerRequest)
        .values({
          id: uuidv4(),
          requesterId: context.session.user.id,
          requestCode,
          status: "DRAFT",
          positionDetails: input.positionDetails,
          budgetDetails: input.budgetDetails,
          revisionVersion: 0,
          version: 0,
        })
        .returning();

      return newRequest;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const [request] = await db
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

    const requests = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.requesterId, context.session.user.id))
      .orderBy(desc(manpowerRequest.createdAt));

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

    let statusFilter: string[];
    if (userRole === "MANAGER") {
      statusFilter = ["PENDING_MANAGER"];
    } else if (userRole === "HR") {
      statusFilter = ["PENDING_HR"];
    } else if (userRole === "FINANCE") {
      statusFilter = ["PENDING_FINANCE"];
    } else if (userRole === "CEO") {
      statusFilter = ["PENDING_CEO"];
    } else {
      return [];
    }

    const requests = await db
      .select()
      .from(manpowerRequest)
      .where(eq(manpowerRequest.status, statusFilter[0] as never))
      .orderBy(desc(manpowerRequest.createdAt));

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

      // Get current request
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, input.id))
        .limit(1);

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      // Check if user is the requester
      if (request.requesterId !== context.session.user.id) {
        throw new ORPCError("FORBIDDEN");
      }

      // Check if request is in DRAFT status
      if (request.status !== "DRAFT") {
        throw new ORPCError("BAD_REQUEST");
      }

      // Optimistic locking check
      if (request.version !== input.version) {
        throw new ORPCError("CONFLICT");
      }

      // Update request
      const [updated] = await db
        .update(manpowerRequest)
        .set({
          positionDetails:
            input.data.positionDetails || request.positionDetails,
          budgetDetails: input.data.budgetDetails || request.budgetDetails,
          version: request.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, input.id))
        .returning();

      return updated;
    }),

  getVersions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const versions = await db
        .select()
        .from(requestVersion)
        .where(eq(requestVersion.requestId, input.id))
        .orderBy(requestVersion.versionNumber);

      return versions;
    }),
};
