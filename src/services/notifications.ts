const scheduledTimers: Map<string, number[]> = new Map();

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `glico-${Date.now()}`,
  });
}

export function scheduleGlucoseReminders(
  mealType: string,
  recordTimestamp: string,
  onNotify: (message: string) => void,
): string[] {
  const recordTime = new Date(recordTimestamp).getTime();
  const now = Date.now();
  const reminderId = `reminder-${Date.now()}`;
  const timers: number[] = [];
  const scheduled: string[] = [];

  const delay1h = recordTime + 60 * 60 * 1000 - now;
  if (delay1h > 0) {
    const msg1h = `Hora de medir glicemia pós 1h - ${mealType}`;
    const t1 = window.setTimeout(() => {
      showBrowserNotification('Glicemia & Mama', msg1h);
      onNotify(msg1h);
    }, delay1h);
    timers.push(t1);

    const time1h = new Date(recordTime + 60 * 60 * 1000);
    scheduled.push(`Pós 1h às ${time1h.getHours().toString().padStart(2, '0')}:${time1h.getMinutes().toString().padStart(2, '0')}`);
  }

  const delay2h = recordTime + 2 * 60 * 60 * 1000 - now;
  if (delay2h > 0) {
    const msg2h = `Hora de medir glicemia pós 2h - ${mealType}`;
    const t2 = window.setTimeout(() => {
      showBrowserNotification('Glicemia & Mama', msg2h);
      onNotify(msg2h);
    }, delay2h);
    timers.push(t2);

    const time2h = new Date(recordTime + 2 * 60 * 60 * 1000);
    scheduled.push(`Pós 2h às ${time2h.getHours().toString().padStart(2, '0')}:${time2h.getMinutes().toString().padStart(2, '0')}`);
  }

  if (timers.length > 0) {
    scheduledTimers.set(reminderId, timers);
  }

  return scheduled;
}

export function clearAllScheduledReminders() {
  for (const timers of scheduledTimers.values()) {
    for (const t of timers) {
      clearTimeout(t);
    }
  }
  scheduledTimers.clear();
}
