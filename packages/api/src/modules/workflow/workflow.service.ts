import type { DbOrTx, Transaction } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import {
  positionSlot,
  slotAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { and, eq, isNull, sql } from "drizzle-orm";
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

const HR_STAGE_SLOT_CODE = "HOD_HR";
const FINANCE_STAGE_SLOT_CODE = "HOD_FINANCE";
const CEO_STAGE_SLOT_CODE = "CEO";

const WORKFLOW_TRANSITIONS: Partial<
  Record<RequestStatus, Partial<Record<ApprovalAction, TransitionTarget>>>
> = {
  DRAFT: {
    SUBMIT: (role) =>
      role === "MANAGER" || role === "HR" ? "PENDING_HR" : "PENDING_MANAGER",
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
    APPROVE: "APPROVED_OPEN",
    REJECT: "REJECTED",
  },
  APPROVED_OPEN: {
    SUBMIT: "HIRING_IN_PROGRESS",
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

  const getStageSlotCodeForStatus = (status: RequestStatus): string | null => {
    const mapping: Partial<Record<RequestStatus, string>> = {
      PENDING_HR: HR_STAGE_SLOT_CODE,
      PENDING_FINANCE: FINANCE_STAGE_SLOT_CODE,
      PENDING_CEO: CEO_STAGE_SLOT_CODE,
    };
    return mapping[status] ?? null;
  };

  const getApprovalSequenceForInitiator = (
    routeKey: InitiatorRouteKey,
  ): RequestStatus[] => {
    switch (routeKey) {
      case "HR":
        return ["PENDING_FINANCE", "PENDING_CEO", "APPROVED_OPEN"];
      case "FINANCE":
        return ["PENDING_HR", "PENDING_CEO", "APPROVED_OPEN"];
      case "CEO":
        return ["PENDING_HR", "PENDING_FINANCE", "APPROVED_OPEN"];
      default:
        return [
          "PENDING_HR",
          "PENDING_FINANCE",
          "PENDING_CEO",
          "APPROVED_OPEN",
        ];
    }
  };

  const hasActiveSlotAssignment = async (
    requesterId: string,
    txOrDb: DbOrTx,
  ): Promise<boolean> => {
    const result = await txOrDb.execute(sql`
      SELECT 1
      FROM slot_assignment sa
      WHERE sa.user_id = ${requesterId}
        AND sa.ends_at IS NULL
      LIMIT 1
    `);
    return result.rows.length > 0;
  };

  const getInitiatorRouteKey = async (
    requesterId: string,
    txOrDb: DbOrTx,
  ): Promise<InitiatorRouteKey> => {
    const result = await txOrDb.execute(sql`
      SELECT ps.code AS slot_code, d.name AS department_name
      FROM slot_assignment sa
      INNER JOIN position_slot ps ON ps.id = sa.slot_id
      LEFT JOIN department d ON d.id = ps.department_id
      WHERE sa.user_id = ${requesterId}
        AND sa.ends_at IS NULL
      LIMIT 1
    `);

    const slotRow = result.rows[0] as
      | { slot_code?: string | null; department_name?: string | null }
      | undefined;

    const normalizedSlotCode = slotRow?.slot_code?.toUpperCase() ?? "";
    const normalizedDepartmentName =
      slotRow?.department_name?.toUpperCase() ?? "";

    if (
      normalizedSlotCode.includes("CEO") ||
      normalizedDepartmentName.includes("CHIEF EXECUTIVE")
    ) {
      return "CEO";
    }

    if (
      normalizedSlotCode.includes("FINANCE") ||
      normalizedDepartmentName.includes("FINANCE")
    ) {
      return "FINANCE";
    }

    if (
      normalizedSlotCode.includes("HR") ||
      normalizedSlotCode.includes("HUMAN_RESOURCES") ||
      normalizedDepartmentName.includes("HUMAN RESOURCES") ||
      normalizedDepartmentName === "HR"
    ) {
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
    options?: { comment?: string; ipAddress?: string; actorSlotId?: string },
  ): Promise<void> => {
    await tx.insert(approvalLog).values({
      requestId,
      actorId,
      actorSlotId: options?.actorSlotId || null,
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
      actorRole?: UserRole,
    ): Promise<RequestStatus> {
      const hasActiveSlot = await hasActiveSlotAssignment(requesterId, txOrDb);
      if (!hasActiveSlot) {
        if (actorRole === "MANAGER" || actorRole === "HR") {
          return "PENDING_HR";
        }

        const [requester] = await txOrDb
          .select({ role: user.role })
          .from(user)
          .where(eq(user.id, requesterId))
          .limit(1);

        return requester?.role === "MANAGER" || requester?.role === "HR"
          ? "PENDING_HR"
          : "PENDING_MANAGER";
      }

      const routeKey = await getInitiatorRouteKey(requesterId, txOrDb);
      const sequence = getApprovalSequenceForInitiator(routeKey);
      return sequence[0] ?? "PENDING_HR";
    },

    async getNextApprover(requesterId: string): Promise<string | null> {
      const result = await db.execute(sql`
        WITH RECURSIVE manager_hierarchy AS (
          SELECT id, reports_to_manager_id, role
          FROM "user"
          WHERE id = ${requesterId}

          UNION ALL

          SELECT u.id, u.reports_to_manager_id, u.role
          FROM "user" u
          INNER JOIN manager_hierarchy mh ON u.id = mh.reports_to_manager_id
        )
        SELECT id, role
        FROM manager_hierarchy
        WHERE role IN ('MANAGER', 'HR', 'FINANCE', 'CEO')
        ORDER BY
          CASE role
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
      const stageSlotCode = getStageSlotCodeForStatus(status);

      if (stageSlotCode) {
        const slotResult = await queryDb.execute(sql`
          SELECT sa.user_id AS user_id
          FROM position_slot ps
          INNER JOIN slot_assignment sa ON sa.slot_id = ps.id
          WHERE ps.code = ${stageSlotCode}
            AND sa.ends_at IS NULL
          LIMIT 1
        `);
        const slotOccupant = slotResult.rows[0] as
          | { user_id?: string | null }
          | undefined;

        if (slotOccupant?.user_id) {
          return slotOccupant.user_id;
        }
      }

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
          .where(eq(user.role, "HR"))
          .limit(1);

        return hrUser?.id || null;
      }

      const [targetUser] = await queryDb
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, targetRole))
        .limit(1);

      return targetUser?.id || null;
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
      // Execute the entire transition within a database transaction
      // This ensures atomicity - all changes succeed or all fail together
      return await db.transaction(async (tx) => {
        // Get request and actor within transaction
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

        const actorRole = (actor.role || "REQUESTER") as UserRole;
        const currentStatus = request.status as RequestStatus;

        let newStatus: RequestStatus;

        const approverForCurrent = getApproverForStatus(currentStatus);
        if (
          approverForCurrent &&
          actorRole !== approverForCurrent &&
          action !== "REQUEST_CHANGE"
        ) {
          throw new AppError(
            "FORBIDDEN",
            "Not authorized for this action",
            403,
          );
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

        if (typeof transition === "function") {
          newStatus = transition(actorRole);
        } else {
          newStatus = transition;
        }

        // Update request status within transaction
        const nextApproverId = await this.getNextApproverIdForStatus(
          request.requesterId,
          newStatus,
          tx,
        );

        await tx
          .update(manpowerRequest)
          .set({
            status: newStatus,
            currentApproverId: nextApproverId,
            currentApproverRole: getApproverForStatus(newStatus),
            revisionVersion:
              newStatus === "DRAFT" && currentStatus !== "DRAFT"
                ? request.revisionVersion + 1
                : request.revisionVersion,
            updatedAt: new Date(),
          })
          .where(eq(manpowerRequest.id, requestId));

        // Create approval log within transaction
        const stepName =
          action === "SUBMIT" ? "Submission" : getStepName(currentStatus);
        await createApprovalLog(tx, requestId, actorId, action, stepName, {
          comment,
          ipAddress,
        });

        // Create audit log
        await createAuditLog(tx, requestId, actorId, action, {
          from: currentStatus,
          to: newStatus,
          comment,
        });

        // Archive version if reverting to DRAFT - within transaction
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
