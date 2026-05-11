import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { GlucoseRecord, UserSettings } from '../types';
import { classifyGlucose } from '../types';
import { getAllRecords, deleteRecord, addRecord, updateRecord, getSettings } from '../services/database';
import NewRecordModal from '../components/NewRecordModal';

export default function RecordsPage() {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<GlucoseRecord | null>(null);
  const [search, setSearch] = useState('');
  const [filterMeal, setFilterMeal] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasDetails = (r: GlucoseRecord) =>
    !!(r.notes || r.foodDescription || r.symptoms);

  const truncate = (text: string, max = 80) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const [recs, s] = await Promise.all([getAllRecords(), getSettings()]);
    setRecords(recs);
    setSettings(s);
  };

  const handleSave = async (record: GlucoseRecord) => {
    if (editRecord) {
      await updateRecord(record);
    } else {
      await addRecord(record);
    }
    setEditRecord(null);
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    loadRecords();
  };

  const filtered = records.filter((r) => {
    const matchSearch = search
      ? r.mealType.toLowerCase().includes(search.toLowerCase()) ||
        r.notes.toLowerCase().includes(search.toLowerCase()) ||
        r.insulinType.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchMeal = filterMeal ? r.mealType === filterMeal : true;
    return matchSearch && matchMeal;
  });

  // Group by date
  const grouped: Record<string, GlucoseRecord[]> = {};
  for (const r of filtered) {
    const key = format(new Date(r.timestamp), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  return (
    <>
      <div className="page-header">
        <h2>Registros</h2>
        <button className="btn btn-primary" onClick={() => { setEditRecord(null); setShowModal(true); }}>
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', position: 'relative', minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar registros..."
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 160 }}
          value={filterMeal}
          onChange={(e) => setFilterMeal(e.target.value)}
        >
          <option value="">Todas as refeições</option>
          <option value="Café da manhã">Café da manhã</option>
          <option value="Almoço">Almoço</option>
          <option value="Jantar">Jantar</option>
          <option value="Ceia">Ceia</option>
          <option value="Lanche da manhã">Lanche da manhã</option>
          <option value="Lanche da tarde">Lanche da tarde</option>
          <option value="Amamentação">Amamentação</option>
          <option value="Correção Alvo">Correção Alvo</option>
          <option value="Correção Hipoglicemia">Correção Hipoglicemia</option>
          <option value="Insulina Rápida">Insulina Rápida</option>
          <option value="Insulina Basal">Insulina Basal</option>
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>Nenhum registro encontrado.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Criar primeiro registro
            </button>
          </div>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayRecords]) => (
            <div className="card" key={date}>
              <div className="card-header">
                <h3>{format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
                <span className="badge badge-purple">{dayRecords.length} registros</span>
              </div>
              <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Refeição</th>
                    <th>Pré</th>
                    <th>Pós 1h</th>
                    <th>Pós 2h</th>
                    <th>Insulina</th>
                    <th>Carb</th>
                    <th>Amamentação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRecords.map((r) => {
                    const glucoseInfo = r.glucosePre ? classifyGlucose(r.glucosePre, settings ?? undefined) : null;
                    return (
                      <React.Fragment key={r.id}>
                      <tr>
                        <td style={{ fontWeight: 600 }}>{format(new Date(r.timestamp), 'HH:mm')}</td>
                        <td>{r.mealType}</td>
                        <td>
                          {r.glucosePre ? (
                            <span style={{ color: glucoseInfo?.color, fontWeight: 600 }}>{r.glucosePre}</span>
                          ) : '—'}
                        </td>
                        <td>{r.glucosePos1h ?? '—'}</td>
                        <td>{r.glucosePos2h ?? '—'}</td>
                        <td>
                          {r.insulinApplied ? (
                            <>{r.insulinApplied} U</>
                          ) : '—'}
                        </td>
                        <td>{r.carbohydrates ? `${r.carbohydrates} g` : '—'}</td>
                        <td>
                          {r.breastfeedingType !== 'Não realizou' ? (
                            <>
                              {r.breastfeedingType}
                              {r.breastSide ? ` (${r.breastSide.charAt(0)})` : ''}
                              {r.breastfeedingDuration ? ` - ${r.breastfeedingDuration} min` : ''}
                            </>
                          ) : '—'}
                        </td>
                        <td>
                          <div className="actions">
                            {hasDetails(r) && (
                              <button className="btn-icon" onClick={() => toggleExpand(r.id)} title="Detalhes">
                                {expandedIds.has(r.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <button className="btn-icon" onClick={() => { setEditRecord(r); setShowModal(true); }}>
                              <Pencil size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => handleDelete(r.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {hasDetails(r) && (
                        <tr key={`${r.id}-details`}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            {expandedIds.has(r.id) ? (
                              <div style={{
                                padding: '10px 16px',
                                background: 'var(--bg-hover)',
                                fontSize: 12,
                                lineHeight: 1.7,
                                color: 'var(--text-secondary)',
                              }}>
                                {r.foodDescription && (
                                  <div><strong>Refeição:</strong> {r.foodDescription}</div>
                                )}
                                {r.notes && (
                                  <div><strong>Observações:</strong> {r.notes}</div>
                                )}
                                {r.symptoms && (
                                  <div><strong>Sintomas:</strong> {r.symptoms}</div>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  padding: '4px 16px',
                                  fontSize: 11,
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                }}
                                onClick={() => toggleExpand(r.id)}
                              >
                                {truncate(
                                  [r.foodDescription, r.notes, r.symptoms].filter(Boolean).join(' | ')
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          ))
      )}

      {showModal && (
        <NewRecordModal
          onClose={() => { setShowModal(false); setEditRecord(null); }}
          onSave={handleSave}
          editRecord={editRecord}
        />
      )}
    </>
  );
}
