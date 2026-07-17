// 1. Définition des caches distincts
const CACHE_MOBILE = 'levelup-mobile-v3';
const CACHE_MOVIE = 'levelmovie-v1';

const ASSETS_MOBILE = [
  '/mobile',
  '/mobile.html',
  '/manifest-mobile.json',
  '/icon.svg'
];

const APP_SHELL_MOVIE = [
  './movie.html',
  './manifest.json',
  './icon-movie.svg'
];

const CDN_LIBS_MOVIE = [
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react@18.2.0/jsx-runtime',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://esm.sh/lucide-react@0.292.0'
];

// --- INSTALLATION ---
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_MOBILE).then((cache) => cache.addAll(ASSETS_MOBILE)),
      caches.open(CACHE_MOVIE).then((cache) => cache.addAll(APP_SHELL_MOVIE).catch(() => {}))
    ])
  );
});

// --- ACTIVATION (Nettoyage ultra sécurisé) ---
self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // On supprime uniquement les anciens caches mobiles
          if (cacheName.startsWith('levelup-mobile-') && cacheName !== CACHE_MOBILE) {
            return caches.delete(cacheName);
          }
          // On supprime uniquement les anciens caches de movie
          if (cacheName.startsWith('levelmovie-') && cacheName !== CACHE_MOVIE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- STRATÉGIE DE FETCH ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Sécurité globale : Ignore les requêtes externes sauf les CDN autorisés
  const isInternal = url.origin === self.location.origin;
  const isCdnLib = CDN_LIBS_MOVIE.some((lib) => request.url.startsWith(lib));
  
  if (!isInternal && !isCdnLib) return;

  // --- FILTRE D'EXCLUSION (TMDB, Firebase, APIs, Iframes) ---
  if (
    url.hostname.includes('themoviedb.org') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.pathname.startsWith('/api/') ||
    request.destination === 'iframe'
  ) {
    return; // Direct réseau
  }

  // --- 1. STRATÉGIE POUR LES LIBS CDN (Cache first) ---
  if (isCdnLib) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_MOVIE).then((cache) => cache.put(request, resClone));
          return res;
        });
      })
    );
    return;
  }

  // --- 2. STRATÉGIE POUR L'APPLICATION MOBILE (Réseau d'abord, sinon cache) ---
  if (url.pathname.startsWith('/mobile')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request, { ignoreSearch: true }))
    );
    return;
  }

  // --- 3. STRATÉGIE POUR LEVELMOVIE (Réseau d'abord, puis mise à jour du cache) ---
  event.respondWith(
    fetch(request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_MOVIE).then((cache) => cache.put(request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request))
  );
});
