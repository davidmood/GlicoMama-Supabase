import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { getSettings, addReminder as dbAddReminder, removeReminder as dbRemoveReminder, updateReminder as dbUpdateReminder } from '../services/database';
import { syncRemindersWithBackend } from '../services/notifications';
import type { Reminder } from '../types';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');

  const loadReminders = async () => {
    const s = await getSettings();
    setReminders(s.reminders);
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const syncWithBackend = async (updatedReminders: Reminder[]) => {
    await syncRemindersWithBackend(updatedReminders);
  };

  const addReminder = async () => {
    if (!newLabel.trim()) return;
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      time: newTime,
      label: newLabel.trim(),
      enabled: true,
    };
    await dbAddReminder(reminder);
    const updated = [...reminders, reminder];
    setReminders(updated);
    setNewLabel('');
    syncWithBackend(updated);
  };

  const removeReminder = async (id: string) => {
    await dbRemoveReminder(id);
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    syncWithBackend(updated);
  };

  const toggleReminder = async (id: string) => {
    const rem = reminders.find((r) => r.id === id);
    if (!rem) return;
    const toggled = { ...rem, enabled: !rem.enabled };
    await dbUpdateReminder(toggled);
    const updated = reminders.map((r) => r.id === id ? toggled : r);
    setReminders(updated);
    syncWithBackend(updated);
  };

  return (
    <>
      <div className="page-header">
        <h2>Lembretes</h2>
      </div>

      {/* Add new reminder */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} style={{ color: 'var(--accent-purple)' }} />
            Novo Lembrete
          </h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Horário</label>
            <input
              type="time"
              className="form-input"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Descrição</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Verificar glicemia"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addReminder()}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={addReminder}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Reminder list */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent-purple)' }} />
            Meus Lembretes
          </h3>
        </div>

        {reminders.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum lembrete configurado.</p>
          </div>
        ) : (
          reminders
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((rem) => (
              <div className="reminder-item" key={rem.id} style={{ opacity: rem.enabled ? 1 : 0.5 }}>
                <span className="reminder-time">{rem.time}</span>
                <span className="reminder-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  ⏰
                </span>
                <span className="reminder-label" style={{ flex: 1 }}>{rem.label}</span>
                <div
                  className={`toggle-switch ${rem.enabled ? 'active' : ''}`}
                  onClick={() => toggleReminder(rem.id)}
                  style={{ flexShrink: 0 }}
                />
                <button className="btn-icon" onClick={() => removeReminder(rem.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Nota</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Os lembretes ativos enviam notificações push diárias no horário configurado,
          mesmo com o app fechado. Certifique-se de que as notificações estão ativadas em Configurações.
        </p>
      </div>
    </>
  );
}
