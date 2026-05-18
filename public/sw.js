// GlicoMama Service Worker - Push Notifications & Offline Support

const CACHE_NAME = 'glicomama-v2';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo-192.png',
        '/logo-512.png',
        '/logo.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Handle push notifications from backend (standard Web Push)
self.addEventListener('push', (event) => {
  let data = { title: 'GlicoMama', body: '' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data.body = event.data?.text() || '';
  }

  const title = data.title || 'GlicoMama';
  const body = data.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      tag: `glico-push-${Date.now()}`,
      requireInteraction: true,
      data: { url: '/' },
    }).then(() => {
      // Notify foreground clients
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PUSH_NOTIFICATION', title, body });
        });
      });
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
