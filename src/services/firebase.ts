// Web Push API — standard push notifications (works on ALL browsers + iOS PWA 16.4+)

const VAPID_PUBLIC_KEY = 'BEHEbrBmNVo9mLE32fZo3hkcxbFUMPHxuFsFo3a0FbQvlGJaPrQ8TekMRh2kfKconVG1HGr_eqI_tuP12I2gCJ0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getFCMToken(): Promise<string | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    // Return the full subscription as a JSON string (used as "token")
    return JSON.stringify(subscription.toJSON());
  } catch (err) {
    console.error('Push subscription error:', err);
    return null;
  }
}

export function onForegroundMessage(callback: (title: string, body: string) => void) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_NOTIFICATION') {
      callback(event.data.title || 'GlicoMama', event.data.body || '');
    }
  });
}
