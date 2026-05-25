import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://glicomama-supabase.onrender.com';

export interface LibreReading {
  id: string;
  timestamp: string;
  glucoseValue: number;
  trend: string;
  source: string;
}

export interface LibreStatus {
  connected: boolean;
  email?: string;
  region?: string;
  patientName?: string;
  lastSync?: string;
}

export async function getLibreStatus(userId: string): Promise<LibreStatus> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/libre/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await resp.json();
    return {
      connected: data.connected ?? false,
      email: data.email,
      region: data.region,
      patientName: data.patient_name,
      lastSync: data.last_sync,
    };
  } catch {
    return { connected: false };
  }
}

export async function connectLibre(
  userId: string,
  email: string,
  password: string,
  region: string,
): Promise<{ success: boolean; error?: string; patientName?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const resp = await fetch(`${BACKEND_URL}/api/libre/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, password, region }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Erro desconhecido' }));
      return { success: false, error: err.detail || 'Falha na conexão' };
    }
    const data = await resp.json();
    return { success: true, patientName: data.patient_name };
  } catch (e) {
    const msg = e instanceof DOMException && e.name === 'AbortError'
      ? 'Tempo limite excedido. O servidor demorou para responder.'
      : `Erro de conexão com o servidor (${BACKEND_URL}). Verifique se o backend está ativo.`;
    console.error('[Libre] Connect error:', e);
    return { success: false, error: msg };
  }
}

export async function disconnectLibre(userId: string): Promise<boolean> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/libre/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function forceSync(userId: string): Promise<{ success: boolean; newReadings?: number }> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/libre/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!resp.ok) return { success: false };
    const data = await resp.json();
    return { success: true, newReadings: data.new_readings };
  } catch {
    return { success: false };
  }
}

export async function getLibreReadings(
  startDate?: string,
  endDate?: string,
): Promise<LibreReading[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('libre_readings')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: true });

  if (startDate) query = query.gte('timestamp', startDate);
  if (endDate) query = query.lte('timestamp', endDate);

  const { data, error } = await query;
  if (error) {
    console.error('[Libre] Failed to fetch readings:', error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    timestamp: r.timestamp as string,
    glucoseValue: r.glucose_value as number,
    trend: (r.trend as string) || 'unknown',
    source: (r.source as string) || 'history',
  }));
}

export async function getLibreReadingsForPatient(
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<LibreReading[]> {
  let query = supabase
    .from('libre_readings')
    .select('*')
    .eq('user_id', patientId)
    .order('timestamp', { ascending: true });

  if (startDate) query = query.gte('timestamp', startDate);
  if (endDate) query = query.lte('timestamp', endDate);

  const { data, error } = await query;
  if (error) {
    console.error('[Libre] Failed to fetch patient readings:', error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    timestamp: r.timestamp as string,
    glucoseValue: r.glucose_value as number,
    trend: (r.trend as string) || 'unknown',
    source: (r.source as string) || 'history',
  }));
}

/** Find the closest Libre reading to a given timestamp within a tolerance window. */
export function findClosestReading(
  readings: LibreReading[],
  targetTime: Date,
  toleranceMinutes: number = 15,
): LibreReading | null {
  const targetMs = targetTime.getTime();
  const toleranceMs = toleranceMinutes * 60 * 1000;
  let closest: LibreReading | null = null;
  let closestDiff = Infinity;

  for (const r of readings) {
    const diff = Math.abs(new Date(r.timestamp).getTime() - targetMs);
    if (diff < closestDiff && diff <= toleranceMs) {
      closest = r;
      closestDiff = diff;
    }
  }
  return closest;
}

/** Get trend arrow emoji. */
export function trendArrow(trend: string): string {
  const arrows: Record<string, string> = {
    rising_fast: '↑↑',
    rising: '↑',
    stable: '→',
    falling: '↓',
    falling_fast: '↓↓',
    unknown: '',
  };
  return arrows[trend] || '';
}
