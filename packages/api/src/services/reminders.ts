// Mock QStash reminder service
// In production, replace with actual QStash integration

import { db } from "@zenith-hr/db";
import { user } from "@zenith-hr/db/schema/auth";
import { manpowerRequest } from "@zenith-hr/db/schema/manpower-requests";
import { and, eq, sql } from "drizzle-orm";

// Store scheduled reminders
const scheduledReminders = new Map<string, NodeJS.Timeout>();

export async function scheduleReminder(
  requestId: string,
  delayMs: number
): Promise<void> {
  // Cancel existing reminder if any
  const existing = scheduledReminders.get(requestId);
  if (existing) {
    clearTimeout(existing);
  }

  // Schedule new reminder
  const timeout = setTimeout(async () => {
    await sendReminderEmail(requestId);
    scheduledReminders.delete(requestId);
  }, delayMs);

  scheduledReminders.set(requestId, timeout);
}

export async function checkPendingRequests(): Promise<void> {
  // Check for requests > 3 days in PENDING_MANAGER
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const staleRequests = await db
    .select()
    .from(manpowerRequest)
    .where(
      and(
        eq(manpowerRequest.status, "PENDING_MANAGER" as never),
        sql`${manpowerRequest.updatedAt} < ${threeDaysAgo}`
      )
    );

  for (const request of staleRequests) {
    await sendReminderEmail(request.id);
  }
}

export async function sendReminderEmail(requestId: string): Promise<void> {
  // Mock email sending
  const [request] = await db
    .select()
    .from(manpowerRequest)
    .where(eq(manpowerRequest.id, requestId))
    .limit(1);

  if (!request) {
    return;
  }

  // Get the manager who should approve
  const [requester] = await db
    .select()
    .from(user)
    .where(eq(user.id, request.requesterId))
    .limit(1);

  if (!requester) {
    return;
  }

  // Mock: Log reminder (in production, send actual email)
  console.log(
    `[REMINDER] Request ${request.requestCode} is pending approval for ${requester.email}`
  );

  // In production, use an email service like Resend, SendGrid, etc.
  // await emailService.send({
  //   to: managerEmail,
  //   subject: `Reminder: Approval needed for ${request.requestCode}`,
  //   body: `...`
  // });
}

// Run check every hour
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      checkPendingRequests().catch(console.error);
    },
    60 * 60 * 1000
  ); // 1 hour
}
