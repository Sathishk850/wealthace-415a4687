/* Wealth Ace push handlers. Imported by the generated service worker
   (vite-plugin-pwa `workbox.importScripts`). Static file — not bundled. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Wealth Ace", body: event.data ? event.data.text() : "" };
  }
  const url = data.url || "/events";
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "Wealth Ace", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        tag: data.tag || "wealth-ace-event",
        data: { url: url, payload: data },
        vibrate: [200, 100, 200],
        requireInteraction: data.priority === "very-high" || data.priority === "high",
      });
      // Let any open window mirror this into the in-app notification bell.
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({ type: "PUSH_RECEIVED", url: url, payload: data });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/events";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: url });
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: event.oldSubscription?.options?.applicationServerKey })
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        }),
      )
      .catch(() => undefined),
  );
});
