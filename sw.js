const CACHE = 'seyeon-closet-v7';
const FILES = ['./', './index.html', './game.css', './game.js', './data.js', './assets/assetRegistry.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => event.waitUntil(Promise.all([caches.open(CACHE).then(cache => cache.addAll(FILES)), self.skipWaiting()])));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('seyeon-closet-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  }))));
});
