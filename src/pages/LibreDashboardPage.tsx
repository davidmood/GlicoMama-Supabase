import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, RefreshCw, ChevronLeft, ChevronRight, WifiOff, TrendingUp, TrendingDown, Minus, Clock, Settings } from 'lucide-react';
import { getLibreReadings, getLibreReadingsForPatient, trendArrow, type LibreReading } from '../services/libre';
import { getSettings, getRecordsByDateRange } from '../services/database';
import type { UserSettings, GlucoseRecord } from '../types';

const MAIN_MEALS = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia', 'Madrugada'];
const MEAL_EMOJI: Record<string, string> = {
  'Café da manhã': '🍳',
  'Lanche da manhã': '🍎',
  'Almoço': '🍽️',
  'Lanche da tarde': '🥪',
  'Jantar': '🍲',
  'Ceia': '🌙',
  'Madrugada': '🌙',
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

interface PatientCgmSettings {
  glucoseTargetMin: number;
  glucoseTargetMax: number;
  glucoseAttentionMax: number;
}

interface Props {
  onNavigate?: (page: string) => void;
  patientId?: string;
  patientSettings?: PatientCgmSettings;
  embedded?: boolean;
  rangeStart?: Date;
  rangeEnd?: Date;
  periodDays?: number;
  mealRecords?: GlucoseRecord[];
}

export default function LibreDashboardPage({ onNavigate, patientId, patientSettings, embedded, rangeStart, rangeEnd, periodDays, mealRecords }: Props) {
  const [readings, setReadings] = useState<LibreReading[]>([]);
  const [ownRecords, setOwnRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState<'1d' | '7d' | '14d'>('1d');
  const [loading, setLoading] = useState(true);
  const [showAllReadings, setShowAllReadings] = useState(false);

  const controlled = !!(rangeStart && rangeEnd);
  const is1d = controlled ? periodDays === 1 : period === '1d';

  useEffect(() => {
    if (!patientSettings) getSettings().then(setSettings);
  }, [patientSettings]);

  useEffect(() => {
    loadReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, period, patientId, rangeStart, rangeEnd]);

  async function loadReadings() {
    setLoading(true);
    let start: Date;
    let end: Date;
    if (controlled) {
      start = rangeStart!;
      end = rangeEnd!;
    } else {
      const days = period === '1d' ? 1 : period === '7d' ? 7 : 14;
      start = startOfDay(period === '1d' ? selectedDate : subDays(selectedDate, days - 1));
      end = endOfDay(selectedDate);
    }
    const data = patientId
      ? await getLibreReadingsForPatient(patientId, start.toISOString(), end.toISOString())
      : await getLibreReadings(start.toISOString(), end.toISOString());
    setReadings(data);
    if (!patientId) {
      try {
        setOwnRecords(await getRecordsByDateRange(start, end));
      } catch {
        setOwnRecords([]);
      }
    }
    setLoading(false);
  }

  const mealsForChart = useMemo(
    () => (patientId ? (mealRecords ?? []) : ownRecords),
    [patientId, mealRecords, ownRecords],
  );

  const targetMin = patientSettings?.glucoseTargetMin ?? settings?.glucoseTargetMin ?? 70;
  const targetMax = patientSettings?.glucoseTargetMax ?? settings?.glucoseTargetMax ?? 180;
  const attentionMax = patientSettings?.glucoseAttentionMax ?? settings?.glucoseAttentionMax ?? 250;

  // Stats
  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const values = readings.map(r => r.glucoseValue);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const inRange = values.filter(v => v >= targetMin && v <= targetMax).length;
    const tirPct = Math.round((inRange / values.length) * 100);
    const low = values.filter(v => v < targetMin).length;
    const lowPct = Math.round((low / values.length) * 100);
    const high = values.filter(v => v > targetMax).length;
    const highPct = Math.round((high / values.length) * 100);
    // GMI (Glucose Management Indicator) approximation
    const gmi = (3.31 + 0.02392 * avg).toFixed(1);
    // Standard deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const sd = Math.round(Math.sqrt(variance));
    // CV (Coefficient of Variation)
    const cv = Math.round((sd / avg) * 100);

    // Last reading
    const lastReading = readings[readings.length - 1];

    return { avg, min, max, tirPct, lowPct, highPct, gmi, sd, cv, lastReading, total: readings.length };
  }, [readings, targetMin, targetMax]);

  // Chart data
  const chartData = useMemo(() => {
    if (readings.length === 0) return null;

    const labels = readings.map(r => {
      const d = new Date(r.timestamp);
      return is1d
        ? format(d, 'HH:mm')
        : format(d, 'dd/MM HH:mm');
    });

    const values = readings.map(r => r.glucoseValue);
    const colors = readings.map(r => {
      if (r.glucoseValue < targetMin) return '#3b82f6';
      if (r.glucoseValue <= targetMax) return '#22c55e';
      if (r.glucoseValue <= attentionMax) return '#f59e0b';
      return '#ef4444';
    });

    const minVal = Math.min(...values, targetMin - 10);
    const maxVal = Math.max(...values, targetMax + 10);

    return {
      labels,
      datasets: [
        {
          label: 'Glicemia (mg/dL)',
          data: values,
          borderColor: '#a78bca',
          backgroundColor: 'rgba(167,139,202,0.1)',
          pointBackgroundColor: colors,
          pointBorderColor: colors,
          pointRadius: is1d ? 3 : 1.5,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
          borderWidth: 2,
        },
      ],
      minVal,
      maxVal,
    };
  }, [readings, is1d, targetMin, targetMax, attentionMax]);

  const chartOptions = useMemo(() => {
    if (!chartData) return {};
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: Math.max(0, (chartData.minVal ?? 40) - 10),
          max: (chartData.maxVal ?? 250) + 10,
          grid: { color: 'rgba(167,139,202,0.1)' },
          ticks: { color: '#a78bca', font: { size: 10 } },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#a78bca',
            font: { size: 9 },
            maxRotation: 45,
            maxTicksLimit: is1d ? 24 : 14,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 20, 50, 0.95)',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callbacks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: (ctx: any) => {
              const reading = readings[ctx.dataIndex];
              const arrow = reading ? trendArrow(reading.trend) : '';
              return `${ctx.raw} mg/dL ${arrow}`;
            },
          },
        },
        annotation: {
          annotations: {
            targetZone: {
              type: 'box',
              yMin: targetMin,
              yMax: targetMax,
              backgroundColor: 'rgba(34,197,94,0.08)',
              borderWidth: 0,
            },
            targetMinLine: {
              type: 'line',
              yMin: targetMin,
              yMax: targetMin,
              borderColor: 'rgba(34,197,94,0.3)',
              borderWidth: 1,
              borderDash: [4, 4],
            },
            targetMaxLine: {
              type: 'line',
              yMin: targetMax,
              yMax: targetMax,
              borderColor: 'rgba(34,197,94,0.3)',
              borderWidth: 1,
              borderDash: [4, 4],
            },
          },
        },
      },
    };
  }, [chartData, readings, targetMin, targetMax, is1d]);

  // Integrated chart: continuous glucose line + meal markers
  const integratedData = useMemo(() => {
    if (readings.length === 0) return null;

    const labels = readings.map(r => {
      const d = new Date(r.timestamp);
      return is1d ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm');
    });
    const values = readings.map(r => r.glucoseValue);
    const lineColors = readings.map(r => {
      if (r.glucoseValue < targetMin) return '#3b82f6';
      if (r.glucoseValue <= targetMax) return '#22c55e';
      if (r.glucoseValue <= attentionMax) return '#f59e0b';
      return '#ef4444';
    });

    const readingTimes = readings.map(r => new Date(r.timestamp).getTime());
    const first = readingTimes[0];
    const last = readingTimes[readingTimes.length - 1];
    const mealByIndex: Record<number, { name: string; time: string; pre: number | null }> = {};
    mealsForChart.forEach(m => {
      if (!MAIN_MEALS.includes(m.mealType)) return;
      const t = new Date(m.timestamp).getTime();
      if (t < first || t > last) return;
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < readingTimes.length; i++) {
        const diff = Math.abs(readingTimes[i] - t);
        if (diff < best) { best = diff; nearest = i; }
      }
      mealByIndex[nearest] = {
        name: m.mealType,
        time: format(new Date(m.timestamp), 'HH:mm'),
        pre: m.glucosePre ?? null,
      };
    });

    const mealData = values.map((v, i) => (mealByIndex[i] !== undefined ? v : null));
    const hasMeals = Object.keys(mealByIndex).length > 0;

    const minVal = Math.min(...values, targetMin - 10);
    const maxVal = Math.max(...values, targetMax + 10);

    return {
      mealByIndex,
      hasMeals,
      minVal,
      maxVal,
      chart: {
        labels,
        datasets: [
          {
            label: 'Glicemia',
            data: values,
            borderColor: '#a78bca',
            backgroundColor: 'rgba(167,139,202,0.1)',
            pointBackgroundColor: lineColors,
            pointBorderColor: lineColors,
            pointRadius: is1d ? 2 : 1,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true,
            borderWidth: 2,
            order: 2,
          },
          {
            label: 'Refeições',
            data: mealData,
            showLine: false,
            pointStyle: 'triangle',
            pointRadius: 9,
            pointHoverRadius: 12,
            pointBackgroundColor: '#ec4899',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            order: 1,
          },
        ],
      },
    };
  }, [readings, mealsForChart, is1d, targetMin, targetMax, attentionMax]);

  const integratedOptions = useMemo(() => {
    if (!integratedData) return {};
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: Math.max(0, (integratedData.minVal ?? 40) - 10),
          max: (integratedData.maxVal ?? 250) + 10,
          grid: { color: 'rgba(167,139,202,0.1)' },
          ticks: { color: '#a78bca', font: { size: 10 } },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#a78bca',
            font: { size: 9 },
            maxRotation: 0,
            autoSkip: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            callback: function (this: any, value: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const label = (this as any).getLabelForValue(value) as string;
              if (!label.endsWith(':00')) return '';
              return is1d ? label.slice(0, 2) + 'h' : label;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#a78bca', font: { size: 11 }, usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 20, 50, 0.95)',
          callbacks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: (ctx: any) => {
              if (ctx.datasetIndex === 1) {
                const m = integratedData.mealByIndex[ctx.dataIndex];
                if (!m) return '';
                const emoji = MEAL_EMOJI[m.name] || '🍽️';
                return `${emoji} ${m.name} (${m.time})${m.pre ? ` · Pré ${m.pre}` : ''}`;
              }
              const reading = readings[ctx.dataIndex];
              const arrow = reading ? trendArrow(reading.trend) : '';
              return `${ctx.raw} mg/dL ${arrow}`;
            },
          },
        },
        annotation: {
          annotations: {
            targetZone: {
              type: 'box',
              yMin: targetMin,
              yMax: targetMax,
              backgroundColor: 'rgba(34,197,94,0.08)',
              borderWidth: 0,
            },
          },
        },
      },
    };
  }, [integratedData, readings, is1d, targetMin, targetMax]);

  const navigate = (dir: number) => {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 14;
    setSelectedDate(prev => dir > 0 ? addDays(prev, days) : subDays(prev, days));
  };

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising' || trend === 'rising_fast') return <TrendingUp size={16} style={{ color: '#ef4444' }} />;
    if (trend === 'falling' || trend === 'falling_fast') return <TrendingDown size={16} style={{ color: '#3b82f6' }} />;
    return <Minus size={16} style={{ color: '#22c55e' }} />;
  };

  const dateLabel = period === '1d'
    ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
    : `${format(subDays(selectedDate, period === '7d' ? 6 : 13), 'dd/MM')} - ${format(selectedDate, 'dd/MM')}`;

  return (
    <>
      {!embedded && (
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={22} style={{ color: 'var(--accent-purple)' }} />
            CGM - Monitoramento Contínuo
          </h2>
          {onNavigate && !patientId && (
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('libre-settings')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              <Settings size={14} />
              Configurar
            </button>
          )}
        </div>
      )}

      {/* Period selector + navigation */}
      {!controlled && (
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['1d', '7d', '14d'] as const).map(p => (
              <button
                key={p}
                className={`btn ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriod(p)}
                style={{ padding: '6px 14px', fontSize: 13, minWidth: 'auto' }}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: '6px 8px', minWidth: 'auto' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>
              {dateLabel}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(1)}
              disabled={isToday && period === '1d'}
              style={{ padding: '6px 8px', minWidth: 'auto' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={loadReadings}
            disabled={loading}
            style={{ padding: '6px 10px', minWidth: 'auto' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
      )}

      {/* Current reading + stats */}
      {stats && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {stats.lastReading && (
              <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Activity size={12} /> Última Leitura
                </div>
                <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {stats.lastReading.glucoseValue}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>mg/dL</span>
                  <TrendIcon trend={stats.lastReading.trend} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {format(new Date(stats.lastReading.timestamp), 'HH:mm')}
                </div>
              </div>
            )}

            <div className="stat-card">
              <div className="stat-label">Média</div>
              <div className="stat-value">{stats.avg} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>mg/dL</span></div>
            </div>

            <div className="stat-card" style={{ borderLeft: '3px solid #22c55e' }}>
              <div className="stat-label">Tempo em Faixa</div>
              <div className="stat-value" style={{ color: '#22c55e' }}>{stats.tirPct}%</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">GMI (HbA1c est.)</div>
              <div className="stat-value">{stats.gmi}%</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Min / Max</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{stats.min} - {stats.max}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Desvio / CV</div>
              <div className="stat-value" style={{ fontSize: 16 }}>±{stats.sd} ({stats.cv}%)</div>
            </div>
          </div>

          {/* TIR bar */}
          <div className="card">
            <div className="card-header"><h3>Distribuição</h3></div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28, marginBottom: 8 }}>
              {stats.lowPct > 0 && (
                <div style={{ width: `${stats.lowPct}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {stats.lowPct >= 8 ? `${stats.lowPct}%` : ''}
                </div>
              )}
              <div style={{ width: `${stats.tirPct}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {stats.tirPct >= 8 ? `${stats.tirPct}%` : ''}
              </div>
              {stats.highPct > 0 && (
                <div style={{ width: `${stats.highPct}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {stats.highPct >= 8 ? `${stats.highPct}%` : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>🔵 Baixa: {stats.lowPct}%</span>
              <span>🟢 Em faixa: {stats.tirPct}%</span>
              <span>🔴 Alta: {stats.highPct}%</span>
            </div>
          </div>
        </>
      )}

      {/* Glucose line chart */}
      <div className="card">
        <div className="card-header">
          <h3>Glicemia Contínua</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{readings.length} leituras</span>
        </div>
        <div className="chart-container" style={{ height: 280 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Carregando...
            </div>
          ) : chartData ? (
            <Line data={chartData} options={chartOptions as Record<string, unknown>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8 }}>
              <WifiOff size={32} />
              <span>Nenhuma leitura neste período</span>
            </div>
          )}
        </div>
      </div>

      {/* Integrated chart: glucose + meals */}
      {integratedData && (
        <div className="card">
          <div className="card-header">
            <h3>Glicemia + Refeições</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {integratedData.hasMeals ? 'refeições marcadas no horário' : 'sem refeições no período'}
            </span>
          </div>
          <div className="chart-container" style={{ height: 300 }}>
            <Line data={integratedData.chart} options={integratedOptions as Record<string, unknown>} />
          </div>
        </div>
      )}

      {/* Recent readings table */}
      {readings.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Leituras Recentes</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {showAllReadings ? readings.length : Math.min(15, readings.length)} de {readings.length}
            </span>
          </div>
          <div style={{ maxHeight: showAllReadings ? 500 : 300, overflowY: 'auto' }}>
            <table className="records-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Horário</th>
                  <th>Glicemia</th>
                  <th>Tendência</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().slice(0, showAllReadings ? readings.length : 15).map(r => {
                  const d = new Date(r.timestamp);
                  const color = r.glucoseValue < targetMin ? '#3b82f6'
                    : r.glucoseValue <= targetMax ? '#22c55e'
                    : r.glucoseValue <= attentionMax ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          {is1d ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm')}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color }}>{r.glucoseValue} mg/dL</td>
                      <td style={{ textAlign: 'center', fontSize: 14 }}>
                        <TrendIcon trend={r.trend} />
                        <span style={{ marginLeft: 4, fontSize: 12 }}>{trendArrow(r.trend)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {readings.length > 15 && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAllReadings(v => !v)}
              style={{ width: '100%', marginTop: 10, fontSize: 13 }}
            >
              {showAllReadings ? 'Mostrar menos' : `Mostrar + (${readings.length - 15} leituras)`}
            </button>
          )}
        </div>
      )}
    </>
  );
}
