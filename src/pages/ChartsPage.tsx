import { useEffect, useState, useMemo } from 'react';
import { format, subDays, addDays, startOfDay, endOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GlucoseRecord } from '../types';
import { getAllRecords, getSettings } from '../services/database';
import type { UserSettings } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function ChartsPage() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    Promise.all([getAllRecords(), getSettings()]).then(([r, s]) => {
      setRecords(r);
      setSettings(s);
    });
  }, []);

  const periodRecords = useMemo(() => {
    const start = subDays(new Date(), period);
    return records.filter((r) => new Date(r.timestamp) >= start);
  }, [records, period]);

  // Daily glucose trend - shows all records for selected day
  const dailyChart = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    const dayRecs = records
      .filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (dayRecs.length === 0) {
      return {
        labels: ['Sem registros'],
        datasets: [{ label: 'Pré', data: [null], borderColor: '#22c55e', pointRadius: 0 }],
      };
    }

    const labels = dayRecs.map((r) => format(new Date(r.timestamp), 'HH:mm') + '\n' + r.mealType);
    const preData = dayRecs.map((r) => r.glucosePre ?? null);
    const pos1Data = dayRecs.map((r) => r.glucosePos1h ?? null);
    const pos2Data = dayRecs.map((r) => r.glucosePos2h ?? null);

    return {
      labels,
      datasets: [
        { label: 'Pré', data: preData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true, pointRadius: 5, pointBackgroundColor: '#22c55e', spanGaps: true },
        { label: 'Pós 1h', data: pos1Data, borderColor: '#f59e0b', tension: 0.3, pointRadius: 5, pointBackgroundColor: '#f59e0b', spanGaps: true },
        { label: 'Pós 2h', data: pos2Data, borderColor: '#ec4899', tension: 0.3, pointRadius: 5, pointBackgroundColor: '#ec4899', spanGaps: true },
      ],
    };
  }, [records, selectedDate]);

  // Glucose by meal
  const mealChart = useMemo(() => {
    const mealMap: Record<string, number[]> = {};
    for (const r of periodRecords) {
      if (r.glucosePre) {
        if (!mealMap[r.mealType]) mealMap[r.mealType] = [];
        mealMap[r.mealType].push(r.glucosePre);
      }
    }
    const meals = Object.keys(mealMap);
    const avgs = meals.map((m) => Math.round(mealMap[m].reduce((a, b) => a + b, 0) / mealMap[m].length));

    return {
      labels: meals,
      datasets: [{
        label: 'Média Glicemia (mg/dL)',
        data: avgs,
        backgroundColor: ['#8b5cf6', '#ec4899', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1'],
        borderRadius: 8,
      }],
    };
  }, [periodRecords]);

  // Glucose vs Breastfeeding
  const bfChart = useMemo(() => {
    const bfMap: Record<string, number[]> = {};
    for (const r of periodRecords) {
      if (r.glucosePre && r.breastfeedingType) {
        if (!bfMap[r.breastfeedingType]) bfMap[r.breastfeedingType] = [];
        bfMap[r.breastfeedingType].push(r.glucosePre);
      }
    }
    const types = Object.keys(bfMap);
    const avgs = types.map((t) => Math.round(bfMap[t].reduce((a, b) => a + b, 0) / bfMap[t].length));

    return {
      labels: types,
      datasets: [{
        label: 'Média Glicemia (mg/dL)',
        data: avgs,
        backgroundColor: ['#ec4899', '#8b5cf6', '#22c55e', '#6b5b8a'],
        borderRadius: 8,
      }],
    };
  }, [periodRecords]);

  // Insulin chart
  const insulinChart = useMemo(() => {
    const days: string[] = [];
    const insulinData: number[] = [];
    const carbData: number[] = [];

    for (let i = period - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      days.push(format(day, 'dd/MM'));
      const s = startOfDay(day);
      const e = endOfDay(day);
      const dayRecs = records.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= s.getTime() && t <= e.getTime();
      });
      insulinData.push(dayRecs.reduce((sum, r) => sum + (r.insulinApplied ?? 0), 0));
      carbData.push(dayRecs.reduce((sum, r) => sum + (r.carbohydrates ?? 0), 0));
    }

    return {
      labels: days,
      datasets: [
        { label: 'Insulina (U)', data: insulinData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true, yAxisID: 'y' },
        { label: 'Carboidratos (g)', data: carbData, borderColor: '#f59e0b', tension: 0.4, yAxisID: 'y1' },
      ],
    };
  }, [records, period]);

  // Time in range donut with detailed labels
  const lowMax = settings?.glucoseLowMax ?? 69;
  const targetMin = settings?.glucoseTargetMin ?? 70;
  const targetMax = settings?.glucoseTargetMax ?? 100;
  const attentionMax = settings?.glucoseAttentionMax ?? 140;

  const rangeDonut = useMemo(() => {
    const vals: number[] = [];
    periodRecords.forEach(r => {
      if (r.glucosePre) vals.push(r.glucosePre);
      if (r.glucosePos1h) vals.push(r.glucosePos1h);
      if (r.glucosePos2h) vals.push(r.glucosePos2h);
    });
    if (vals.length === 0) return null;

    const low = vals.filter((v) => v <= lowMax).length;
    const inRange = vals.filter((v) => v >= targetMin && v <= targetMax).length;
    const attention = vals.filter((v) => v > targetMax && v <= attentionMax).length;
    const high = vals.filter((v) => v > attentionMax).length;
    const t = vals.length;

    const lowPct = Math.round(low / t * 100);
    const inRangePct = Math.round(inRange / t * 100);
    const attPct = Math.round(attention / t * 100);
    const highPct = Math.round(high / t * 100);

    return {
      data: {
        labels: [
          `< ${targetMin} mg/dL`,
          `${targetMin} - ${targetMax} mg/dL`,
          `${targetMax + 1} - ${attentionMax} mg/dL`,
          `> ${attentionMax} mg/dL`,
        ],
        datasets: [{
          data: [lowPct, inRangePct, attPct, highPct],
          backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
          cutout: '65%',
          borderWidth: 0,
        }],
      },
      total: t,
      inRangePct,
    };
  }, [periodRecords, lowMax, targetMin, targetMax, attentionMax]);

  const dailyChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#a78bca', usePointStyle: true, padding: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          title: (items: { label?: string }[]) => items[0]?.label?.replace('\n', ' - ') || '',
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(61,45,92,0.3)' },
        ticks: {
          color: '#6b5b8a',
          font: { size: 9 },
          maxRotation: 45,
          callback: function(_: unknown, index: number) {
            const label = dailyChart.labels[index];
            return label ? label.split('\n')[0] : '';
          },
        },
      },
      y: { grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#6b5b8a' } },
    },
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#a78bca', font: { size: 11 } } },
      y: { grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#6b5b8a' } },
    },
  };

  const dualAxisOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: '#a78bca', usePointStyle: true, padding: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#6b5b8a', font: { size: 10 } } },
      y: { type: 'linear' as const, position: 'left' as const, grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#3b82f6' }, title: { display: true, text: 'Insulina (U)', color: '#3b82f6' } },
      y1: { type: 'linear' as const, position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#f59e0b' }, title: { display: true, text: 'Carb (g)', color: '#f59e0b' } },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#a78bca',
          usePointStyle: true,
          padding: 10,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; raw?: unknown }) => `${ctx.label}`,
        },
      },
    },
  };

  const selectedDateStr = format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <>
      <div className="page-header">
        <h2>Gráficos</h2>
        <div className="tabs" style={{ width: 'auto', marginBottom: 0 }}>
          {([7, 14, 30] as const).map((p) => (
            <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'column', gap: 8 }}>
            <h3>Tendência de Glicemia</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn-icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                style={{ padding: 4 }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize', minWidth: 180, textAlign: 'center' }}>
                {isToday(selectedDate) ? 'Hoje' : selectedDateStr}
              </span>
              <button
                className="btn-icon"
                onClick={() => !isToday(selectedDate) && setSelectedDate(addDays(selectedDate, 1))}
                style={{ padding: 4, opacity: isToday(selectedDate) ? 0.3 : 1 }}
                disabled={isToday(selectedDate)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="chart-container"><Line data={dailyChart} options={dailyChartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Tempo em Faixa</h3></div>
          <div className="chart-container" style={{ position: 'relative' }}>
            {rangeDonut ? (
              <>
                <Doughnut data={rangeDonut.data} options={donutOpts} />
                <div style={{
                  position: 'absolute',
                  top: '35%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{rangeDonut.inRangePct}%</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>em faixa</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rangeDonut.total} medições</div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Sem registros de glicemia no período
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h3>Glicemia por Refeição</h3></div>
          <div className="chart-container"><Bar data={mealChart} options={barOpts} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Glicemia x Amamentação</h3></div>
          <div className="chart-container"><Bar data={bfChart} options={barOpts} /></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h3>Insulina x Carboidratos</h3></div>
          <div className="chart-container"><Line data={insulinChart} options={dualAxisOpts} /></div>
        </div>
      </div>
    </>
  );
}
