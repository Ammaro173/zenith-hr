import type { db as _db } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user, type userRoleEnum } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { notifyUser } from "../../shared/notify";
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
      this.validateSalaryRange(input.salaryRangeMin, input.salaryRangeMax);

      const requestCode = this.generateRequestCode();

      const [requester] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, requesterId))
        .limit(1);

      const requesterRole = (requester?.role || "REQUESTER") as string;
      const initialStatus =
        requesterRole === "MANAGER" || requesterRole === "HR"
          ? "PENDING_HR"
          : "PENDING_MANAGER";
      const initialApproverRole =
        initialStatus === "PENDING_MANAGER" ? "MANAGER" : "HR";

      const [newRequest] = await db
        .insert(manpowerRequest)
        .values({
          requesterId,
          requestCode,
          requestType: input.requestType,
          isBudgeted: input.isBudgeted,
          replacementForUserId: input.replacementForUserId || null,
          contractDuration: input.contractDuration,
          justificationText: input.justificationText,
          salaryRangeMin: input.salaryRangeMin.toString(),
          salaryRangeMax: input.salaryRangeMax.toString(),
          currentApproverRole: initialApproverRole,
          positionDetails: input.positionDetails,
          budgetDetails: input.budgetDetails,
          status: initialStatus,
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

      const userRole = (userRecord?.role ||
        "REQUESTER") as (typeof userRoleEnum.enumValues)[number];

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
        .where(
          and(
            eq(manpowerRequest.status, statusFilter as "PENDING_MANAGER"),
            eq(manpowerRequest.currentApproverRole, userRole)
          )
        );
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
      return await db.transaction(async (tx) => {
        // Check existence and version
        const [existing] = await tx
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

        const nextSalaryMin =
          data.salaryRangeMin ?? Number(existing.salaryRangeMin);
        const nextSalaryMax =
          data.salaryRangeMax ?? Number(existing.salaryRangeMax);
        this.validateSalaryRange(nextSalaryMin, nextSalaryMax);

        const nextRequestType = data.requestType ?? existing.requestType;
        const replacementForUserId =
          data.replacementForUserId ?? existing.replacementForUserId;

        if (
          nextRequestType === "REPLACEMENT" &&
          (!replacementForUserId || replacementForUserId.length === 0)
        ) {
          throw new Error("REPLACEMENT_NEEDS_TARGET");
        }

        // Save version history
        await tx.insert(requestVersion).values({
          requestId: existing.id,
          versionNumber: existing.version,
          snapshotData: {
            positionDetails: existing.positionDetails,
            budgetDetails: existing.budgetDetails,
            status: existing.status,
            requestType: existing.requestType,
            isBudgeted: existing.isBudgeted,
            replacementForUserId: existing.replacementForUserId,
            contractDuration: existing.contractDuration,
            justificationText: existing.justificationText,
            salaryRangeMin: existing.salaryRangeMin,
            salaryRangeMax: existing.salaryRangeMax,
            currentApproverRole: existing.currentApproverRole,
          },
          createdAt: new Date(),
        });

        // Update
        const [updated] = await tx
          .update(manpowerRequest)
          .set({
            ...data,
            replacementForUserId,
            salaryRangeMin: nextSalaryMin.toString(),
            salaryRangeMax: nextSalaryMax.toString(),
            requestType: nextRequestType,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(manpowerRequest.id, id))
          .returning();

        return updated;
      });
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
    validateSalaryRange(min: number, max: number): void {
      if (min > max) {
        throw new Error("Minimum salary cannot exceed maximum salary");
      }
    },

    /**
     * Transition request status with approval workflow
     */
    async transitionRequest(
      requestId: string,
      actorId: string,
      action: "SUBMIT" | "APPROVE" | "REJECT" | "REQUEST_CHANGE" | "HOLD",
      comment?: string
    ) {
      return await db.transaction(async (tx) => {
        // 1. Get current request with lock
        const [request] = await tx
          .select()
          .from(manpowerRequest)
          .where(eq(manpowerRequest.id, requestId))
          .limit(1);

        if (!request) {
          throw new Error("NOT_FOUND");
        }

        // 2. Determine new status
        let newStatus = request.status;
        const currentStatus = request.status;

        if (action === "SUBMIT" && currentStatus === "DRAFT") {
          newStatus = "PENDING_MANAGER";
        } else if (action === "APPROVE") {
          switch (currentStatus) {
            case "PENDING_MANAGER":
              newStatus = "PENDING_HR";
              break;
            case "PENDING_HR":
              newStatus = "PENDING_FINANCE";
              break;
            case "PENDING_FINANCE":
              newStatus = "PENDING_CEO";
              break;
            case "PENDING_CEO":
              newStatus = "APPROVED_OPEN";
              break;
            default:
              throw new Error("INVALID_TRANSITION");
          }
        } else if (action === "REJECT") {
          newStatus = "REJECTED";
        } else if (action === "REQUEST_CHANGE") {
          // Return to requester for changes
          newStatus = "DRAFT";
        }

        if (
          newStatus === currentStatus &&
          action !== "HOLD" &&
          (action === "APPROVE" || action === "SUBMIT")
        ) {
          // If status didn't change and it wasn't a HOLD, block invalid approve/submit transitions
          throw new Error("INVALID_TRANSITION");
        }

        const nextApproverRole = (() => {
          switch (newStatus) {
            case "PENDING_MANAGER":
              return "MANAGER" as (typeof userRoleEnum.enumValues)[number];
            case "PENDING_HR":
              return "HR" as (typeof userRoleEnum.enumValues)[number];
            case "PENDING_FINANCE":
              return "FINANCE" as (typeof userRoleEnum.enumValues)[number];
            case "PENDING_CEO":
              return "CEO" as (typeof userRoleEnum.enumValues)[number];
            default:
              return null;
          }
        })();

        // 3. Update request
        await tx
          .update(manpowerRequest)
          .set({
            status: newStatus,
            currentApproverRole: nextApproverRole,
            updatedAt: new Date(),
            version: request.version + 1,
          })
          .where(eq(manpowerRequest.id, requestId));

        // 4. Create approval log
        // We need to import approvalLog from schema, adding import at top of file
        await tx.insert(approvalLog).values({
          requestId,
          actorId,
          action,
          comment,
          stepName: currentStatus,
          performedAt: new Date(),
        });

        await tx.insert(auditLog).values({
          entityId: requestId,
          entityType: "MANPOWER_REQUEST",
          action,
          performedBy: actorId,
          performedAt: new Date(),
          metadata: {
            from: currentStatus,
            to: newStatus,
            comment,
          },
        });

        await notifyUser({
          userId: request.requesterId,
          message: `Request ${request.requestCode} moved to ${newStatus}`,
        });

        return {
          previousStatus: currentStatus,
          newStatus,
          requestId,
        };
      });
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
