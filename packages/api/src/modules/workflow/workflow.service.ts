import type { DbOrTx, Transaction } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { userPositionAssignment } from "@zenith-hr/db/schema/position-slots";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { and, eq, sql } from "drizzle-orm";
import { AppError } from "../../shared/errors";
import type {
  ApprovalAction,
  RequestStatus,
  UserRole,
} from "../../shared/types";

type TransitionResult = RequestStatus;
type TransitionFn = (actorRole: UserRole) => TransitionResult;
type TransitionTarget = TransitionResult | TransitionFn;
type InitiatorRouteKey = "HR" | "FINANCE" | "CEO" | "OTHER";

const WORKFLOW_TRANSITIONS: Partial<
  Record<RequestStatus, Partial<Record<ApprovalAction, TransitionTarget>>>
> = {
  DRAFT: {
    SUBMIT: "PENDING_HR",
  },
  PENDING_MANAGER: {
    APPROVE: "PENDING_HR",
    REJECT: "REJECTED",
    REQUEST_CHANGE: "DRAFT",
  },
  PENDING_HR: {
    APPROVE: "PENDING_FINANCE",
    REJECT: "REJECTED",
    HOLD: "PENDING_HR",
    REQUEST_CHANGE: "DRAFT",
  },
  PENDING_FINANCE: {
    APPROVE: "PENDING_CEO",
    REJECT: "DRAFT",
    REQUEST_CHANGE: "DRAFT",
  },
  PENDING_CEO: {
    APPROVE: "HIRING_IN_PROGRESS",
    REJECT: "REJECTED",
  },
  HIRING_IN_PROGRESS: {
    APPROVE: "COMPLETED",
  },
};

