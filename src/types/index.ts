export interface GlucoseRecord {
  id: string;
  timestamp: string;
  mealType: MealType;
  glucosePre: number | null;
  glucosePos1h: number | null;
  glucosePos2h: number | null;
  insulinApplied: number | null;
  insulinType: string;
  insulinLocal: string;
  carbohydrates: number | null;
  breastfeedingType: BreastfeedingType;
  breastfeedingDuration: number | null;
  breastSide: BreastSide | null;
  extractedAmount: number | null;
  symptoms: string;
  notes: string;
  foodDescription: string;
  babyMood: BabyMood | null;
  babySleep: string;
}

export type MealType =
  | 'Café da manhã'
  | 'Lanche da manhã'
  | 'Almoço'
  | 'Lanche da tarde'
  | 'Jantar'
  | 'Ceia'
  | 'Madrugada'
  | 'Amamentação'
  | 'Correção Alvo'
  | 'Correção Hipoglicemia'
  | 'Insulina Rápida'
  | 'Insulina Basal';

export type BreastfeedingType = 'Peito' | 'Bomba' | 'Ambos' | 'Não realizou';

export type BreastSide = 'Esquerdo (E)' | 'Direito (D)' | 'Ambos';

export type InsulinType = 'Lispro' | 'Aspart' | 'Regular' | 'NPH' | 'Glargina' | 'Detemir' | 'Degludeca';

export type BabyMood = 'Calmo' | 'Agitado' | 'Chorando' | 'Dormindo' | 'Alerta';

export const MEAL_TYPES: MealType[] = [
  'Café da manhã',
  'Lanche da manhã',
  'Almoço',
  'Lanche da tarde',
  'Jantar',
  'Ceia',
  'Madrugada',
  'Amamentação',
  'Correção Alvo',
  'Correção Hipoglicemia',
  'Insulina Rápida',
  'Insulina Basal',
];

export const BREASTFEEDING_TYPES: BreastfeedingType[] = ['Peito', 'Bomba', 'Ambos', 'Não realizou'];

export const BREAST_SIDES: BreastSide[] = ['Esquerdo (E)', 'Direito (D)', 'Ambos'];

export const INSULIN_TYPES: InsulinType[] = ['Lispro', 'Aspart', 'Regular', 'NPH', 'Glargina', 'Detemir', 'Degludeca'];

export const INSULIN_LOCALS = ['Abdômen', 'Braço', 'Coxa', 'Glúteo'];

export const BABY_MOODS: BabyMood[] = ['Calmo', 'Agitado', 'Chorando', 'Dormindo', 'Alerta'];

export const INSULIN_TYPE_CATEGORIES = {
  rapida: ['Lispro', 'Aspart', 'Regular'] as InsulinType[],
  lenta: ['NPH', 'Glargina', 'Detemir', 'Degludeca'] as InsulinType[],
};

export type UserPhase =
  | 'gestante'
  | 'puerperio'
  | 'amamentacao'
  | 'tentando'
  | 'parceiro'
  | 'outro';

export type SensorType =
  | 'Libre 1'
  | 'Libre 2'
  | 'Libre 3'
  | 'Glicemia capilar'
  | 'Dexcom'
  | 'Outro sensor'
  | 'Não utilizo sensor';

export type InsulinUse = 'nao' | 'basal' | 'rapida' | 'ambas';

export const USER_PHASES: { value: UserPhase; label: string; description: string }[] = [
  { value: 'gestante', label: 'Gestante', description: 'Monitoramento glicêmico durante a gravidez' },
  { value: 'puerperio', label: 'Puerpério', description: 'Recuperação e adaptação após o parto' },
  { value: 'amamentacao', label: 'Amamentação', description: 'Foco em lactação e rotina materna' },
  { value: 'tentando', label: 'Tentando engravidar', description: 'Preparação glicêmica e saúde para gestação' },
  { value: 'parceiro', label: 'Parceiro(a) / acompanhante', description: '' },
  { value: 'outro', label: 'Outro acompanhamento glicêmico', description: '' },
];

export const SENSOR_TYPES: SensorType[] = [
  'Libre 1', 'Libre 2', 'Libre 3', 'Glicemia capilar', 'Dexcom', 'Outro sensor', 'Não utilizo sensor',
];

export interface UserSettings {
  name: string;
  darkMode: boolean;
  glucoseTargetMin: number;
  glucoseTargetMax: number;
  glucoseLowMax: number;
  glucoseAttentionMax: number;
  reminders: Reminder[];
  phase?: UserPhase;
  sensor?: SensorType;
  insulinUse?: InsulinUse;
  onboardingCompleted?: boolean;
}

export interface Reminder {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

export interface Goal {
  id: string;
  label: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

// Convert UTC ISO string to datetime-local input value (local time)
export function utcToLocalInput(utc: string): string {
  const d = new Date(utc);
  if (isNaN(d.getTime())) return utc;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

// Convert datetime-local input value (local time) to UTC ISO string
export function localInputToUtc(local: string): string {
  const d = new Date(local);
  if (isNaN(d.getTime())) return local;
  return d.toISOString();
}

export function createEmptyRecord(): Omit<GlucoseRecord, 'id'> {
  return {
    timestamp: new Date().toISOString(),
    mealType: 'Café da manhã',
    glucosePre: null,
    glucosePos1h: null,
    glucosePos2h: null,
    insulinApplied: null,
    insulinType: '',
    insulinLocal: '',
    carbohydrates: null,
    breastfeedingType: 'Não realizou',
    breastfeedingDuration: null,
    breastSide: null,
    extractedAmount: null,
    symptoms: '',
    notes: '',
    foodDescription: '',
    babyMood: null,
    babySleep: '',
  };
}

export function classifyGlucose(
  value: number,
  settings?: { glucoseLowMax?: number; glucoseTargetMin?: number; glucoseTargetMax?: number; glucoseAttentionMax?: number }
): { label: string; color: string } {
  const lowMax = settings?.glucoseLowMax ?? 69;
  const targetMin = settings?.glucoseTargetMin ?? 70;
  const targetMax = settings?.glucoseTargetMax ?? 100;
  const attentionMax = settings?.glucoseAttentionMax ?? 140;
  if (value <= lowMax) return { label: 'Baixa', color: '#3b82f6' };
  if (value >= targetMin && value <= targetMax) return { label: 'Dentro da meta', color: '#22c55e' };
  if (value <= attentionMax) return { label: 'Atenção', color: '#f59e0b' };
  return { label: 'Alta', color: '#ef4444' };
}
