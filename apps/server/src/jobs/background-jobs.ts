import { db } from "@zenith-hr/db";
import {
  notification,
  notificationOutbox,
  separationReminderState,
  separationRequest,
  user,
  userClearanceLane,
  userPositionAssignment,
} from "@zenith-hr/db/schema";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";

type Lane =
  | "OPERATIONS"
  | "IT"
  | "FINANCE"
  | "ADMIN_ASSETS"
  | "INSURANCE"
  | "USED_CARS"
  | "HR_PAYROLL";

type ReminderType =
  | "APPROVAL_PENDING"
  | "CHECKLIST_DUE_SOON"
  | "CHECKLIST_OVERDUE";

export function buildReminderKey(params: {
  dateKey: string; // YYYY-MM-DD
  separationId: string;
  scope: "approval" | "item";
  status?: string;
  checklistItemId?: string;
  reminderType?: ReminderType;
}): string {
  if (params.scope === "approval") {
    return `reminder:${params.dateKey}:separation:${params.separationId}:approval:${params.status ?? "unknown"}`;
  }
  return `reminder:${params.dateKey}:separation:${params.separationId}:item:${params.checklistItemId ?? "unknown"}:${params.reminderType ?? "unknown"}`;
}

export function buildOutboxKey(reminderKey: string, userId: string): string {
  return `${reminderKey}:user:${userId}`;
}

function startInterval(
  fn: () => Promise<void>,
  intervalMs: number,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    fn().catch((err: unknown) => {
      console.error("[jobs] error", err);
    });
  }, intervalMs);
}

async function withAdvisoryLock<T>(
  lockName: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const lockResult = await db.execute<{ locked: boolean }>(
    sql`select pg_try_advisory_lock(hashtext(${lockName})) as locked`,
  );
  const locked = Boolean(lockResult.rows[0]?.locked);
  if (!locked) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await db.execute(sql`select pg_advisory_unlock(hashtext(${lockName}))`);
  }
}

async function getLaneRecipients(lane: Lane): Promise<string[]> {
  const memberships = await db
    .select({ userId: userClearanceLane.userId })
    .from(userClearanceLane)
    .where(eq(userClearanceLane.lane, lane));

  const fromMembership = memberships.map((m) => m.userId);
  if (fromMembership.length > 0) {
    return fromMembership;
  }

  // Fallback: derive from global roles for the lanes that map cleanly.
  let role: ("IT" | "FINANCE" | "ADMIN" | "HR") | null = null;
  switch (lane) {
    case "IT":
      role = "IT";
      break;
    case "FINANCE":
      role = "FINANCE";
      break;
    case "ADMIN_ASSETS":
      role = "ADMIN";
      break;
    case "HR_PAYROLL":
      role = "HR";
      break;
    default:
      role = null;
  }

  if (!role) {
    return [];
  }

  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, role))
    .limit(50);

  return users.map((u) => u.id);
}

