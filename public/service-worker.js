/* ONVM — service worker
   - Pages : réseau d'abord (toujours la dernière version en ligne),
     copie locale si pas de connexion.
   - Fichiers /static/ (noms uniques à chaque build) : cache d'abord.
   - Les appels au serveur (API, temps réel, Cloudinary) ne sont jamais
     mis en cache. */

const CACHE_STATIC = "onvm-static-v2";
const CACHE_PAGES = "onvm-pages-v2";
const KEEP = [CACHE_STATIC, CACHE_PAGES];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then((cache) => cache.addAll(["/index.html", "/manifest.json"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !KEEP.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname === "/asset-manifest.json" ||
    url.pathname === "/service-worker.js"
  ) {
    return;
  }

  // Navigation : réseau d'abord
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_PAGES).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then(
            (cached) =>
              cached ||
              new Response("<h1>Hors connexion</h1><p>Reconnecte-toi à Internet.</p>", {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
          )
        )
    );
    return;
  }

  // Fichiers versionnés du build : cache d'abord
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Images, icônes… : version en cache tout de suite, mise à jour en fond
  event.respondWith(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
