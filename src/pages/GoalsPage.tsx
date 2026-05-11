import { useEffect, useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { Target } from 'lucide-react';
import type { GlucoseRecord, UserPhase } from '../types';
import { getAllRecords, getSettings } from '../services/database';
import type { UserSettings } from '../types';

const PHASE_CONTENT: Record<UserPhase, { emoji: string; title: string; intro: string; tips: string[] }> = {
  gestante: {
    emoji: '💜',
    title: 'Gestante',
    intro: 'Durante a gestação, pequenas variações glicêmicas podem fazer diferença. O acompanhamento frequente ajuda você e seu bebê.',
    tips: [
      'Glicemia pré-refeição: 70–95 mg/dL',
      '1h após refeição: abaixo de 140 mg/dL',
      '2h após refeição: abaixo de 120 mg/dL',
      'Registre refeições e aplicações regularmente',
      'Evite longos períodos sem alimentação',
      'Compartilhe os relatórios com seu médico',
      'Observe padrões após determinados alimentos',
      'Mantenha hidratação adequada',
      'Procure manter horários consistentes de refeição',
      'Registre sintomas de hipoglicemia ou indisposição',
    ],
  },
  puerperio: {
    emoji: '🌸',
    title: 'Puerpério',
    intro: 'O corpo passa por grandes adaptações após o parto. Seu controle glicêmico pode variar bastante nesse período.',
    tips: [
      'Monitore possíveis episódios de hipoglicemia',
      'Amamentação pode reduzir glicemia',
      'Registre sono, alimentação e sintomas',
      'Não esqueça sua hidratação',
      'Tenha lanches rápidos por perto',
      'Observe padrões relacionados ao cansaço',
    ],
  },
  amamentacao: {
    emoji: '🤱',
    title: 'Amamentação',
    intro: 'A amamentação pode impactar diretamente sua glicemia e gasto energético.',
    tips: [
      'Registre mamadas e extrações',
      'Observe quedas glicêmicas após amamentar',
      'Mantenha ingestão adequada de água',
      'Faça pequenos lanches quando necessário',
      'Registre volume extraído na bomba',
      'Observe horários com maior demanda do bebê',
    ],
  },
  tentando: {
    emoji: '🌱',
    title: 'Tentando engravidar',
    intro: 'Preparar o controle glicêmico antes da gestação é fundamental para uma gravidez saudável.',
    tips: [
      'Mantenha a hemoglobina glicada abaixo de 6,5%',
      'Estabilize a glicemia antes de engravidar',
      'Converse com seu endocrinologista regularmente',
      'Registre padrões alimentares e glicêmicos',
      'Mantenha atividade física regular',
    ],
  },
  parceiro: {
    emoji: '💙',
    title: 'Parceiro(a) / Acompanhante',
    intro: 'Seu apoio faz toda a diferença no acompanhamento glicêmico.',
    tips: [
      'Ajude a registrar medições e refeições',
      'Fique atento a sintomas de hipoglicemia',
      'Acompanhe os relatórios nas consultas médicas',
      'Mantenha lanches rápidos acessíveis',
    ],
  },
  outro: {
    emoji: '📊',
    title: 'Acompanhamento Glicêmico',
    intro: 'O monitoramento constante é a chave para um bom controle.',
    tips: [
      'Registre todas as medições com consistência',
      'Observe padrões após refeições',
      'Compartilhe relatórios com seu médico',
      'Mantenha metas realistas e alcançáveis',
    ],
  },
};

export default function GoalsPage() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    Promise.all([getAllRecords(), getSettings()]).then(([r, s]) => {
      setRecords(r);
      setSettings(s);
    });
  }, []);

  const weekRecords = useMemo(() => {
    const weekStart = subDays(new Date(), 7);
    return records.filter((r) => new Date(r.timestamp) >= weekStart);
  }, [records]);

  const goals = useMemo(() => {
    const min = settings?.glucoseTargetMin ?? 70;
    const max = settings?.glucoseTargetMax ?? 140;
    const preVals = weekRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
    const inRange = preVals.filter((v) => v >= min && v <= max).length;
    const pct = preVals.length ? Math.round((inRange / preVals.length) * 100) : 0;
    const avg = preVals.length ? Math.round(preVals.reduce((a, b) => a + b, 0) / preVals.length) : 0;

    return [
      { label: 'Tempo em faixa (meta: 80%)', target: 80, current: pct, unit: '%', color: '#22c55e' },
      { label: 'Média glicêmica (meta: < 120 mg/dL)', target: 120, current: avg, unit: 'mg/dL', color: avg <= 120 ? '#22c55e' : '#f59e0b' },
      { label: 'Registros na semana (meta: 28)', target: 28, current: weekRecords.length, unit: 'registros', color: '#8b5cf6' },
      { label: 'Amamentações na semana (meta: 21)', target: 21, current: weekRecords.filter((r) => r.breastfeedingType && r.breastfeedingType !== 'Não realizou').length, unit: 'vezes', color: '#ec4899' },
    ];
  }, [weekRecords, settings]);

  const phase = settings?.phase ?? 'gestante';
  const content = PHASE_CONTENT[phase];

  return (
    <>
      <div className="page-header">
        <h2>Metas</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--accent-purple)' }} />
            Metas da Semana
          </h3>
        </div>

        {goals.map((goal, i) => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <div className="goal-item" key={i}>
              <div className="goal-label">
                <span>{goal.label}</span>
                <span style={{ fontWeight: 700, color: goal.color }}>
                  {goal.current} / {goal.target} {goal.unit}
                </span>
              </div>
              <div className="goal-bar">
                <div
                  className="goal-bar-fill"
                  style={{ width: `${pct}%`, background: goal.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>{content.emoji} {content.title}</h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
          <p style={{ marginBottom: 12, fontStyle: 'italic' }}>{content.intro}</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Dicas</p>
          {content.tips.map((tip, i) => (
            <p key={i}>• {tip}</p>
          ))}
        </div>
      </div>
    </>
  );
}
