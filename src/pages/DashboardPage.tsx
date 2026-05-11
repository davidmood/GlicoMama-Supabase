import { useEffect, useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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
import { TrendingUp, Pencil, Trash2 } from 'lucide-react';
import type { GlucoseRecord, UserSettings } from '../types';
import { classifyGlucose, INSULIN_TYPE_CATEGORIES } from '../types';
import { getAllRecords, deleteRecord, getSettings } from '../services/database';
import Calendar from '../components/Calendar';
import NewRecordModal from '../components/NewRecordModal';
import Toast from '../components/Toast';
import { addRecord, updateRecord } from '../services/database';
import { scheduleGlucoseReminders } from '../services/notifications';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<GlucoseRecord | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const addToast = (message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [recs, s] = await Promise.all([getAllRecords(), getSettings()]);
    setRecords(recs);
    setSettings(s);
  };

  const handleSave = async (record: GlucoseRecord, options?: { scheduleAlarm?: boolean }) => {
    if (editRecord) {
      await updateRecord(record);
    } else {
      await addRecord(record);
      if (options?.scheduleAlarm && record.glucosePre && !record.glucosePos1h && !record.glucosePos2h) {
        const scheduled = scheduleGlucoseReminders(
          record.mealType,
          record.timestamp,
          (msg) => addToast(msg),
        );
        if (scheduled.length > 0) {
          addToast(`Alarmes agendados: ${scheduled.join(' e ')}`);
        }
      }
    }
    setEditRecord(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    loadData();
  };

  const todayRecords = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return records.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= todayStart.getTime() && t <= todayEnd.getTime();
    });
  }, [records]);

  const weekRecords = useMemo(() => {
    const weekStart = subDays(new Date(), 7);
    return records.filter((r) => new Date(r.timestamp) >= weekStart);
  }, [records]);

  const avgGlucose = useMemo(() => {
    const vals = weekRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [weekRecords]);

  const timeInRange = useMemo(() => {
    const min = settings?.glucoseTargetMin ?? 70;
    const max = settings?.glucoseAttentionMax ?? 140;
    const vals = weekRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
    if (vals.length === 0) return 0;
    const inRange = vals.filter((v) => v >= min && v <= max).length;
    return Math.round((inRange / vals.length) * 100);
  }, [weekRecords, settings]);

  const totalCarbsToday = useMemo(() => {
    return todayRecords.reduce((sum, r) => sum + (r.carbohydrates ?? 0), 0);
  }, [todayRecords]);

  const insulinRapidaToday = useMemo(() => {
    return todayRecords
      .filter((r) => r.insulinApplied && INSULIN_TYPE_CATEGORIES.rapida.includes(r.insulinType as typeof INSULIN_TYPE_CATEGORIES.rapida[number]))
      .reduce((sum, r) => sum + (r.insulinApplied ?? 0), 0);
  }, [todayRecords]);

  const insulinLentaToday = useMemo(() => {
    return todayRecords
      .filter((r) => r.insulinApplied && INSULIN_TYPE_CATEGORIES.lenta.includes(r.insulinType as typeof INSULIN_TYPE_CATEGORIES.lenta[number]))
      .reduce((sum, r) => sum + (r.insulinApplied ?? 0), 0);
  }, [todayRecords]);

  const breastfeedingCountToday = useMemo(() => {
    return todayRecords.filter((r) => r.breastfeedingType && r.breastfeedingType !== 'Não realizou').length;
  }, [todayRecords]);

  const lastBreastfeeding = useMemo(() => {
    const bfRecords = records.filter((r) => r.breastfeedingType && r.breastfeedingType !== 'Não realizou' && r.breastSide);
    if (bfRecords.length === 0) return null;
    const last = bfRecords[0];
    return {
      side: last.breastSide,
      time: format(new Date(last.timestamp), 'HH:mm', { locale: ptBR }),
      type: last.breastfeedingType,
      duration: last.breastfeedingDuration,
    };
  }, [records]);

  // Line chart: last 7 days
  const lineChartData = useMemo(() => {
    const days: string[] = [];
    const avgPre: (number | null)[] = [];
    const avgPos1h: (number | null)[] = [];
    const avgPos2h: (number | null)[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'dd/MM');
      days.push(dayStr);

      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayRecords = records.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });

      const preVals = dayRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
      const pos1Vals = dayRecords.filter((r) => r.glucosePos1h).map((r) => r.glucosePos1h!);
      const pos2Vals = dayRecords.filter((r) => r.glucosePos2h).map((r) => r.glucosePos2h!);

      avgPre.push(preVals.length > 0 ? Math.round(preVals.reduce((a, b) => a + b, 0) / preVals.length) : null);
      avgPos1h.push(pos1Vals.length > 0 ? Math.round(pos1Vals.reduce((a, b) => a + b, 0) / pos1Vals.length) : null);
      avgPos2h.push(pos2Vals.length > 0 ? Math.round(pos2Vals.reduce((a, b) => a + b, 0) / pos2Vals.length) : null);
    }

    return {
      labels: days,
      datasets: [
        {
          label: 'Média',
          data: avgPre.map((v, i) => {
            const vals = [v, avgPos1h[i], avgPos2h[i]].filter((x): x is number => x !== null);
            return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
          }),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#8b5cf6',
        },
        {
          label: 'Pré',
          data: avgPre,
          borderColor: '#22c55e',
          tension: 0.4,
          pointRadius: 3,
          borderDash: [5, 5],
        },
        {
          label: 'Pós 1h',
          data: avgPos1h,
          borderColor: '#f59e0b',
          tension: 0.4,
          pointRadius: 3,
          borderDash: [5, 5],
        },
        {
          label: 'Pós 2h',
          data: avgPos2h,
          borderColor: '#ec4899',
          tension: 0.4,
          pointRadius: 3,
          borderDash: [5, 5],
        },
      ],
    };
  }, [records]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#a78bca', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#231a33',
        borderColor: '#3d2d5c',
        borderWidth: 1,
        titleColor: '#f5f3ff',
        bodyColor: '#a78bca',
      },
    },
    scales: {
      x: { grid: { color: 'rgba(61,45,92,0.3)' }, ticks: { color: '#6b5b8a', font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(61,45,92,0.3)' },
        ticks: { color: '#6b5b8a', font: { size: 11 } },
        min: 50,
        max: 250,
        suggestedMin: 50,
        suggestedMax: 250,
      },
    },
  };

  // Donut chart: time in range
  const donutData = useMemo(() => {
    const min = settings?.glucoseTargetMin ?? 70;
    const max = settings?.glucoseTargetMax ?? 140;
    const vals = weekRecords.filter((r) => r.glucosePre).map((r) => r.glucosePre!);

    if (vals.length === 0) return { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#3d2d5c'] }] };

    const low = vals.filter((v) => v < min).length;
    const inRange = vals.filter((v) => v >= min && v <= max).length;
    const high = vals.filter((v) => v > max && v <= 250).length;
    const veryHigh = vals.filter((v) => v > 250).length;

    const total = vals.length;
    return {
      labels: [
        `< ${min} mg/dL`,
        `${min} - ${max} mg/dL`,
        `${max} - 250 mg/dL`,
        `> 250 mg/dL`,
      ],
      datasets: [
        {
          data: [
            Math.round((low / total) * 100),
            Math.round((inRange / total) * 100),
            Math.round((high / total) * 100),
            Math.round((veryHigh / total) * 100),
          ],
          backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          cutout: '70%',
        },
      ],
    };
  }, [weekRecords, settings]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#a78bca', usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } },
      },
    },
  };

  const recentRecords = records.slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Olá, {settings?.name ?? 'Renata'}! 👋</h2>
          <p className="page-greeting">Aqui está o resumo do seu dia.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditRecord(null); setShowModal(true); }}>
          + Novo Registro
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card" onClick={() => onNavigate('charts')} style={{ cursor: 'pointer' }}>
          <div className="label"><TrendingUp size={12} /> Média de Glicemia</div>
          <div className="value">{avgGlucose || '—'}</div>
          <div className="unit">mg/dL</div>
        </div>
        <div className="stat-card">
          <div className="label">Tempo em Faixa</div>
          <div className="value">{timeInRange}%</div>
          <div className="unit">da semana</div>
        </div>
        <div className="stat-card">
          <div className="label">Registros Hoje</div>
          <div className="value">{todayRecords.length}</div>
          <div className="unit">registros</div>
        </div>
        <div className="stat-card">
          <div className="label">Carboidratos Hoje</div>
          <div className="value">{totalCarbsToday}</div>
          <div className="unit">g</div>
        </div>
        <div className="stat-card">
          <div className="label">Insulina Rápida</div>
          <div className="value">{insulinRapidaToday}</div>
          <div className="unit">U</div>
        </div>
        <div className="stat-card">
          <div className="label">Insulina Lenta</div>
          <div className="value">{insulinLentaToday}</div>
          <div className="unit">U</div>
        </div>
        <div className="stat-card">
          <div className="label">Amamentações Hoje</div>
          <div className="value">{breastfeedingCountToday}</div>
          <div className="unit">vezes</div>
        </div>
        <div className="stat-card">
          <div className="label">Última Mama</div>
          <div className="value" style={{ fontSize: 18 }}>
            {lastBreastfeeding ? lastBreastfeeding.side : '—'}
          </div>
          <div className="unit">
            {lastBreastfeeding
              ? `${lastBreastfeeding.type} às ${lastBreastfeeding.time}${lastBreastfeeding.duration ? ` (${lastBreastfeeding.duration} min)` : ''}`
              : 'nenhuma registrada'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>Glicemia - Últimos 7 dias</h3>
          </div>
          <div className="chart-container">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Glicemia - Tempo em Faixa (7 dias)</h3>
          </div>
          <div className="chart-container" style={{ position: 'relative' }}>
            <Doughnut data={donutData} options={donutOptions} />
            <div className="donut-center">
              <div className="pct">{timeInRange}%</div>
              <div className="lbl">em faixa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="bottom-grid">
        <div className="card">
          <div className="card-header">
            <h3>Registros Recentes</h3>
            <button className="btn btn-secondary" onClick={() => onNavigate('records')} style={{ fontSize: 12, padding: '6px 12px' }}>
              Ver todos
            </button>
          </div>
          {recentRecords.length > 0 ? (
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Refeição</th>
                  <th>Pré</th>
                  <th>Pós 1h</th>
                  <th>Pós 2h</th>
                  <th>Insulina (U)</th>
                  <th>Carb (g)</th>
                  <th>Amamentação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r) => {
                  const glucoseInfo = r.glucosePre ? classifyGlucose(r.glucosePre, settings ?? undefined) : null;
                  return (
                    <tr key={r.id}>
                      <td>{format(new Date(r.timestamp), 'dd/MM HH:mm', { locale: ptBR })}</td>
                      <td>{r.mealType}</td>
                      <td>
                        {r.glucosePre ? (
                          <span style={{ color: glucoseInfo?.color }}>{r.glucosePre}</span>
                        ) : '—'}
                      </td>
                      <td>{r.glucosePos1h ?? '—'}</td>
                      <td>{r.glucosePos2h ?? '—'}</td>
                      <td>{r.insulinApplied ?? '—'}</td>
                      <td>{r.carbohydrates ?? '—'}</td>
                      <td>
                        {r.breastfeedingType !== 'Não realizou' ? (
                          <>
                            {r.breastfeedingType}
                            {r.breastfeedingDuration ? ` - ${r.breastfeedingDuration} min` : ''}
                          </>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" onClick={() => { setEditRecord(r); setShowModal(true); }}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDelete(r.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhum registro ainda. Clique em "Novo Registro" para começar!</p>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="card-header">
              <h3>{format(new Date(), 'MMMM yyyy', { locale: ptBR })}</h3>
            </div>
            <Calendar records={records} />
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Lembretes</h3>
            </div>
            {(settings?.reminders ?? []).map((rem) => (
              <div className="reminder-item" key={rem.id}>
                <span className="reminder-time">{rem.time}</span>
                <span className="reminder-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  ⏰
                </span>
                <span className="reminder-label">{rem.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <NewRecordModal
          onClose={() => { setShowModal(false); setEditRecord(null); }}
          onSave={handleSave}
          editRecord={editRecord}
        />
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      )}
    </>
  );
}
