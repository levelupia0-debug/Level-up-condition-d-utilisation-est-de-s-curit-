/**
 * 🔐 AUTH ROUTER - Gère la navigation Login <-> Dashboard
 * ✅ Redirige vers /login quand non authentifié
 * ✅ Affiche le dashboard quand authentifié  
 * ✅ Garde l'URL cohérente sans parasite
 */

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

const cfg = {
  apiKey: 'AIzaSyA3JgvNu5p-43037jvm4WRDaJHI9ES7uGM',
  authDomain: 'levelup-ecosystem.com',
  projectId: 'levelup-ia',
  storageBucket: 'levelup-ia.firebasestorage.app',
  messagingSenderId: '229420004282',
  appId: '1:229420004282:web:6735f059a947f0936ae383'
};

// On importe juste pour avoir l'auth (pas d'app init ici)
const auth = getAuth();

/**
 * Vérifie si l'utilisateur est connecté
 * @returns {Promise<boolean>} true si connecté, false sinon
 */
export function checkAuthState() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

/**
 * Redirige vers login
 */
export function redirectToLogin() {
  // Nettoie l'URL et redirige
  window.location.replace('/login');
}

/**
 * Affiche le dashboard (masque landing, affiche dashboard section)
 */
export function showDashboard() {
  const landing = document.getElementById('landing');
  const dashboard = document.getElementById('dashboard');
  
  if (landing) landing.style.display = 'none';
  if (dashboard) dashboard.style.display = 'flex';
  
  // Met à jour l'URL sans recharger
  if (window.location.pathname !== '/dashboard') {
    window.history.replaceState({}, '', '/dashboard');
  }
}

/**
 * Affiche l'accueil (masque dashboard, affiche landing)
 */
export function showHome() {
  const landing = document.getElementById('landing');
  const dashboard = document.getElementById('dashboard');
  
  if (landing) landing.style.display = 'block';
  if (dashboard) dashboard.style.display = 'none';
  
  // Met à jour l'URL
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/');
  }
}

/**
 * Initialise le router
 * Appelé au démarrage de l'app
 */
export async function initAuthRouter() {
  const isAuthenticated = await checkAuthState();
  const path = window.location.pathname;

  // Si l'utilisateur est sur /dashboard mais pas connecté → redirige login
  if (path === '/dashboard' && !isAuthenticated) {
    redirectToLogin();
    return;
  }

  // Si pas authentifié, affiche le home
  if (!isAuthenticated) {
    showHome();
  } else {
    // Si authentifié et path est /, affiche pas dashboard (reste sur home)
    // Si authentifié et path est /dashboard, affiche dashboard
    if (path === '/dashboard') {
      showDashboard();
    } else {
      showHome();
    }
  }
}

/**
 * Setup des boutons de navigation
 */
export function setupNavigation() {
  // Bouton "Me Connecter" → vers /login
  const loginBtn = document.getElementById('navLoginBtn') || 
                   document.querySelector('[data-action="login"]') ||
                   document.querySelector('a[href*="login"]');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      redirectToLogin();
    });
  }

  // Bouton "Accueil" → vers / + masque dashboard
  const homeBtn = document.getElementById('navHomeBtn') ||
                  document.querySelector('[data-action="home"]') ||
                  document.querySelector('a[href="/"]');
  
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showHome();
    });
  }

  // Bouton "Dashboard" → vers /dashboard + affiche dashboard
  const dashboardBtn = document.getElementById('navDashboardBtn') ||
                       document.querySelector('[data-action="dashboard"]') ||
                       document.querySelector('a[href*="dashboard"]');
  
  if (dashboardBtn && dashboardBtn !== loginBtn) {
    dashboardBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuth = await checkAuthState();
      if (isAuth) {
        showDashboard();
      } else {
        redirectToLogin();
      }
    });
  }
}

// Auto-init si le script est appelé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuthRouter();
    setupNavigation();
  });
} else {
  initAuthRouter();
  setupNavigation();
}
