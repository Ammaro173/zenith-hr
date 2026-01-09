"use server";

import type { PushSubscription as WebPushSubscription } from "web-push";
import webpush from "web-push";
import { env } from "@/lib/env";

type ClientPushSubscription =
  | PushSubscription
  | {
      endpoint?: string;
      keys?: {
        p256dh?: string;
        auth?: string;
      };
    };

const toWebPushSubscription = (
  sub: ClientPushSubscription,
): WebPushSubscription => {
  const json = "toJSON" in sub ? sub.toJSON() : sub;
  const endpoint = json.endpoint ?? "";
  const auth = json.keys?.auth ?? "";
  const p256dh = json.keys?.p256dh ?? "";

  if (!(endpoint && auth && p256dh)) {
    throw new Error("Invalid push subscription payload");
  }

  return {
    endpoint,
    keys: {
      auth,
      p256dh,
    },
  };
};

webpush.setVapidDetails(
  "mailto:admin@q-auto.com", //!For example: 'https://my-site.com/contact' or 'mailto: contact@my-site.com'
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  env.VAPID_PRIVATE_KEY ?? "",
);

export async function subscribeUser(_sub: ClientPushSubscription) {
  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  await Promise.resolve();
  return { success: true };
}

export async function unsubscribeUser() {
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  await Promise.resolve();
  return { success: true };
}

export async function sendNotification(
  subscriptionData: ClientPushSubscription,
  message: string,
) {
  if (!subscriptionData) {
    throw new Error("No subscription available");
  }

  try {
    const parsedSubscription = toWebPushSubscription(subscriptionData);

    await webpush.sendNotification(
      parsedSubscription,
      JSON.stringify({
        title: "Test Notification",
        body: message,
        icon: "/favicon/favicon.svg",
      }),
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
