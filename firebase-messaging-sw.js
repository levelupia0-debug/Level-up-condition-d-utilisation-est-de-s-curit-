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

// ─── ANTI-DOUBLON SW ──────────────────────────────────────────────────────────
// Fenêtre de dédup 30s basée sur le contenu — empêche 2 affichages du même push
const _shownKeys = new Set();

function _notifKey(title, body) {
    // Bucket de 15s : même notif dans la même fenêtre = doublon
    return `${title}|${body}|${Math.floor(Date.now() / 15000)}`;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
messaging.onBackgroundMessage(async (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'LevelUp Ecosystem';
    const body  = payload.notification?.body  || payload.data?.body  || 'Nouvelle notification.';
    const url   = payload.data?.url || APP_URL;
    const image = payload.data?.image || undefined;

    // ── 1. Anti-doublon contenu (même notif reçue 2x par FCM) ──
    const key = _notifKey(title, body);
    if (_shownKeys.has(key)) return;
    _shownKeys.add(key);
    setTimeout(() => _shownKeys.delete(key), 30000);

    // ── 2. CRITIQUE : si l'app est ouverte et visible, NE PAS afficher une
    //    notification système — envoyer le payload à la page à la place.
    //    La page a son propre onMessage() qui gère le toast in-app.
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focusedClient = allClients.find(c => c.focused);

    if (focusedClient) {
        // App active — on signale juste à la page qu'une notif est arrivée
        focusedClient.postMessage({ type: 'SW_FG_NOTIF', payload: { title, body, url } });
        return; // ← PAS de notification système = zéro doublon
    }

    // ── 3. App en arrière-plan : afficher la notification système ──
    // Tag unique basé sur le contenu pour que le navigateur fusionne les doublons
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

    // Si une notif avec le même tag est déjà affichée, la remplacer (renotify:false)
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
                    client.postMessage({ type: 'NOTIF_CLICK', url: full });
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
