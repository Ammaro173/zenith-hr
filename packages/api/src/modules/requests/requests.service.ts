import type { db as _db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { desc, eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  createRequestSchema,
  updateRequestSchema,
} from "./requests.schema";

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

/**
 * Factory function to create RequestService with injected dependencies
 */
export const createRequestsService = (db: typeof _db) => {
  return {
    /**
     * Generate a unique request code
     */
    generateRequestCode(): string {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `REQ-${timestamp}-${random}`;
    },

    /**
     * Create a new manpower request
     */
    async create(input: CreateRequestInput, requesterId: string) {
      const requestCode = this.generateRequestCode();

      const [newRequest] = await db
        .insert(manpowerRequest)
        .values({
          requesterId,
          requestCode,
          positionDetails: input.positionDetails,
          budgetDetails: input.budgetDetails,
          status: "PENDING_MANAGER", // Initial status
        })
        .returning();

      return newRequest;
    },

    /**
     * Get request by ID
     */
    async getById(id: string) {
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, id))
        .limit(1);
      return request;
    },

    /**
     * Get requests for a specific user
     */
    async getByRequester(requesterId: string) {
      return await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.requesterId, requesterId));
    },

    /**
     * Get pending approvals based on user role
     */
    async getPendingApprovals(userId: string) {
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
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

      return await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.status, statusFilter as "PENDING_MANAGER"));
    },

    /**
     * Update a request with optimistic locking
     */
    async update(
      id: string,
      data: UpdateRequestInput,
      version: number,
      userId: string
    ) {
      // Check existence and version
      const [existing] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, id))
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.version !== version) {
        throw new Error("CONFLICT");
      }

      // Check permissions (simplified)
      if (existing.requesterId !== userId) {
        throw new Error("FORBIDDEN");
      }

      // Save version history
      await db.insert(requestVersion).values({
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
      const [updated] = await db
        .update(manpowerRequest)
        .set({
          ...data,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, id))
        .returning();

      return updated;
    },

    /**
     * Get request versions history
     */
    async getRequestVersions(requestId: string) {
      return await db
        .select()
        .from(requestVersion)
        .where(eq(requestVersion.requestId, requestId))
        .orderBy(desc(requestVersion.versionNumber));
    },

    /**
     * Validate budget details
     */
    validateBudgetDetails(budgetDetails: Record<string, unknown>): void {
      const required = ["minSalary", "maxSalary", "currency"];
      for (const field of required) {
        if (!(field in budgetDetails)) {
          throw new Error(`Missing required budget field: ${field}`);
        }
      }

      const { minSalary, maxSalary } = budgetDetails as {
        minSalary: number;
        maxSalary: number;
      };
      if (minSalary > maxSalary) {
        throw new Error("Minimum salary cannot exceed maximum salary");
      }
    },

    /**
     * Check if user can edit request
     */
    async canUserEditRequest(
      requestId: string,
      userId: string
    ): Promise<boolean> {
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, requestId))
        .limit(1);

      if (!request) {
        return false;
      }

      // Only requester can edit, and only if in DRAFT status
      return request.requesterId === userId && request.status === "DRAFT";
    },
  };
};

export type RequestsService = ReturnType<typeof createRequestsService>;
