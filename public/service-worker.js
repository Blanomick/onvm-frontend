/* ONVM — service worker
   - Pages : réseau d'abord (toujours la dernière version en ligne),
     copie locale si pas de connexion.
   - Fichiers /static/ (noms uniques à chaque build) : cache d'abord.
   - Les appels au serveur (API, temps réel, Cloudinary) ne sont jamais
     mis en cache. */

const CACHE_STATIC = "onvm-static-v3";
const CACHE_PAGES = "onvm-pages-v3";
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
          fetch(request)
            .then((response) => {
              if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
              }
              return response;
            })
            .catch(() => Response.error())
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
          .catch(() => cached || Response.error());
        return cached || network;
      })
    )
  );
});

/* ------------------------------------------------------------------ */
/* Notifications push : appels, messages, activité                     */
/* ------------------------------------------------------------------ */

const API_URL = new URL(self.location.href).searchParams.get("api") || "";

async function visibleClient() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return windows.find((client) => client.visibilityState === "visible" && client.focused);
}

async function closeByTag(tag) {
  if (!tag) return;
  const list = await self.registration.getNotifications({ tag });
  list.forEach((notification) => notification.close());
}

// Appels déjà terminés : une sonnerie en retard ne doit pas réapparaître
const endedCalls = new Set();

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ONVM", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // Fin d'appel : on arrête la sonnerie, et on signale un appel manqué
      if (data.type === "call-end") {
        if (data.tag) endedCalls.add(data.tag);
        await closeByTag(data.tag);
        const missed =
          data.missed === true ||
          data.missed === "true" ||
          data.reason === "no-answer" ||
          data.reason === "disconnected";
        if (missed) {
          await self.registration.showNotification(data.title || "ONVM", {
            body: data.body || "Appel manqué",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: data.tag,
            data: { url: data.url || "/conversations" },
          });
        }
        return;
      }

      // Appli ouverte devant l'utilisateur : elle affiche déjà l'info
      if (await visibleClient()) return;

      const isCall = data.type === "call";

      // Sonnerie répétée : on ignore les rappels d'un appel fini ou expiré
      if (isCall) {
        if (data.tag && endedCalls.has(data.tag)) return;
        const expiresAt = Number(data.expiresAt);
        if (expiresAt && Date.now() > expiresAt) return;
      }

      const options = {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || undefined,
        // même « tag » : remplace la notification ET refait sonner/vibrer
        renotify: Boolean(data.tag),
        silent: false,
        timestamp: Date.now(),
        data,
        vibrate: isCall
          ? [800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800]
          : [200, 100, 200],
        requireInteraction: isCall,
        actions: isCall
          ? [
              { action: "answer", title: "Répondre" },
              { action: "decline", title: "Refuser" },
            ]
          : [],
      };

      await self.registration.showNotification(data.title || "ONVM", options);
    })()
  );
});

async function openApp(path) {
  const url = new URL(path || "/publication", self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const client = windows.find((item) => item.url.startsWith(self.location.origin));

  if (client) {
    await client.focus();
    try {
      await client.navigate(url);
    } catch {
      client.postMessage({ type: "onvm-open", url });
    }
    return;
  }
  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    (async () => {
      if (data.type === "call" && event.action === "decline") {
        if (API_URL) {
          await fetch(`${API_URL}/api/push/call-decline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callId: data.callId, userId: data.userId, sig: data.sig }),
          }).catch(() => undefined);
        }
        return;
      }

      if (data.type === "call") {
        // « Répondre » décroche directement ; un appui simple ouvre l'appel
        await openApp(event.action === "answer" ? data.answerUrl : data.url);
        return;
      }

      await openApp(data.url);
    })()
  );
});
