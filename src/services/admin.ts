const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://glicomama-supabase.onrender.com';

export interface SystemStatus {
  backend: {
    status: string;
    supabase: boolean;
    vapid: boolean;
    lastLibrePoll: string | null;
    pollIntervalMin: number;
    serverTime: string;
  };
  supabase: {
    dbSizeBytes: number | null;
    freeTierLimitBytes: number;
    usagePercent: number | null;
    libreReadingsCount: number | null;
    glucoseRecordsCount: number | null;
    lastLibreReading: string | null;
  };
}

export async function getSystemStatus(userId: string): Promise<SystemStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const resp = await fetch(`${BACKEND_URL}/api/admin/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `Erro ${resp.status}` }));
    throw new Error(err.detail || `Erro ${resp.status}`);
  }
  const data = await resp.json();
  return {
    backend: {
      status: data.backend?.status ?? 'unknown',
      supabase: data.backend?.supabase ?? false,
      vapid: data.backend?.vapid ?? false,
      lastLibrePoll: data.backend?.last_libre_poll ?? null,
      pollIntervalMin: data.backend?.poll_interval_min ?? 30,
      serverTime: data.backend?.server_time ?? '',
    },
    supabase: {
      dbSizeBytes: data.supabase?.db_size_bytes ?? null,
      freeTierLimitBytes: data.supabase?.free_tier_limit_bytes ?? 500 * 1024 * 1024,
      usagePercent: data.supabase?.usage_percent ?? null,
      libreReadingsCount: data.supabase?.libre_readings_count ?? null,
      glucoseRecordsCount: data.supabase?.glucose_records_count ?? null,
      lastLibreReading: data.supabase?.last_libre_reading ?? null,
    },
  };
}
