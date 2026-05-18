import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyB3Qa_sQGPz8b0_r7WA-4g1FedbYLd5x00",
  authDomain: "glicomama-147b9.firebaseapp.com",
  projectId: "glicomama-147b9",
  storageBucket: "glicomama-147b9.firebasestorage.app",
  messagingSenderId: "492996844280",
  appId: "1:492996844280:web:0eb2f7d249d1d18874390d",
  measurementId: "G-8DTWBNBYK2",
};

const VAPID_KEY = 'BFpb2Q14ZY5jxVlvVR7s9SzSHYlbY9cuWOSKuLOJ2o';

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const msg = getMessagingInstance();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      || await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

export function onForegroundMessage(callback: (title: string, body: string) => void) {
  const msg = getMessagingInstance();
  if (!msg) return;

  onMessage(msg, (payload) => {
    const title = payload.notification?.title || 'GlicoMama';
    const body = payload.notification?.body || '';
    callback(title, body);
  });
}
