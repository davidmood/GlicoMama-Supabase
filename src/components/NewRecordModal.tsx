import { useState, useEffect } from 'react';
import { X, Droplets, Syringe, UtensilsCrossed, Baby, MoreHorizontal, Bell } from 'lucide-react';
import {
  MEAL_TYPES,
  BREASTFEEDING_TYPES,
  BREAST_SIDES,
  INSULIN_TYPES,
  INSULIN_LOCALS,
  BABY_MOODS,
  createEmptyRecord,
} from '../types';
import type { GlucoseRecord } from '../types';

interface NewRecordModalProps {
  onClose: () => void;
  onSave: (record: GlucoseRecord, options?: { scheduleAlarm?: boolean }) => void;
  editRecord?: GlucoseRecord | null;
  mode?: 'full' | 'breastfeeding';
}

type RecordTab = 'glicemia' | 'insulina' | 'refeicao' | 'amamentacao' | 'mais';

const tabs: { id: RecordTab; label: string; icon: React.ElementType }[] = [
  { id: 'glicemia', label: 'Glicemia', icon: Droplets },
  { id: 'insulina', label: 'Insulina', icon: Syringe },
  { id: 'refeicao', label: 'Refeição', icon: UtensilsCrossed },
  { id: 'amamentacao', label: 'Amamentação', icon: Baby },
  { id: 'mais', label: 'Mais', icon: MoreHorizontal },
];

