import type { DbOrTx, Transaction } from "@zenith-hr/db";
import { approvalLog } from "@zenith-hr/db/schema/approval-logs";
import { auditLog } from "@zenith-hr/db/schema/audit-logs";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import {
  jobPosition,
  userPositionAssignment,
} from "@zenith-hr/db/schema/position-slots";
import { requestVersion } from "@zenith-hr/db/schema/request-versions";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AppError } from "../../shared/errors";
import type {
  ApprovalAction,
  PositionRole,
  RequestStatus,
  UserRole,
} from "../../shared/types";
import { getActorPositionInfo } from "../../shared/utils";

/** RequestStatus + PENDING_HOD (trip-only); used by canActorTransition for both MPR and trips */
type TransitionStatus = RequestStatus | "PENDING_HOD";

// MPR routing matrix based on requester's PositionRole
const MPR_ROUTES: Record<
  PositionRole,
  {
    initialStatus: RequestStatus;
    sequence: RequestStatus[];
  }
> = {
  EMPLOYEE: {
    initialStatus: "PENDING_MANAGER",
    sequence: [
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
  MANAGER: {
    initialStatus: "PENDING_HR",
    sequence: [
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
  HOD: {
    initialStatus: "PENDING_HR",
    sequence: [
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
  HOD_HR: {
    initialStatus: "PENDING_FINANCE",
    sequence: [
      "PENDING_FINANCE",
      "PENDING_CEO",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
  HOD_FINANCE: {
    initialStatus: "PENDING_HR",
    sequence: ["PENDING_HR", "PENDING_CEO", "HIRING_IN_PROGRESS", "COMPLETED"],
  },
  HOD_IT: {
    initialStatus: "PENDING_HR",
    sequence: [
      "PENDING_HR",
      "PENDING_FINANCE",
      "PENDING_CEO",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
  CEO: {
    initialStatus: "PENDING_HR",
    sequence: [
      "PENDING_HR",
      "PENDING_FINANCE",
      "HIRING_IN_PROGRESS",
      "COMPLETED",
    ],
  },
};

// Shared role queues - these statuses can be handled by any user with matching role
const SHARED_ROLE_QUEUES: Record<string, PositionRole[]> = {
  PENDING_HR: ["HOD_HR"],
  PENDING_FINANCE: ["HOD_FINANCE"],
  PENDING_CEO: ["CEO"],
};

export const createWorkflowService = (db: DbOrTx) => {
  /**
   * Get manager chain using recursive CTE starting from a position
   * Returns positions ordered by depth (closest manager first)
   */
  const getManagerChain = async (
    startPositionId: string,
    txOrDb: DbOrTx = db,
  ): Promise<
    Array<{
      positionId: string;
      positionRole: PositionRole;
      depth: number;
    }>
  > => {
    const result = await txOrDb.execute(sql`
      WITH RECURSIVE manager_chain AS (
        -- Base case: start position
        SELECT 
          jp.id AS position_id,
          jp.role::text AS position_role,
          0 AS depth
        FROM job_position jp
        WHERE jp.id = ${startPositionId}
        
        UNION ALL
        
        -- Recursive case: walk up reports_to chain
        SELECT 
          parent_jp.id AS position_id,
          parent_jp.role::text AS position_role,
          mc.depth + 1 AS depth
        FROM manager_chain mc
        INNER JOIN job_position jp ON jp.id = mc.position_id
        INNER JOIN job_position parent_jp ON parent_jp.id = jp.reports_to_position_id
        WHERE jp.reports_to_position_id IS NOT NULL
      )
      SELECT 
        position_id,
        position_role,
        depth
      FROM manager_chain
      WHERE depth > 0  -- Exclude the starting position itself
      ORDER BY depth ASC
    `);

    return result.rows.map((row) => ({
      positionId: row.position_id as string,
      positionRole: row.position_role as PositionRole,
      depth: row.depth as number,
    }));
  };

  /**
   * Find executive positions (HOD_HR, HOD_FINANCE, CEO) in the chain
   */
  const findExecutivePositions = async (
    startPositionId: string,
    txOrDb: DbOrTx = db,
  ): Promise<
    Array<{
      positionId: string;
      positionRole: PositionRole;
    }>
  > => {
    const result = await txOrDb.execute(sql`
      WITH RECURSIVE manager_chain AS (
        SELECT 
          jp.id AS position_id,
          jp.role::text AS position_role,
          0 AS depth
        FROM job_position jp
        WHERE jp.id = ${startPositionId}
        
        UNION ALL
        
        SELECT 
          parent_jp.id AS position_id,
          parent_jp.role::text AS position_role,
          mc.depth + 1 AS depth
        FROM manager_chain mc
        INNER JOIN job_position jp ON jp.id = mc.position_id
        INNER JOIN job_position parent_jp ON parent_jp.id = jp.reports_to_position_id
        WHERE jp.reports_to_position_id IS NOT NULL
      )
      SELECT 
        position_id,
        position_role
      FROM manager_chain
      WHERE position_role IN ('HOD_HR', 'HOD_FINANCE', 'CEO')
      ORDER BY depth ASC
    `);

    return result.rows.map((row) => ({
      positionId: row.position_id as string,
      positionRole: row.position_role as PositionRole,
    }));
  };

  /**
   * Get role for a position (for requester skip logic in trip flow)
   */
  const getPositionRole = async (
    positionId: string,
    txOrDb: DbOrTx = db,
  ): Promise<PositionRole | null> => {
    const [row] = await txOrDb
      .select({ role: jobPosition.role })
      .from(jobPosition)
      .where(eq(jobPosition.id, positionId))
      .limit(1);
    return (row?.role as PositionRole) ?? null;
  };

  /**
   * Get users assigned to a position (for vacancy check)
   */
  const getPositionUsers = async (
    positionId: string,
    txOrDb: DbOrTx = db,
  ): Promise<Array<{ userId: string }>> => {
    const result = await txOrDb
      .select({ userId: userPositionAssignment.userId })
      .from(userPositionAssignment)
      .innerJoin(user, eq(userPositionAssignment.userId, user.id))
      .where(
        and(
          eq(userPositionAssignment.positionId, positionId),
          eq(user.status, "ACTIVE"),
        ),
      );

    return result.map((r) => ({ userId: r.userId }));
  };

  /**
   * Get next approver position for a given status based on requester's position
   */
  const getNextApproverPositionForStatus = async (
    requesterPositionId: string,
    status: RequestStatus,
    txOrDb: DbOrTx = db,
  ): Promise<{
    positionId: string | null;
    positionRole: PositionRole | null;
  }> => {
    // For shared role queues, find any position with matching role
    if (
      status === "PENDING_HR" ||
      status === "PENDING_FINANCE" ||
      status === "PENDING_CEO"
    ) {
      const targetRoles = SHARED_ROLE_QUEUES[status] || [];
      if (targetRoles.length === 0) {
        return { positionId: null, positionRole: null };
      }

      // Find first active position with matching role
      const [position] = await txOrDb
        .select({
          id: jobPosition.id,
          role: jobPosition.role,
        })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, targetRoles as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);

      if (position) {
        // Vacancy guard: check if position has assigned users
        const users = await getPositionUsers(position.id, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `Position ${position.id} (${position.role}) has no assigned users. Cannot route approval.`,
            500,
          );
        }
        return {
          positionId: null, // Shared queues don't assign to a specific positionId
          positionRole: position.role as PositionRole,
        };
      }

      throw new AppError(
        "CONFIGURATION_ERROR",
        `No active position found for ${status}. Please configure ${targetRoles.join(" or ")} positions.`,
        500,
      );
    }

    // For PENDING_MANAGER, walk up the manager chain
    if (status === "PENDING_MANAGER") {
      const chain = await getManagerChain(requesterPositionId, txOrDb);
      if (chain.length === 0) {
        // Fallback to HR if no manager chain
        const [hrPosition] = await txOrDb
          .select({ id: jobPosition.id, role: jobPosition.role })
          .from(jobPosition)
          .where(
            and(
              inArray(jobPosition.role, ["HOD_HR"] as PositionRole[]),
              eq(jobPosition.active, true),
            ),
          )
          .limit(1);

        if (hrPosition) {
          const users = await getPositionUsers(hrPosition.id, txOrDb);
          if (users.length === 0) {
            throw new AppError(
              "CONFIGURATION_ERROR",
              `HR position ${hrPosition.id} has no assigned users. Cannot route approval.`,
              500,
            );
          }
          return {
            positionId: hrPosition.id,
            positionRole: hrPosition.role as PositionRole,
          };
        }

        throw new AppError(
          "CONFIGURATION_ERROR",
          "No manager chain found and no HR position available. Cannot route approval.",
          500,
        );
      }

      // Use first manager in chain
      const firstManager = chain[0];
      if (!firstManager) {
        throw new AppError(
          "CONFIGURATION_ERROR",
          "Manager chain is empty",
          500,
        );
      }
      const users = await getPositionUsers(firstManager.positionId, txOrDb);
      if (users.length === 0) {
        throw new AppError(
          "CONFIGURATION_ERROR",
          `Manager position ${firstManager.positionId} has no assigned users. Cannot route approval.`,
          500,
        );
      }

      return {
        positionId: firstManager.positionId,
        positionRole: firstManager.positionRole,
      };
    }

    return { positionId: null, positionRole: null };
  };

  /**
   * Compute next step dynamically based on current status and action
   */
  const computeNextStep = async (
    requesterPositionId: string,
    requesterPositionRole: PositionRole,
    currentStatus: RequestStatus,
    action: ApprovalAction,
    txOrDb: DbOrTx = db,
  ): Promise<{
    nextStatus: RequestStatus;
    nextApproverPositionId: string | null;
    nextApproverRole: PositionRole | null;
  }> => {
    // Handle SUBMIT action
    if (action === "SUBMIT" && currentStatus === "DRAFT") {
      const route = MPR_ROUTES[requesterPositionRole] || MPR_ROUTES.EMPLOYEE;
      const nextStatus = route.initialStatus;
      const approver = await getNextApproverPositionForStatus(
        requesterPositionId,
        nextStatus,
        txOrDb,
      );
      return {
        nextStatus,
        nextApproverPositionId: approver.positionId,
        nextApproverRole: approver.positionRole,
      };
    }

    // Handle REJECT action
    if (action === "REJECT") {
      return {
        nextStatus: "REJECTED",
        nextApproverPositionId: null,
        nextApproverRole: null,
      };
    }

    // Handle REQUEST_CHANGE action
    if (action === "REQUEST_CHANGE") {
      return {
        nextStatus: "DRAFT",
        nextApproverPositionId: null,
        nextApproverRole: null,
      };
    }

    // Handle APPROVE action - walk through sequence
    if (action === "APPROVE") {
      const route = MPR_ROUTES[requesterPositionRole] || MPR_ROUTES.EMPLOYEE;
      const currentIndex = route.sequence.indexOf(currentStatus);

      if (currentIndex === -1) {
        // Status not in sequence, check terminal states
        if (currentStatus === "APPROVED_OPEN") {
          return {
            nextStatus: "HIRING_IN_PROGRESS",
            nextApproverPositionId: null,
            nextApproverRole: null,
          };
        }
        if (currentStatus === "HIRING_IN_PROGRESS") {
          return {
            nextStatus: "COMPLETED",
            nextApproverPositionId: null,
            nextApproverRole: null,
          };
        }

        throw new AppError(
          "BAD_REQUEST",
          `Invalid status ${currentStatus} for position role ${requesterPositionRole}`,
          400,
        );
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= route.sequence.length) {
        // Already at terminal state
        return {
          nextStatus: currentStatus,
          nextApproverPositionId: null,
          nextApproverRole: null,
        };
      }

      const nextStatus = route.sequence[nextIndex] || currentStatus;
      const approver = await getNextApproverPositionForStatus(
        requesterPositionId,
        nextStatus,
        txOrDb,
      );

      return {
        nextStatus,
        nextApproverPositionId: approver.positionId,
        nextApproverRole: approver.positionRole,
      };
    }

    // Handle HOLD action
    if (action === "HOLD") {
      return {
        nextStatus: currentStatus,
        nextApproverPositionId: null,
        nextApproverRole: null,
      };
    }

    throw new AppError(
      "BAD_REQUEST",
      `Unsupported action ${action} from status ${currentStatus}`,
      400,
    );
  };

  const HOD_ROLES: PositionRole[] = ["HOD_HR", "HOD_FINANCE", "HOD", "HOD_IT"];

  /** Roles that skip PENDING_MANAGER at DRAFT: HODs and CEO (executive chain only). */
  const SKIP_MANAGER_AT_DRAFT: PositionRole[] = [...HOD_ROLES, "CEO"];

  /**
   * Trip routing: walk up manager chain, then hit executive chain.
   * Skips PENDING_MANAGER for HOD and CEO requesters (they go via executive chain only).
   * - HOD_HR requester → HOD_FINANCE → CEO (HR skipped by maybeSkip).
   * - HOD_FINANCE requester → HOD_HR → CEO (Finance skipped by maybeSkip).
   * - CEO requester → HOD_HR → HOD_FINANCE (CEO step skipped by maybeSkip → APPROVED).
   * Skips any step where the approver role is the same as the requester's role (no self-approval).
   */
  const getNextTripApprover = async (
    requesterPositionId: string,
    currentStatus: string,
    txOrDb: DbOrTx = db,
  ): Promise<{
    approverPositionId: string | null;
    approverRole: PositionRole | null;
    nextStatus: string;
  }> => {
    const requesterPositionRole = await getPositionRole(
      requesterPositionId,
      txOrDb,
    );

    const maybeSkip = async (result: {
      approverPositionId: string | null;
      approverRole: PositionRole | null;
      nextStatus: string;
    }) => {
      if (
        requesterPositionRole &&
        result.approverRole === requesterPositionRole &&
        result.nextStatus !== "APPROVED"
      ) {
        return await getNextTripApprover(
          requesterPositionId,
          result.nextStatus,
          txOrDb,
        );
      }
      return result;
    };

    if (currentStatus === "DRAFT") {
      if (
        requesterPositionRole &&
        SKIP_MANAGER_AT_DRAFT.includes(requesterPositionRole)
      ) {
        return getNextTripApprover(
          requesterPositionId,
          "PENDING_MANAGER",
          txOrDb,
        );
      }
      // Start with manager chain
      const chain = await getManagerChain(requesterPositionId, txOrDb);
      if (chain.length > 0) {
        const firstManager = chain[0];
        if (!firstManager) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            "Manager chain is empty",
            500,
          );
        }
        const users = await getPositionUsers(firstManager.positionId, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `Manager position ${firstManager.positionId} has no assigned users. Cannot route trip approval.`,
            500,
          );
        }
        return maybeSkip({
          approverPositionId: firstManager.positionId,
          approverRole: firstManager.positionRole,
          nextStatus: "PENDING_MANAGER",
        });
      }

      // No manager chain, go to HR
      const [hrPosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, ["HOD_HR"] as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);

      if (hrPosition) {
        const users = await getPositionUsers(hrPosition.id, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `HR position ${hrPosition.id} has no assigned users. Cannot route trip approval.`,
            500,
          );
        }
        return maybeSkip({
          approverPositionId: null,
          approverRole: hrPosition.role as PositionRole,
          nextStatus: "PENDING_HR",
        });
      }

      throw new AppError(
        "CONFIGURATION_ERROR",
        "No manager or HR position available for trip approval.",
        500,
      );
    }

    if (currentStatus === "PENDING_MANAGER") {
      // After manager, check if there's an HOD or HOD_IT in the chain (use full chain, not just executives)
      const chain = await getManagerChain(requesterPositionId, txOrDb);
      const hodPosition = chain.find(
        (p) => p.positionRole === "HOD" || p.positionRole === "HOD_IT",
      );

      if (hodPosition) {
        const users = await getPositionUsers(hodPosition.positionId, txOrDb);
        if (users.length > 0) {
          return maybeSkip({
            approverPositionId: hodPosition.positionId,
            approverRole: hodPosition.positionRole,
            nextStatus: "PENDING_HOD",
          });
        }
      }

      // Go to HR
      const [hrPosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, ["HOD_HR"] as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);

      if (hrPosition) {
        const users = await getPositionUsers(hrPosition.id, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `HR position ${hrPosition.id} has no assigned users. Cannot route trip approval.`,
            500,
          );
        }
        return maybeSkip({
          approverPositionId: null,
          approverRole: hrPosition.role as PositionRole,
          nextStatus: "PENDING_HR",
        });
      }

      throw new AppError(
        "CONFIGURATION_ERROR",
        "No HR position available for trip approval.",
        500,
      );
    }

    if (currentStatus === "PENDING_HOD" || currentStatus === "PENDING_HR") {
      // Go to Finance
      const [financePosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, ["HOD_FINANCE"] as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);

      if (financePosition) {
        const users = await getPositionUsers(financePosition.id, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `Finance position ${financePosition.id} has no assigned users. Cannot route trip approval.`,
            500,
          );
        }
        return maybeSkip({
          approverPositionId: null,
          approverRole: financePosition.role as PositionRole,
          nextStatus: "PENDING_FINANCE",
        });
      }

      throw new AppError(
        "CONFIGURATION_ERROR",
        "No Finance position available for trip approval.",
        500,
      );
    }

    if (currentStatus === "PENDING_FINANCE") {
      // Go to CEO
      const [ceoPosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(and(eq(jobPosition.role, "CEO"), eq(jobPosition.active, true)))
        .limit(1);

      if (ceoPosition) {
        const users = await getPositionUsers(ceoPosition.id, txOrDb);
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `CEO position ${ceoPosition.id} has no assigned users. Cannot route trip approval.`,
            500,
          );
        }
        return maybeSkip({
          approverPositionId: null,
          approverRole: ceoPosition.role as PositionRole,
          nextStatus: "PENDING_CEO",
        });
      }

      throw new AppError(
        "CONFIGURATION_ERROR",
        "No CEO position available for trip approval.",
        500,
      );
    }

    if (currentStatus === "PENDING_CEO") {
      return {
        approverPositionId: null,
        approverRole: null,
        nextStatus: "APPROVED",
      };
    }

    throw new AppError(
      "BAD_REQUEST",
      `Invalid trip status ${currentStatus} for approval`,
      400,
    );
  };

  /**
   * Who can act at a given trip status (current approver for that step).
   * Use this when setting currentApproverPositionId/requiredApproverRole after a transition.
   */
  const getTripApproverForStatus = async (
    requesterPositionId: string,
    status: string,
    txOrDb: DbOrTx = db,
  ): Promise<{
    approverPositionId: string | null;
    approverRole: PositionRole | null;
  }> => {
    if (status === "PENDING_MANAGER") {
      const next = await getNextTripApprover(
        requesterPositionId,
        "DRAFT",
        txOrDb,
      );
      return {
        approverPositionId: next.approverPositionId,
        approverRole: next.approverRole,
      };
    }
    if (status === "PENDING_HOD") {
      const chain = await getManagerChain(requesterPositionId, txOrDb);
      const hodPosition = chain.find(
        (p) => p.positionRole === "HOD" || p.positionRole === "HOD_IT",
      );
      if (hodPosition) {
        const users = await getPositionUsers(hodPosition.positionId, txOrDb);
        if (users.length > 0) {
          return {
            approverPositionId: hodPosition.positionId,
            approverRole: hodPosition.positionRole,
          };
        }
      }
      return { approverPositionId: null, approverRole: null };
    }
    if (status === "PENDING_HR") {
      const [hrPosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, ["HOD_HR"] as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);
      if (hrPosition) {
        const users = await getPositionUsers(hrPosition.id, txOrDb);
        if (users.length > 0) {
          return {
            approverPositionId: null,
            approverRole: hrPosition.role as PositionRole,
          };
        }
      }
      return { approverPositionId: null, approverRole: null };
    }
    if (status === "PENDING_FINANCE") {
      const [financePosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(
          and(
            inArray(jobPosition.role, ["HOD_FINANCE"] as PositionRole[]),
            eq(jobPosition.active, true),
          ),
        )
        .limit(1);
      if (financePosition) {
        const users = await getPositionUsers(financePosition.id, txOrDb);
        if (users.length > 0) {
          return {
            approverPositionId: null,
            approverRole: financePosition.role as PositionRole,
          };
        }
      }
      return { approverPositionId: null, approverRole: null };
    }
    if (status === "PENDING_CEO") {
      const [ceoPosition] = await txOrDb
        .select({ id: jobPosition.id, role: jobPosition.role })
        .from(jobPosition)
        .where(and(eq(jobPosition.role, "CEO"), eq(jobPosition.active, true)))
        .limit(1);
      if (ceoPosition) {
        const users = await getPositionUsers(ceoPosition.id, txOrDb);
        if (users.length > 0) {
          return {
            approverPositionId: null,
            approverRole: ceoPosition.role as PositionRole,
          };
        }
      }
      return { approverPositionId: null, approverRole: null };
    }
    return { approverPositionId: null, approverRole: null };
  };

  /**
   * Check if actor can perform action on request (position-based auth)
   */
  const canActorTransition = async (
    actorId: string,
    currentApproverPositionId: string | null,
    requiredApproverRole: PositionRole | null,
    currentStatus: TransitionStatus,
    _action: ApprovalAction,
    txOrDb: DbOrTx = db,
  ): Promise<boolean> => {
    // Get actor's position info
    const actorPosInfo = await getActorPositionInfo(txOrDb, actorId);
    if (!actorPosInfo) {
      return false;
    }

    const actorPositionRole = actorPosInfo.positionRole as PositionRole;
    const actorSystemRole = (
      await txOrDb
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, actorId))
        .limit(1)
    )[0]?.role as UserRole;

    // ADMIN override
    if (actorSystemRole === "ADMIN") {
      return true;
    }

    // HOD_HR override for HR-related statuses
    if (
      actorPositionRole === "HOD_HR" &&
      (currentStatus === "PENDING_HR" || currentStatus === "HIRING_IN_PROGRESS")
    ) {
      return true;
    }

    // Check if actor's position matches current approver position
    if (
      currentApproverPositionId &&
      actorPosInfo.positionId === currentApproverPositionId
    ) {
      return true;
    }

    // Check shared role queue access
    if (
      (currentStatus === "PENDING_HR" &&
        (actorPositionRole === "HOD" || actorPositionRole === "HOD_HR")) ||
      (currentStatus === "PENDING_FINANCE" &&
        actorPositionRole === "HOD_FINANCE") ||
      (currentStatus === "PENDING_CEO" && actorPositionRole === "CEO")
    ) {
      return true;
    }

    // Check required role match
    if (requiredApproverRole && actorPositionRole === requiredApproverRole) {
      return true;
    }

    return false;
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

  /**
   * Get initial status for requester based on their position role
   */
  const getInitialStatusForRequester = async (
    requesterId: string,
    txOrDb: DbOrTx = db,
  ): Promise<RequestStatus> => {
    const posInfo = await getActorPositionInfo(txOrDb, requesterId);
    if (!posInfo) {
      // No position assignment, default to PENDING_HR
      return "PENDING_HR";
    }

    const route =
      MPR_ROUTES[posInfo.positionRole as PositionRole] || MPR_ROUTES.EMPLOYEE;
    return route.initialStatus;
  };

  /**
   * Transition MPR request
   */
  const transitionRequest = async (
    requestId: string,
    actorId: string,
    action: ApprovalAction,
    comment?: string,
    ipAddress?: string,
  ): Promise<{
    previousStatus: RequestStatus;
    newStatus: RequestStatus;
  }> => {
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

      const actorPosInfo = await getActorPositionInfo(tx, actorId);
      if (!actorPosInfo) {
        throw new AppError(
          "FORBIDDEN",
          "Actor has no position assignment",
          403,
        );
      }

      const requesterPosInfo = await getActorPositionInfo(
        tx,
        request.requesterId,
      );
      if (!requesterPosInfo) {
        throw new AppError(
          "CONFIGURATION_ERROR",
          "Requester has no position assignment",
          500,
        );
      }

      const currentStatus = request.status as RequestStatus;

      // Auth check
      if (currentStatus === "DRAFT" && action === "SUBMIT") {
        if (request.requesterId !== actorId) {
          throw new AppError("FORBIDDEN", "Only requester can submit", 403);
        }
      } else {
        const canTransition = await canActorTransition(
          actorId,
          request.currentApproverPositionId,
          request.requiredApproverRole as PositionRole | null,
          currentStatus,
          action,
          tx,
        );

        if (!canTransition) {
          throw new AppError(
            "FORBIDDEN",
            "Not authorized for this action",
            403,
          );
        }
      }

      // Vacancy guard: check if current approver position has users
      if (request.currentApproverPositionId) {
        const users = await getPositionUsers(
          request.currentApproverPositionId,
          tx,
        );
        if (users.length === 0) {
          throw new AppError(
            "CONFIGURATION_ERROR",
            `Current approver position ${request.currentApproverPositionId} has no assigned users. Cannot proceed.`,
            500,
          );
        }
      }

      // Compute next step
      const nextStep = await computeNextStep(
        requesterPosInfo.positionId,
        requesterPosInfo.positionRole as PositionRole,
        currentStatus,
        action,
        tx,
      );

      await tx
        .update(manpowerRequest)
        .set({
          status: nextStep.nextStatus,
          currentApproverPositionId: nextStep.nextApproverPositionId,
          requiredApproverRole: nextStep.nextApproverRole,
          revisionVersion:
            nextStep.nextStatus === "DRAFT" && currentStatus !== "DRAFT"
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
        actorPositionId: actorPosInfo.positionId,
      });

      await createAuditLog(tx, requestId, actorId, action, {
        from: currentStatus,
        to: nextStep.nextStatus,
        comment,
      });

      if (nextStep.nextStatus === "DRAFT" && currentStatus !== "DRAFT") {
        await archiveVersion(tx, requestId, request.revisionVersion + 1, {
          status: currentStatus,
          positionDetails: request.positionDetails,
          budgetDetails: request.budgetDetails,
        });
      }

      return {
        previousStatus: currentStatus,
        newStatus: nextStep.nextStatus,
      };
    });
  };

  return {
    // Core workflow functions
    computeNextStep,
    getManagerChain,
    getNextApproverPositionForStatus,
    getInitialStatusForRequester,
    canActorTransition,
    transitionRequest,

    // Trip-specific helpers
    getNextTripApprover,
    getTripApproverForStatus,
    findExecutivePositions,

    // Legacy helpers (for backward compatibility)
    getApproverForStatus: (status: RequestStatus): PositionRole | null => {
      const mapping: Partial<Record<RequestStatus, PositionRole>> = {
        PENDING_MANAGER: "MANAGER",
        PENDING_HR: "HOD_HR",
        PENDING_FINANCE: "HOD_FINANCE",
        PENDING_CEO: "CEO",
      };
      return mapping[status] ?? null;
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
