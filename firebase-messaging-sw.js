importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA3JgvNu5p-43037jvm4WRDaJHI9ES7uGM",
    authDomain: "levelup-ia.firebaseapp.com",
    projectId: "levelup-ia",
    storageBucket: "levelup-ia.firebasestorage.app",
    messagingSenderId: "229420004282",
    appId: "1:229420004282:web:6735f059a947f0936ae383",
    measurementId: "G-MSRDY2574K"
};

// Initialisation de Firebase en arrière-plan
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gère les notifications reçues quand l'application est fermée (en arrière-plan)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan ', payload);
    
    // Titre Premium par défaut si aucun titre n'est envoyé (Supporte les payloads 'notification' et 'data')
    const notificationTitle = payload.notification?.title || payload.data?.title || '🌟 Level IA Premium';
    
    // Options de la notification (Design, Icone, Vibration)
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Nouvelle information de ton assistant.',
        icon: './icon.svg', // Ton étoile brillante en SVG
        badge: './icon.svg', // Petite icône dans la barre d'état Android
        vibrate: [300, 100, 400, 100, 400, 100, 300], // Vibration personnalisée
        requireInteraction: true, // Force la notification à rester à l'écran jusqu'à ce qu'on clique dessus
        data: payload.data // On passe les données pour pouvoir les utiliser lors du clic
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Écouteur pour le clic sur la notification : Ouvre l'application
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // L'URL à ouvrir ou focus
    const urlToOpen = new URL('./index.html', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // S'il y a déjà une fenêtre de l'app ouverte, on la met au premier plan
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Sinon, on ouvre un nouvel onglet avec l'app
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// =========================================================================
// LIGNE MAGIQUE OBLIGATOIRE POUR QUE CHROME VALIDE L'INSTALLATION DE LA PWA
// =========================================================================
self.addEventListener('fetch', function(event) {
    // Un simple écouteur vide suffit pour débloquer l'installation PWA !
});

// Forcer l'activation immédiate du Service Worker
self.addEventListener('install', function(event) {
    self.skipWaiting();
});
self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});
