// 🔥 public/firebase-messaging-sw.js - Service Worker Unifié
// Version: 3.0.0 - Firebase + Cache + PWA

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ===========================
// CONFIGURATION FIREBASE
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyCbAU10zAKrvv9WJtapj1uBTQhKAlZrhXg",
  authDomain: "baby-footv2.firebaseapp.com",
  projectId: "baby-footv2",
  storageBucket: "baby-footv2.appspot.com",
  messagingSenderId: "630738367010",
  appId: "1:630738367010:web:8070effcead46645d7507b"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ===========================
// CONFIGURATION DES CACHES
// ===========================
const CACHE_VERSION = 'v3.0.0';
const CACHE_NAME = `babyfoot-app-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;
const IMAGES_CACHE = `images-${CACHE_VERSION}`;

const ESSENTIAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/logo-192.png',
  '/icons/logo-512.png'
];

// ===========================
// INSTALLATION
// ===========================
self.addEventListener('install', (event) => {
  console.log('🚀 [SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_ASSETS))
      .then(() => console.log('✅ [SW] Installation réussie'))
      .catch(err => console.error('❌ [SW] Erreur installation:', err))
  );
  
  self.skipWaiting();
});

// ===========================
// ACTIVATION
// ===========================
self.addEventListener('activate', (event) => {
  console.log('🔄 [SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('babyfoot-') && name !== CACHE_NAME)
            .map(name => {
              console.log('🗑️ [SW] Suppression:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => console.log('✅ [SW] Activation réussie'))
  );
  
  self.clients.claim();
});

// ===========================
// STRATÉGIES DE CACHE
// ===========================
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('📦 [SW] Cache offline:', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// ===========================
// INTERCEPTION DES REQUÊTES
// ===========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer non-GET
  if (request.method !== 'GET') return;
  
  // Ignorer Firebase et extensions
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.protocol.includes('-extension:')
  ) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Images des cartes
        if (url.pathname.startsWith('/images/cards/')) {
          return await cacheFirst(request, IMAGES_CACHE);
        }
        
        // Assets statiques
        if (
          url.pathname.match(/\.(css|js|woff2?|png|jpg|svg|ico)$/) ||
          url.pathname.startsWith('/icons/')
        ) {
          return await cacheFirst(request, ASSETS_CACHE);
        }
        
        // HTML pages
        if (
          request.headers.get('accept')?.includes('text/html') ||
          url.pathname === '/'
        ) {
          return await networkFirst(request, CACHE_NAME);
        }
        
        // Par défaut
        return await fetch(request);
        
      } catch (error) {
        // Fallback offline
        if (request.headers.get('accept')?.includes('text/html')) {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || new Response('Offline', { status: 503 });
        }
        throw error;
      }
    })()
  );
});

// ===========================
// NOTIFICATIONS FCM
// ===========================
messaging.onBackgroundMessage((payload) => {
  console.log('📩 [FCM] Notification en arrière-plan:', payload);
  
  const notificationTitle = payload.notification?.title || 'Baby-Foot App';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle notification',
    icon: '/icons/logo-192.png',
    badge: '/icons/logo-192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: false
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [FCM] Notification cliquée');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus fenêtre existante
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Ou ouvrir nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// ===========================
// MESSAGES DU CLIENT
// ===========================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      )
    );
  }
});

console.log('✅ [SW] Service Worker chargé et prêt !');