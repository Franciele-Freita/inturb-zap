self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Inturb Driver";

  const options = {
    body: payload.body || "Voce recebeu uma nova atualizacao.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || "inturb-driver-notification",
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: payload.url || "/",
      rideId: payload.rideId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
