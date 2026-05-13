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

// ─── ANTI-DOUBLON contenu ────────────────────────────────────────────────────
const _shownKeys    = new Set();
const _handledByPage = new Set(); // ← clés signalées par onMessage() de la page

function _notifKey(title, body) {
    return `${title}|${body}|${Math.floor(Date.now() / 15000)}`;
}

// ─── La page signale qu'elle a géré un message (fix iOS) ─────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'PAGE_HANDLED_NOTIF') {
        _handledByPage.add(event.data.key);
        setTimeout(() => _handledByPage.delete(event.data.key), 10000);
    }
});

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
messaging.onBackgroundMessage(async (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'LevelUp Ecosystem';
    const body  = payload.notification?.body  || payload.data?.body  || 'Nouvelle notification.';
    const url   = payload.data?.url || APP_URL;
    const image = payload.data?.image || undefined;

    // 1. Dédup contenu — même message reçu deux fois par FCM
    const key = _notifKey(title, body);
    if (_shownKeys.has(key)) return;
    _shownKeys.add(key);
    setTimeout(() => _shownKeys.delete(key), 30000);

    // 2. FIX iOS DOUBLE NOTIF :
    //    Sur Android, `visibilityState` fonctionne.
    //    Sur iOS, `focused` est plus fiable.
    //    On attend 300ms pour laisser la page envoyer PAGE_HANDLED_NOTIF.
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appIsOpen  = allClients.some(c => c.focused === true || c.visibilityState === 'visible');

    if (appIsOpen) {
        // Attendre que onMessage() de la page nous signale s'il a géré le message
        await new Promise(r => setTimeout(r, 300));
        if (_handledByPage.has(key)) return; // page l'a géré → pas de doublon
        return; // app ouverte même sans signal → onMessage() gère le toast
    }

    // 3. App en arrière-plan ou fermée → notification système unique
    const tag = `lvlup-${btoa(unescape(encodeURIComponent(title + body))).slice(0, 20)}`;
    const options = {
        body,
        icon:               ICON_URL,
        badge:              ICON_URL,
        vibrate:            [200, 80, 200],
        requireInteraction: false,
        tag,
        renotify:           false,
        silent:             false,
        data:               { url, ...payload.data }
    };
    if (image) options.image = image;

    await self.registration.showNotification(title, options);
});

// ─── CLIC SUR NOTIF ──────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || APP_URL;
    const full   = target.startsWith('http') ? target : new URL(target, self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow ? clients.openWindow(full) : null;
        })
    );
});

// ─── LIFECYCLE ────────────────────────────────────────────────────────────────
self.addEventListener('fetch',    () => {});
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
