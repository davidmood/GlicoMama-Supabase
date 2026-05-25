import { supabase } from './supabase';
import type { PatientLink } from '../types';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GLM-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createShareCode(): Promise<{ code: string; expiresAt: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const code = generateCode();

  const { error } = await supabase
    .from('share_codes')
    .insert({ user_id: user.id, code, expires_at: expiresAt });

  if (error) {
    console.error('[Sharing] Failed to create code:', error);
    return null;
  }

  return { code, expiresAt };
}

export async function getActiveShareCode(): Promise<{ code: string; expiresAt: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('share_codes')
    .select('code, expires_at')
    .eq('user_id', user.id)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return { code: data.code, expiresAt: data.expires_at };
}

export async function redeemShareCode(code: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Usuário não autenticado' };

  const normalizedCode = code.trim().toUpperCase();

  const { data: shareCode, error: fetchError } = await supabase
    .from('share_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (fetchError || !shareCode) {
    return { success: false, error: 'Código inválido, expirado ou já utilizado' };
  }

  if (shareCode.user_id === user.id) {
    return { success: false, error: 'Você não pode adicionar a si mesmo' };
  }

  const { data: existing } = await supabase
    .from('patient_links')
    .select('id')
    .eq('patient_id', shareCode.user_id)
    .eq('viewer_id', user.id)
    .single();

  if (existing) {
    return { success: false, error: 'Paciente já vinculado à sua conta' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const viewerRole = profile?.role === 'medico' ? 'medico' : 'familiar';

  const { error: linkError } = await supabase
    .from('patient_links')
    .insert({
      patient_id: shareCode.user_id,
      viewer_id: user.id,
      role: viewerRole,
    });

  if (linkError) {
    console.error('[Sharing] Failed to create link:', linkError);
    return { success: false, error: 'Erro ao vincular paciente' };
  }

  await supabase
    .from('share_codes')
    .update({ used: true })
    .eq('id', shareCode.id);

  return { success: true };
}

export async function getMyPatients(): Promise<PatientLink[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links, error } = await supabase
    .from('patient_links')
    .select('id, patient_id, viewer_id, role, created_at')
    .eq('viewer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Sharing] Failed to fetch patient links:', error);
    return [];
  }

  if (!links || links.length === 0) return [];

  const patientIds = links.map((l: Record<string, unknown>) => l.patient_id as string);

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, cpf')
    .in('id', patientIds);

  if (profileError) {
    console.error('[Sharing] Failed to fetch patient profiles:', profileError);
  }

  const profileMap = new Map<string, Record<string, unknown>>();
  (profiles || []).forEach((p: Record<string, unknown>) => {
    profileMap.set(p.id as string, p);
  });

  return links.map((row: Record<string, unknown>) => {
    const profile = profileMap.get(row.patient_id as string);
    return {
      id: row.id as string,
      patientId: row.patient_id as string,
      viewerId: row.viewer_id as string,
      patientName: (profile?.name as string) || 'Sem nome',
      patientCpf: (profile?.cpf as string) || '',
      role: row.role as 'medico' | 'familiar',
      createdAt: row.created_at as string,
    };
  });
}

export async function getMyViewers(): Promise<PatientLink[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links, error } = await supabase
    .from('patient_links')
    .select('id, patient_id, viewer_id, role, created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Sharing] Failed to fetch viewers:', error);
    return [];
  }

  if (!links || links.length === 0) return [];

  const viewerIds = links.map((l: Record<string, unknown>) => l.viewer_id as string);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', viewerIds);

  const profileMap = new Map<string, Record<string, unknown>>();
  (profiles || []).forEach((p: Record<string, unknown>) => {
    profileMap.set(p.id as string, p);
  });

  return links.map((row: Record<string, unknown>) => {
    const profile = profileMap.get(row.viewer_id as string);
    const name = (profile?.name as string) || 'Sem nome';
    return {
      id: row.id as string,
      patientId: row.patient_id as string,
      viewerId: row.viewer_id as string,
      patientName: name,
      viewerName: name,
      patientCpf: '',
      role: row.role as 'medico' | 'familiar',
      createdAt: row.created_at as string,
    };
  });
}

export async function removePatientLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    console.error('[Sharing] Failed to remove link:', error);
    throw error;
  }
}

export async function getPatientRecords(patientId: string) {
  const { data, error } = await supabase
    .from('glucose_records')
    .select('*')
    .eq('user_id', patientId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[Sharing] Failed to fetch patient records:', error);
    return [];
  }

  return data || [];
}

export async function getPatientProfile(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, cpf, phase, sensor, insulin_use, glucose_target_min, glucose_target_max, glucose_low_max, glucose_attention_max')
    .eq('id', patientId)
    .single();

  if (error) {
    console.error('[Sharing] Failed to fetch patient profile:', error);
    return null;
  }

  return data;
}
