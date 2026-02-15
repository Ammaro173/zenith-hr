import {
  auditLog,
  type DbOrTx,
  notificationOutbox,
  separationChecklist,
  separationChecklistTemplate,
  separationDocument,
  separationRequest,
  slotAssignment,
  slotReportingLine,
  user,
  userClearanceLane,
} from "@zenith-hr/db";
import { and, eq, or, sql } from "drizzle-orm";
import type { z } from "zod";
import type { StorageService } from "../../infrastructure/interfaces";
import { AppError } from "../../shared/errors";
import { getActor, getActorRole } from "../../shared/utils";
import type {
  addChecklistItemSchema,
  approveByHrSchema,
  approveByManagerSchema,
  createSeparationSchema,
  getSeparationDocumentDownloadUrlSchema,
  reorderChecklistItemsSchema,
  startClearanceSchema,
  updateChecklistSchema,
  updateSeparationSchema,
  uploadSeparationDocumentSchema,
} from "./separations.schema";

type Lane =
  | "OPERATIONS"
  | "IT"
  | "FINANCE"
  | "ADMIN_ASSETS"
  | "INSURANCE"
  | "USED_CARS"
  | "HR_PAYROLL";

type ChecklistStatus = "PENDING" | "CLEARED" | "REJECTED";

function sanitizeFileName(fileName: string): string {
  return fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

export const createSeparationsService = (
  db: DbOrTx,
  storage: StorageService,
) => {
  const getRoleDefaultLanes = (role: string): Lane[] => {
    if (role === "HR") {
      return ["HR_PAYROLL"];
    }
    if (role === "IT") {
      return ["IT"];
    }
    if (role === "FINANCE") {
      return ["FINANCE"];
    }
    if (role === "ADMIN") {
      return ["ADMIN_ASSETS"];
    }
    return [];
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

  const getActivePrimarySlotId = async (
    txOrDb: DbOrTx,
    userId: string,
  ): Promise<string | null> => {
    const [assignment] = await txOrDb
      .select({ slotId: slotAssignment.slotId })
      .from(slotAssignment)
      .where(
        and(
          eq(slotAssignment.userId, userId),
          eq(slotAssignment.isPrimary, true),
          sql`${slotAssignment.endsAt} IS NULL`,
        ),
      )
      .limit(1);

    return assignment?.slotId ?? null;
  };

  const getParentSlotId = async (
    txOrDb: DbOrTx,
    childSlotId: string,
  ): Promise<string | null> => {
    const [parent] = await txOrDb
      .select({ parentSlotId: slotReportingLine.parentSlotId })
      .from(slotReportingLine)
      .where(eq(slotReportingLine.childSlotId, childSlotId))
      .limit(1);

    return parent?.parentSlotId ?? null;
  };

  const getActiveSlotOccupant = async (
    txOrDb: DbOrTx,
    slotId: string,
  ): Promise<string | null> => {
    const [occupant] = await txOrDb
      .select({ userId: slotAssignment.userId })
      .from(slotAssignment)
      .where(
        and(
          eq(slotAssignment.slotId, slotId),
          sql`${slotAssignment.endsAt} IS NULL`,
        ),
      )
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
    if (actorRole === "HR" || actorRole === "ADMIN") {
      return { request, actorRole };
    }
    if (request.employeeId === actorId) {
      return { request, actorRole };
    }
    if (request.managerSlotId) {
      const slotOccupant = await getActiveSlotOccupant(
        db,
        request.managerSlotId,
      );
      if (slotOccupant === actorId) {
        return { request, actorRole };
      }
    }
    throw new AppError("FORBIDDEN", "Not authorized to access separation", 403);
  };

  return {
    async create(
      input: z.infer<typeof createSeparationSchema>,
      employeeId: string,
    ) {
      return await db.transaction(async (tx) => {
        const actor = await getActor(db, employeeId);
        const requesterRole = actor?.role ?? "EMPLOYEE";

        const employeeSlotId = await getActivePrimarySlotId(tx, employeeId);
        const managerSlotId = employeeSlotId
          ? await getParentSlotId(tx, employeeSlotId)
          : null;
        const managerId = managerSlotId
          ? await getActiveSlotOccupant(tx, managerSlotId)
          : null;

        let status: "PENDING_MANAGER" | "PENDING_HR";
        if (
          requesterRole === "MANAGER" ||
          requesterRole === "HR" ||
          requesterRole === "ADMIN"
        ) {
          status = "PENDING_HR";
        } else if (managerSlotId) {
          status = "PENDING_MANAGER";
        } else {
          status = "PENDING_HR";
        }

        const [request] = await tx
          .insert(separationRequest)
          .values({
            employeeId,
            managerId,
            managerSlotId,
            type: input.type,
            reason: input.reason,
            lastWorkingDay: input.lastWorkingDay.toISOString().slice(0, 10),
            noticePeriodWaived: input.noticePeriodWaived,
            status,
          })
          .returning();

        if (!request) {
          throw new Error("Failed to create separation request");
        }

        await tx.insert(auditLog).values({
          entityId: request.id,
          entityType: "SEPARATION",
          action: "CREATE_REQUEST",
          performedBy: employeeId,
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

    async get(separationId: string) {
      return await db.query.separationRequest.findFirst({
        where: eq(separationRequest.id, separationId),
        with: {
          checklistItems: true,
          documents: true,
          employee: true,
        },
      });
    },

    async update(input: z.infer<typeof updateSeparationSchema>) {
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
      if (
        !(
          actorRole === "MANAGER" ||
          actorRole === "HR" ||
          actorRole === "ADMIN"
        )
      ) {
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
          actorRole !== "HR" &&
          actorRole !== "ADMIN"
        ) {
          throw AppError.badRequest("Request is not pending manager approval");
        }

        // Only direct manager (or HR/Admin override).
        const isDirectManagerBySlot = request.managerSlotId
          ? (await getActiveSlotOccupant(tx, request.managerSlotId)) === actorId
          : false;
        const isDirectManager = isDirectManagerBySlot;
        if (!isDirectManager && actorRole !== "HR" && actorRole !== "ADMIN") {
          throw new AppError("FORBIDDEN", "Not authorized as manager", 403);
        }

        const [updated] = await tx
          .update(separationRequest)
          .set({
            status: "PENDING_HR",
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
          metadata: { comment: input.comment ?? null },
        });

        // Notify HR (first available HR user; simplified).
        const [hrUser] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "HR"))
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

        return updated;
      });
    },

    async approveByHr(
      input: z.infer<typeof approveByHrSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);
      if (!(actorRole === "HR" || actorRole === "ADMIN")) {
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

    async updateChecklist(
      input: z.infer<typeof updateChecklistSchema>,
      userId: string,
    ) {
      const actorRole = await getActorRole(db, userId);

      const [checklist] = await db
        .select()
        .from(separationChecklist)
        .where(eq(separationChecklist.id, input.checklistId))
        .limit(1);

      if (!checklist) {
        throw AppError.notFound("Checklist item not found");
      }

      if (input.status === "REJECTED" && !input.remarks?.trim()) {
        throw AppError.badRequest(
          "Remarks are required when rejecting an item",
        );
      }

      // HR/Admin can act across all lanes.
      const isPrivileged = actorRole === "HR" || actorRole === "ADMIN";
      const allowedLanes = isPrivileged
        ? ([
            "OPERATIONS",
            "IT",
            "FINANCE",
            "ADMIN_ASSETS",
            "INSURANCE",
            "USED_CARS",
            "HR_PAYROLL",
          ] satisfies Lane[])
        : await getUserLanes(userId, actorRole);

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

        if ((pendingRequired?.count ?? 0) === 0) {
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
      }

      return updated;
    },

    async getAll() {
      return await db.query.separationRequest.findMany({
        with: {
          employee: true,
        },
        orderBy: (requests, { desc }) => [desc(requests.createdAt)],
      });
    },

    async startClearance(
      input: z.infer<typeof startClearanceSchema>,
      actorId: string,
    ) {
      const actorRole = await getActorRole(db, actorId);

      if (actorRole !== "HR") {
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
      const { request } = await ensureRequestVisibleToActor(
        input.separationId,
        actorId,
      );

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
        actorRole === "HR" || actorRole === "ADMIN"
          ? ([
              "OPERATIONS",
              "IT",
              "FINANCE",
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
