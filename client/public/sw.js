const CACHE_NAME = "pocketdevos-v1";

const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https — skip chrome-extension, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  // Don't cache API calls or WebSocket
  if (url.pathname.startsWith("/api") || request.headers.get("upgrade") === "websocket") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response && response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  try { cache.put(request, response.clone()); } catch (e) {}
                });
              }
            })
            .catch(() => {})
        );
        return cached;
      }

      return fetch(request).then((response) => {
        if (response && response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(request, clone); } catch (e) {}
          });
        }
        return response;
      }).catch(() => {
        return new Response("Offline", { status: 503 });
      });
    })
  );
});
