import type { DB } from "@zenith-hr/db";
import { notification } from "@zenith-hr/db/schema/notifications";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";
import { env } from "../../env";
import { notificationEmitter } from "./emitter";

export const createNotificationsService = (db: DB) => {
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  return {
    async createNotification(
      userId: string,
      title: string,
      body: string,
      type: "INFO" | "ACTION_REQUIRED" | "REMINDER" = "INFO",
      link?: string,
      email?: string,
    ) {
      // 1. Insert into DB
      const [newNotification] = await db
        .insert(notification)
        .values({
          userId,
          title,
          body,
          type,
          link: link || null,
        })
        .returning();

      if (newNotification) {
        // Emit event for active SSE connections
        notificationEmitter.emit(`notification:${userId}`, newNotification);
      }

      // 2. Send Email if requested (fire and forget pattern)
      if (email && resend && env.EMAIL_FROM) {
        resend.emails
          .send({
            from: env.EMAIL_FROM,
            to: email,
            subject: title,
            html: `<p>${body}</p>${link ? `<p><a href="${link}">View Details</a></p>` : ""}`,
          })
          .catch((err) => console.error("Resend error:", err)); // Non-blocking
      }

      return newNotification;
    },

    async getUserNotifications(userId: string, limit = 10) {
      const items = await db
        .select({
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          link: notification.link,
          readAt: notification.readAt,
          createdAt: notification.createdAt,
        })
        .from(notification)
        .where(eq(notification.userId, userId))
        .orderBy(desc(notification.createdAt))
        .limit(limit);

      return items;
    },

    async markAsRead(id: string, userId: string) {
      const [updated] = await db
        .update(notification)
        .set({ readAt: new Date() })
        .where(and(eq(notification.id, id), eq(notification.userId, userId)))
        .returning();
      return updated;
    },

    async getUnreadCount(userId: string) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notification)
        .where(
          and(eq(notification.userId, userId), isNull(notification.readAt)),
        );
      return result[0]?.count ?? 0;
    },
  };
};

export type NotificationsService = ReturnType<
  typeof createNotificationsService
>;
