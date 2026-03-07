import type { DB } from "@zenith-hr/db";
import { notification } from "@zenith-hr/db/schema/notifications";
import { pushSubscription } from "@zenith-hr/db/schema/push-subscriptions";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { Resend } from "resend";
import webpush from "web-push";
import { env } from "../../env";
import { notificationEmitter } from "./emitter";
import type { PushSubscriptionInput } from "./push.schema";

export const createNotificationsService = (db: DB) => {
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
  }

  const sendPushNotification = async (
    userId: string,
    payload: { title: string; body: string; type: string; link: string },
  ) => {
    if (!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)) {
      return;
    }

    const subscriptions = await db
      .select()
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, userId));

    const payloadString = JSON.stringify(payload);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payloadString,
          );
        } catch (error: unknown) {
          if (error instanceof webpush.WebPushError) {
            const statusCode = error.statusCode;
            const message = error.message;
            // Handle expired/revoked subscriptions (410 Gone or 404 Not Found)
            if (statusCode === 410 || statusCode === 404) {
              console.info(
                `[notifications] Cleaning up dead push subscription: ${sub.id}`,
              );
              await db
                .delete(pushSubscription)
                .where(eq(pushSubscription.id, sub.id))
                .catch(console.error);
            } else if (statusCode === 401) {
              console.error(
                "[notifications] CRITICAL_ERROR: VAPID keys are unauthorized/badly configured",
              );
            } else {
              console.warn(
                `[notifications] Failed to send push to ${sub.id}:`,
                message,
              );
            }
          } else {
            console.warn(
              `[notifications] Failed to send push to ${sub.id}:`,
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        }
      }),
    );
  };

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

        // 2. Send Web Push (fire and forget)
        sendPushNotification(userId, {
          title,
          body,
          type,
          link: link || "/",
        }).catch((err) =>
          console.error("[notifications] Push dispatch failed:", err),
        );
      }

      // 3. Send Email if requested (fire and forget pattern)
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

    sendPushNotification,

    async deletePushSubscription(userId: string, endpoint: string) {
      await db
        .delete(pushSubscription)
        .where(
          and(
            eq(pushSubscription.userId, userId),
            eq(pushSubscription.endpoint, endpoint),
          ),
        );
      return { success: true };
    },

    async savePushSubscription(userId: string, input: PushSubscriptionInput) {
      const [saved] = await db
        .insert(pushSubscription)
        .values({
          userId,
          endpoint: input.endpoint,
          keys: input.keys,
        })
        .onConflictDoUpdate({
          target: [pushSubscription.userId, pushSubscription.endpoint],
          set: {
            keys: input.keys,
          },
        })
        .returning();

      return saved;
    },

    async getUserNotifications(userId: string, limit = 10, cursor?: string) {
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
        .where(
          and(
            eq(notification.userId, userId),
            cursor ? lt(notification.createdAt, new Date(cursor)) : undefined,
          ),
        )
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
