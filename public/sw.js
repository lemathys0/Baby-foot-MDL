const cacheName = "babyfoot-cache-v2-20251120";
const assetsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./pari.js",
  "./firebase-config.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assetsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  // Si le message est 'SKIP_WAITING', forcez le Service Worker à s'activer immédiatement
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Facultatif: Pour s'assurer que le nouveau SW prend le contrôle de tous les clients
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
