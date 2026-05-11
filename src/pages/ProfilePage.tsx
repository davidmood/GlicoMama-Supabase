import { useEffect, useState } from 'react';
import { User, Save, Activity, Stethoscope } from 'lucide-react';
import { getSettings, saveSettings } from '../services/database';
import type { UserSettings } from '../types';
import { USER_PHASES, SENSOR_TYPES } from '../types';
import type { UserPhase, SensorType, InsulinUse } from '../types';

interface ProfilePageProps {
  onSettingsChange: () => void;
}

export default function ProfilePage({ onSettingsChange }: ProfilePageProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await saveSettings(settings);
    onSettingsChange();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return null;

  const initials = settings.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const phaseLabel = USER_PHASES.find((p) => p.value === settings.phase)?.label ?? 'Não informado';

  return (
    <>
      <div className="page-header">
        <h2>Perfil</h2>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: 'white',
            margin: '0 auto 16px',
          }}
        >
          {initials}
        </div>
        <h3>{settings.name}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{phaseLabel}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} style={{ color: 'var(--accent-purple)' }} />
            Dados Pessoais
          </h3>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            className="form-input"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Fase</label>
          <select
            className="form-input"
            value={settings.phase ?? ''}
            onChange={(e) => setSettings({ ...settings, phase: e.target.value as UserPhase })}
          >
            <option value="">Selecione...</option>
            {USER_PHASES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stethoscope size={18} style={{ color: 'var(--accent-purple)' }} />
            Dispositivos & Insulina
          </h3>
        </div>

        <div className="form-group">
          <label>Sensor de Glicemia</label>
          <select
            className="form-input"
            value={settings.sensor ?? ''}
            onChange={(e) => setSettings({ ...settings, sensor: e.target.value as SensorType })}
          >
            <option value="">Selecione...</option>
            {SENSOR_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Uso de Insulina</label>
          <select
            className="form-input"
            value={settings.insulinUse ?? 'nao'}
            onChange={(e) => setSettings({ ...settings, insulinUse: e.target.value as InsulinUse })}
          >
            <option value="nao">Não uso insulina</option>
            <option value="basal">Basal</option>
            <option value="rapida">Rápida</option>
            <option value="ambas">Ambas (Basal + Rápida)</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--accent-purple)' }} />
            Faixas de Glicemia (mg/dL)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Baixa (Blue) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 8,
            background: 'rgba(59,130,246,0.08)', borderLeft: '4px solid #3b82f6',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#3b82f6', marginBottom: 4 }}>
                Baixa (Hipoglicemia)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Até {settings.glucoseLowMax} mg/dL
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, width: 90 }}>
              <label style={{ fontSize: 10 }}>Até</label>
              <input
                type="number"
                className="form-input"
                value={settings.glucoseLowMax}
                onChange={(e) => setSettings({ ...settings, glucoseLowMax: Number(e.target.value) })}
                style={{ padding: '6px 8px', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Ideal (Green) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 8,
            background: 'rgba(34,197,94,0.08)', borderLeft: '4px solid #22c55e',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#22c55e', marginBottom: 4 }}>
                Ideal (Dentro da Meta)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {settings.glucoseTargetMin}–{settings.glucoseTargetMax} mg/dL
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="form-group" style={{ margin: 0, width: 70 }}>
                <label style={{ fontSize: 10 }}>De</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.glucoseTargetMin}
                  onChange={(e) => setSettings({ ...settings, glucoseTargetMin: Number(e.target.value) })}
                  style={{ padding: '6px 8px', fontSize: 13 }}
                />
              </div>
              <div className="form-group" style={{ margin: 0, width: 70 }}>
                <label style={{ fontSize: 10 }}>Até</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.glucoseTargetMax}
                  onChange={(e) => setSettings({ ...settings, glucoseTargetMax: Number(e.target.value) })}
                  style={{ padding: '6px 8px', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {/* Atenção (Yellow) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 8,
            background: 'rgba(245,158,11,0.08)', borderLeft: '4px solid #f59e0b',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f59e0b', marginBottom: 4 }}>
                Atenção
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(settings.glucoseTargetMax ?? 100) + 1}–{settings.glucoseAttentionMax} mg/dL
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, width: 90 }}>
              <label style={{ fontSize: 10 }}>Até</label>
              <input
                type="number"
                className="form-input"
                value={settings.glucoseAttentionMax}
                onChange={(e) => setSettings({ ...settings, glucoseAttentionMax: Number(e.target.value) })}
                style={{ padding: '6px 8px', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Alta (Red) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', borderLeft: '4px solid #ef4444',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
                Alta (Hiperglicemia)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Acima de {settings.glucoseAttentionMax} mg/dL
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
          <Save size={16} />
          {saved ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>
    </>
  );
}
