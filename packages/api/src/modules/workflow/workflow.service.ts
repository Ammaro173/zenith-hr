import type { DbOrTx, Transaction } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { eq, sql } from "drizzle-orm";
import { AppError } from "../../shared/errors";
import type {
  ApprovalAction,
  RequestStatus,
  UserRole,
} from "../../shared/types";

type TransitionResult = RequestStatus;
type TransitionFn = (actorRole: UserRole) => TransitionResult;
type TransitionTarget = TransitionResult | TransitionFn;

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

  // Helper functions now accept a transaction context
  const createApprovalLog = async (
    tx: Transaction,
    requestId: string,
    actorId: string,
    action: ApprovalAction,
    stepName: string,
    options?: { comment?: string; ipAddress?: string },
  ): Promise<void> => {
    await tx.insert(approvalLog).values({
      requestId,
      actorId,
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

  const getApproverForStatus = (status: RequestStatus): UserRole | null => {
    const mapping: Partial<Record<RequestStatus, UserRole>> = {
      PENDING_MANAGER: "MANAGER",
      PENDING_HR: "HR",
      PENDING_FINANCE: "FINANCE",
      PENDING_CEO: "CEO",
    };
    return mapping[status] ?? null;
  };

  return {
    getApproverForStatus,
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
      const targetRole = getApproverForStatus(status);
      if (!targetRole) {
        return null;
      }

      // For manager review, try to find direct manager first
      if (status === "PENDING_MANAGER") {
        const managerId = await this.getNextApprover(requesterId);
        if (managerId) {
          return managerId;
        }

        // If no manager found, fall through to finding anyone with HR role as per user request
        const [hrUser] = await queryDb
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "HR"))
          .limit(1);
        return hrUser?.id || null;
      }

      // For other roles, find the first user with that role
      // (Simplified logic - could be enhanced to use department heads)
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
