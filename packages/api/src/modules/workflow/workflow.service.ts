import type { db as _db } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type {
  ApprovalAction,
  RequestStatus,
  UserRole,
} from "../../shared/types";

export const createWorkflowService = (db: typeof _db) => {
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
    };
    return stepMap[status] || status;
  };

  const createApprovalLog = async (
    requestId: string,
    actorId: string,
    action: ApprovalAction,
    stepName: string,
    options?: { comment?: string; ipAddress?: string }
  ): Promise<void> => {
    await db.insert(approvalLog).values({
      id: uuidv4(),
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
    requestId: string,
    versionNumber: number,
    snapshotData: Record<string, unknown>
  ): Promise<void> => {
    await db.insert(requestVersion).values({
      id: uuidv4(),
      requestId,
      versionNumber,
      snapshotData,
      createdAt: new Date(),
    });
  };

  return {
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
      currentStatus: RequestStatus
    ): boolean {
      if (requesterRole === "MANAGER" && currentStatus === "PENDING_MANAGER") {
        return true;
      }
      if (requesterRole === "HR" && currentStatus === "PENDING_HR") {
        return true;
      }
      return false;
    },

    async transitionRequest(
      requestId: string,
      actorId: string,
      action: ApprovalAction,
      comment?: string,
      ipAddress?: string
    ): Promise<RequestStatus> {
      // Get request and actor
      const [request] = await db
        .select()
        .from(manpowerRequest)
        .where(eq(manpowerRequest.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error("Request not found");
      }

      const [actor] = await db
        .select()
        .from(user)
        .where(eq(user.id, actorId))
        .limit(1);

      if (!actor) {
        throw new Error("Actor not found");
      }

      const actorRole = (actor.role || "REQUESTER") as UserRole;
      const currentStatus = request.status as RequestStatus;

      let newStatus: RequestStatus;

      switch (currentStatus) {
        case "DRAFT":
          if (action === "SUBMIT") {
            newStatus =
              actorRole === "MANAGER" || actorRole === "HR"
                ? "PENDING_HR"
                : "PENDING_MANAGER";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        case "PENDING_MANAGER":
          if (action === "APPROVE") {
            newStatus = "PENDING_HR";
          } else if (action === "REJECT") {
            newStatus = "REJECTED";
          } else if (action === "REQUEST_CHANGE") {
            newStatus = "DRAFT";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        case "PENDING_HR":
          if (action === "APPROVE") {
            newStatus = "PENDING_FINANCE";
          } else if (action === "REJECT") {
            newStatus = "REJECTED";
          } else if (action === "HOLD") {
            newStatus = "PENDING_HR";
          } else if (action === "REQUEST_CHANGE") {
            newStatus = "DRAFT";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        case "PENDING_FINANCE":
          if (action === "APPROVE") {
            newStatus = "PENDING_CEO";
          } else if (action === "REJECT" || action === "REQUEST_CHANGE") {
            newStatus = "DRAFT";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        case "PENDING_CEO":
          if (action === "APPROVE") {
            newStatus = "APPROVED_OPEN";
          } else if (action === "REJECT") {
            newStatus = "REJECTED";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        case "APPROVED_OPEN":
          if (action === "SUBMIT") {
            newStatus = "HIRING_IN_PROGRESS";
          } else {
            throw new Error(`Invalid action ${action} from ${currentStatus}`);
          }
          break;
        default:
          throw new Error(`Invalid status ${currentStatus}`);
      }

      // Update request status
      await db
        .update(manpowerRequest)
        .set({
          status: newStatus,
          revisionVersion:
            newStatus === "DRAFT" && currentStatus !== "DRAFT"
              ? request.revisionVersion + 1
              : request.revisionVersion,
          updatedAt: new Date(),
        })
        .where(eq(manpowerRequest.id, requestId));

      // Create approval log
      const stepName =
        action === "SUBMIT" ? "Submission" : getStepName(currentStatus);
      await createApprovalLog(requestId, actorId, action, stepName, {
        comment,
        ipAddress,
      });

      // Archive version if reverting to DRAFT
      if (newStatus === "DRAFT" && currentStatus !== "DRAFT") {
        await archiveVersion(requestId, request.revisionVersion + 1, {
          status: currentStatus,
          positionDetails: request.positionDetails,
          budgetDetails: request.budgetDetails,
        });
      }

      return newStatus;
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
        .select()
        .from(approvalLog)
        .where(eq(approvalLog.requestId, id))
        .orderBy(approvalLog.performedAt);
    },
  };
};

export type WorkflowService = ReturnType<typeof createWorkflowService>;
