import { useEffect, useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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
import type { GlucoseRecord } from '../types';
import { getAllRecords, getSettings } from '../services/database';
import type { UserSettings } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function ChartsPage() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);

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

  // Daily glucose trend
  const dailyChart = useMemo(() => {
    const days: string[] = [];
    const preData: (number | null)[] = [];
    const pos1Data: (number | null)[] = [];
    const pos2Data: (number | null)[] = [];

    for (let i = period - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      days.push(format(day, 'dd/MM'));
      const s = startOfDay(day);
      const e = endOfDay(day);
      const dayRecs = records.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= s.getTime() && t <= e.getTime();
      });
      const pre = dayRecs.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
      const p1 = dayRecs.filter((r) => r.glucosePos1h).map((r) => r.glucosePos1h!);
      const p2 = dayRecs.filter((r) => r.glucosePos2h).map((r) => r.glucosePos2h!);
      preData.push(pre.length ? Math.round(pre.reduce((a, b) => a + b, 0) / pre.length) : null);
      pos1Data.push(p1.length ? Math.round(p1.reduce((a, b) => a + b, 0) / p1.length) : null);
      pos2Data.push(p2.length ? Math.round(p2.reduce((a, b) => a + b, 0) / p2.length) : null);
    }

    return {
      labels: days,
      datasets: [
        { label: 'Pré', data: preData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Pós 1h', data: pos1Data, borderColor: '#f59e0b', tension: 0.4, pointRadius: 3 },
        { label: 'Pós 2h', data: pos2Data, borderColor: '#ec4899', tension: 0.4, pointRadius: 3 },
      ],
    };
  }, [records, period]);

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

  // Time in range donut
  const rangeDonut = useMemo(() => {
    const min = settings?.glucoseTargetMin ?? 70;
    const max = settings?.glucoseTargetMax ?? 140;
    const vals = periodRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
    if (vals.length === 0) return { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#3d2d5c'], cutout: '70%' }] };
    const low = vals.filter((v) => v < min).length;
    const inRange = vals.filter((v) => v >= min && v <= max).length;
    const high = vals.filter((v) => v > max).length;
    const t = vals.length;
    return {
      labels: ['Baixa', 'Em faixa', 'Alta'],
      datasets: [{ data: [Math.round(low/t*100), Math.round(inRange/t*100), Math.round(high/t*100)], backgroundColor: ['#3b82f6', '#22c55e', '#ef4444'], cutout: '70%', borderWidth: 0 }],
    };
  }, [periodRecords, settings]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#a78bca', usePointStyle: true, padding: 12, font: { size: 11 } } },
    },
    scales: {
      x: { grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#6b5b8a', font: { size: 10 } } },
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
          <div className="card-header"><h3>Tendência de Glicemia</h3></div>
          <div className="chart-container"><Line data={dailyChart} options={chartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Tempo em Faixa</h3></div>
          <div className="chart-container" style={{ position: 'relative' }}>
            <Doughnut data={rangeDonut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#a78bca', usePointStyle: true, padding: 10 } } } }} />
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
