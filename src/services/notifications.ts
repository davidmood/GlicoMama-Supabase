import { getFCMToken, onForegroundMessage, cleanupOldServiceWorkers } from './firebase';
import { supabase } from './supabase';

const PENDING_KEY = 'glm_pending_notifications';
const FCM_TOKEN_KEY = 'glm_fcm_token';
const PUSH_API_URL = import.meta.env.VITE_PUSH_API_URL || 'https://glicomama-supabase.onrender.com';

interface PendingNotification {
  id: string;
  title: string;
  body: string;
  fireAt: number;
  fired: boolean;
}

function getPending(): PendingNotification[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePending(list: PendingNotification[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

// --- Push Token Management ---

let cachedPushToken: string | null = null;

export async function initializePushNotifications(): Promise<string | null> {
  try {
    // Clean up old Firebase SWs before getting push token
    await cleanupOldServiceWorkers();

    const token = await getFCMToken();
    if (!token) {
      console.warn('[Notifications] Failed to get push subscription');
      return null;
    }

    console.log('[Notifications] Push token obtained, saving...');
    cachedPushToken = token;
    localStorage.setItem(FCM_TOKEN_KEY, token);

    // Save token to Supabase profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles').update({ fcm_token: token }).eq('id', user.id);
      if (error) {
        console.error('[Notifications] Failed to save token to Supabase:', error);
      } else {
        console.log('[Notifications] Token saved to Supabase');
      }
    }

    // Save token to backend
    if (PUSH_API_URL && user) {
      try {
        const res = await fetch(`${PUSH_API_URL}/api/save-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, fcm_token: token }),
        });
        console.log('[Notifications] Backend save-token:', res.ok ? 'OK' : res.status);
      } catch (err) {
        console.warn('[Notifications] Backend save-token failed:', err);
      }
    }

    return token;
  } catch (err) {
    console.error('[Notifications] initializePushNotifications error:', err);
    return null;
  }
}

export function getCachedFCMToken(): string | null {
  if (cachedPushToken) return cachedPushToken;
  return localStorage.getItem(FCM_TOKEN_KEY);
}

export function setupForegroundHandler(onNotify: (message: string) => void) {
  onForegroundMessage((title, body) => {
    onNotify(`${title}: ${body}`);
  });
}

// --- Permission ---

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    await initializePushNotifications();
    return true;
  }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await initializePushNotifications();
  }
  return result === 'granted';
}

// --- Local Notification (fallback) ---

async function showNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `glico-${Date.now()}`,
        requireInteraction: true,
      } as NotificationOptions);
      return;
    } catch {
      // Fallback
    }
  }

  new Notification(title, {
    body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: `glico-${Date.now()}`,
  });
}

// --- Test Notification ---

export async function sendTestNotification(): Promise<'push' | 'local' | 'failed'> {
  // Try to get/refresh token first
  if (!getCachedFCMToken()) {
    await initializePushNotifications();
  }

  const token = getCachedFCMToken();

  // Try push notification via backend first
  if (PUSH_API_URL && token) {
    try {
      const res = await fetch(`${PUSH_API_URL}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token }),
      });
      if (res.ok) {
        console.log('[Notifications] Test push sent via backend');
        return 'push';
      }
      const errText = await res.text();
      console.warn('[Notifications] Test push failed:', res.status, errText);
    } catch (err) {
      console.warn('[Notifications] Test push error:', err);
    }
  } else {
    console.warn('[Notifications] No push token, using local fallback');
  }

  // Fallback to local notification
  showNotification(
    'GlicoMama - Teste (Local)',
    'Notificação LOCAL funcionando. Push notifications precisam ser ativadas.',
  );
  return 'local';
}

// --- Schedule Push Notifications via Backend ---

