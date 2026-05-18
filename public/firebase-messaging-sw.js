// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB3Qa_sQGPz8b0_r7WA-4g1FedbYLd5x00",
  authDomain: "glicomama-147b9.firebaseapp.com",
  projectId: "glicomama-147b9",
  storageBucket: "glicomama-147b9.firebasestorage.app",
  messagingSenderId: "492996844280",
  appId: "1:492996844280:web:0eb2f7d249d1d18874390d",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GlicoMama';
  const body = payload.notification?.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: `glico-push-${Date.now()}`,
    requireInteraction: true,
  });
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
