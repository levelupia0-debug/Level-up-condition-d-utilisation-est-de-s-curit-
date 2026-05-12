importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyA3JgvNu5p-43037jvm4WRDaJHI9ES7uGM",
    authDomain: "levelup-ecosystem.com",
    projectId: "levelup-ia",
    storageBucket: "levelup-ia.firebasestorage.app",
    messagingSenderId: "229420004282",
    appId: "1:229420004282:web:6735f059a947f0936ae383"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const ICON_URL = '/icon.svg';
const APP_URL  = 'https://levelup-ecosystem.com';

// Cache anti-doublon : mémorise les IDs des notifs affichées dans les 30 dernières secondes
const _recentNotifKeys = new Set();

function _getNotifKey(title, body) {
    return `${title}|${body}|${Math.floor(Date.now() / 15000)}`; // fenêtre 15s
}

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'LevelUp Ecosystem';
    const body  = payload.notification?.body  || payload.data?.body  || 'Nouvelle notification.';
    const url   = payload.data?.url           || APP_URL;
    const image = payload.data?.image         || undefined;

    // Anti-doublon SW : si même notif reçue dans la fenêtre de 15s, ignorer
    const key = _getNotifKey(title, body);
    if (_recentNotifKeys.has(key)) return;
    _recentNotifKeys.add(key);
    setTimeout(() => _recentNotifKeys.delete(key), 30000);

    // Tag unique basé sur le contenu — empêche le navigateur d'en stacker deux identiques
    const tag = `lvlup-${btoa(unescape(encodeURIComponent(title + body))).slice(0, 16)}`;

    const options = {
        body,
        icon:               ICON_URL,
        badge:              ICON_URL,
        vibrate:            [300, 100, 400, 100, 300],
        requireInteraction: true,
        tag,
        renotify:           false,
        silent:             false,
        data:               { url, ...payload.data }
    };
    if (image) options.image = image;

    self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || APP_URL;
    const full   = target.startsWith('http') ? target : new URL(target, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            // Chercher un onglet déjà ouvert sur le domaine et le focus au lieu d'en ouvrir un nouveau
            for (const client of list) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NOTIF_CLICK', url: full });
                    return client.focus();
                }
            }
            return clients.openWindow ? clients.openWindow(full) : null;
        })
    );
});

self.addEventListener('fetch', () => {});
self.addEventListener('install',  ()  => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
