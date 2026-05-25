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
import { getLibreReadings, trendArrow, type LibreReading } from '../services/libre';
import { getSettings } from '../services/database';
import type { UserSettings } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

interface Props {
  onNavigate?: (page: string) => void;
}

export default function LibreDashboardPage({ onNavigate }: Props) {
  const [readings, setReadings] = useState<LibreReading[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState<'1d' | '7d' | '14d'>('1d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    loadReadings();
  }, [selectedDate, period]);

  async function loadReadings() {
    setLoading(true);
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 14;
    const start = startOfDay(period === '1d' ? selectedDate : subDays(selectedDate, days - 1));
    const end = endOfDay(selectedDate);
    const data = await getLibreReadings(start.toISOString(), end.toISOString());
    setReadings(data);
    setLoading(false);
  }

  const targetMin = settings?.glucoseTargetMin ?? 70;
  const targetMax = settings?.glucoseTargetMax ?? 180;
  const attentionMax = settings?.glucoseAttentionMax ?? 250;

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
      return period === '1d'
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
          pointRadius: period === '1d' ? 3 : 1.5,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
          borderWidth: 2,
        },
      ],
      minVal,
      maxVal,
    };
  }, [readings, period, targetMin, targetMax, attentionMax]);

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
            maxTicksLimit: period === '1d' ? 24 : 14,
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
  }, [chartData, readings, targetMin, targetMax, period]);

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={22} style={{ color: 'var(--accent-purple)' }} />
          CGM - Monitoramento Contínuo
        </h2>
        {onNavigate && (
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

      {/* Period selector + navigation */}
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
                <div style={{ width: `${stats.lowPct}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                  {stats.lowPct}%
                </div>
              )}
              <div style={{ width: `${stats.tirPct}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                {stats.tirPct}%
              </div>
              {stats.highPct > 0 && (
                <div style={{ width: `${stats.highPct}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                  {stats.highPct}%
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

      {/* Recent readings table */}
      {readings.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Leituras Recentes</h3>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="records-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Horário</th>
                  <th>Glicemia</th>
                  <th>Tendência</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().slice(0, 50).map(r => {
                  const d = new Date(r.timestamp);
                  const color = r.glucoseValue < targetMin ? '#3b82f6'
                    : r.glucoseValue <= targetMax ? '#22c55e'
                    : r.glucoseValue <= attentionMax ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          {period === '1d' ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm')}
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
        </div>
      )}
    </>
  );
}
