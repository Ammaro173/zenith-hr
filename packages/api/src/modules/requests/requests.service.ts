import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { slotAssignment } from "@zenith-hr/db/schema/position-slots";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { getActorRole } from "../../shared/utils";
import type { WorkflowService } from "../workflow/workflow.service";
import type {
  createRequestSchema,
  GetMyRequestsInput,
  updateRequestSchema,
} from "./requests.schema";

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

const PENDING_VIEW_MAP: Partial<
  Record<
    string,
    "PENDING_MANAGER" | "PENDING_HR" | "PENDING_FINANCE" | "PENDING_CEO"
  >
> = {
  MANAGER: "PENDING_MANAGER",
  HR: "PENDING_HR",
  FINANCE: "PENDING_FINANCE",
  CEO: "PENDING_CEO",
};

/**
 * Factory function to create RequestService with injected dependencies
 */
export const createRequestsService = (
  db: DbOrTx,
  workflowService: WorkflowService,
) => {
  return {
    /**
     * Generate a unique request code
     */
    async generateRequestCode(): Promise<string> {
      const result = await db.execute(
        sql`SELECT nextval('manpower_requests_seq') as value`,
      );

      if (!result.rows.length) {
        throw new AppError(
          "INTERNAL_SERVER_ERROR",
          "Failed to generate manpower request code",
          500,
        );
      }

      const row = result.rows[0] as { value: number | string };
      const sequenceNumber = row.value ? Number(row.value) : 0;

      // Note: padding grows naturally beyond 4 digits (MPR-10000+)
      return `MPR-${String(sequenceNumber).padStart(4, "0")}`;
    },

    /**
     * Create a new manpower request
     */
    async create(input: CreateRequestInput, requesterId: string) {
      this.validateSalaryRange(input.salaryRangeMin, input.salaryRangeMax);

      const requestCode = await this.generateRequestCode();

      await getActorRole(db, requesterId);
      const initialStatus = await workflowService.getInitialStatusForRequester(
        requesterId,
        db,
      );

      const [requesterSlot] = await db
        .select({ slotId: slotAssignment.slotId })
        .from(slotAssignment)
        .where(
          and(
            eq(slotAssignment.userId, requesterId),
            isNull(slotAssignment.endsAt),
          ),
        )
        .limit(1);

      // Use provided approverId or auto-determine from hierarchy
      const initialApproverId =
        input.approverId ||
        (await workflowService.getNextApproverIdForStatus(
          requesterId,
          initialStatus,
        ));

      let initialApproverSlotId: string | null = null;
      if (initialApproverId) {
        const [approverSlot] = await db
          .select({ slotId: slotAssignment.slotId })
          .from(slotAssignment)
          .where(
            and(
              eq(slotAssignment.userId, initialApproverId),
              isNull(slotAssignment.endsAt),
            ),
          )
          .limit(1);
        initialApproverSlotId = approverSlot?.slotId ?? null;
      }

      const [newRequest] = await db
        .insert(manpowerRequest)
        .values({
          requesterId,
          requesterSlotId: requesterSlot?.slotId ?? null,
          requestCode,
          requestType: input.requestType,
          replacementForUserId: input.replacementForUserId || null,
          contractDuration: input.contractDuration,
          employmentType: input.employmentType,
          headcount: input.headcount,
          jobDescriptionId: input.jobDescriptionId || null,
          justificationText: input.justificationText,
          salaryRangeMin: input.salaryRangeMin.toString(),
          salaryRangeMax: input.salaryRangeMax.toString(),
          currentApproverId: initialApproverId,
          currentApproverSlotId: initialApproverSlotId,
          currentApproverRole:
            workflowService.getApproverForStatus(initialStatus),
          positionDetails: input.positionDetails,
          budgetDetails: input.budgetDetails,
          status: initialStatus,
        })
        .returning();

      return newRequest;
    },

    /**
     * Get request by ID with related user details
     */
    async getById(id: string) {
      const [request] = await db
        .select({
          id: manpowerRequest.id,
          requesterId: manpowerRequest.requesterId,
          requestCode: manpowerRequest.requestCode,
          status: manpowerRequest.status,
          requestType: manpowerRequest.requestType,
          replacementForUserId: manpowerRequest.replacementForUserId,
          contractDuration: manpowerRequest.contractDuration,
          justificationText: manpowerRequest.justificationText,
          salaryRangeMin: manpowerRequest.salaryRangeMin,
          salaryRangeMax: manpowerRequest.salaryRangeMax,
          currentApproverId: manpowerRequest.currentApproverId,
          currentApproverSlotId: manpowerRequest.currentApproverSlotId,
          currentApproverRole: manpowerRequest.currentApproverRole,
          positionDetails: manpowerRequest.positionDetails,
          budgetDetails: manpowerRequest.budgetDetails,
          revisionVersion: manpowerRequest.revisionVersion,
          version: manpowerRequest.version,
          createdAt: manpowerRequest.createdAt,
          updatedAt: manpowerRequest.updatedAt,
          requester: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(manpowerRequest)
        .innerJoin(user, eq(manpowerRequest.requesterId, user.id))
        .where(eq(manpowerRequest.id, id))
        .limit(1);

      if (!request) {
        return null;
      }

      // Fetch replacement user if exists
      let replacementForUser: { id: string; name: string | null } | null = null;
      if (request.replacementForUserId) {
        const [u] = await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(eq(user.id, request.replacementForUserId))
          .limit(1);
        replacementForUser = u || null;
      }

      // Fetch current approver if exists
      let currentApprover: { id: string; name: string | null } | null = null;
      if (request.currentApproverId) {
        const [u] = await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(eq(user.id, request.currentApproverId))
          .limit(1);
        currentApprover = u || null;
      }

      return {
        ...request,
        replacementForUser,
        currentApprover,
      };
    },

    /**
     * Get requests for a specific user with filtering, search and pagination
     */
    async getByRequester(requesterId: string, params: GetMyRequestsInput) {
      const { page, pageSize, search, status, requestType, sortBy, sortOrder } =
        params;

      const conditions = [eq(manpowerRequest.requesterId, requesterId)];

      // Status filter
      if (status?.length) {
        conditions.push(inArray(manpowerRequest.status, status));
      }

      // Type filter
      if (requestType?.length) {
        conditions.push(inArray(manpowerRequest.requestType, requestType));
      }

      // Search (requestCode, positionDetails->title, positionDetails->department)
      if (search) {
        conditions.push(
          sql`(${manpowerRequest.requestCode} ILIKE ${`%${search}%`} OR 
              ${manpowerRequest.positionDetails}->>'title' ILIKE ${`%${search}%`} OR 
              ${manpowerRequest.positionDetails}->>'department' ILIKE ${`%${search}%`})`,
        );
      }

      const offset = (page - 1) * pageSize;

      // Determine sort column or expression
      const orderFn = sortOrder === "desc" ? desc : asc;
      const orderBy =
        sortBy === "title" || sortBy === "department"
          ? orderFn(sql`${manpowerRequest.positionDetails}->>${sortBy}`)
          : orderFn(
              manpowerRequest[sortBy as keyof typeof manpowerRequest._.columns],
            );

      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(manpowerRequest)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: count() })
          .from(manpowerRequest)
          .where(and(...conditions)),
      ]);

      const total = totalResult[0]?.count ?? 0;

      return {
        data,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      };
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

      const statusFilter = PENDING_VIEW_MAP[userRole];

      if (!statusFilter) {
        return [];
      }

      return await db
        .select()
        .from(manpowerRequest)
        .where(
          and(
            eq(manpowerRequest.status, statusFilter as "PENDING_MANAGER"),
            eq(manpowerRequest.currentApproverId, userId),
          ),
        );
    },

    /**
     * Update a request with optimistic locking
     */
    async update(
      id: string,
      data: UpdateRequestInput,
      version: number,
      userId: string,
    ) {
      return await db.transaction(async (tx) => {
        // Check existence and version
        const [existing] = await tx
          .select()
          .from(manpowerRequest)
          .where(eq(manpowerRequest.id, id))
          .limit(1);

        if (!existing) {
          throw AppError.notFound("Request not found");
        }

        if (existing.version !== version) {
          throw new AppError(
            "CONFLICT",
            "Version mismatch - please refresh",
            409,
          );
        }

        // Check permissions (simplified)
        if (existing.requesterId !== userId) {
          throw new AppError(
            "FORBIDDEN",
            "Not authorized to edit this request",
            403,
          );
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
          throw AppError.badRequest("Replacement request requires target user");
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
        throw AppError.badRequest(
          "Minimum salary cannot exceed maximum salary",
        );
      }
    },

    /**
     * Check if user can edit request
     */
    async canUserEditRequest(
      requestId: string,
      userId: string,
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
