import { useEffect, useState, useCallback } from 'react';
import { Gauge, RefreshCw, Server, Database, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { getSystemStatus, type SystemStatus } from '../services/admin';

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 100 ? 0 : 1)} ${units[i]}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado.');
        return;
      }
      const s = await getSystemStatus(user.id);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pollMin = status?.backend.pollIntervalMin ?? 30;
  const pollAgeMin = status?.backend.lastLibrePoll
    ? Math.floor((Date.now() - new Date(status.backend.lastLibrePoll).getTime()) / 60000)
    : null;
  const pollStale = pollAgeMin !== null && pollAgeMin > pollMin + 10;

  const usagePercent = status?.supabase.usagePercent ?? 0;
  const usageColor = usagePercent >= 80 ? '#ef4444' : usagePercent >= 60 ? '#f59e0b' : '#22c55e';

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge size={22} style={{ color: 'var(--accent-purple)' }} />
          Status do Sistema
        </h2>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading && !status && (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
            <AlertTriangle size={18} />
            {error}
          </div>
        </div>
      )}

      {status && (
        <>
          {/* Backend health */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={18} style={{ color: 'var(--accent-purple)' }} />
                Backend (Render)
              </h3>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <Row
                label="Status"
                value={status.backend.status === 'ok' ? 'Online' : status.backend.status}
                color={status.backend.status === 'ok' ? '#22c55e' : '#ef4444'}
              />
              <Row label="Supabase conectado" value={status.backend.supabase ? 'Sim' : 'Não'} color={status.backend.supabase ? '#22c55e' : '#ef4444'} />
              <Row label="Push (VAPID)" value={status.backend.vapid ? 'Ativo' : 'Inativo'} color={status.backend.vapid ? '#22c55e' : '#f59e0b'} />
              <Row
                label="Último polling do Libre"
                value={`${timeAgo(status.backend.lastLibrePoll)} (a cada ${pollMin} min)`}
                color={pollStale ? '#ef4444' : '#22c55e'}
              />
              {pollStale && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13 }}>
                  <AlertTriangle size={16} />
                  O polling parece atrasado — verifique o backend no Render.
                </div>
              )}
            </div>
          </div>

          {/* Supabase usage */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} style={{ color: 'var(--accent-purple)' }} />
                Banco de Dados (Supabase)
              </h3>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(status.supabase.dbSizeBytes)} de {formatBytes(status.supabase.freeTierLimitBytes)}
                </span>
                <span style={{ fontWeight: 700, color: usageColor }}>
                  {usagePercent.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: 'var(--bg-secondary, rgba(128,128,128,0.2))', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(usagePercent, 100)}%`, height: '100%', background: usageColor, transition: 'width 0.3s' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <Row label="Leituras do Libre" value={(status.supabase.libreReadingsCount ?? 0).toLocaleString('pt-BR')} icon={<Activity size={14} />} />
              <Row label="Registros de glicemia" value={(status.supabase.glucoseRecordsCount ?? 0).toLocaleString('pt-BR')} />
              <Row label="Última leitura do sensor" value={timeAgo(status.supabase.lastLibreReading)} />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              Plano gratuito do Supabase: 500 MB. No ritmo atual, há margem de vários anos.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function Row({ label, value, color, icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 14, color: color || 'var(--text-primary, inherit)' }}>{value}</span>
    </div>
  );
}