export default function NewRecordModal({ onClose, onSave, editRecord, mode = 'full' }: NewRecordModalProps) {
  const [activeTab, setActiveTab] = useState<RecordTab>(mode === 'breastfeeding' ? 'amamentacao' : 'glicemia');
  const [scheduleAlarm, setScheduleAlarm] = useState(false);
  const [form, setForm] = useState(() => {
    if (editRecord) return { ...editRecord };
    const empty = { id: crypto.randomUUID(), ...createEmptyRecord() };
    if (mode === 'breastfeeding') {
      empty.mealType = 'Amamentação' as GlucoseRecord['mealType'];
    }
    return empty;
  });

  useEffect(() => {
    const hasGlucosePre = !!form.glucosePre;
    const noPost = !form.glucosePos1h && !form.glucosePos2h;
    setScheduleAlarm(hasGlucosePre && noPost);
  }, [form.glucosePre, form.glucosePos1h, form.glucosePos2h]);

  const update = <K extends keyof GlucoseRecord>(key: K, value: GlucoseRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(form as GlucoseRecord, { scheduleAlarm });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editRecord ? 'Editar Registro' : 'Novo Registro'}</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs-wrapper">
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {activeTab === 'glicemia' && (
            <>
              <div className="form-group">
                <label>Data e Hora</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.timestamp}
                  onChange={(e) => update('timestamp', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Refeição</label>
                <select
                  className="form-input"
                  value={form.mealType}
                  onChange={(e) => update('mealType', e.target.value as GlucoseRecord['mealType'])}
                >
                  {MEAL_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Glicemia (mg/dL)</label>
                <div className="form-row">
                  <div>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>Pré</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Pré"
                      value={form.glucosePre ?? ''}
                      onChange={(e) => update('glucosePre', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>Pós 1h</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Pós 1h"
                      value={form.glucosePos1h ?? ''}
                      onChange={(e) => update('glucosePos1h', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>Pós 2h</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Pós 2h"
                      value={form.glucosePos2h ?? ''}
                      onChange={(e) => update('glucosePos2h', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea
                  className="form-input"
                  placeholder="Como você está se sentindo?"
                  value={form.symptoms}
                  onChange={(e) => update('symptoms', e.target.value)}
                />
              </div>
            </>
          )}

          {activeTab === 'insulina' && (
            <>
              <div className="form-group">
                <label>Insulina Aplicada (Unidades)</label>
                <div className="number-stepper">
                  <button onClick={() => update('insulinApplied', Math.max(0, (form.insulinApplied ?? 0) - 1))}>−</button>
                  <input
                    type="number"
                    value={form.insulinApplied ?? ''}
                    onChange={(e) => update('insulinApplied', e.target.value ? Number(e.target.value) : null)}
                  />
                  <button onClick={() => update('insulinApplied', (form.insulinApplied ?? 0) + 1)}>+</button>
                </div>
              </div>

              <div className="form-group">
                <label>Tipo de Insulina</label>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Rápida</div>
                  <div className="pill-group">
                    {INSULIN_TYPES.filter(t => ['Lispro', 'Aspart', 'Regular'].includes(t)).map((t) => (
                      <button
                        key={t}
                        className={`pill ${form.insulinType === t ? 'active' : ''}`}
                        onClick={() => update('insulinType', t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Lenta</div>
                  <div className="pill-group">
                    {INSULIN_TYPES.filter(t => ['NPH', 'Glargina', 'Detemir', 'Degludeca'].includes(t)).map((t) => (
                      <button
                        key={t}
                        className={`pill ${form.insulinType === t ? 'active' : ''}`}
                        onClick={() => update('insulinType', t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Local da Aplicação</label>
                <div className="pill-group">
                  {INSULIN_LOCALS.map((l) => (
                    <button
                      key={l}
                      className={`pill ${form.insulinLocal === l ? 'active' : ''}`}
                      onClick={() => update('insulinLocal', l)}
                    >{l}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'refeicao' && (
            <>
              <div className="form-group">
                <label>Refeição</label>
                <select
                  className="form-input"
                  value={form.mealType}
                  onChange={(e) => update('mealType', e.target.value as GlucoseRecord['mealType'])}
                >
                  {MEAL_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Carboidratos (g)</label>
                <div className="number-stepper">
                  <button onClick={() => update('carbohydrates', Math.max(0, (form.carbohydrates ?? 0) - 5))}>−</button>
                  <input
                    type="number"
                    value={form.carbohydrates ?? ''}
                    onChange={(e) => update('carbohydrates', e.target.value ? Number(e.target.value) : null)}
                  />
                  <button onClick={() => update('carbohydrates', (form.carbohydrates ?? 0) + 5)}>+</button>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição (opcional)</label>
                <textarea
                  className="form-input"
                  placeholder="Ex: Pão integral, ovo, café..."
                  value={form.foodDescription}
                  onChange={(e) => update('foodDescription', e.target.value)}
                />
              </div>
            </>
          )}

          {activeTab === 'amamentacao' && (
            <>
              <div className="form-group">
                <label>Tipo</label>
                <div className="pill-group">
                  {BREASTFEEDING_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`pill ${form.breastfeedingType === t ? 'active' : ''}`}
                      onClick={() => update('breastfeedingType', t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {form.breastfeedingType !== 'Não realizou' && (
                <>
                  <div className="form-group">
                    <label>Lado do peito</label>
                    <div className="pill-group">
                      {BREAST_SIDES.map((s) => (
                        <button
                          key={s}
                          className={`pill ${form.breastSide === s ? 'active' : ''}`}
                          onClick={() => update('breastSide', s)}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Duração</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="20"
                          value={form.breastfeedingDuration ?? ''}
                          onChange={(e) => update('breastfeedingDuration', e.target.value ? Number(e.target.value) : null)}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>minutos</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Quantidade (se bomba)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="120"
                          value={form.extractedAmount ?? ''}
                          onChange={(e) => update('extractedAmount', e.target.value ? Number(e.target.value) : null)}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>ml</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Observações (opcional)</label>
                    <textarea
                      className="form-input"
                      placeholder="Como foi a mamada / extração?"
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'mais' && (
            <>
              <div className="form-group">
                <label>Humor do Bebê</label>
                <div className="pill-group">
                  {BABY_MOODS.map((m) => (
                    <button
                      key={m}
                      className={`pill ${form.babyMood === m ? 'active' : ''}`}
                      onClick={() => update('babyMood', m)}
                    >{m}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Sono do Bebê</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Dormiu 3h seguidas"
                  value={form.babySleep}
                  onChange={(e) => update('babySleep', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Sintomas</label>
                <textarea
                  className="form-input"
                  placeholder="Algum sintoma? Tontura, enjoo..."
                  value={form.symptoms}
                  onChange={(e) => update('symptoms', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Observações Gerais</label>
                <textarea
                  className="form-input"
                  placeholder="Anotações adicionais..."
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column', gap: 12 }}>
          {form.glucosePre && !form.glucosePos1h && !form.glucosePos2h && !editRecord && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}>
              <input
                type="checkbox"
                checked={scheduleAlarm}
                onChange={(e) => setScheduleAlarm(e.target.checked)}
                style={{ accentColor: 'var(--accent-purple)' }}
              />
              <Bell size={14} />
              Agendar lembrete para pós 1h e 2h
            </label>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
