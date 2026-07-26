const CACHE_VERSION = 'levelmovie-v2';
const APP_SHELL = [
  './movie.html',
  './manifest.json',
  './icon-movie.svg'
];

// Bibliothèques figées par version dans leur URL : sans danger à mettre en cache longtemps.
const CDN_LIBS = [
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react@18.2.0/jsx-runtime',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://esm.sh/lucide-react@0.292.0'
];

// --- Firebase Cloud Messaging (fusionné ici : un seul Service Worker pour tout,
// pour éviter que deux SW enregistrés sur la même portée "/" se marchent dessus) ---
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA3JgvNu5p-43037jvm4WRDaJHI9ES7uGM",
  authDomain: "levelup-ia.firebaseapp.com",
  projectId: "levelup-ia",
  storageBucket: "levelup-ia.firebasestorage.app",
  messagingSenderId: "229420004282",
  appId: "1:229420004282:web:6735f059a947f0936ae383"
});

const messaging = firebase.messaging();
const recentlyHandled = new Set();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'LevelMovie';
  const body = payload?.notification?.body || payload?.data?.body || '';
  const icon = payload?.data?.icon || '/icon-movie.svg';
  const url = payload?.data?.url || '/movie';
  const key = `${title}|${body}|${Math.floor(Date.now() / 15000)}`;

  if (recentlyHandled.has(key)) return;

  self.registration.showNotification(title, {
    body, icon, badge: icon,
    vibrate: [200, 80, 200],
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/movie';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIF_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// --- Cycle de vie / cache PWA ---
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PAGE_HANDLED_NOTIF' && event.data?.key) {
    recentlyHandled.add(event.data.key);
    setTimeout(() => recentlyHandled.delete(event.data.key), 20000);
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jamais mettre en cache : API TMDB, Firebase/Firestore, notre propre API (/api/*), les flux vidéo des lecteurs.
  if (
    url.hostname.includes('themoviedb.org') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.pathname.startsWith('/api/') ||
    request.destination === 'iframe'
  ) {
    return; // laisse passer directement au réseau
  }

  // Bibliothèques CDN figées par version : cache d'abord, réseau en secours.
  if (CDN_LIBS.some((lib) => request.url.startsWith(lib))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, resClone));
        return res;
      }))
    );
    return;
  }

  // Le fichier app (movie.html) et le reste : réseau d'abord, cache en secours si hors-ligne.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request))
  );
});
