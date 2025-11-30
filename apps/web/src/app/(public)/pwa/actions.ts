"use server";

import webpush from "web-push";
import { env } from "@/lib/env";

webpush.setVapidDetails(
  "mailto:admin@q-auto.com", //!For example: 'https://my-site.com/contact' or 'mailto: contact@my-site.com'
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  env.VAPID_PRIVATE_KEY ?? ""
);

export async function subscribeUser(_sub: PushSubscription) {
  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  return { success: true };
}

export async function unsubscribeUser() {
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  return { success: true };
}

export async function sendNotification(
  subscriptionData: PushSubscription,
  message: string
) {
  if (!subscriptionData) {
    throw new Error("No subscription available");
  }

  try {
    await webpush.sendNotification(
      subscriptionData,
      JSON.stringify({
        title: "Test Notification",
        body: message,
        icon: "/favicon/favicon.svg",
      })
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