async function enqueueOutbox(params: {
  idempotencyKey: string;
  userId: string;
  payload: {
    type: "INFO" | "ACTION_REQUIRED" | "REMINDER";
    title: string;
    body: string;
    link?: string | null;
  };
}) {
  await db
    .insert(notificationOutbox)
    .values({
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      payload: params.payload,
      status: "PENDING",
      nextAttemptAt: new Date(),
      attemptCount: 0,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

async function markReminderSent(params: {
  idempotencyKey: string;
  separationId: string;
  reminderType: ReminderType;
  lane?: Lane | null;
  checklistItemId?: string | null;
}): Promise<boolean> {
  const [inserted] = await db
    .insert(separationReminderState)
    .values({
      idempotencyKey: params.idempotencyKey,
      separationId: params.separationId,
      reminderType: params.reminderType,
      lane: params.lane ?? null,
      checklistItemId: params.checklistItemId ?? null,
      lastSentAt: new Date(),
      createdAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  return Boolean(inserted?.id);
}

async function separationReminderTick(): Promise<void> {
  await withAdvisoryLock("zenith_separation_reminders", async () => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    // 1) Approval reminders (once per day per separation/status)
    const approvalRows = await db
      .select({
        id: separationRequest.id,
        status: separationRequest.status,
        managerPositionId: separationRequest.managerPositionId,
        employeeId: separationRequest.employeeId,
        createdAt: separationRequest.createdAt,
      })
      .from(separationRequest)
      .where(
        inArray(separationRequest.status, ["PENDING_MANAGER", "PENDING_HR"]),
      )
      .orderBy(desc(separationRequest.createdAt))
      .limit(200);

    for (const r of approvalRows) {
      const ageMs = now.getTime() - new Date(r.createdAt).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        continue;
      }

      const reminderKey = buildReminderKey({
        dateKey: todayKey,
        separationId: r.id,
        scope: "approval",
        status: r.status,
      });
      const inserted = await markReminderSent({
        idempotencyKey: reminderKey,
        separationId: r.id,
        reminderType: "APPROVAL_PENDING",
      });
      if (!inserted) {
        continue;
      }

      const recipients: string[] = [];
      if (r.status === "PENDING_MANAGER" && r.managerPositionId) {
        const slotManagers = await db
          .select({ userId: userPositionAssignment.userId })
          .from(userPositionAssignment)
          .where(eq(userPositionAssignment.positionId, r.managerPositionId))
          .limit(20);
        recipients.push(...slotManagers.map((m) => m.userId));
      }
      if (r.status === "PENDING_HR") {
        const hrs = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "HR"))
          .limit(20);
        recipients.push(...hrs.map((u) => u.id));
      }

      for (const userId of recipients) {
        await enqueueOutbox({
          idempotencyKey: buildOutboxKey(reminderKey, userId),
          userId,
          payload: {
            type: "ACTION_REQUIRED",
            title: "Separation approval pending",
            body: "You have a separation request waiting for your action.",
            link: `/separations/${r.id}`,
          },
        });
      }
    }

    // 2) Checklist reminders (due soon / overdue)
    const checklistRows = await db.query.separationChecklist.findMany({
      where: (items, { and, eq }) =>
        and(eq(items.status, "PENDING"), eq(items.required, true)),
      with: {
        separationRequest: true,
      },
      orderBy: (items, { asc }) => [asc(items.dueAt)],
      limit: 400,
    });

    for (const item of checklistRows) {
      const req = item.separationRequest;
      if (!req || req.status !== "CLEARANCE_IN_PROGRESS") {
        continue;
      }

      if (!item.dueAt) {
        continue;
      }

      const dueAt = new Date(item.dueAt);
      const msToDue = dueAt.getTime() - now.getTime();
      const isOverdue = msToDue < 0;
      const isDueSoon = msToDue >= 0 && msToDue <= 48 * 60 * 60 * 1000;

      let reminderType: ReminderType | null = null;
      if (isOverdue) {
        reminderType = "CHECKLIST_OVERDUE";
      } else if (isDueSoon) {
        reminderType = "CHECKLIST_DUE_SOON";
      }

      if (!reminderType) {
        continue;
      }

      const lane = item.lane as Lane;
      const reminderKey = buildReminderKey({
        dateKey: todayKey,
        separationId: req.id,
        scope: "item",
        checklistItemId: item.id,
        reminderType,
      });
      const inserted = await markReminderSent({
        idempotencyKey: reminderKey,
        separationId: req.id,
        reminderType,
        lane,
        checklistItemId: item.id,
      });
      if (!inserted) {
        continue;
      }

      const recipients = await getLaneRecipients(lane);
      for (const userId of recipients) {
        await enqueueOutbox({
          idempotencyKey: buildOutboxKey(reminderKey, userId),
          userId,
          payload: {
            type: "REMINDER",
            title: isOverdue
              ? "Checklist item overdue"
              : "Checklist item due soon",
            body: `${item.title} (${lane})`,
            link: `/separations/${req.id}`,
          },
        });
      }
    }
  });
}

async function notificationOutboxTick(): Promise<void> {
  await withAdvisoryLock("zenith_notification_outbox", async () => {
    const now = new Date();

    const pending = await db
      .select()
      .from(notificationOutbox)
      .where(
        and(
          inArray(notificationOutbox.status, ["PENDING", "FAILED"]),
          lte(notificationOutbox.nextAttemptAt, now),
        ),
      )
      .orderBy(asc(notificationOutbox.nextAttemptAt))
      .limit(50);

    for (const row of pending) {
      // Acquire per-row “lease” (status transition).
      const [leased] = await db
        .update(notificationOutbox)
        .set({ status: "SENDING", updatedAt: new Date() })
        .where(
          and(
            eq(notificationOutbox.id, row.id),
            inArray(notificationOutbox.status, ["PENDING", "FAILED"]),
          ),
        )
        .returning();

      if (!leased) {
        continue;
      }

      try {
        const payload = row.payload as {
          type: "INFO" | "ACTION_REQUIRED" | "REMINDER";
          title: string;
          body: string;
          link?: string | null;
        };

        await db.insert(notification).values({
          userId: row.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          link: payload.link ?? null,
          createdAt: new Date(),
        });

        await db
          .update(notificationOutbox)
          .set({ status: "SENT", updatedAt: new Date() })
          .where(eq(notificationOutbox.id, row.id));
      } catch (err: unknown) {
        const attemptCount = (row.attemptCount ?? 0) + 1;
        const backoffSeconds = Math.min(
          3600,
          30 * 2 ** Math.min(8, attemptCount),
        );
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
        const lastError = err instanceof Error ? err.message : String(err);

        await db
          .update(notificationOutbox)
          .set({
            status: "FAILED",
            attemptCount,
            nextAttemptAt,
            lastError,
            updatedAt: new Date(),
          })
          .where(eq(notificationOutbox.id, row.id));
      }
    }
  });
}

export function startBackgroundJobs() {
  const reminders = startInterval(separationReminderTick, 60_000);
  const outbox = startInterval(notificationOutboxTick, 5000);

  console.log("[jobs] background jobs started");

  return () => {
    clearInterval(reminders);
    clearInterval(outbox);
    console.log("[jobs] background jobs stopped");
  };
}
