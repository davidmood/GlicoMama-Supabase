import { getAllRecords, getSettings, addRecord, saveSettings } from './database';
import type { GlucoseRecord, UserSettings } from '../types';
import { localInputToUtc } from '../types';

const BACKUP_KEY_PREFIX = 'glicomama_backup_';
const BACKUP_LAST_KEY = 'glicomama_last_backup';
const MAX_BACKUPS = 7;

interface BackupData {
  version: 1;
  createdAt: string;
  records: GlucoseRecord[];
  settings: UserSettings;
}

export async function createBackup(): Promise<BackupData> {
  const [records, settings] = await Promise.all([getAllRecords(), getSettings()]);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    records,
    settings,
  };
}

export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `glicomama-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Normalize timestamp: old version stored local time without timezone (e.g. "2026-05-15T15:00")
// New version stores UTC ISO (e.g. "2026-05-15T18:00:00.000Z").
// If the timestamp doesn't end in "Z" and doesn't contain a timezone offset (+/-),
// it's a local time from the old version — convert it to UTC.
function normalizeTimestamp(ts: string): string {
  if (!ts) return ts;
  // Already UTC or has timezone offset
  if (ts.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(ts)) return ts;
  // Old format: local time without timezone — convert to UTC
  return localInputToUtc(ts);
}

export async function importBackup(file: File): Promise<{ records: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as BackupData;

  if (!data.version || !data.records || !Array.isArray(data.records)) {
    throw new Error('Arquivo de backup inválido');
  }

  if (data.settings) {
    const current = await getSettings();
    await saveSettings({
      ...current,
      ...data.settings,
      onboardingCompleted: current.onboardingCompleted || data.settings.onboardingCompleted || false,
    });
  }

  let count = 0;
  for (const record of data.records) {
    const normalized = { ...record, timestamp: normalizeTimestamp(record.timestamp) };
    await addRecord(normalized);
    count++;
  }

  return { records: count };
}

export async function saveAutoBackup(): Promise<void> {
  const backup = await createBackup();
  const key = BACKUP_KEY_PREFIX + new Date().toISOString().slice(0, 10);

  try {
    localStorage.setItem(key, JSON.stringify(backup));
    localStorage.setItem(BACKUP_LAST_KEY, new Date().toISOString());
    cleanOldBackups();
  } catch {
    // localStorage full — remove oldest and retry once
    cleanOldBackups(1);
    try {
      localStorage.setItem(key, JSON.stringify(backup));
    } catch {
      // still full, skip
    }
  }
}

function cleanOldBackups(keepCount: number = MAX_BACKUPS): void {
  const keys = getBackupKeys();
  if (keys.length > keepCount) {
    const toRemove = keys.slice(0, keys.length - keepCount);
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  }
}

function getBackupKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys.sort();
}

export interface AutoBackupInfo {
  date: string;
  key: string;
  recordCount: number;
}

export function listAutoBackups(): AutoBackupInfo[] {
  const keys = getBackupKeys();
  const backups: AutoBackupInfo[] = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as BackupData;
      backups.push({
        date: data.createdAt,
        key,
        recordCount: data.records.length,
      });
    } catch {
      // corrupted backup, skip
    }
  }
  return backups.sort((a, b) => b.date.localeCompare(a.date));
}

export async function restoreAutoBackup(key: string): Promise<{ records: number }> {
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('Backup não encontrado');
  const data = JSON.parse(raw) as BackupData;

  if (data.settings) {
    const current = await getSettings();
    await saveSettings({
      ...current,
      ...data.settings,
      onboardingCompleted: current.onboardingCompleted || data.settings.onboardingCompleted || false,
    });
  }

  let count = 0;
  for (const record of data.records) {
    const normalized = { ...record, timestamp: normalizeTimestamp(record.timestamp) };
    await addRecord(normalized);
    count++;
  }

  return { records: count };
}

export function scheduleAutoBackup(): void {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    saveAutoBackup();
    // Schedule next one in 24h
    setInterval(() => {
      saveAutoBackup();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  // Also run immediately if last backup was not today
  const lastBackup = localStorage.getItem(BACKUP_LAST_KEY);
  if (!lastBackup || lastBackup.slice(0, 10) !== now.toISOString().slice(0, 10)) {
    saveAutoBackup();
  }
}
