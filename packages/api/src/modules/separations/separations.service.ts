import {
  auditLog,
  type DbOrTx,
  jobPosition,
  notificationOutbox,
  separationChecklist,
  separationChecklistTemplate,
  separationDocument,
  separationRequest,
  user,
  userClearanceLane,
  userPositionAssignment,
} from "@zenith-hr/db";
import { department } from "@zenith-hr/db/schema/departments";
import { and, asc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import type { StorageService } from "../../infrastructure/interfaces";
import { AppError } from "../../shared/errors";
import {
  getActor,
  getActorPositionInfo,
  getActorRole,
  isHODFamily,
} from "../../shared/utils";
import type { NotificationsService } from "../notifications/notifications.service";
import {
  type addChecklistItemSchema,
  type approveByHrSchema,
  type approveByManagerSchema,
  type createSeparationSchema,
  elevatedSeparationTypes,
  type getSeparationDocumentDownloadUrlSchema,
  type listEligibleSeparationSubjectsSchema,
  type rejectByHrSchema,
  type rejectByManagerSchema,
  type reorderChecklistItemsSchema,
  type sendClearanceReminderSchema,
  type startClearanceSchema,
  type updateChecklistSchema,
  type updateSeparationSchema,
  type uploadSeparationDocumentSchema,
} from "./separations.schema";

type Lane =
  | "OPERATIONS"
  | "HOD_IT"
  | "HOD_FINANCE"
  | "ADMIN_ASSETS"
  | "INSURANCE"
  | "USED_CARS"
  | "HR_PAYROLL";

type ChecklistStatus = "PENDING" | "CLEARED" | "REJECTED";

const ALL_CLEARANCE_LANES: Lane[] = [
  "OPERATIONS",
  "HOD_IT",
  "HOD_FINANCE",
  "ADMIN_ASSETS",
  "INSURANCE",
  "USED_CARS",
  "HR_PAYROLL",
];

const LANE_LABELS: Record<Lane, string> = {
  OPERATIONS: "Operations",
  HOD_IT: "HOD IT",
  HOD_FINANCE: "HOD Finance",
  ADMIN_ASSETS: "Admin/Assets",
  INSURANCE: "Insurance",
  USED_CARS: "Used Cars",
  HR_PAYROLL: "HR/Payroll",
};

const CLEARANCE_VIEW_STATUSES = ["CLEARANCE_IN_PROGRESS", "COMPLETED"] as const;

type LaneFallbackRole = "HOD_IT" | "HOD_FINANCE" | "ADMIN" | "HOD_HR";

interface ReminderRecipient {
  email: string | null;
  userId: string;
}

/** Mirrors `approveByManager` / `rejectByManager` role gate (position-derived role). */
const MANAGER_APPROVER_ROLES = [
  "MANAGER",
  "HOD",
  "HOD_IT",
  "HOD_FINANCE",
  "CEO",
  "HOD_HR",
  "ADMIN",
] as const;

/** For manager approval escalation: non-manager roles skip chain-of-command. */
const MANAGER_APPROVER_ROLES_EXCLUDING_LINE_MANAGER = (
  MANAGER_APPROVER_ROLES as readonly string[]
).filter((r) => r !== "MANAGER") as readonly string[];

/** May initiate a separation on behalf of any active user. */
const FULL_SUBJECT_ACCESS_ROLES: readonly string[] = ["ADMIN", "HOD_HR", "CEO"];

/** Sees all separation rows in list/get (aligned with broad org duties). */
const SEPARATION_ORG_WIDE_VIEW_ROLES: readonly string[] = [
  "ADMIN",
  "HOD_HR",
  "CEO",
];

export interface SeparationViewerFlags {
  canAddClearanceItems: boolean;
  canApproveAsHr: boolean;
  canApproveAsManager: boolean;
  canRejectAsHr: boolean;
  canRejectAsManager: boolean;
  /** Lanes this viewer may act on for checklist updates (matches `updateChecklist` / position + `user_clearance_lane`). */
  clearanceActLanes: Lane[];
}

function sanitizeFileName(fileName: string): string {
  return fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

export const createSeparationsService = (
  db: DbOrTx,
  storage: StorageService,
  notificationsService?: Pick<NotificationsService, "createNotification">,
) => {
  const notifications: Pick<NotificationsService, "createNotification"> =
    notificationsService ?? {
      createNotification: async (
        _userId: string,
        _title: string,
        _body: string,
        _type?: "INFO" | "ACTION_REQUIRED" | "REMINDER",
        _link?: string,
        _email?: string,
      ) =>
        undefined as unknown as Awaited<
          ReturnType<NotificationsService["createNotification"]>
        >,
    };

  const getRoleDefaultLanes = (role: string): Lane[] => {
    if (role === "HOD_HR") {
      return ["HR_PAYROLL"];
    }
    if (role === "HOD_IT") {
      return ["HOD_IT"];
    }
    if (role === "HOD_FINANCE") {
      return ["HOD_FINANCE"];
    }
    if (role === "ADMIN") {
      return ["ADMIN_ASSETS"];
    }
    return [];
  };

  const getFallbackRoleForLane = (lane: Lane): LaneFallbackRole | null => {
    if (lane === "HOD_IT") {
      return "HOD_IT";
    }
    if (lane === "HOD_FINANCE") {
      return "HOD_FINANCE";
    }
    if (lane === "ADMIN_ASSETS") {
      return "ADMIN";
    }
    if (lane === "HR_PAYROLL") {
      return "HOD_HR";
    }
    return null;
  };

  const getLaneReminderRecipients = async (
    lane: Lane,
  ): Promise<ReminderRecipient[]> => {
    const memberships = await db
      .select({ email: user.email, userId: user.id })
      .from(userClearanceLane)
      .innerJoin(user, eq(userClearanceLane.userId, user.id))
      .where(and(eq(userClearanceLane.lane, lane), eq(user.status, "ACTIVE")));

    if (memberships.length > 0) {
      return memberships;
    }

    const fallbackRole = getFallbackRoleForLane(lane);
    if (!fallbackRole) {
      return [];
    }

    return await db
      .select({ email: user.email, userId: user.id })
      .from(user)
      .where(and(eq(user.role, fallbackRole), eq(user.status, "ACTIVE")))
      .limit(100);
  };

  const getUserLanes = async (
    userId: string,
    role: string,
  ): Promise<Lane[]> => {
    // Lane memberships (supports lanes beyond global roles).
    const memberships = await db
      .select({ lane: userClearanceLane.lane })
      .from(userClearanceLane)
      .where(eq(userClearanceLane.userId, userId));

    const fromDb = memberships
      .map((m) => m.lane as Lane)
      .filter((lane) => lane !== undefined);

    const merged = new Set<Lane>([...fromDb, ...getRoleDefaultLanes(role)]);
    return Array.from(merged);
  };

  const getEffectivePositionId = async (
    txOrDb: DbOrTx,
    userId: string,
  ): Promise<string | null> => {
    const info = await getActorPositionInfo(txOrDb, userId);
    return info?.positionId ?? null;
  };

  const getParentPositionId = async (
    txOrDb: DbOrTx,
    childPositionId: string,
  ): Promise<string | null> => {
    const parent = await txOrDb.execute(sql`
      SELECT reports_to_position_id AS parent_position_id
      FROM job_position
      WHERE id = ${childPositionId}
      LIMIT 1
    `);

    const row = parent.rows[0] as { parent_position_id?: string | null };
    return row?.parent_position_id ?? null;
  };

  const getActivePositionOccupant = async (
    txOrDb: DbOrTx,
    positionId: string,
  ): Promise<string | null> => {
    const [occupant] = await txOrDb
      .select({ userId: userPositionAssignment.userId })
      .from(userPositionAssignment)
      .where(eq(userPositionAssignment.positionId, positionId))
      .limit(1);

    return occupant?.userId ?? null;
  };

  const enqueueOutbox = async (
    txOrDb: DbOrTx,
    payload: {
      idempotencyKey: string;
      userId: string;
      type: "INFO" | "ACTION_REQUIRED" | "REMINDER";
      title: string;
      body: string;
      link?: string;
    },
  ) => {
    await txOrDb
      .insert(notificationOutbox)
      .values({
        idempotencyKey: payload.idempotencyKey,
        userId: payload.userId,
        payload: {
          type: payload.type,
          title: payload.title,
          body: payload.body,
          link: payload.link ?? null,
        },
        status: "PENDING",
        nextAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  };

  const resolveClearanceActLanes = async (
    actorId: string,
    actorRole: string,
  ): Promise<Lane[]> => {
    const isPrivileged =
      actorRole === "HOD_HR" || actorRole === "ADMIN" || actorRole === "CEO";
    if (isPrivileged) {
      return [...ALL_CLEARANCE_LANES];
    }
    return await getUserLanes(actorId, actorRole);
  };

  const actorHasChecklistInAllowedLanes = async (
    separationId: string,
    allowedLanes: Lane[],
  ): Promise<boolean> => {
    if (allowedLanes.length === 0) {
      return false;
    }
    const [row] = await db
      .select({ id: separationChecklist.id })
      .from(separationChecklist)
      .where(
        and(
          eq(separationChecklist.separationId, separationId),
          inArray(separationChecklist.lane, allowedLanes),
        ),
      )
      .limit(1);
    return row !== undefined;
  };

  const getClearanceParticipationSeparationIds = async (
    actorId: string,
    actorRole: string,
  ): Promise<string[]> => {
    const lanes = await resolveClearanceActLanes(actorId, actorRole);
    if (lanes.length === 0) {
      return [];
    }
    const rows = await db
      .select({ separationId: separationChecklist.separationId })
      .from(separationChecklist)
      .innerJoin(
        separationRequest,
        eq(separationChecklist.separationId, separationRequest.id),
      )
      .where(
        and(
          inArray(separationChecklist.lane, lanes),
          inArray(separationRequest.status, [...CLEARANCE_VIEW_STATUSES]),
        ),
      );
    return [...new Set(rows.map((r) => r.separationId))];
  };

  const separationWasInitiatedByActor = async (
    separationId: string,
    actorId: string,
  ): Promise<boolean> => {
    const [row] = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityId, separationId),
          eq(auditLog.entityType, "SEPARATION"),
          eq(auditLog.action, "CREATE_REQUEST"),
          eq(auditLog.performedBy, actorId),
        ),
      )
      .limit(1);
    return row != null;
  };

  const ensureRequestVisibleToActor = async (
    separationId: string,
    actorId: string,
  ) => {
    const request = await db.query.separationRequest.findFirst({
      where: eq(separationRequest.id, separationId),
      with: { employee: true },
    });
    if (!request) {
      throw AppError.notFound("Separation request not found");
    }

    const actorRole = await getActorRole(db, actorId);
    if (SEPARATION_ORG_WIDE_VIEW_ROLES.includes(actorRole)) {
      return { request, actorRole };
    }
    if (request.employeeId === actorId) {
      return { request, actorRole };
    }
    if (request.managerPositionId) {
      const slotOccupant = await getActivePositionOccupant(
        db,
        request.managerPositionId,
      );
      if (slotOccupant === actorId) {
        return { request, actorRole };
      }
    }
    if (
      (CLEARANCE_VIEW_STATUSES as readonly string[]).includes(request.status)
    ) {
      const lanes = await resolveClearanceActLanes(actorId, actorRole);
      if (await actorHasChecklistInAllowedLanes(separationId, lanes)) {
        return { request, actorRole };
      }
    }
    if (await separationWasInitiatedByActor(separationId, actorId)) {
      return { request, actorRole };
    }
    throw new AppError("FORBIDDEN", "Not authorized to access separation", 403);
  };

  const computeViewerApprovalFlags = async (
    separation: {
      status: string;
      managerPositionId: string | null;
    },
    actorId: string,
    actorRole: string,
  ): Promise<SeparationViewerFlags> => {
    const isDirectManager = separation.managerPositionId
      ? (await getActivePositionOccupant(db, separation.managerPositionId)) ===
        actorId
      : false;
    const hrOrAdminOverride = actorRole === "HOD_HR" || actorRole === "ADMIN";
    const roleAllowsManagerApproval = (
      MANAGER_APPROVER_ROLES as readonly string[]
    ).includes(actorRole);

    const canActAsManager =
      separation.status === "PENDING_MANAGER" &&
      roleAllowsManagerApproval &&
      (isDirectManager || hrOrAdminOverride);

    const canApproveAsHr =
      hrOrAdminOverride &&
      (separation.status === "PENDING_HR" ||
        separation.status === "PENDING_MANAGER" ||
        separation.status === "REQUESTED");

    const canRejectAsHr =
      hrOrAdminOverride && separation.status === "PENDING_HR";

    const clearanceActLanes = await resolveClearanceActLanes(
      actorId,
      actorRole,
    );

    return {
      canApproveAsManager: canActAsManager,
      canRejectAsManager: canActAsManager,
      canApproveAsHr,
      canRejectAsHr,
      clearanceActLanes,
      canAddClearanceItems: hrOrAdminOverride,
    };
  };

  const getSubordinateUserIds = async (
    txOrDb: DbOrTx,
    managerId: string,
  ): Promise<string[]> => {
    const managerPositionId = await getEffectivePositionId(txOrDb, managerId);
    if (!managerPositionId) {
      return [];
    }

    const result = await txOrDb.execute(sql`
      WITH RECURSIVE subordinate_positions AS (
        SELECT id AS position_id
        FROM job_position
        WHERE reports_to_position_id = ${managerPositionId}

        UNION ALL

        SELECT jp.id AS position_id
        FROM job_position jp
        INNER JOIN subordinate_positions sp ON jp.reports_to_position_id = sp.position_id
      )
      SELECT upa.user_id AS id
      FROM subordinate_positions sp
      INNER JOIN user_position_assignment upa ON upa.position_id = sp.position_id
    `);

    return (result.rows as Array<{ id: string }>).map((row) => row.id);
  };

  const getActorPositionDepartmentIds = async (
    txOrDb: DbOrTx,
    forUserId: string,
  ): Promise<string[]> => {
    const rows = await txOrDb
      .select({ departmentId: jobPosition.departmentId })
      .from(userPositionAssignment)
      .innerJoin(
        jobPosition,
        eq(userPositionAssignment.positionId, jobPosition.id),
      )
      .where(eq(userPositionAssignment.userId, forUserId));

    const ids = rows
      .map((r) => r.departmentId)
      .filter((id): id is string => id != null);
    return [...new Set(ids)];
  };

  const actorMayCreateForSubject = async (
    txOrDb: DbOrTx,
    actorId: string,
    subjectUserId: string,
    actorRole: string,
  ): Promise<boolean> => {
    if (subjectUserId === actorId) {
      return true;
    }
    if (FULL_SUBJECT_ACCESS_ROLES.includes(actorRole)) {
      return true;
    }
    if (actorRole === "EMPLOYEE") {
      return false;
    }

    const subordinateIds = await getSubordinateUserIds(txOrDb, actorId);
    if (subordinateIds.includes(subjectUserId)) {
      return true;
    }

    if (isHODFamily(actorRole)) {
      const actorDeptIds = await getActorPositionDepartmentIds(txOrDb, actorId);
      if (actorDeptIds.length === 0) {
        return false;
      }
      const subjectDeptIds = await getActorPositionDepartmentIds(
        txOrDb,
        subjectUserId,
      );
      return subjectDeptIds.some((d) => actorDeptIds.includes(d));
    }

    return false;
  };

  const assertActorMayCreateForSubject = async (
    txOrDb: DbOrTx,
    actorId: string,
    subjectUserId: string,
    actorRole: string,
  ) => {
    const allowed = await actorMayCreateForSubject(
      txOrDb,
      actorId,
      subjectUserId,
      actorRole,
    );
    if (!allowed) {
      throw new AppError(
        "FORBIDDEN",
        "Not authorized to submit a separation for this employee",
        403,
      );
    }
  };

  const collectEligibleSubjectUserIds = async (
    actorId: string,
    actorRole: string,
  ): Promise<{ mode: "all" } | { mode: "restricted"; ids: string[] }> => {
    if (FULL_SUBJECT_ACCESS_ROLES.includes(actorRole)) {
      return { mode: "all" };
    }
    if (actorRole === "EMPLOYEE") {
      return { mode: "restricted", ids: [actorId] };
    }

    const subordinateIds = await getSubordinateUserIds(db, actorId);
    const ids = new Set<string>([actorId, ...subordinateIds]);

    if (isHODFamily(actorRole)) {
      const deptIds = await getActorPositionDepartmentIds(db, actorId);
      if (deptIds.length > 0) {
        const positionScoped = await db
          .select({ id: user.id })
          .from(user)
          .innerJoin(
            userPositionAssignment,
            eq(userPositionAssignment.userId, user.id),
          )
          .innerJoin(
            jobPosition,
            eq(userPositionAssignment.positionId, jobPosition.id),
          )
          .where(
            and(
              eq(user.status, "ACTIVE"),
              inArray(jobPosition.departmentId, deptIds),
            ),
          );
        for (const row of positionScoped) {
          ids.add(row.id);
        }
      }
    }

    return { mode: "restricted", ids: Array.from(ids) };
  };

  return {
    async listEligibleSubjects(
      actorId: string,
      input: z.infer<typeof listEligibleSeparationSubjectsSchema>,
    ) {
      const actorRole = await getActorRole(db, actorId);
      const limit = input.limit ?? 50;
      const q = (input.query ?? "").trim();

      const scope = await collectEligibleSubjectUserIds(actorId, actorRole);
      if (scope.mode === "restricted" && scope.ids.length === 0) {
        return [];
      }

      const filters: SQL[] = [eq(user.status, "ACTIVE")];
      if (scope.mode === "restricted") {
        filters.push(inArray(user.id, scope.ids));
      }
      if (q.length > 0) {
        const searchOr = or(
          ilike(user.name, `%${q}%`),
          ilike(user.email, `%${q}%`),
          ilike(user.sapNo, `%${q}%`),
        );
        if (searchOr) {
          filters.push(searchOr);
        }
      }

      return await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          sapNo: user.sapNo,
          departmentName: department.name,
        })
        .from(user)
        .leftJoin(department, eq(user.departmentId, department.id))
        .where(and(...filters))
        .orderBy(asc(user.name))
        .limit(limit);
    },

    async create(
      input: z.infer<typeof createSeparationSchema>,
      actorId: string,
    ) {
      const actor = await getActor(db, actorId);
      if (!actor) {
        throw AppError.notFound("User not found");
      }
      const requesterRole = actor.role;

      if (
        (elevatedSeparationTypes as readonly string[]).includes(input.type) &&
        requesterRole === "EMPLOYEE"
      ) {
        throw new AppError(
          "FORBIDDEN",
          "Termination and end-of-contract requests must be submitted by a manager or HR",
          403,
        );
      }

      return await db.transaction(async (tx) => {
        const subjectUserId = input.subjectUserId ?? actorId;

        const [subjectRow] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, subjectUserId))
          .limit(1);
        if (!subjectRow) {
          throw AppError.notFound("Employee not found");
        }

        await assertActorMayCreateForSubject(
          tx,
          actorId,
          subjectUserId,
          requesterRole,
        );

        const employeePositionId = await getEffectivePositionId(
          tx,
          subjectUserId,
        );
        const managerPositionId = employeePositionId
          ? await getParentPositionId(tx, employeePositionId)
          : null;
        const managerId = managerPositionId
          ? await getActivePositionOccupant(tx, managerPositionId)
          : null;

        let status: "PENDING_MANAGER" | "PENDING_HR";
        if (
          ["HOD", "HOD_IT", "HOD_FINANCE", "CEO", "HOD_HR", "ADMIN"].includes(
            requesterRole,
          )
        ) {
          status = "PENDING_HR";
        } else if (managerPositionId) {
          status = "PENDING_MANAGER";
        } else {
          status = "PENDING_HR";
        }

        const [request] = await tx
          .insert(separationRequest)
          .values({
            employeeId: subjectUserId,
            managerId,
            managerPositionId,
            type: input.type,
            reason: input.reason,
            lastWorkingDay: input.lastWorkingDay.toISOString().slice(0, 10),
            noticePeriodWaived: input.noticePeriodWaived,
            status,
          })
          .returning();

        if (!request) {
          throw new AppError(
            "INTERNAL_ERROR",
            "Failed to create separation request",
            500,
          );
        }

        await tx.insert(auditLog).values({
          entityId: request.id,
          entityType: "SEPARATION",
          action: "CREATE_REQUEST",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { status },
        });

        if (status === "PENDING_MANAGER" && managerId) {
          await enqueueOutbox(tx, {
            idempotencyKey: `separation:${request.id}:notify:manager_pending`,
            userId: managerId,
            type: "ACTION_REQUIRED",
            title: "Separation approval required",
            body: "A separation request is pending your approval.",
            link: `/separations/${request.id}`,
          });
        }

        return request;
      });
    },

    async getForViewer(separationId: string, actorId: string) {
      const { actorRole } = await ensureRequestVisibleToActor(
        separationId,
        actorId,
      );

      const full = await db.query.separationRequest.findFirst({
        where: eq(separationRequest.id, separationId),
        with: {
          checklistItems: true,
          documents: true,
          employee: true,
        },
      });

      if (!full) {
        throw AppError.notFound("Separation request not found");
      }

      const viewer = await computeViewerApprovalFlags(full, actorId, actorRole);

      return { ...full, viewer };
    },

    async update(
      input: z.infer<typeof updateSeparationSchema>,
      actorId: string,
    ) {
      const { request, actorRole } = await ensureRequestVisibleToActor(
        input.separationId,
        actorId,
      );
      const isHr = actorRole === "HOD_HR" || actorRole === "ADMIN";
      const isEmployee = request.employeeId === actorId;

      if (input.status !== undefined && !isHr) {
        throw new AppError(
          "FORBIDDEN",
          "Only HR may change separation status",
          403,
        );
      }

      const hasNonStatusFields =
        input.reason !== undefined ||
        input.lastWorkingDay !== undefined ||
        input.noticePeriodWaived !== undefined;

      if (hasNonStatusFields && !isHr && !isEmployee) {
        throw new AppError(
          "FORBIDDEN",
          "Not authorized to edit this separation",
          403,
        );
      }

      if (hasNonStatusFields && isEmployee && !isHr) {
        const editableByEmployee = [
          "REQUESTED",
          "PENDING_MANAGER",
          "PENDING_HR",
        ] as const;
        if (
          !(editableByEmployee as readonly string[]).includes(request.status)
        ) {
          throw AppError.badRequest(
            "Cannot edit request fields in the current status",
          );
        }
      }

      const [updated] = await db
        .update(separationRequest)
        .set({
          status: input.status,
          reason: input.reason,
          lastWorkingDay: input.lastWorkingDay
            ? input.lastWorkingDay.toISOString().slice(0, 10)
            : undefined,
          noticePeriodWaived: input.noticePeriodWaived,
          updatedAt: new Date(),
        })
        .where(eq(separationRequest.id, input.separationId))
        .returning();
      return updated;
    },

    async approveByManager(
      input: z.infer<typeof approveByManagerSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);
      if (!(MANAGER_APPROVER_ROLES as readonly string[]).includes(actorRole)) {
        throw new AppError("FORBIDDEN", "Not authorized", 403);
      }

      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(separationRequest)
          .where(eq(separationRequest.id, input.separationId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Separation request not found");
        }

        if (
          request.status !== "PENDING_MANAGER" &&
          actorRole !== "HOD_HR" &&
          actorRole !== "ADMIN"
        ) {
          throw AppError.badRequest("Request is not pending manager approval");
        }

        // Only direct manager (or HR/Admin override).
        const isDirectManagerBySlot = request.managerPositionId
          ? (await getActivePositionOccupant(tx, request.managerPositionId)) ===
            actorId
          : false;
        const isDirectManager = isDirectManagerBySlot;
        if (
          !isDirectManager &&
          actorRole !== "HOD_HR" &&
          actorRole !== "ADMIN"
        ) {
          throw new AppError("FORBIDDEN", "Not authorized as manager", 403);
        }

        const isApproverHOD = (
          MANAGER_APPROVER_ROLES_EXCLUDING_LINE_MANAGER as readonly string[]
        ).includes(actorRole);

        let nextStatus: "PENDING_MANAGER" | "PENDING_HR" = "PENDING_HR";
        let nextManagerPositionId = request.managerPositionId;
        let nextManagerId = request.managerId;

        if (!isApproverHOD && request.managerPositionId) {
          const parentPosId = await getParentPositionId(
            tx,
            request.managerPositionId,
          );
          if (parentPosId) {
            const parentManagerId = await getActivePositionOccupant(
              tx,
              parentPosId,
            );
            if (parentManagerId) {
              nextStatus = "PENDING_MANAGER";
              nextManagerPositionId = parentPosId;
              nextManagerId = parentManagerId;
            }
          }
        }

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: nextStatus,
            managerPositionId: nextManagerPositionId,
            managerId: nextManagerId,
            updatedAt: new Date(),
          })
          .where(eq(separationRequest.id, input.separationId))
          .returning();

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "MANAGER_APPROVE",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { comment: input.comment ?? null, nextStatus },
        });

        if (nextStatus === "PENDING_HR") {
          // Notify HR (first available HR user; simplified).
          const [hrUser] = await tx
            .select({ id: user.id })
            .from(user)
            .where(and(eq(user.role, "HOD_HR"), eq(user.status, "ACTIVE")))
            .limit(1);
          if (hrUser?.id) {
            await enqueueOutbox(tx, {
              idempotencyKey: `separation:${input.separationId}:notify:hr_pending`,
              userId: hrUser.id,
              type: "ACTION_REQUIRED",
              title: "HR approval required",
              body: "A separation request is pending HR approval.",
              link: `/separations/${input.separationId}`,
            });
          }
        } else if (nextStatus === "PENDING_MANAGER" && nextManagerId) {
          await enqueueOutbox(tx, {
            idempotencyKey: `separation:${input.separationId}:notify:manager_pending:${nextManagerId}`,
            userId: nextManagerId,
            type: "ACTION_REQUIRED",
            title: "Separation approval required",
            body: "A separation request is pending your approval.",
            link: `/separations/${input.separationId}`,
          });
        }

        return updated;
      });
    },

    async approveByHr(
      input: z.infer<typeof approveByHrSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);
      if (!(actorRole === "HOD_HR" || actorRole === "ADMIN")) {
        throw new AppError("FORBIDDEN", "Only HR can approve", 403);
      }

      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(separationRequest)
          .where(eq(separationRequest.id, input.separationId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Separation request not found");
        }

        if (
          request.status !== "PENDING_HR" &&
          request.status !== "PENDING_MANAGER" &&
          request.status !== "REQUESTED"
        ) {
          throw AppError.badRequest("Request is not pending HR approval");
        }

        // Clone templates into checklist items.
        const templates = await tx
          .select()
          .from(separationChecklistTemplate)
          .where(eq(separationChecklistTemplate.active, true))
          .orderBy(
            separationChecklistTemplate.lane,
            separationChecklistTemplate.order,
          );

        const lastDay = new Date(request.lastWorkingDay);

        const checklistItems = templates.map((t) => {
          const offsetDays = t.defaultDueOffsetDays ?? null;
          const dueAt =
            offsetDays === null
              ? null
              : new Date(lastDay.getTime() - offsetDays * 24 * 60 * 60 * 1000);

          return {
            separationId: request.id,
            lane: t.lane,
            title: t.title,
            description: t.description,
            required: t.required,
            dueAt,
            status: "PENDING" as const,
            source: "TEMPLATE" as const,
            order: t.order,
          };
        });

        if (checklistItems.length > 0) {
          await tx.insert(separationChecklist).values(checklistItems);
        }

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: "CLEARANCE_IN_PROGRESS",
            hrOwnerId: request.hrOwnerId ?? actorId,
            updatedAt: new Date(),
          })
          .where(eq(separationRequest.id, input.separationId))
          .returning();

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "HR_APPROVE_AND_START_CLEARANCE",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { comment: input.comment ?? null },
        });

        await enqueueOutbox(tx, {
          idempotencyKey: `separation:${input.separationId}:notify:employee_clearance_started`,
          userId: request.employeeId,
          type: "INFO",
          title: "Exit clearance started",
          body: "Your clearance process has started.",
          link: `/separations/${input.separationId}`,
        });

        return updated;
      });
    },

    async rejectByManager(
      input: z.infer<typeof rejectByManagerSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);
      if (!(MANAGER_APPROVER_ROLES as readonly string[]).includes(actorRole)) {
        throw new AppError("FORBIDDEN", "Not authorized", 403);
      }

      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(separationRequest)
          .where(eq(separationRequest.id, input.separationId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Separation request not found");
        }

        if (
          request.status !== "PENDING_MANAGER" &&
          actorRole !== "HOD_HR" &&
          actorRole !== "ADMIN"
        ) {
          throw AppError.badRequest("Request is not pending manager approval");
        }

        const isDirectManagerBySlot = request.managerPositionId
          ? (await getActivePositionOccupant(tx, request.managerPositionId)) ===
            actorId
          : false;
        if (
          !isDirectManagerBySlot &&
          actorRole !== "HOD_HR" &&
          actorRole !== "ADMIN"
        ) {
          throw new AppError("FORBIDDEN", "Not authorized as manager", 403);
        }

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: "REJECTED",
            updatedAt: new Date(),
          })
          .where(eq(separationRequest.id, input.separationId))
          .returning();

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "MANAGER_REJECT",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { comment: input.comment },
        });

        await enqueueOutbox(tx, {
          idempotencyKey: `separation:${input.separationId}:notify:employee_rejected_by_manager`,
          userId: request.employeeId,
          type: "INFO",
          title: "Separation request rejected",
          body: "Your separation request has been rejected by your manager.",
          link: `/separations/${input.separationId}`,
        });

        return updated;
      });
    },

    async rejectByHr(input: z.infer<typeof rejectByHrSchema>, actorId: string) {
      const actorRole = await getActorRole(db, actorId);
      if (!(actorRole === "HOD_HR" || actorRole === "ADMIN")) {
        throw new AppError("FORBIDDEN", "Only HR can reject", 403);
      }

      return await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(separationRequest)
          .where(eq(separationRequest.id, input.separationId))
          .limit(1);

        if (!request) {
          throw AppError.notFound("Separation request not found");
        }

        if (request.status !== "PENDING_HR") {
          throw AppError.badRequest("Request is not pending HR approval");
        }

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: "REJECTED",
            updatedAt: new Date(),
          })
          .where(eq(separationRequest.id, input.separationId))
          .returning();

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "HR_REJECT",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { comment: input.comment },
        });

        await enqueueOutbox(tx, {
          idempotencyKey: `separation:${input.separationId}:notify:employee_rejected_by_hr`,
          userId: request.employeeId,
          type: "INFO",
          title: "Separation request rejected",
          body: "Your separation request has been rejected by HR.",
          link: `/separations/${input.separationId}`,
        });

        return updated;
      });
    },

    async updateChecklist(
      input: z.infer<typeof updateChecklistSchema>,
      userId: string,
    ) {
      const [checklist] = await db
        .select()
        .from(separationChecklist)
        .where(eq(separationChecklist.id, input.checklistId))
        .limit(1);

      if (!checklist) {
        throw AppError.notFound("Checklist item not found");
      }

      const { actorRole } = await ensureRequestVisibleToActor(
        checklist.separationId,
        userId,
      );

      if (input.status === "REJECTED" && !input.remarks?.trim()) {
        throw AppError.badRequest(
          "Remarks are required when rejecting an item",
        );
      }

      const allowedLanes = await resolveClearanceActLanes(userId, actorRole);

      if (!allowedLanes.includes(checklist.lane as Lane)) {
        throw new AppError("FORBIDDEN", "Not authorized for this lane", 403);
      }

      const now = new Date();

      const updatePayload: Partial<{
        status: ChecklistStatus;
        checkedBy: string | null;
        checkedAt: Date | null;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        remarks: string | null;
        updatedAt: Date;
      }> = {
        status: input.status,
        updatedAt: now,
      };

      if (input.status === "PENDING") {
        updatePayload.checkedBy = null;
        updatePayload.checkedAt = null;
        updatePayload.verifiedBy = null;
        updatePayload.verifiedAt = null;
        updatePayload.remarks = input.remarks ?? null;
      } else {
        updatePayload.checkedBy = userId;
        updatePayload.checkedAt = now;
        updatePayload.remarks = input.remarks ?? null;
      }

      const [updated] = await db
        .update(separationChecklist)
        .set(updatePayload)
        .where(eq(separationChecklist.id, input.checklistId))
        .returning();

      await db.insert(auditLog).values({
        entityId: checklist.separationId,
        entityType: "SEPARATION",
        action: `CHECKLIST_${input.status}`,
        performedBy: userId,
        performedAt: now,
        metadata: {
          checklistId: input.checklistId,
          lane: checklist.lane,
          remarks: input.remarks ?? null,
        },
      });

      // Auto-complete separation once all REQUIRED items are cleared.
      if (input.status === "CLEARED") {
        const [pendingRequired] = await db
          .select({ count: sql<number>`count(*)` })
          .from(separationChecklist)
          .where(
            and(
              eq(separationChecklist.separationId, checklist.separationId),
              eq(separationChecklist.required, true),
              or(
                eq(separationChecklist.status, "PENDING"),
                eq(separationChecklist.status, "REJECTED"),
              ),
            ),
          );

        if (Number(pendingRequired?.count ?? 0) === 0) {
          await db
            .update(separationRequest)
            .set({
              status: "COMPLETED",
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(separationRequest.id, checklist.separationId));

          await db.insert(auditLog).values({
            entityId: checklist.separationId,
            entityType: "SEPARATION",
            action: "AUTO_COMPLETE",
            performedBy: userId,
            performedAt: now,
          });
        }
      } else if (input.status === "REJECTED" || input.status === "PENDING") {
        // Revert COMPLETED → CLEARANCE_IN_PROGRESS if a required item is un-cleared.
        const [sep] = await db
          .select({ status: separationRequest.status })
          .from(separationRequest)
          .where(eq(separationRequest.id, checklist.separationId))
          .limit(1);

        if (sep?.status === "COMPLETED" && checklist.required) {
          await db
            .update(separationRequest)
            .set({
              status: "CLEARANCE_IN_PROGRESS",
              completedAt: null,
              updatedAt: now,
            })
            .where(eq(separationRequest.id, checklist.separationId));

          await db.insert(auditLog).values({
            entityId: checklist.separationId,
            entityType: "SEPARATION",
            action: "REVERT_COMPLETE",
            performedBy: userId,
            performedAt: now,
            metadata: {
              reason: `Required item "${checklist.title}" was ${input.status.toLowerCase()}`,
            },
          });
        }
      }

      return updated;
    },

    async sendClearanceReminder(
      input: z.infer<typeof sendClearanceReminderSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);
      if (!(actorRole === "HOD_HR" || actorRole === "ADMIN")) {
        throw new AppError("FORBIDDEN", "Only HR can send reminders", 403);
      }

      const [request] = await db
        .select({ id: separationRequest.id, status: separationRequest.status })
        .from(separationRequest)
        .where(eq(separationRequest.id, input.separationId))
        .limit(1);

      if (!request) {
        throw AppError.notFound("Separation request not found");
      }

      if (request.status !== "CLEARANCE_IN_PROGRESS") {
        throw AppError.badRequest(
          "Reminders are only available while clearance is in progress",
        );
      }

      const pendingRows = await db
        .select({ lane: separationChecklist.lane })
        .from(separationChecklist)
        .where(
          and(
            eq(separationChecklist.separationId, input.separationId),
            eq(separationChecklist.status, "PENDING"),
          ),
        );

      const pendingLanes = Array.from(
        new Set(pendingRows.map((row) => row.lane as Lane)),
      );

      if (pendingLanes.length === 0) {
        throw AppError.badRequest("No pending clearance departments to remind");
      }

      const targetLanes =
        input.scope === "LANE" ? [input.lane as Lane] : pendingLanes;

      if (
        input.scope === "LANE" &&
        !pendingLanes.includes(input.lane as Lane)
      ) {
        throw AppError.badRequest(
          "Selected department has no pending clearance items",
        );
      }

      const skippedLanes: Lane[] = [];
      let notifiedRecipients = 0;

      for (const lane of targetLanes) {
        const recipients = await getLaneReminderRecipients(lane);
        const dedupedRecipients = Array.from(
          new Map(
            recipients.map((recipient) => [recipient.userId, recipient]),
          ).values(),
        );

        if (dedupedRecipients.length === 0) {
          skippedLanes.push(lane);
          continue;
        }

        for (const recipient of dedupedRecipients) {
          try {
            await notifications.createNotification(
              recipient.userId,
              "Clearance reminder",
              `${LANE_LABELS[lane]} has pending clearance tasks that require your action.`,
              "REMINDER",
              `/separations/${input.separationId}`,
              recipient.email ?? undefined,
            );
            notifiedRecipients += 1;
          } catch (error: unknown) {
            console.warn("[separations] failed to send clearance reminder", {
              error: error instanceof Error ? error.message : String(error),
              lane,
              recipientId: recipient.userId,
              separationId: input.separationId,
            });
          }
        }
      }

      if (notifiedRecipients === 0) {
        throw AppError.badRequest(
          "No active recipients found for pending clearance reminders",
        );
      }

      await db.insert(auditLog).values({
        entityId: input.separationId,
        entityType: "SEPARATION",
        action: "SEND_CLEARANCE_REMINDER",
        metadata: {
          lanes: targetLanes,
          notifiedRecipients,
          scope: input.scope,
          skippedLanes,
        },
        performedAt: new Date(),
        performedBy: actorId,
      });

      return {
        lanes: targetLanes,
        notifiedRecipients,
        scope: input.scope,
        separationId: input.separationId,
        skippedLanes,
      };
    },

    async getListForViewer(actorId: string) {
      const actorRole = await getActorRole(db, actorId);
      if (SEPARATION_ORG_WIDE_VIEW_ROLES.includes(actorRole)) {
        return await db.query.separationRequest.findMany({
          with: { employee: true },
          orderBy: (requests, { desc }) => [desc(requests.createdAt)],
        });
      }

      const initiatedRows = await db
        .select({ entityId: auditLog.entityId })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityType, "SEPARATION"),
            eq(auditLog.action, "CREATE_REQUEST"),
            eq(auditLog.performedBy, actorId),
          ),
        );
      const initiatedIds = [...new Set(initiatedRows.map((r) => r.entityId))];

      const clearanceIds = await getClearanceParticipationSeparationIds(
        actorId,
        actorRole,
      );

      const assignments = await db
        .select({ positionId: userPositionAssignment.positionId })
        .from(userPositionAssignment)
        .where(eq(userPositionAssignment.userId, actorId));

      const positionIds = assignments
        .map((a) => a.positionId)
        .filter((id): id is string => id != null);

      const clearancePredicate =
        clearanceIds.length > 0
          ? inArray(separationRequest.id, clearanceIds)
          : undefined;

      if (positionIds.length > 0) {
        const baseParts =
          initiatedIds.length > 0
            ? [
                eq(separationRequest.employeeId, actorId),
                inArray(separationRequest.managerPositionId, positionIds),
                inArray(separationRequest.id, initiatedIds),
              ]
            : [
                eq(separationRequest.employeeId, actorId),
                inArray(separationRequest.managerPositionId, positionIds),
              ];
        const base = or(...baseParts);
        return await db.query.separationRequest.findMany({
          where: clearancePredicate ? or(base, clearancePredicate) : base,
          with: { employee: true },
          orderBy: (requests, { desc }) => [desc(requests.createdAt)],
        });
      }

      const employeeParts =
        initiatedIds.length > 0
          ? [
              eq(separationRequest.employeeId, actorId),
              inArray(separationRequest.id, initiatedIds),
            ]
          : [eq(separationRequest.employeeId, actorId)];
      const visibilityPredicate = or(...employeeParts);
      return await db.query.separationRequest.findMany({
        where: clearancePredicate
          ? or(visibilityPredicate, clearancePredicate)
          : visibilityPredicate,
        with: { employee: true },
        orderBy: (requests, { desc }) => [desc(requests.createdAt)],
      });
    },

    async startClearance(
      input: z.infer<typeof startClearanceSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);

      if (actorRole !== "HOD_HR") {
        throw new AppError("FORBIDDEN", "Only HR can start clearance", 403);
      }

      return await this.approveByHr(
        { separationId: input.separationId },
        actorId,
      );
    },

    async addChecklistItem(
      input: z.infer<typeof addChecklistItemSchema>,
      actorId: string,
    ) {
      await ensureRequestVisibleToActor(input.separationId, actorId);

      const now = new Date();
      const [maxOrderRow] = await db
        .select({
          max: sql<number>`coalesce(max(${separationChecklist.order}), 0)`,
        })
        .from(separationChecklist)
        .where(
          and(
            eq(separationChecklist.separationId, input.separationId),
            eq(separationChecklist.lane, input.lane),
          ),
        );

      const order = (maxOrderRow?.max ?? 0) + 1;

      const [created] = await db
        .insert(separationChecklist)
        .values({
          separationId: input.separationId,
          lane: input.lane,
          title: input.title,
          description: input.description,
          required: input.required,
          dueAt: input.dueAt ?? null,
          status: "PENDING",
          source: "CUSTOM",
          order,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await db.insert(auditLog).values({
        entityId: input.separationId,
        entityType: "SEPARATION",
        action: "ADD_CHECKLIST_ITEM",
        performedBy: actorId,
        performedAt: now,
        metadata: {
          lane: input.lane,
          title: input.title,
          required: input.required,
        },
      });

      return created;
    },

    async reorderChecklistItems(
      input: z.infer<typeof reorderChecklistItemsSchema>,
      actorId: string,
    ) {
      await ensureRequestVisibleToActor(input.separationId, actorId);

      return await db.transaction(async (tx) => {
        for (const [idx, id] of input.orderedIds.entries()) {
          await tx
            .update(separationChecklist)
            .set({ order: idx, updatedAt: new Date() })
            .where(
              and(
                eq(separationChecklist.id, id),
                eq(separationChecklist.separationId, input.separationId),
                eq(separationChecklist.lane, input.lane),
              ),
            );
        }

        await tx.insert(auditLog).values({
          entityId: input.separationId,
          entityType: "SEPARATION",
          action: "REORDER_CHECKLIST_ITEMS",
          performedBy: actorId,
          performedAt: new Date(),
          metadata: { lane: input.lane, count: input.orderedIds.length },
        });

        return { success: true };
      });
    },

    async uploadDocument(
      input: z.infer<typeof uploadSeparationDocumentSchema>,
      actorId: string,
    ) {
      const { request, actorRole } = await ensureRequestVisibleToActor(
        input.separationId,
        actorId,
      );

      if (input.kind === "RESIGNATION_LETTER") {
        const isLeaver = request.employeeId === actorId;
        const isPrivileged =
          actorRole === "HOD_HR" ||
          actorRole === "ADMIN" ||
          actorRole === "CEO";
        const isInitiator = await separationWasInitiatedByActor(
          input.separationId,
          actorId,
        );
        if (!(isLeaver || isPrivileged || isInitiator)) {
          throw new AppError(
            "FORBIDDEN",
            "Only the employee, HR, leadership, or the request initiator may upload a resignation letter",
            403,
          );
        }
      }

      const buffer = Buffer.from(input.fileBase64, "base64");
      const safeName = sanitizeFileName(input.fileName);
      const key = `separations/${input.separationId}/${Date.now()}_${safeName}`;

      const url = await storage.upload(key, buffer, {
        contentType: input.contentType,
        acl: "private",
        metadata: {
          separationId: input.separationId,
          kind: input.kind,
          uploadedBy: actorId,
        },
      });

      const [created] = await db
        .insert(separationDocument)
        .values({
          separationId: input.separationId,
          kind: input.kind,
          fileName: input.fileName,
          contentType: input.contentType,
          size: buffer.length,
          storageKey: key,
          storageUrl: url,
          uploadedBy: actorId,
          createdAt: new Date(),
        })
        .returning();

      await db.insert(auditLog).values({
        entityId: input.separationId,
        entityType: "SEPARATION",
        action: "UPLOAD_DOCUMENT",
        performedBy: actorId,
        performedAt: new Date(),
        metadata: { documentId: created?.id ?? null, kind: input.kind },
      });

      // Notify HR owner if assigned.
      if (request.hrOwnerId) {
        await enqueueOutbox(db, {
          idempotencyKey: `separation:${input.separationId}:notify:doc:${created?.id ?? key}`,
          userId: request.hrOwnerId,
          type: "INFO",
          title: "Separation document uploaded",
          body: "A document was uploaded for a separation request.",
          link: `/separations/${input.separationId}`,
        });
      }

      return created;
    },

    async getDocumentDownloadUrl(
      input: z.infer<typeof getSeparationDocumentDownloadUrlSchema>,
      actorId: string,
    ) {
      const [doc] = await db
        .select()
        .from(separationDocument)
        .where(eq(separationDocument.id, input.documentId))
        .limit(1);

      if (!doc) {
        throw AppError.notFound("Document not found");
      }

      await ensureRequestVisibleToActor(doc.separationId, actorId);

      const url = await storage.getPresignedUrl(doc.storageKey);
      return { url };
    },

    async getMyClearanceInbox(actorId: string) {
      const actorRole = await getActorRole(db, actorId);
      const lanes =
        actorRole === "HOD_HR" || actorRole === "ADMIN"
          ? ([
              "OPERATIONS",
              "HOD_IT",
              "HOD_FINANCE",
              "ADMIN_ASSETS",
              "INSURANCE",
              "USED_CARS",
              "HR_PAYROLL",
            ] satisfies Lane[])
          : await getUserLanes(actorId, actorRole);

      if (lanes.length === 0) {
        return [];
      }

      const rows = await db.query.separationChecklist.findMany({
        where: (items, { and, eq, inArray }) =>
          and(eq(items.status, "PENDING"), inArray(items.lane, lanes)),
        with: {
          separationRequest: {
            with: { employee: true },
          },
        },
        orderBy: (items, { asc }) => [asc(items.dueAt)],
      });

      return rows
        .filter((r) => r.separationRequest?.status === "CLEARANCE_IN_PROGRESS")
        .map((r) => ({
          checklistId: r.id,
          lane: r.lane,
          title: r.title,
          dueAt: r.dueAt,
          separation: {
            id: r.separationId,
            lastWorkingDay: r.separationRequest?.lastWorkingDay,
            employee: r.separationRequest?.employee,
          },
        }));
    },
  };
};
