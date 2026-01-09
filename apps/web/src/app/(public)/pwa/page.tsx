"use client";

import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle,
  Info,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { sendNotification, subscribeUser, unsubscribeUser } from "./actions";

// Base64 URL decoding constants
const BASE64_PADDING_CHAR = "=";
const BASE64_URL_CHARS = { "-": "+", _: "/" };

// Base64 decoding constants
const BASE64_BLOCK_SIZE = 4;

// iOS detection regex
const IOS_REGEX = /iPad|iPhone|iPod/;

function urlBase64ToUint8Array(base64String: string) {
  const paddingLength =
    (BASE64_BLOCK_SIZE - (base64String.length % BASE64_BLOCK_SIZE)) %
    BASE64_BLOCK_SIZE;
  const padding = BASE64_PADDING_CHAR.repeat(paddingLength);
  const base64 = (base64String + padding)
    .replace(/-/g, BASE64_URL_CHARS["-"])
    .replace(/_/g, BASE64_URL_CHARS._);

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true); //TODO useTransition
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerServiceWorker = useCallback(
    async (setSubscriptionCallback: (sub: PushSubscription | null) => void) => {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const sub = await registration.pushManager.getSubscription();
      setSubscriptionCallback(sub);
    },
    [],
  );

  const checkSupport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!("serviceWorker" in navigator && "PushManager" in window)) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    try {
      await registerServiceWorker(setSubscription);
      setIsSupported(true);
    } catch {
      setError("Failed to initialize push notifications");
      setIsSupported(false);
    } finally {
      setIsLoading(false);
    }
  }, [registerServiceWorker]);

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  async function subscribeToPush() {
    setIsSubscribing(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
        ),
      });
      setSubscription(sub);
      const serializedSub = sub.toJSON();
      await subscribeUser(serializedSub);
    } catch {
      setError("Failed to subscribe to push notifications");
    } finally {
      setIsSubscribing(false);
    }
  }

  async function unsubscribeFromPush() {
    setIsUnsubscribing(true);
    setError(null);

    try {
      await subscription?.unsubscribe();
      setSubscription(null);
      await unsubscribeUser();
    } catch {
      setError("Failed to unsubscribe from push notifications");
    } finally {
      setIsUnsubscribing(false);
    }
  }

  async function sendTestNotification() {
    if (!subscription) {
      return;
    }

    if (!message.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Serialize the PushSubscription to a plain object
      const encodeKey = (key: ArrayBuffer | null) =>
        key ? btoa(String.fromCharCode(...new Uint8Array(key))) : undefined;

      const serializedSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: encodeKey(subscription.getKey("p256dh")),
          auth: encodeKey(subscription.getKey("auth")),
        },
      };

      await sendNotification(serializedSubscription, message.trim());
      setMessage("");
    } catch {
      setError("Failed to send test notification");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-destructive" />
            <CardTitle>Push Notifications Unavailable</CardTitle>
          </div>
          <CardDescription>
            Your browser doesn't support push notifications or service workers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              Try using a modern browser like Chrome, Firefox, or Safari for the
              best experience.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {subscription ? (
              <CheckCircle className="size-5 text-green-500" />
            ) : (
              <Bell className="size-5 text-muted-foreground" />
            )}
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <Badge variant={subscription ? "default" : "secondary"}>
            {subscription ? "Subscribed" : "Not Subscribed"}
          </Badge>
        </div>
        <CardDescription>
          {subscription
            ? "You're subscribed to receive push notifications from this app."
            : "Subscribe to receive push notifications even when the app is closed."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {Boolean(error) && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="size-4 text-green-500" />
              Successfully subscribed to push notifications
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="notification-message">
                Send Test Notification
              </Label>
              <div className="flex gap-2">
                <Input
                  id="notification-message"
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && sendTestNotification()
                  }
                  placeholder="Enter your test message..."
                  value={message}
                />
                <Button
                  className="shrink-0"
                  disabled={!message.trim() || isSending}
                  onClick={sendTestNotification}
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={isUnsubscribing}
              onClick={unsubscribeFromPush}
              variant="outline"
            >
              {isUnsubscribing ? (
                "Unsubscribing..."
              ) : (
                <>
                  <BellOff className="me-2 size-4" />
                  Unsubscribe
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Bell className="mt-0.5 size-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Stay Updated</p>
                <p className="text-muted-foreground text-sm">
                  Get notified about important updates, messages, and
                  activities.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={isSubscribing}
              onClick={subscribeToPush}
              size="lg"
            >
              {isSubscribing ? (
                "Subscribing..."
              ) : (
                <>
                  <Bell className="me-2 size-4" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstallPrompt() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const isIOS =
      IOS_REGEX.test(navigator.userAgent) &&
      !(window as unknown as { msStream?: unknown }).msStream;
    setIsIos(isIOS);

    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    // Check for PWA install prompt availability
    if ("onbeforeinstallprompt" in window) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () =>
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      const promptEvent = deferredPrompt as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  if (isStandalone) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <CheckCircle className="size-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  App Installed Successfully!
                </p>
                <p className="text-green-600 text-sm dark:text-green-300">
                  The app is now installed and ready to use.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                <Info className="mt-0.5 size-4 text-blue-600" />
                <div className="space-y-2">
                  <p className="font-medium text-blue-800 text-sm dark:text-blue-200">
                    Want to reinstall?
                  </p>
                  <div className="space-y-1 text-blue-600 text-sm dark:text-blue-300">
                    <p>
                      • First, uninstall the app from your home screen/desktop
                    </p>
                    <p>
                      • Then refresh this page to show the install option again
                    </p>
                    <p>• Or clear your browser data and reload the page</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="size-5 text-muted-foreground" />
          <CardTitle>Install App</CardTitle>
        </div>
        <CardDescription>
          Install this app on your device for a better experience and quick
          access.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isInstallable ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <Info className="mt-0.5 size-5 text-blue-600" />
              <div className="space-y-1">
                <p className="font-medium text-blue-800 text-sm dark:text-blue-200">
                  Ready to Install
                </p>
                <p className="text-blue-600 text-sm dark:text-blue-300">
                  Click the button below to install the app on your device.
                </p>
              </div>
            </div>

            <Button className="w-full" onClick={handleInstallClick} size="lg">
              <Smartphone className="me-2 size-4" />
              Install App
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Smartphone className="mt-0.5 size-5 text-muted-foreground" />
              <div className="space-y-2">
                <p className="font-medium text-sm">Desktop Installation</p>
                <p className="text-muted-foreground text-sm">
                  On desktop, you can install this app by clicking the install
                  icon in your browser's address bar or using the browser menu.
                </p>
              </div>
            </div>

            {isIos ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                    <Smartphone className="mt-0.5 size-5 text-amber-600" />
                    <div className="space-y-1">
                      <p className="font-medium text-amber-800 text-sm dark:text-amber-200">
                        iOS Installation
                      </p>
                      <p className="text-amber-600 text-sm dark:text-amber-300">
                        To install on iOS, tap the share button and select "Add
                        to Home Screen".
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span>Share button:</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs">⎋</kbd>
                    <span>→</span>
                    <span>Add to Home Screen:</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs">➕</kbd>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            Progressive Web App
          </h1>
          <p className="text-muted-foreground">
            Experience native-like features with modern web technologies
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PushNotificationManager />
          <InstallPrompt />
        </div>

        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg">What is a PWA?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm">
            <p>
              A Progressive Web App (PWA) combines the best of web and mobile
              apps. It can be installed on your device, work offline, send push
              notifications, and provide a native-like experience.
            </p>
            <div className="grid gap-2 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                <span>Installable on desktop and mobile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                <span>Works offline with cached content</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                <span>Push notifications for updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" />
                <span>Fast loading and responsive design</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
