import { useEffect, useState, useMemo } from 'react';
import { subDays, startOfDay, endOfDay, startOfMonth, format } from 'date-fns';
import { X, FileText, Download } from 'lucide-react';
import type { GlucoseRecord, UserSettings } from '../types';
import { getAllRecords, getSettings } from '../services/database';
import { getLibreReadings } from '../services/libre';
import { exportToCSV, exportToPDF } from '../services/export';

type RangeOption = '30d' | 'month' | 'custom';

export default function ReportsPage() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userName, setUserName] = useState('');
  const [period, setPeriod] = useState(30);

  const [exportModal, setExportModal] = useState<null | 'pdf' | 'csv'>(null);
  const [rangeOption, setRangeOption] = useState<RangeOption>('30d');
  const today = format(new Date(), 'yyyy-MM-dd');
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(today);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getAllRecords().then(setRecords);
    getSettings().then((s) => { setUserName(s.name); setSettings(s); });
  }, []);

  const filtered = useMemo(() => {
    const start = subDays(new Date(), period);
    return records.filter((r) => new Date(r.timestamp) >= start);
  }, [records, period]);

  function resolveRange(): { start: Date; end: Date; label: string } {
    const now = new Date();
    if (rangeOption === 'month') {
      const start = startOfMonth(now);
      return { start, end: endOfDay(now), label: `${format(start, 'dd/MM/yyyy')} – ${format(now, 'dd/MM/yyyy')}` };
    }
    if (rangeOption === 'custom') {
      const start = startOfDay(new Date(`${customStart}T00:00:00`));
      const end = endOfDay(new Date(`${customEnd}T00:00:00`));
      return { start, end, label: `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')}` };
    }
    const start = startOfDay(subDays(now, 30));
    return { start, end: endOfDay(now), label: `Últimos 30 dias (${format(start, 'dd/MM/yyyy')} – ${format(now, 'dd/MM/yyyy')})` };
  }

  async function handleConfirmExport() {
    const type = exportModal;
    if (!type) return;
    if (rangeOption === 'custom') {
      if (!customStart || !customEnd) { alert('Selecione as datas de início e fim.'); return; }
      if (new Date(customStart) > new Date(customEnd)) { alert('A data de início não pode ser depois da data de fim.'); return; }
    }
    setExporting(true);
    try {
      const { start, end, label } = resolveRange();
      const rangeRecords = records.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });
      if (type === 'csv') {
        exportToCSV(rangeRecords);
      } else {
        const libre = await getLibreReadings(start.toISOString(), end.toISOString()).catch(() => []);
        await exportToPDF(rangeRecords, userName, {
          libreReadings: libre,
          ranges: settings ? {
            targetMin: settings.glucoseTargetMin,
            targetMax: settings.glucoseTargetMax,
            attentionMax: settings.glucoseAttentionMax,
          } : undefined,
          periodLabel: label,
        });
      }
      setExportModal(null);
    } finally {
      setExporting(false);
    }
  }

  const stats = useMemo(() => {
    const preVals = filtered.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
    const avg = preVals.length ? Math.round(preVals.reduce((a, b) => a + b, 0) / preVals.length) : 0;
    const min = preVals.length ? Math.min(...preVals) : 0;
    const max = preVals.length ? Math.max(...preVals) : 0;
    const inRange = preVals.filter((v) => v >= 70 && v <= 140).length;
    const pct = preVals.length ? Math.round((inRange / preVals.length) * 100) : 0;
    const totalInsulin = filtered.reduce((s, r) => s + (r.insulinApplied ?? 0), 0);
    const totalCarbs = filtered.reduce((s, r) => s + (r.carbohydrates ?? 0), 0);
    const bfCount = filtered.filter((r) => r.breastfeedingType && r.breastfeedingType !== 'Não realizou').length;

    return { avg, min, max, pct, totalInsulin, totalCarbs, bfCount, total: filtered.length };
  }, [filtered]);

  return (
    <>
      <div className="page-header">
        <h2>Relatórios</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="form-input"
            style={{ width: 150 }}
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={9999}>Todos</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Registros</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Média Glicêmica</div>
          <div className="value">{stats.avg}</div>
          <div className="unit">mg/dL</div>
        </div>
        <div className="stat-card">
          <div className="label">Mínima</div>
          <div className="value">{stats.min}</div>
          <div className="unit">mg/dL</div>
        </div>
        <div className="stat-card">
          <div className="label">Máxima</div>
          <div className="value">{stats.max}</div>
          <div className="unit">mg/dL</div>
        </div>
        <div className="stat-card">
          <div className="label">Tempo em Faixa</div>
          <div className="value">{stats.pct}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Amamentações</div>
          <div className="value">{stats.bfCount}</div>
        </div>
      </div>

      {/* Export Options */}
      <div className="charts-grid">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <FileText size={48} style={{ color: 'var(--accent-purple)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>Relatório PDF</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Gere um relatório completo em PDF com todos os registros, estatísticas e informações para compartilhar com seu médico.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { setRangeOption('30d'); setExportModal('pdf'); }}
          >
            <Download size={16} /> Baixar PDF
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <FileText size={48} style={{ color: 'var(--accent-green)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>Exportar CSV/Excel</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Exporte seus dados em formato CSV para abrir no Excel, Google Sheets ou outro programa de planilhas.
          </p>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--accent-green)' }}
            onClick={() => { setRangeOption('30d'); setExportModal('csv'); }}
          >
            <Download size={16} /> Baixar CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Resumo do Período</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Glicemia</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Média</span>
                <span style={{ fontWeight: 600 }}>{stats.avg} mg/dL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mínima</span>
                <span style={{ fontWeight: 600 }}>{stats.min} mg/dL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Máxima</span>
                <span style={{ fontWeight: 600 }}>{stats.max} mg/dL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tempo em faixa (70-140)</span>
                <span style={{ fontWeight: 600, color: stats.pct >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{stats.pct}%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Insulina e Alimentação</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Insulina total</span>
                <span style={{ fontWeight: 600 }}>{stats.totalInsulin} U</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Carboidratos total</span>
                <span style={{ fontWeight: 600 }}>{stats.totalCarbs} g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amamentações</span>
                <span style={{ fontWeight: 600 }}>{stats.bfCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {exportModal && (
        <div className="modal-overlay" onClick={() => !exporting && setExportModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Exportar {exportModal === 'pdf' ? 'PDF' : 'CSV'} — período</h3>
              <button className="btn-icon" onClick={() => !exporting && setExportModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="rangeOption" checked={rangeOption === '30d'} onChange={() => setRangeOption('30d')} />
                  Últimos 30 dias
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="rangeOption" checked={rangeOption === 'month'} onChange={() => setRangeOption('month')} />
                  Este mês
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="rangeOption" checked={rangeOption === 'custom'} onChange={() => setRangeOption('custom')} />
                  Personalizado
                </label>

                {rangeOption === 'custom' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Início</label>
                      <input
                        type="date"
                        className="form-input"
                        value={customStart}
                        max={today}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Fim</label>
                      <input
                        type="date"
                        className="form-input"
                        value={customEnd}
                        max={today}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
              <button className="btn btn-secondary" onClick={() => setExportModal(null)} disabled={exporting}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmExport} disabled={exporting}>
                <Download size={16} /> {exporting ? 'Gerando...' : 'Baixar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
