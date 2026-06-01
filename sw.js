const CACHE_NAME = 'levelup-cache-v1';

// Fichiers à mettre en cache pour un lancement ultra-rapide
const ASSETS_TO_CACHE = [
  '/mobile.html',
  '/manifest-mobile.json',
  '/icon.svg'
];

// 1. Installation : On met en cache les fichiers de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activation : On nettoie les vieux caches s'il y a eu une mise à jour
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

// 3. Interception (Fetch) : Stratégie "Network First"
// On essaie de récupérer la donnée sur internet pour avoir les actus fraîches,
// et si pas de réseau (mode hors-ligne), on renvoie ce qu'il y a dans le cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
