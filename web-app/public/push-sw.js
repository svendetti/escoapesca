self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "EscoAPesca";
  const options = {
    body: data.body || "Hai un nuovo aggiornamento.",
    icon: "/logo-escoapesca.svg",
    badge: "/logo-escoapesca.svg",
    tag: data.tag || "escoapesca-update",
    renotify: true,
    silent: false,
    vibrate: [220, 90, 220],
    data: { url: data.url || "/notifiche" },
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "escoapesca:push-received" }));
    }),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/notifiche", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    for (const client of clients) {
      if ("focus" in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  }));
});
