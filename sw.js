const CACHE = 'seyeon-closet-v7';
const FILES = ['./', './index.html', './game.css', './game.js', './data.js', './assets/assetRegistry.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then(cache => cache.addAll(FILES)),
    self.skipWaiting()
  ]));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('seyeon-closet-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Online: always prefer the newest file and refresh the offline cache.
// Offline: fall back to the last successfully cached response.
// This prevents assetRegistry.js/game.js from staying stale after new art is pushed.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(async response => {
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./');
        return Response.error();
      })
  );
});
