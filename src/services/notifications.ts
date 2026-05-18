const PENDING_KEY = 'glm_pending_notifications';

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

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function showNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Try service worker notification first (works better in PWA)
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
      // Fallback to regular notification
    }
  }

  new Notification(title, {
    body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: `glico-${Date.now()}`,
  });
}

export function sendTestNotification() {
  showNotification(
    'GlicoMama - Teste',
    'As notificações estão funcionando corretamente!',
  );
}

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

export function scheduleGlucoseReminders(
  mealType: string,
  recordTimestamp: string,
  onNotify: (message: string) => void,
): string[] {
  const recordTime = new Date(recordTimestamp).getTime();
  const scheduled: string[] = [];

  const fire1h = recordTime + 60 * 60 * 1000;
  const fire2h = recordTime + 2 * 60 * 60 * 1000;
  const now = Date.now();

  const notifications: PendingNotification[] = [];

  if (fire1h > now) {
    const notif: PendingNotification = {
      id: `notif-1h-${Date.now()}`,
      title: 'GlicoMama',
      body: `Hora de medir glicemia pós 1h - ${mealType}`,
      fireAt: fire1h,
      fired: false,
    };
    notifications.push(notif);
    scheduleTimer(notif, onNotify);

    const time1h = new Date(fire1h);
    scheduled.push(`Pós 1h às ${time1h.getHours().toString().padStart(2, '0')}:${time1h.getMinutes().toString().padStart(2, '0')}`);
  }

  if (fire2h > now) {
    const notif: PendingNotification = {
      id: `notif-2h-${Date.now()}`,
      title: 'GlicoMama',
      body: `Hora de medir glicemia pós 2h - ${mealType}`,
      fireAt: fire2h,
      fired: false,
    };
    notifications.push(notif);
    scheduleTimer(notif, onNotify);

    const time2h = new Date(fire2h);
    scheduled.push(`Pós 2h às ${time2h.getHours().toString().padStart(2, '0')}:${time2h.getMinutes().toString().padStart(2, '0')}`);
  }

  // Save to localStorage for persistence across page reloads
  if (notifications.length > 0) {
    const existing = getPending().filter((n) => !n.fired && n.fireAt > now);
    savePending([...existing, ...notifications]);
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

  // Clean up old fired notifications (older than 24h)
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
