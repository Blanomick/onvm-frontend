// service-worker.js
const CACHE_NAME = "onvm-cache-v1";
const urlsToCache = [
  "/", 
  "/index.html", 
  "/static/js/bundle.js", 
  "/static/js/main.chunk.js", 
  "/static/js/0.chunk.js", 
  "/images/icons/icon-192x192.png", 
  "/images/icons/icon-512x512.png"
];

// Installer le service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[LOG] Service worker installé, mais aucune ressource n'est mise en cache.");
      // Ne pas ajouter d'urls à mettre en cache pour forcer les requêtes réseau
      return Promise.resolve();
    })
  );
});

// Désactiver la mise en cache pour les requêtes réseau
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      console.log("[ERREUR] Impossible de récupérer les ressources, vérifiez votre connexion Internet.");
    })
  );
});

// Activer immédiatement le service worker mis à jour
self.addEventListener("activate", (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      console.log("[LOG] Service worker activé.");
    })
  );
});
