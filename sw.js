const CACHE_NAME = 'levelup-mobile-v3'; // Nom de cache spécifique à l'app mobile

const ASSETS_TO_CACHE = [
  '/mobile',
  '/mobile.html',
  '/manifest-mobile.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 🚨 CORRECTION CRUCIALE : On supprime UNIQUEMENT les anciens caches de "mobile".
          // On ne touche PLUS aux caches des autres apps (LevelMovie, LevelMusic, etc.)
          if (cacheName.startsWith('levelup-mobile-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Sécurité : On ignore les requêtes externes (API, TMDB, Firebase) pour ne rien casser
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request, { ignoreSearch: true });
    })
  );
});
