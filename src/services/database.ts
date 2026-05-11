import { supabase } from './supabase';
import type { GlucoseRecord, UserSettings, Reminder } from '../types';

// Helper to convert DB row to GlucoseRecord
function rowToRecord(row: Record<string, unknown>): GlucoseRecord {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    mealType: row.meal_type as GlucoseRecord['mealType'],
    glucosePre: row.glucose_pre as number | null,
    glucosePos1h: row.glucose_pos_1h as number | null,
    glucosePos2h: row.glucose_pos_2h as number | null,
    insulinApplied: row.insulin_applied as number | null,
    insulinType: (row.insulin_type as string) || '',
    insulinLocal: (row.insulin_local as string) || '',
    carbohydrates: row.carbohydrates as number | null,
    breastfeedingType: (row.breastfeeding_type as GlucoseRecord['breastfeedingType']) || 'Não realizou',
    breastfeedingDuration: row.breastfeeding_duration as number | null,
    breastSide: row.breast_side as GlucoseRecord['breastSide'] | null,
    extractedAmount: row.extracted_amount as number | null,
    symptoms: (row.symptoms as string) || '',
    notes: (row.notes as string) || '',
    foodDescription: (row.food_description as string) || '',
    babyMood: row.baby_mood as GlucoseRecord['babyMood'] | null,
    babySleep: (row.baby_sleep as string) || '',
  };
}

// Helper to convert GlucoseRecord to DB row
function recordToRow(record: GlucoseRecord) {
  return {
    id: record.id,
    timestamp: record.timestamp,
    meal_type: record.mealType,
    glucose_pre: record.glucosePre,
    glucose_pos_1h: record.glucosePos1h,
    glucose_pos_2h: record.glucosePos2h,
    insulin_applied: record.insulinApplied,
    insulin_type: record.insulinType,
    insulin_local: record.insulinLocal,
    carbohydrates: record.carbohydrates,
    breastfeeding_type: record.breastfeedingType,
    breastfeeding_duration: record.breastfeedingDuration,
    breast_side: record.breastSide,
    extracted_amount: record.extractedAmount,
    symptoms: record.symptoms,
    notes: record.notes,
    food_description: record.foodDescription,
    baby_mood: record.babyMood,
    baby_sleep: record.babySleep,
  };
}

export async function getAllRecords(): Promise<GlucoseRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('glucose_records')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data || []).map(rowToRecord);
}

export async function getSharedRecords(ownerId: string): Promise<GlucoseRecord[]> {
  const { data, error } = await supabase
    .from('glucose_records')
    .select('*')
    .eq('user_id', ownerId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data || []).map(rowToRecord);
}

export async function addRecord(record: GlucoseRecord): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const row = recordToRow(record);
  const { error } = await supabase
    .from('glucose_records')
    .upsert({ ...row, user_id: user.id });

  if (error) throw error;
}

export async function updateRecord(record: GlucoseRecord): Promise<void> {
  const row = recordToRow(record);
  const { error } = await supabase
    .from('glucose_records')
    .update(row)
    .eq('id', record.id);

  if (error) throw error;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('glucose_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAllRecords(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('glucose_records')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getRecordsByDateRange(
  start: Date,
  end: Date
): Promise<GlucoseRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('glucose_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString())
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data || []).map(rowToRecord);
}

// --- Settings ---

const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  darkMode: true,
  glucoseTargetMin: 70,
  glucoseTargetMax: 100,
  glucoseLowMax: 69,
  glucoseAttentionMax: 140,
  reminders: [],
};

export async function getSettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_SETTINGS };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If profile fetch fails (RLS or missing row), return defaults
  if (profileError || !profile) return { ...DEFAULT_SETTINGS };

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id);

  return {
    name: profile.name || '',
    darkMode: profile.dark_mode ?? true,
    glucoseTargetMin: profile.glucose_target_min ?? 70,
    glucoseTargetMax: profile.glucose_target_max ?? 100,
    glucoseLowMax: profile.glucose_low_max ?? 69,
    glucoseAttentionMax: profile.glucose_attention_max ?? 140,
    phase: profile.phase || undefined,
    sensor: profile.sensor || undefined,
    insulinUse: profile.insulin_use || undefined,
    onboardingCompleted: profile.onboarding_completed ?? false,
    reminders: (reminders || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      time: r.time as string,
      label: r.label as string,
      enabled: r.enabled as boolean,
    })),
  };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const profileData = {
    id: user.id,
    name: settings.name,
    dark_mode: settings.darkMode,
    glucose_target_min: settings.glucoseTargetMin,
    glucose_target_max: settings.glucoseTargetMax,
    glucose_low_max: settings.glucoseLowMax,
    glucose_attention_max: settings.glucoseAttentionMax,
    phase: settings.phase || null,
    sensor: settings.sensor || null,
    insulin_use: settings.insulinUse || null,
    onboarding_completed: settings.onboardingCompleted ?? false,
    updated_at: new Date().toISOString(),
  };

  // Try upsert first
  const { error } = await supabase
    .from('profiles')
    .upsert(profileData);

  if (error) {
    // If upsert fails, try update then insert as fallback
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id);

    if (updateError) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (insertError) throw insertError;
    }
  }
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('reminders')
    .insert({
      id: reminder.id,
      user_id: user.id,
      time: reminder.time,
      label: reminder.label,
      enabled: reminder.enabled,
    });

  if (error) throw error;
}

export async function removeReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// No demo data seeding in Supabase version — real user data only
export async function seedDemoData(): Promise<void> {
  // No-op: Supabase version doesn't seed demo data
}

// --- Sharing ---

export interface ShareInfo {
  id: string;
  ownerEmail: string;
  ownerId: string;
  ownerName: string;
  role: 'medico' | 'parceiro';
  accepted: boolean;
}

export async function getMyShares(): Promise<ShareInfo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('shares')
    .select('*, profiles!shares_owner_id_fkey(name)')
    .eq('shared_with_id', user.id)
    .eq('accepted', true);

  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    ownerId: s.owner_id as string,
    ownerEmail: '',
    ownerName: (s.profiles as Record<string, unknown>)?.name as string || '',
    role: s.role as 'medico' | 'parceiro',
    accepted: s.accepted as boolean,
  }));
}

export async function getSharedWithMe(): Promise<ShareInfo[]> {
  return getMyShares();
}

export async function createShare(email: string, role: 'medico' | 'parceiro'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('shares')
    .insert({
      owner_id: user.id,
      shared_with_email: email,
      role,
    });

  if (error) throw error;
}

export async function removeShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('shares')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPendingShares(): Promise<ShareInfo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('shares')
    .select('*, profiles!shares_owner_id_fkey(name)')
    .eq('shared_with_email', user.email)
    .eq('accepted', false);

  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    ownerId: s.owner_id as string,
    ownerEmail: '',
    ownerName: (s.profiles as Record<string, unknown>)?.name as string || '',
    role: s.role as 'medico' | 'parceiro',
    accepted: false,
  }));
}

export async function acceptShare(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('shares')
    .update({ accepted: true, shared_with_id: user.id })
    .eq('id', id);

  if (error) throw error;
}

export async function getOutgoingShares(): Promise<{ id: string; email: string; role: string; accepted: boolean }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('shares')
    .select('*')
    .eq('owner_id', user.id);

  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    email: s.shared_with_email as string,
    role: s.role as string,
    accepted: s.accepted as boolean,
  }));
}
