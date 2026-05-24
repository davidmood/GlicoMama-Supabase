import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Activity, TrendingUp, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getPatientRecords, getPatientProfile } from '../services/sharing';
import { exportToCSV, exportToPDF } from '../services/export';
import type { GlucoseRecord } from '../types';
import { classifyGlucose } from '../types';

type TirRanges = { min: number; max: number };

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

interface PatientDetailPageProps {
  patientId: string;
  onBack: () => void;
}

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

export default function PatientDetailPage({ patientId, onBack }: PatientDetailPageProps) {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [dateOffset, setDateOffset] = useState(0);

  useEffect(() => {
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);
    const [rawRecords, profileData] = await Promise.all([
      getPatientRecords(patientId),
      getPatientProfile(patientId),
    ]);
    setRecords((rawRecords as Record<string, unknown>[]).map(rowToRecord));
    setProfile(profileData as Record<string, unknown> | null);
    setLoading(false);
  }

  const settings = useMemo(() => ({
    glucoseLowMax: (profile?.glucose_low_max as number) ?? 69,
    glucoseTargetMin: (profile?.glucose_target_min as number) ?? 70,
    glucoseTargetMax: (profile?.glucose_target_max as number) ?? 100,
    glucoseAttentionMax: (profile?.glucose_attention_max as number) ?? 140,
  }), [profile]);

  const periodRecords = useMemo(() => {
    const baseDate = addDays(new Date(), dateOffset);
    const end = endOfDay(baseDate);
    const start = startOfDay(subDays(baseDate, period - 1));
    return records.filter(r => {
      const d = new Date(r.timestamp);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, period, dateOffset]);

  const periodLabel = useMemo(() => {
    const baseDate = addDays(new Date(), dateOffset);
    const end = endOfDay(baseDate);
    const start = startOfDay(subDays(baseDate, period - 1));
    if (period === 1) {
      return format(start, "dd/MM/yyyy (EEEE)", { locale: ptBR });
    }
    return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`;
  }, [period, dateOffset]);

  const glucoseValues = useMemo(() => {
    const values: number[] = [];
    periodRecords.forEach(r => {
      if (r.glucosePre) values.push(r.glucosePre);
      if (r.glucosePos1h) values.push(r.glucosePos1h);
      if (r.glucosePos2h) values.push(r.glucosePos2h);
    });
    return values;
  }, [periodRecords]);

  const avg = glucoseValues.length > 0
    ? Math.round(glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length)
    : 0;

  const tirRanges: TirRanges = useMemo(() => ({
    min: settings.glucoseTargetMin,
    max: settings.glucoseTargetMax,
  }), [settings]);

  const inRange = glucoseValues.filter(v => v >= tirRanges.min && v <= tirRanges.max).length;
  const tirPct = glucoseValues.length > 0 ? Math.round((inRange / glucoseValues.length) * 100) : 0;

  const distribution = useMemo(() => {
    let low = 0, inTarget = 0, attention = 0, high = 0;
    glucoseValues.forEach(v => {
      if (v < tirRanges.min) low++;
      else if (v <= tirRanges.max) inTarget++;
      else if (v <= 250) attention++;
      else high++;
    });
    return { low, inTarget, attention, high };
  }, [glucoseValues, tirRanges]);

  const chartData = useMemo(() => {
    const sorted = [...periodRecords].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const labels = sorted.map(r => format(new Date(r.timestamp), 'dd/MM HH:mm'));
    const preData = sorted.map(r => r.glucosePre ?? null);
    const pos1hData = sorted.map(r => r.glucosePos1h ?? null);
    const pos2hData = sorted.map(r => r.glucosePos2h ?? null);

    return {
      labels,
      datasets: [
        {
          label: 'Pré-refeição',
          data: preData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.1)',
          tension: 0.3,
          fill: false,
          spanGaps: true,
        },
        {
          label: 'Pós 1h',
          data: pos1hData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          tension: 0.3,
          fill: false,
          spanGaps: true,
        },
        {
          label: 'Pós 2h',
          data: pos2hData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          tension: 0.3,
          fill: false,
          spanGaps: true,
        },
      ],
    };
  }, [periodRecords]);

  const yRange = useMemo(() => {
    if (glucoseValues.length === 0) return { min: 40, max: 200 };
    const minVal = Math.min(...glucoseValues);
    const maxVal = Math.max(...glucoseValues);
    const padding = 20;
    return {
      min: Math.max(0, Math.floor((minVal - padding) / 10) * 10),
      max: Math.ceil((maxVal + padding) / 10) * 10,
    };
  }, [glucoseValues]);

  const total = glucoseValues.length || 1;
  const donutData = {
    labels: [
      `< ${tirRanges.min} mg/dL`,
      `${tirRanges.min} - ${tirRanges.max} mg/dL`,
      `${tirRanges.max} - 250 mg/dL`,
      `> 250 mg/dL`,
    ],
    datasets: [{
      data: [
        Math.round((distribution.low / total) * 100),
        Math.round((distribution.inTarget / total) * 100),
        Math.round((distribution.attention / total) * 100),
        Math.round((distribution.high / total) * 100),
      ],
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      cutout: '70%',
    }],
  };

  const patientName = (profile?.name as string) || 'Paciente';
  const phaseLabel = (profile?.phase as string) || '';
  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  function handlePeriodChange(newPeriod: number) {
    setPeriod(newPeriod);
    setDateOffset(0);
  }

  function handleNav(direction: 'prev' | 'next') {
    if (direction === 'next' && dateOffset >= 0) return;
    setDateOffset(prev => prev + (direction === 'prev' ? -period : period));
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados do paciente...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ padding: '6px 12px', marginRight: 8 }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2 style={{ flex: 1 }}>{patientName}</h2>
      </div>

      {/* Patient info card */}
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: 'white',
          margin: '0 auto 12px',
        }}>
          {initials}
        </div>
        <h3>{patientName}</h3>
        {phaseLabel && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{phaseLabel}</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => exportToCSV(periodRecords)}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => exportToPDF(periodRecords, patientName)}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Period selector + navigation */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8,
        }}>
          {[1, 7, 14, 30].map(d => (
            <button
              key={d}
              className={`btn ${period === d ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange(d)}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              {d}d
            </button>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleNav('prev')}
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 160, textAlign: 'center' }}>
            {periodLabel}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => handleNav('next')}
            disabled={dateOffset >= 0}
            style={{ padding: '4px 8px', minWidth: 'auto', opacity: dateOffset >= 0 ? 0.4 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-purple)' }}>{avg || '-'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Média mg/dL</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{tirPct}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Em Faixa</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{periodRecords.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Registros</div>
        </div>
      </div>

      {/* Glucose trend chart */}
      {periodRecords.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-purple)' }} />
              Tendência Glicêmica
            </h3>
          </div>
          <div style={{ height: 220 }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: {
                  y: {
                    min: yRange.min,
                    max: yRange.max,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { font: { size: 10 } },
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 9 }, maxRotation: 45 },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Distribution donut */}
      {glucoseValues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--accent-purple)' }} />
              Distribuição
            </h3>
          </div>
          <div style={{ maxWidth: 240, margin: '0 auto', position: 'relative' }}>
            <Doughnut
              data={donutData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 10,
                      font: { size: 11 },
                      usePointStyle: true,
                      pointStyle: 'circle',
                      padding: 12,
                    },
                  },
                },
                cutout: '70%',
              }}
            />
            <div style={{
              position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{tirPct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>em faixa</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent records */}
      <div className="card">
        <div className="card-header">
          <h3>Últimos Registros</h3>
        </div>
        {periodRecords.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Nenhum registro no período selecionado
          </p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {periodRecords.slice(0, 30).map(r => (
              <div
                key={r.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{r.mealType}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8, flexShrink: 0, paddingRight: 8 }}>
                    {format(new Date(r.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {r.glucosePre && (
                    <span style={{
                      color: classifyGlucose(r.glucosePre, settings).color,
                    }}>
                      Pré: {r.glucosePre}
                    </span>
                  )}
                  {r.glucosePos1h && (
                    <span style={{
                      color: classifyGlucose(r.glucosePos1h, settings).color,
                    }}>
                      1h: {r.glucosePos1h}
                    </span>
                  )}
                  {r.glucosePos2h && (
                    <span style={{
                      color: classifyGlucose(r.glucosePos2h, settings).color,
                    }}>
                      2h: {r.glucosePos2h}
                    </span>
                  )}
                  {r.insulinApplied && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Insulina: {r.insulinApplied}UI
                    </span>
                  )}
                </div>
                {r.notes && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                    {r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
