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

/**
 * Clean up old Firebase service worker registrations.
 * Must be called before subscribing to push to avoid scope conflicts.
 */
export async function cleanupOldServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      // Unregister any Firebase-specific service workers
      if (reg.active?.scriptURL?.includes('firebase-messaging-sw')) {
        await reg.unregister();
        console.log('Unregistered old Firebase SW');
      }
    }
  } catch (err) {
    console.warn('Failed to cleanup old SWs:', err);
  }
}

export async function getPushSubscription(): Promise<string | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker not supported');
      return null;
    }
    if (!('PushManager' in window)) {
      console.warn('[Push] PushManager not supported');
      return null;
    }
    if (!('Notification' in window)) {
      console.warn('[Push] Notification API not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    if (permission !== 'granted') return null;

    // Wait for SW to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] SW ready, scope:', registration.scope);

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If existing subscription uses a different key, unsubscribe first
    if (subscription) {
      console.log('[Push] Found existing subscription');
    } else {
      console.log('[Push] Creating new subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      console.log('[Push] Subscription created');
    }

    const json = JSON.stringify(subscription.toJSON());
    console.log('[Push] Token obtained, length:', json.length);
    return json;
  } catch (err) {
    console.error('[Push] Subscription error:', err);
    return null;
  }
}

// Keep backward compat alias
export const getFCMToken = getPushSubscription;

export function onForegroundMessage(callback: (title: string, body: string) => void) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_NOTIFICATION') {
      callback(event.data.title || 'GlicoMama', event.data.body || '');
    }
  });
}
