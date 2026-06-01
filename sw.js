const CACHE_NAME = 'levelup-cache-v2'; // On passe en V2 pour forcer la maj

// Fichiers à mettre en cache
const ASSETS_TO_CACHE = [
  '/mobile',
  '/mobile.html',
  '/manifest-mobile.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // L'option ignoreSearch est vitale pour matcher "/mobile?pwa=1" avec le "/mobile" en cache
      return caches.match(event.request, { ignoreSearch: true });
    })
  );
});
