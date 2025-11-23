import type { db as _db } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { ApprovalAction, RequestStatus, UserRole } from "../types";

/**
 * WorkflowService handles all workflow-related business logic
 * including approval chains, state transitions, and version management
 */
export class WorkflowService {
  /**
   * Get the next approver in the hierarchy for a given requester
   */
  static async getNextApprover(
    db: typeof _db,
    requesterId: string
  ): Promise<string | null> {
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
  }

  /**
   * Check if a workflow step should be skipped based on requester role
   */
  static shouldSkipStep(
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
  }

  /**
   * Create an approval log entry
   */
  static async createApprovalLog(
    db: typeof _db,
    requestId: string,
    actorId: string,
    action: ApprovalAction,
    stepName: string,
    options?: { comment?: string; ipAddress?: string }
  ): Promise<void> {
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
  }

  /**
   * Archive a version of the request
   */
  static async archiveVersion(
    db: typeof _db,
    requestId: string,
    versionNumber: number,
    snapshotData: Record<string, unknown>
  ): Promise<void> {
    await db.insert(requestVersion).values({
      id: uuidv4(),
      requestId,
      versionNumber,
      snapshotData,
      createdAt: new Date(),
    });
  }

  /**
   * Transition a request through the workflow state machine
   */
  static async transitionRequest(
    db: typeof _db,
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

    // Determine next status based on state machine
    const newStatus = WorkflowService.calculateNextStatus(
      currentStatus,
      action,
      actorRole
    );

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
      action === "SUBMIT"
        ? "Submission"
        : WorkflowService.getStepName(currentStatus);
    await WorkflowService.createApprovalLog(
      db,
      requestId,
      actorId,
      action,
      stepName,
      {
        comment,
        ipAddress,
      }
    );

    // Archive version if reverting to DRAFT
    if (newStatus === "DRAFT" && currentStatus !== "DRAFT") {
      await WorkflowService.archiveVersion(
        db,
        requestId,
        request.revisionVersion + 1,
        {
          status: currentStatus,
          positionDetails: request.positionDetails,
          budgetDetails: request.budgetDetails,
        }
      );
    }

    return newStatus;
  }

  /**
   * Calculate the next status based on current status and action
   */
  private static calculateNextStatus(
    currentStatus: RequestStatus,
    action: ApprovalAction,
    actorRole: UserRole
  ): RequestStatus {
    switch (currentStatus) {
      case "DRAFT":
        if (action === "SUBMIT") {
          return actorRole === "MANAGER" || actorRole === "HR"
            ? "PENDING_HR"
            : "PENDING_MANAGER";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      case "PENDING_MANAGER":
        if (action === "APPROVE") {
          return "PENDING_HR";
        }
        if (action === "REJECT") {
          return "REJECTED";
        }
        if (action === "REQUEST_CHANGE") {
          return "DRAFT";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      case "PENDING_HR":
        if (action === "APPROVE") {
          return "PENDING_FINANCE";
        }
        if (action === "REJECT") {
          return "REJECTED";
        }
        if (action === "HOLD") {
          return "PENDING_HR";
        }
        if (action === "REQUEST_CHANGE") {
          return "DRAFT";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      case "PENDING_FINANCE":
        if (action === "APPROVE") {
          return "PENDING_CEO";
        }
        if (action === "REJECT" || action === "REQUEST_CHANGE") {
          return "DRAFT";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      case "PENDING_CEO":
        if (action === "APPROVE") {
          return "APPROVED_OPEN";
        }
        if (action === "REJECT") {
          return "REJECTED";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      case "APPROVED_OPEN":
        if (action === "SUBMIT") {
          return "HIRING_IN_PROGRESS";
        }
        throw new Error(`Invalid action ${action} from ${currentStatus}`);

      default:
        throw new Error(`Invalid status ${currentStatus}`);
    }
  }

  /**
   * Get human-readable step name from status
   */
  private static getStepName(status: RequestStatus): string {
    const stepNames: Record<RequestStatus, string> = {
      DRAFT: "Draft",
      PENDING_MANAGER: "Manager Approval",
      PENDING_HR: "HR Review",
      PENDING_FINANCE: "Finance Approval",
      PENDING_CEO: "CEO Approval",
      APPROVED_OPEN: "Approved - Open",
      HIRING_IN_PROGRESS: "Hiring in Progress",
      REJECTED: "Rejected",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    };
    return stepNames[status] || status;
  }
}
