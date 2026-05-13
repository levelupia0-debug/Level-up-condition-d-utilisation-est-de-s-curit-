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

// ─── ANTI-DOUBLON ─────────────────────────────────────────────────────────────
// On ne montre jamais le même (title+body) deux fois dans la même fenêtre de 15s
const _shownKeys = new Set();
function _notifKey(title, body) {
    return `${title}|${body}|${Math.floor(Date.now() / 15000)}`;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
// RÈGLE UNIQUE : le SW est la SEULE source de notifications système.
// La page (onMessage) gère les toasts in-app ; le SW gère le reste.
// → Zéro doublon garanti.
messaging.onBackgroundMessage(async (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'LevelUp Ecosystem';
    const body  = payload.notification?.body  || payload.data?.body  || 'Nouvelle notification.';
    const url   = payload.data?.url || APP_URL;
    const image = payload.data?.image || undefined;

    // 1. Dédup — même message reçu deux fois par FCM (rare mais possible)
    const key = _notifKey(title, body);
    if (_shownKeys.has(key)) return;
    _shownKeys.add(key);
    setTimeout(() => _shownKeys.delete(key), 30000);

    // 2. Si l'app est OUVERTE ET VISIBLE : on ne montre PAS de notification système.
    //    onMessage() dans la page s'en charge déjà via le toast in-app.
    //    → NE PAS envoyer SW_FG_NOTIF : ce postMessage causait un deuxième toast.
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visibleClient = allClients.find(c => c.visibilityState === 'visible');
    if (visibleClient) return; // page visible → onMessage() gère → on s'arrête ici

    // 3. App en arrière-plan ou fermée → notification système
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
self.addEventListener('fetch', () => {});
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
