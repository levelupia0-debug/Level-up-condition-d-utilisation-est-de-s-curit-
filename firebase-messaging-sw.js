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
    
    // Titre Premium par défaut si aucun titre n'est envoyé
    const notificationTitle = payload.notification?.title || '🌟 Level IA Premium';
    
    // Options de la notification (Design, Icone, Vibration)
    const notificationOptions = {
        body: payload.notification?.body || 'Nouvelle information de ton assistant.',
        icon: './icon.svg', // Ton étoile brillante en SVG
        badge: './icon.svg', // Petite icône dans la barre d'état Android
        vibrate: [300, 100, 400, 100, 400, 100, 300], // Vibration personnalisée
        requireInteraction: true // Force la notification à rester à l'écran jusqu'à ce qu'on clique dessus
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// =========================================================================
// LIGNE MAGIQUE OBLIGATOIRE POUR QUE CHROME VALIDE L'INSTALLATION DE LA PWA
// =========================================================================
self.addEventListener('fetch', function(event) {
    // Un simple écouteur vide suffit pour débloquer l'installation PWA !
});
