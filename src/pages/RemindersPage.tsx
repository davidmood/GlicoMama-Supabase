import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { getSettings, saveSettings } from '../services/database';
import type { UserSettings } from '../types';

export default function RemindersPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const addReminder = async () => {
    if (!settings || !newLabel.trim()) return;
    const updated: UserSettings = {
      ...settings,
      reminders: [
        ...settings.reminders,
        { id: crypto.randomUUID(), time: newTime, label: newLabel.trim(), enabled: true },
      ],
    };
    await saveSettings(updated);
    setSettings(updated);
    setNewLabel('');
  };

  const removeReminder = async (id: string) => {
    if (!settings) return;
    const updated: UserSettings = {
      ...settings,
      reminders: settings.reminders.filter((r) => r.id !== id),
    };
    await saveSettings(updated);
    setSettings(updated);
  };

  const toggleReminder = async (id: string) => {
    if (!settings) return;
    const updated: UserSettings = {
      ...settings,
      reminders: settings.reminders.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    };
    await saveSettings(updated);
    setSettings(updated);
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

        {(settings?.reminders ?? []).length === 0 ? (
          <div className="empty-state">
            <p>Nenhum lembrete configurado.</p>
          </div>
        ) : (
          (settings?.reminders ?? [])
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
          Os lembretes funcionam como referência visual. Para notificações push no celular, instale o app como PWA
          e ative as notificações do navegador.
        </p>
      </div>
    </>
  );
}