async function schedulePushNotification(title: string, body: string, fireAt: Date): Promise<boolean> {
  const token = getCachedFCMToken();
  if (!PUSH_API_URL || !token) {
    console.warn('[Notifications] Cannot schedule push: no token or API URL');
    return false;
  }

  try {
    const res = await fetch(`${PUSH_API_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fcm_token: token,
        title,
        body,
        fire_at: fireAt.toISOString(),
      }),
    });
    console.log('[Notifications] Schedule push:', res.ok ? 'OK' : res.status);
    return res.ok;
  } catch (err) {
    console.warn('[Notifications] Schedule push error:', err);
    return false;
  }
}

// --- Local Timer Scheduling (fallback when backend unavailable) ---

const activeTimers: Map<string, number> = new Map();

function scheduleTimer(notif: PendingNotification, onNotify: (message: string) => void) {
  const delay = notif.fireAt - Date.now();
  if (delay <= 0) {
    if (!notif.fired) {
      showNotification('GlicoMama', notif.body);
      onNotify(notif.body);
      markFired(notif.id);
    }
    return;
  }

  const timer = window.setTimeout(() => {
    showNotification('GlicoMama', notif.body);
    onNotify(notif.body);
    markFired(notif.id);
    activeTimers.delete(notif.id);
  }, delay);

  activeTimers.set(notif.id, timer);
}

function markFired(id: string) {
  const list = getPending();
  const updated = list.map((n) => n.id === id ? { ...n, fired: true } : n);
  savePending(updated);
}

// --- Schedule Glucose Reminders ---

export async function scheduleGlucoseReminders(
  mealType: string,
  recordTimestamp: string,
  onNotify: (message: string) => void,
): Promise<string[]> {
  const recordTime = new Date(recordTimestamp).getTime();
  const scheduled: string[] = [];

  const fire1h = recordTime + 60 * 60 * 1000;
  const fire2h = recordTime + 2 * 60 * 60 * 1000;
  const now = Date.now();

  const notifications: PendingNotification[] = [];

  if (fire1h > now) {
    const body1h = `Hora de medir glicemia pós 1h - ${mealType}`;
    const pushed = await schedulePushNotification('GlicoMama', body1h, new Date(fire1h));

    const notif: PendingNotification = {
      id: `notif-1h-${Date.now()}`,
      title: 'GlicoMama',
      body: body1h,
      fireAt: fire1h,
      fired: false,
    };
    notifications.push(notif);

    if (!pushed) {
      scheduleTimer(notif, onNotify);
    }

    const time1h = new Date(fire1h);
    scheduled.push(`Pós 1h às ${time1h.getHours().toString().padStart(2, '0')}:${time1h.getMinutes().toString().padStart(2, '0')}`);
  }

  if (fire2h > now) {
    const body2h = `Hora de medir glicemia pós 2h - ${mealType}`;
    const pushed = await schedulePushNotification('GlicoMama', body2h, new Date(fire2h));

    const notif: PendingNotification = {
      id: `notif-2h-${Date.now()}`,
      title: 'GlicoMama',
      body: body2h,
      fireAt: fire2h,
      fired: false,
    };
    notifications.push(notif);

    if (!pushed) {
      scheduleTimer(notif, onNotify);
    }

    const time2h = new Date(fire2h);
    scheduled.push(`Pós 2h às ${time2h.getHours().toString().padStart(2, '0')}:${time2h.getMinutes().toString().padStart(2, '0')}`);
  }

  // Save to localStorage for persistence across page reloads
  if (notifications.length > 0) {
    const existing = getPending().filter((n) => !n.fired && n.fireAt > now);
    savePending([...existing, ...notifications]);
  }

  if (scheduled.length === 0 && (fire1h <= now || fire2h <= now)) {
    console.log('[Notifications] Alarm times already passed, not scheduling');
  }

  return scheduled;
}

// Check for missed notifications when app comes back to foreground
export function checkMissedNotifications(onNotify: (message: string) => void) {
  const now = Date.now();
  const list = getPending();
  let updated = false;

  for (const notif of list) {
    if (!notif.fired && notif.fireAt <= now) {
      showNotification(notif.title, notif.body);
      onNotify(notif.body);
      notif.fired = true;
      updated = true;
    } else if (!notif.fired && notif.fireAt > now && !activeTimers.has(notif.id)) {
      scheduleTimer(notif, onNotify);
    }
  }

  if (updated) {
    savePending(list);
  }

  const cleaned = list.filter((n) => !n.fired || n.fireAt > now - 24 * 60 * 60 * 1000);
  if (cleaned.length !== list.length) {
    savePending(cleaned);
  }
}

export function clearAllScheduledReminders() {
  for (const timer of activeTimers.values()) {
    clearTimeout(timer);
  }
  activeTimers.clear();
  savePending([]);
}

// --- Sync Recurring Reminders with Backend ---

export async function syncRemindersWithBackend(reminders: { id: string; time: string; label: string; enabled: boolean }[]): Promise<boolean> {
  const token = getCachedFCMToken();
  if (!PUSH_API_URL || !token) {
    console.warn('[Notifications] syncReminders: no token or API URL');
    return false;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const res = await fetch(`${PUSH_API_URL}/api/sync-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        fcm_token: token,
        reminders,
        tz_offset_minutes: -new Date().getTimezoneOffset(),
      }),
    });
    console.log('[Notifications] syncReminders:', res.ok ? 'OK' : res.status);
    return res.ok;
  } catch (err) {
    console.warn('[Notifications] syncReminders error:', err);
    return false;
  }
}