export const createWorkflowService = (db: DbOrTx) => {
  const getStepName = (status: RequestStatus): string => {
    const stepMap: Record<RequestStatus, string> = {
      DRAFT: "Draft",
      PENDING_MANAGER: "Manager Review",
      PENDING_HR: "HR Review",
      PENDING_FINANCE: "Finance Review",
      PENDING_CEO: "CEO Review",
      APPROVED_OPEN: "Approved",
      HIRING_IN_PROGRESS: "Hiring",
      REJECTED: "Rejected",
      ARCHIVED: "Archived",
      APPROVED: "Approved",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    };
    return stepMap[status] || status;
  };

  const getApproverForStatus = (status: RequestStatus): UserRole | null => {
    const mapping: Partial<Record<RequestStatus, UserRole>> = {
      PENDING_MANAGER: "MANAGER",
      PENDING_HR: "HR",
      PENDING_FINANCE: "FINANCE",
      PENDING_CEO: "CEO",
    };
    return mapping[status] ?? null;
  };

  const getApprovalSequenceForInitiator = (
    routeKey: InitiatorRouteKey,
  ): RequestStatus[] => {
    switch (routeKey) {
      case "HR":
        return ["PENDING_FINANCE", "PENDING_CEO", "HIRING_IN_PROGRESS"];
      case "FINANCE":
        return ["PENDING_HR", "PENDING_CEO", "HIRING_IN_PROGRESS"];
      case "CEO":
        return ["PENDING_HR", "PENDING_FINANCE", "HIRING_IN_PROGRESS"];
      default:
        return [
          "PENDING_HR",
          "PENDING_FINANCE",
          "PENDING_CEO",
          "HIRING_IN_PROGRESS",
        ];
    }
  };

  const hasActivePositionAssignment = async (
    requesterId: string,
    txOrDb: DbOrTx,
  ): Promise<boolean> => {
    const result = await txOrDb.execute(sql`
      SELECT 1
      FROM user_position_assignment upa
      WHERE upa.user_id = ${requesterId}
      LIMIT 1
    `);
    return result.rows.length > 0;
  };

  const getInitiatorRouteKey = async (
    requesterId: string,
    txOrDb: DbOrTx,
  ): Promise<InitiatorRouteKey> => {
    const [requester] = await txOrDb
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, requesterId))
      .limit(1);

    if (requester?.role === "CEO") {
      return "CEO";
    }
    if (requester?.role === "FINANCE") {
      return "FINANCE";
    }
    if (requester?.role === "HR") {
      return "HR";
    }

    return "OTHER";
  };

  const createApprovalLog = async (
    tx: Transaction,
    requestId: string,
    actorId: string,
    action: ApprovalAction,
    stepName: string,
    options?: {
      comment?: string;
      ipAddress?: string;
      actorPositionId?: string;
    },
  ): Promise<void> => {
    await tx.insert(approvalLog).values({
      requestId,
      actorId,
      actorPositionId: options?.actorPositionId || null,
      action,
      stepName,
      comment: options?.comment || null,
      ipAddress: options?.ipAddress || null,
      performedAt: new Date(),
    });
  };

  const archiveVersion = async (
    tx: Transaction,
    requestId: string,
    versionNumber: number,
    snapshotData: Record<string, unknown>,
  ): Promise<void> => {
    await tx.insert(requestVersion).values({
      requestId,
      versionNumber,
      snapshotData,
      createdAt: new Date(),
    });
  };

  const createAuditLog = async (
    tx: Transaction,
    entityId: string,
    performedBy: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> => {
    await tx.insert(auditLog).values({
      entityId,
      entityType: "MANPOWER_REQUEST",
      action,
      performedBy,
      performedAt: new Date(),
      metadata: metadata || null,
    });
  };

  return {
    getApproverForStatus,

    async getInitialStatusForRequester(
      requesterId: string,
      txOrDb: DbOrTx = db,
      _actorRole?: UserRole,
    ): Promise<RequestStatus> {
      const hasActivePosition = await hasActivePositionAssignment(
        requesterId,
        txOrDb,
      );
      if (!hasActivePosition) {
        return "PENDING_HR";
      }

      const routeKey = await getInitiatorRouteKey(requesterId, txOrDb);
      const sequence = getApprovalSequenceForInitiator(routeKey);
      return sequence[0] ?? "PENDING_HR";
    },

    async getNextApprover(requesterId: string): Promise<string | null> {
      const result = await db.execute(sql`
        WITH RECURSIVE requester_position AS (
          SELECT upa.position_id AS position_id
          FROM user_position_assignment upa
          WHERE upa.user_id = ${requesterId}
          LIMIT 1
        ),
        ancestor_positions AS (
          SELECT jp.reports_to_position_id AS position_id, 1 AS depth
          FROM job_position jp
          INNER JOIN requester_position rp ON rp.position_id = jp.id

          UNION ALL

          SELECT jp.reports_to_position_id AS position_id, ap.depth + 1 AS depth
          FROM job_position jp
          INNER JOIN ancestor_positions ap ON ap.position_id = jp.id
          WHERE ap.position_id IS NOT NULL
        )
        SELECT u.id, u.role, ap.depth
        FROM ancestor_positions ap
        INNER JOIN user_position_assignment upa ON upa.position_id = ap.position_id
        INNER JOIN "user" u ON u.id = upa.user_id
        WHERE ap.position_id IS NOT NULL
          AND u.status = 'ACTIVE'
          AND u.role IN ('MANAGER', 'HR', 'FINANCE', 'CEO')
        ORDER BY
          ap.depth ASC,
          CASE u.role
            WHEN 'MANAGER' THEN 1
            WHEN 'HR' THEN 2
            WHEN 'FINANCE' THEN 3
            WHEN 'CEO' THEN 4
          END
        LIMIT 1
      `);

      if (result.rows.length > 0 && result.rows[0]) {
        return result.rows[0].id as string;
      }
      return null;
    },

    shouldSkipStep(
      requesterRole: UserRole,
      currentStatus: RequestStatus,
    ): boolean {
      if (requesterRole === "MANAGER" && currentStatus === "PENDING_MANAGER") {
        return true;
      }
      if (requesterRole === "HR" && currentStatus === "PENDING_HR") {
        return true;
      }
      return false;
    },

    async getNextApproverIdForStatus(
      requesterId: string,
      status: RequestStatus,
      txOrDb?: DbOrTx,
    ): Promise<string | null> {
      const queryDb = txOrDb || db;

      const targetRole = getApproverForStatus(status);
      if (!targetRole) {
        return null;
      }

      if (status === "PENDING_MANAGER") {
        const managerId = await this.getNextApprover(requesterId);
        if (managerId) {
          return managerId;
        }

        const [hrUser] = await queryDb
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.role, "HR"), eq(user.status, "ACTIVE")))
          .limit(1);

        if (hrUser?.id) {
          return hrUser.id;
        }

        throw new AppError(
          "CONFLICT",
          "No ACTIVE approver available for manager step. Reassign reporting lines or activate an approver.",
          409,
        );
      }

      const [targetUser] = await queryDb
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.role, targetRole), eq(user.status, "ACTIVE")))
        .limit(1);

      if (targetUser?.id) {
        return targetUser.id;
      }

      throw new AppError(
        "CONFLICT",
        `No ACTIVE approver available for ${status}. Reassign role ownership or activate an approver.`,
        409,
      );
    },

    async transitionRequest(
      requestId: string,
      actorId: string,
      action: ApprovalAction,
      comment?: string,
      ipAddress?: string,
    ): Promise<{
      previousStatus: RequestStatus;
      newStatus: RequestStatus;
    }> {
      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(manpowerRequest)
          .where(eq(manpowerRequest.id, requestId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Request not found");
        }

        const [actor] = await tx
          .select()
          .from(user)
          .where(eq(user.id, actorId))
          .limit(1);

        if (!actor) {
          throw AppError.notFound("Actor not found");
        }

        const actorRole = (actor.role || "EMPLOYEE") as UserRole;
        const currentStatus = request.status as RequestStatus;

        const requiresActiveApprover =
          currentStatus !== "DRAFT" && action !== "REQUEST_CHANGE";
        if (requiresActiveApprover) {
          const isAssignedUser = request.currentApproverId === actorId;
          const isAssignedRole =
            request.currentApproverRole === actorRole &&
            ["HR", "FINANCE", "CEO"].includes(actorRole);
          const isAdmin = actorRole === "ADMIN";

          if (
            request.currentApproverId &&
            !isAssignedUser &&
            !isAssignedRole &&
            !isAdmin
          ) {
            throw new AppError(
              "FORBIDDEN",
              "Not authorized for this action",
              403,
            );
          }

          if (!request.currentApproverId) {
            const requiredRole = getApproverForStatus(currentStatus);
            // HIRING_IN_PROGRESS can only be completed by HR or ADMIN
            const hiringRole =
              currentStatus === "HIRING_IN_PROGRESS" ? "HR" : null;
            const effectiveRole = requiredRole ?? hiringRole;
            if (
              effectiveRole &&
              actorRole !== effectiveRole &&
              actorRole !== "ADMIN"
            ) {
              throw new AppError(
                "FORBIDDEN",
                "Not authorized for this action",
                403,
              );
            }
          }
        }

        const statusTransitions = WORKFLOW_TRANSITIONS[currentStatus];
        if (!statusTransitions) {
          throw AppError.badRequest(`Invalid status ${currentStatus}`);
        }

        const transition = statusTransitions[action];
        if (!transition) {
          throw AppError.badRequest(
            `Invalid action ${action} from ${currentStatus}`,
          );
        }

        let newStatus: RequestStatus;
        if (currentStatus === "DRAFT" && action === "SUBMIT") {
          newStatus = await this.getInitialStatusForRequester(
            request.requesterId,
            tx,
            actorRole,
          );
        } else if (
          action === "APPROVE" &&
          ["PENDING_HR", "PENDING_FINANCE", "PENDING_CEO"].includes(
            currentStatus,
          )
        ) {
          const hasActivePosition = await hasActivePositionAssignment(
            request.requesterId,
            tx,
          );
          if (hasActivePosition) {
            const routeKey = await getInitiatorRouteKey(
              request.requesterId,
              tx,
            );
            const sequence = getApprovalSequenceForInitiator(routeKey);
            const currentIndex = sequence.indexOf(currentStatus);
            if (currentIndex < 0 || !sequence[currentIndex + 1]) {
              throw AppError.badRequest(
                `Invalid action ${action} from ${currentStatus}`,
              );
            }
            newStatus = sequence[currentIndex + 1] as RequestStatus;
          } else if (typeof transition === "function") {
            newStatus = transition(actorRole);
          } else {
            newStatus = transition;
          }
        } else if (typeof transition === "function") {
          newStatus = transition(actorRole);
        } else {
          newStatus = transition;
        }

        const nextApproverId = await this.getNextApproverIdForStatus(
          request.requesterId,
          newStatus,
          tx,
        );

        let nextApproverPositionId: string | null = null;
        if (nextApproverId) {
          const [nextAssignee] = await tx
            .select({ positionId: userPositionAssignment.positionId })
            .from(userPositionAssignment)
            .where(eq(userPositionAssignment.userId, nextApproverId))
            .limit(1);
          nextApproverPositionId = nextAssignee?.positionId ?? null;
        }

        const [actorPosition] = await tx
          .select({ positionId: userPositionAssignment.positionId })
          .from(userPositionAssignment)
          .where(eq(userPositionAssignment.userId, actorId))
          .limit(1);

        await tx
          .update(manpowerRequest)
          .set({
            status: newStatus,
            currentApproverId: nextApproverId,
            currentApproverPositionId: nextApproverPositionId,
            currentApproverRole: getApproverForStatus(newStatus),
            revisionVersion:
              newStatus === "DRAFT" && currentStatus !== "DRAFT"
                ? request.revisionVersion + 1
                : request.revisionVersion,
            updatedAt: new Date(),
          })
          .where(eq(manpowerRequest.id, requestId));

        const stepName =
          action === "SUBMIT" ? "Submission" : getStepName(currentStatus);
        await createApprovalLog(tx, requestId, actorId, action, stepName, {
          comment,
          ipAddress,
          actorPositionId: actorPosition?.positionId,
        });

        await createAuditLog(tx, requestId, actorId, action, {
          from: currentStatus,
          to: newStatus,
          comment,
        });

        if (newStatus === "DRAFT" && currentStatus !== "DRAFT") {
          await archiveVersion(tx, requestId, request.revisionVersion + 1, {
            status: currentStatus,
            positionDetails: request.positionDetails,
            budgetDetails: request.budgetDetails,
          });
        }

        return {
          previousStatus: currentStatus,
          newStatus,
        };
      });
    },

    async getRequest(id: string) {
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, id))
        .limit(1);
      return request;
    },

    async getRequestHistory(id: string) {
      return await db
        .select({
          id: approvalLog.id,
          requestId: approvalLog.requestId,
          actorId: approvalLog.actorId,
          action: approvalLog.action,
          stepName: approvalLog.stepName,
          comment: approvalLog.comment,
          performedAt: approvalLog.performedAt,
          actor: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
        .from(approvalLog)
        .leftJoin(user, eq(approvalLog.actorId, user.id))
        .where(eq(approvalLog.requestId, id))
        .orderBy(approvalLog.performedAt);
    },
  };
};

export type WorkflowService = ReturnType<typeof createWorkflowService>;
