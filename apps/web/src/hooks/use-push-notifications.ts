"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { env } from "../lib/env";
import { orpc } from "../utils/orpc";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  const { mutateAsync: saveSubscription } = useMutation(
    orpc.push.subscribe.mutationOptions(),
  );

  const { mutateAsync: removeSubscription } = useMutation(
    orpc.push.unsubscribe.mutationOptions(),
  );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const unsubscribe = async () => {
    if (!subscription) {
      return;
    }

    try {
      await subscription.unsubscribe();
      await removeSubscription({ endpoint: subscription.endpoint });
      setSubscription(null);
      toast.success("Push notifications disabled");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to unsubscribe from push notifications:", error);
      toast.error(`Unsubscribe failed: ${message}`);
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported by your browser");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
        ),
      });

      const p256dhBuffer = sub.getKey("p256dh");
      const authBuffer = sub.getKey("auth");

      if (!(p256dhBuffer && authBuffer)) {
        throw new Error("Failed to get subscription keys");
      }

      const p256dh = btoa(
        String.fromCharCode.apply(
          null,
          Array.from(new Uint8Array(p256dhBuffer)),
        ),
      );
      const auth = btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(authBuffer))),
      );

      await saveSubscription({
        endpoint: sub.endpoint,
        keys: {
          p256dh,
          auth,
        },
      });

      setSubscription(sub);
      setPermission(Notification.permission);
      toast.success("Push notifications enabled!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to subscribe to push notifications:", error);
      toast.error(`Subscription failed: ${message}`);
    }
  };

  return {
    isSupported,
    subscription,
    permission,
    subscribe,
    unsubscribe,
  };
}
