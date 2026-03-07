self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/favicon/favicon.svg",
      badge: "/favicon/favicon.svg",
      vibrate: [100, 50, 100],
      tag: data.type || "QAuto-notification",
      data: {
        url: data.link,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // event.waitUntil(clients.openWindow(self.location.origin));
  const urlToOpen = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing app instance if open anywhere (to avoid duplicate SPA mounts)
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.startsWith(self.location.origin)) {
            // If the app is open but on a different route, navigate it there
            if ("navigate" in client) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  if (!event.oldSubscription) return; // Spec allows null on some browsers

  // Listen for browser-triggered key rotation/expiry and update the backend
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        // Fire API call to update the backend.
        // We use credentials: 'include' so Elysia/better-auth accepts the session cookie
        // silently without requiring a Bearer token in the SW.
        return fetch("/rpc/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: newSubscription.endpoint,
            keys: {
              p256dh: btoa(
                String.fromCharCode.apply(
                  null,
                  new Uint8Array(newSubscription.getKey("p256dh")),
                ),
              ),
              auth: btoa(
                String.fromCharCode.apply(
                  null,
                  new Uint8Array(newSubscription.getKey("auth")),
                ),
              ),
            },
          }),
          credentials: "include",
        });
      }),
  );
});
