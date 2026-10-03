const CACHE = 'seyeon-closet-v45';
const FILES = ['./', './index.html', './game.css', './game.js', './fit-engine.js', './data.js', './outfit-rules.js', './assets/assetRegistry.js', './manifest.webmanifest', './icon.svg', './assets/runtime/characters/girl01.webp', './assets/runtime/characters/dressable/girl01.webp', './assets/runtime/characters/dressable/girl02.webp', './assets/runtime/characters/dressable/bear01.webp', './assets/runtime/characters/dressable/rabbit01.webp', './assets/runtime/characters/girl02.webp', './assets/runtime/characters/bear01.webp', './assets/runtime/characters/rabbit01.webp', './assets/runtime/characters/rabbit01_hair01.webp', './assets/runtime/characters/rabbit01_hair03.webp', './assets/runtime/characters/rabbit01_hair07.webp', './assets/runtime/characters/rabbit01_hair01_dressable.webp', './assets/runtime/characters/rabbit01_hair03_dressable.webp', './assets/runtime/characters/rabbit01_hair07_dressable.webp', './assets/runtime/clothes/shoes_02.webp', './assets/runtime/clothes/top_01_v2.webp', './assets/runtime/clothes/top_02_v1.webp', './assets/runtime/clothes/top_03_v1.webp', './assets/runtime/clothes/top_04_v1.webp', './assets/runtime/clothes/top_05_v1.webp', './assets/runtime/clothes/hair_06_v3.webp', './assets/runtime/clothes/hair_07_v2.webp', './assets/runtime/clothes/hair_08_v1.webp', './assets/runtime/clothes/hat_04_v1.webp', './assets/runtime/clothes/hat_01_v1.webp', './assets/runtime/clothes/hat_02_v1.webp', './assets/runtime/clothes/hat_03_v1.webp', './assets/runtime/clothes/hat_05_v1.webp', './assets/runtime/clothes/hat_06_v1.webp', './assets/runtime/clothes/hat_07_v1.webp', './assets/runtime/clothes/hat_08_v1.webp', './assets/runtime/clothes/hat_09_v1.webp', './assets/runtime/clothes/hat_10_v1.webp'];

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
        if (response.status === 200) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put(event.request, response.clone());
          } catch { /* Partial or unsupported responses must still reach the audio player. */ }
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
