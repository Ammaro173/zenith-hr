import type { DbOrTx } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { department } from "@zenith-hr/db/schema/departments";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../../shared/errors";
import { getActorPositionInfo, getActorRole } from "../../shared/utils";
import type { WorkflowService } from "../workflow/workflow.service";
import type {
  createRequestSchema,
  GetMyRequestsInput,
  updateRequestSchema,
} from "./requests.schema";

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

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

      // Get requester position info using shared utility
      const requesterPosInfo = await getActorPositionInfo(db, requesterId);
      if (!requesterPosInfo?.positionId) {
        throw new AppError(
          "BAD_REQUEST",
          "Requester must have an assigned position",
          400,
        );
      }

      // Get next approver position for initial status
      const nextApprover =
        await workflowService.getNextApproverPositionForStatus(
          requesterPosInfo.positionId,
          initialStatus,
          db,
        );

      // Enrich positionDetails from position
      const enrichedPositionDetails = { ...input.positionDetails };
      if (input.positionId) {
        const [pos] = await db
          .select({
            name: jobPosition.name,
            departmentId: jobPosition.departmentId,
            departmentName: department.name,
            description: jobPosition.description,
          })
          .from(jobPosition)
          .leftJoin(department, eq(jobPosition.departmentId, department.id))
          .where(eq(jobPosition.id, input.positionId))
          .limit(1);
        if (pos) {
          enrichedPositionDetails.title = pos.name;
          enrichedPositionDetails.department = pos.departmentName ?? undefined;
          if (!enrichedPositionDetails.description) {
            enrichedPositionDetails.description = pos.description ?? undefined;
          }
        }
      }

      const [newRequest] = await db
        .insert(manpowerRequest)
        .values({
          requesterId,
          requesterPositionId: requesterPosInfo.positionId,
          requestCode,
          requestType: input.requestType,
          replacementForUserId: input.replacementForUserId || null,
          contractDuration: input.contractDuration,
          employmentType: input.employmentType,
          headcount: input.headcount,
          positionId: input.positionId || null,
          justificationText: input.justificationText,
          salaryRangeMin: input.salaryRangeMin.toString(),
          salaryRangeMax: input.salaryRangeMax.toString(),
          currentApproverPositionId: nextApprover.positionId,
          requiredApproverRole: nextApprover.positionRole,
          positionDetails: enrichedPositionDetails,
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
          employmentType: manpowerRequest.employmentType,
          headcount: manpowerRequest.headcount,
          justificationText: manpowerRequest.justificationText,
          salaryRangeMin: manpowerRequest.salaryRangeMin,
          salaryRangeMax: manpowerRequest.salaryRangeMax,
          currentApproverPositionId: manpowerRequest.currentApproverPositionId,
          requiredApproverRole: manpowerRequest.requiredApproverRole,
          positionDetails: manpowerRequest.positionDetails,
          budgetDetails: manpowerRequest.budgetDetails,
          positionId: manpowerRequest.positionId,
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

      // Fetch current approver position users if exists
      let currentApprover: { id: string; name: string | null } | null = null;
      if (request.currentApproverPositionId) {
        const [assignment] = await db
          .select({
            userId: userPositionAssignment.userId,
            userName: user.name,
          })
          .from(userPositionAssignment)
          .innerJoin(user, eq(userPositionAssignment.userId, user.id))
          .where(
            eq(
              userPositionAssignment.positionId,
              request.currentApproverPositionId,
            ),
          )
          .limit(1);
        if (assignment) {
          currentApprover = {
            id: assignment.userId,
            name: assignment.userName,
          };
        }
      }

      // Fetch linked position details
      let positionDetails: {
        id: string;
        name: string;
        description: string | null;
        responsibilities: string | null;
        departmentName: string | null;
        grade: string | null;
        role: string;
        reportsToPositionId: string | null;
      } | null = null;
      if (request.positionId) {
        const [pos] = await db
          .select({
            id: jobPosition.id,
            name: jobPosition.name,
            description: jobPosition.description,
            responsibilities: jobPosition.responsibilities,
            departmentName: department.name,
            grade: jobPosition.grade,
            role: jobPosition.role,
            reportsToPositionId: jobPosition.reportsToPositionId,
          })
          .from(jobPosition)
          .leftJoin(department, eq(jobPosition.departmentId, department.id))
          .where(eq(jobPosition.id, request.positionId))
          .limit(1);
        positionDetails = pos
          ? {
              ...pos,
              departmentName: pos.departmentName ?? null,
            }
          : null;
      }

      // Resolve reporting position info from position
      let reportingPosition: {
        id: string;
        name: string;
        code: string;
        incumbentName: string | null;
      } | null = null;
      if (positionDetails?.reportsToPositionId) {
        const [pos] = await db
          .select({
            id: jobPosition.id,
            name: jobPosition.name,
            code: jobPosition.code,
          })
          .from(jobPosition)
          .where(eq(jobPosition.id, positionDetails.reportsToPositionId))
          .limit(1);

        if (pos) {
          // Find the user currently assigned to this position
          const [assignment] = await db
            .select({ userName: user.name })
            .from(userPositionAssignment)
            .innerJoin(user, eq(userPositionAssignment.userId, user.id))
            .where(eq(userPositionAssignment.positionId, pos.id))
            .limit(1);

          reportingPosition = {
            ...pos,
            incumbentName: assignment?.userName ?? null,
          };
        }
      }

      return {
        ...request,
        replacementForUser,
        currentApprover,
        position: positionDetails,
        reportingPosition,
      };
    },

    /**
     * Get requests for a specific user with filtering, search and pagination
     */
    async getByRequester(
      requesterId: string,
      role: string,
      params: GetMyRequestsInput,
    ) {
      const { page, pageSize, search, status, requestType, sortBy, sortOrder } =
        params;

      const conditions: SQL[] = [];
      if (role === "EMPLOYEE" || role === "MANAGER") {
        conditions.push(eq(manpowerRequest.requesterId, requesterId));
      }

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
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: count() })
          .from(manpowerRequest)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
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
     * Get pending approvals based on user role and position
     */
    async getPendingApprovals(userId: string) {
      const actorPosInfo = await getActorPositionInfo(db, userId);
      if (!actorPosInfo) {
        return [];
      }

      const actorRole = await getActorRole(db, userId);
      const isSharedQueueRole = ["HOD_HR", "HOD_FINANCE", "CEO"].includes(
        actorRole,
      );

      // Map roles to the statuses they are responsible for.
      // This acts as a fallback when requiredApproverRole is NULL
      const ROLE_STATUS_MAP = {
        HOD_HR: ["PENDING_HR"],
        HOD_FINANCE: ["PENDING_FINANCE"],
        CEO: ["PENDING_CEO"],
      } as const;

      const statusesForRole =
        ROLE_STATUS_MAP[actorRole as keyof typeof ROLE_STATUS_MAP];

      const visibilityConditions: SQL[] = [];

      // Check if actor's position matches current approver position
      if (actorPosInfo.positionId) {
        visibilityConditions.push(
          eq(
            manpowerRequest.currentApproverPositionId,
            actorPosInfo.positionId,
          ),
        );
      }

      // For shared queue roles, check by required role
      if (isSharedQueueRole) {
        visibilityConditions.push(
          eq(manpowerRequest.requiredApproverRole, actorPosInfo.positionRole),
        );
        if (statusesForRole) {
          visibilityConditions.push(
            inArray(manpowerRequest.status, statusesForRole),
          );
        }
      }

      if (visibilityConditions.length === 0) {
        return [];
      }

      const items = await db
        .select({
          request: manpowerRequest,
          requester: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(manpowerRequest)
        .innerJoin(user, eq(manpowerRequest.requesterId, user.id))
        .where(or(...visibilityConditions))
        .orderBy(desc(manpowerRequest.createdAt));

      // Enrich each item with replacement user, job description, and reporting position
      const enriched = await Promise.all(
        items.map(async (item) => {
          const req = item.request;

          // Fetch replacement user if exists
          let replacementForUser: {
            id: string;
            name: string | null;
          } | null = null;
          if (req.replacementForUserId) {
            const [u] = await db
              .select({ id: user.id, name: user.name })
              .from(user)
              .where(eq(user.id, req.replacementForUserId))
              .limit(1);
            replacementForUser = u || null;
          }

          // Fetch linked position
          let posData: {
            name: string;
            description: string | null;
            responsibilities: string | null;
            departmentName: string | null;
            grade: string | null;
            role: string;
            reportsToPositionId: string | null;
          } | null = null;
          if (req.positionId) {
            const [row] = await db
              .select({
                name: jobPosition.name,
                description: jobPosition.description,
                responsibilities: jobPosition.responsibilities,
                departmentName: department.name,
                grade: jobPosition.grade,
                role: jobPosition.role,
                reportsToPositionId: jobPosition.reportsToPositionId,
              })
              .from(jobPosition)
              .leftJoin(department, eq(jobPosition.departmentId, department.id))
              .where(eq(jobPosition.id, req.positionId))
              .limit(1);
            posData = row
              ? { ...row, departmentName: row.departmentName ?? null }
              : null;
          }

          // Resolve reporting position from position
          let reportingPosition: {
            id: string;
            name: string;
            code: string;
            incumbentName: string | null;
          } | null = null;
          if (posData?.reportsToPositionId) {
            const [pos] = await db
              .select({
                id: jobPosition.id,
                name: jobPosition.name,
                code: jobPosition.code,
              })
              .from(jobPosition)
              .where(eq(jobPosition.id, posData.reportsToPositionId))
              .limit(1);

            if (pos) {
              const [assignment] = await db
                .select({ userName: user.name })
                .from(userPositionAssignment)
                .innerJoin(user, eq(userPositionAssignment.userId, user.id))
                .where(eq(userPositionAssignment.positionId, pos.id))
                .limit(1);

              reportingPosition = {
                ...pos,
                incumbentName: assignment?.userName ?? null,
              };
            }
          }

          return {
            ...req,
            requester: item.requester,
            replacementForUser,
            position: posData,
            reportingPosition,
          };
        }),
      );

      return enriched;
    },

    /**
     * Get all related requests and trips visible to the actor using dynamic CTE
     * Shows visibility for all requested and involved workflows based on position hierarchy
     */
    async getAllRelated(actorId: string, params: GetMyRequestsInput) {
      const { page, pageSize, search, status, requestType, sortBy, sortOrder } =
        params;
      const actorPosInfo = await getActorPositionInfo(db, actorId);

      if (!actorPosInfo?.positionId) {
        return { data: [], total: 0, page, pageSize, pageCount: 0 };
      }

      // We'll use Drizzle's relational querying with CTE for the IDs
      const descendantsResult = await db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id AS position_id FROM job_position WHERE id = ${actorPosInfo.positionId}
          UNION ALL
          SELECT jp.id FROM job_position jp INNER JOIN descendants d ON jp.reports_to_position_id = d.position_id
        )
        SELECT position_id FROM descendants
      `);
      const descendantIds = descendantsResult.rows.map(
        (r) => r.position_id as string,
      );

      const conditions: SQL[] = [
        or(
          eq(manpowerRequest.requesterId, actorId),
          inArray(manpowerRequest.requesterPositionId, descendantIds),
          inArray(manpowerRequest.currentApproverPositionId, descendantIds),
          eq(manpowerRequest.requiredApproverRole, actorPosInfo.positionRole),
        ) as SQL,
      ];

      if (status?.length) {
        conditions.push(inArray(manpowerRequest.status, status));
      }
      if (requestType?.length) {
        conditions.push(inArray(manpowerRequest.requestType, requestType));
      }
      if (search) {
        conditions.push(
          sql`(${manpowerRequest.requestCode} ILIKE ${`%${search}%`} OR ${manpowerRequest.positionDetails}->>'title' ILIKE ${`%${search}%`} OR ${manpowerRequest.positionDetails}->>'department' ILIKE ${`%${search}%`})`,
        );
      }

      const offset = (page - 1) * pageSize;
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

      return {
        data,
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
        pageCount: Math.ceil((totalResult[0]?.count ?? 0) / pageSize),
      };
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
            requiredApproverRole: existing.requiredApproverRole,
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

/** Return type of getPendingApprovals; use for type-safe consumption on the frontend. */
export type PendingRequestApprovalsResult = Awaited<
  ReturnType<RequestsService["getPendingApprovals"]>
>;
