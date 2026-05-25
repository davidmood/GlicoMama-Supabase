import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Link2, Unlink, Activity, Globe } from 'lucide-react';
import { supabase } from '../services/supabase';
import { getLibreStatus, connectLibre, disconnectLibre, forceSync, type LibreStatus } from '../services/libre';

const REGIONS = [
  { value: 'eu', label: 'Europa' },
  { value: 'us', label: 'Estados Unidos' },
  { value: 'la', label: 'América Latina' },
  { value: 'au', label: 'Austrália' },
  { value: 'ap', label: 'Ásia Pacífico' },
  { value: 'de', label: 'Alemanha' },
  { value: 'fr', label: 'França' },
  { value: 'jp', label: 'Japão' },
  { value: 'ae', label: 'Emirados Árabes' },
  { value: 'eu2', label: 'Europa 2' },
];

export default function LibreSettingsPage() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<LibreStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Connect form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('eu');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const s = await getLibreStatus(user.id);
      setStatus(s);
    }
    setLoading(false);
  }

  async function handleConnect() {
    if (!email || !password) return;
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');

    const result = await connectLibre(userId, email, password, region);
    if (result.success) {
      setConnectSuccess(`Conectado! ${result.patientName ? `Paciente: ${result.patientName}. ` : ''}As leituras serão sincronizadas em até 5 minutos.`);
      setEmail('');
      setPassword('');
      await loadStatus();
    } else {
      setConnectError(result.error || 'Falha na conexão');
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar LibreLinkUp? As leituras já sincronizadas serão mantidas.')) return;
    await disconnectLibre(userId);
    setStatus({ connected: false });
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const result = await forceSync(userId);
    if (result.success) {
      setSyncResult(`Sincronizado! ${result.newReadings || 0} novas leituras.`);
      await loadStatus();
    } else {
      setSyncResult('Falha na sincronização. Tente novamente.');
    }
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="page-header">
        <h2>LibreLinkUp</h2>
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={22} style={{ color: 'var(--accent-purple)' }} />
          LibreLinkUp
        </h2>
      </div>

      {/* Connection status */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status.connected ? (
              <Wifi size={18} style={{ color: '#22c55e' }} />
            ) : (
              <WifiOff size={18} style={{ color: 'var(--text-muted)' }} />
            )}
            Status da Conexão
          </h3>
        </div>

        {status.connected ? (
          <div>
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>Conectado</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {status.email && <div>Email: {status.email}</div>}
                {status.patientName && <div>Paciente: {status.patientName}</div>}
                {status.region && <div>Região: {REGIONS.find(r => r.value === status.region)?.label || status.region}</div>}
                {status.lastSync && (
                  <div>Última sync: {new Date(status.lastSync).toLocaleString('pt-BR')}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleSync}
                disabled={syncing}
                style={{ flex: 1 }}
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleDisconnect}
                style={{ color: '#ef4444' }}
              >
                <Unlink size={14} />
                Desconectar
              </button>
            </div>

            {syncResult && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                marginTop: 12,
                fontSize: 13,
                background: syncResult.includes('Falha') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                color: syncResult.includes('Falha') ? '#ef4444' : '#22c55e',
              }}>
                {syncResult}
              </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
              O sistema sincroniza automaticamente a cada 5 minutos.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Conecte sua conta LibreLinkUp para sincronizar automaticamente as leituras do sensor FreeStyle Libre.
              Suas credenciais são armazenadas de forma segura e criptografada.
            </p>

            <div className="form-group">
              <label>Email do LibreLinkUp</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Senha do LibreLinkUp</label>
              <input
                type="password"
                className="form-input"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Globe size={14} /> Região
              </label>
              <select
                className="form-input"
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                {REGIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>
              Selecione a região da sua conta LibreView. Se não souber, tente "Europa" ou "América Latina".
              O sistema detecta automaticamente se a região for diferente.
            </p>

            {connectError && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid #ef4444',
              }}>
                {connectError}
              </div>
            )}

            {connectSuccess && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                background: 'rgba(34,197,94,0.1)',
                color: '#22c55e',
                border: '1px solid #22c55e',
              }}>
                {connectSuccess}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={connecting || !email || !password}
              style={{ width: '100%' }}
            >
              <Link2 size={14} />
              {connecting ? 'Conectando...' : 'Conectar LibreLinkUp'}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h3>Como funciona?</h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <p><strong>1.</strong> Baixe o app <strong>LibreLinkUp</strong> (Abbott) no celular</p>
          <p><strong>2.</strong> Crie uma conta ou use a existente</p>
          <p><strong>3.</strong> No app FreeStyle Libre, compartilhe seus dados com sua conta LibreLinkUp</p>
          <p><strong>4.</strong> Conecte aqui usando o mesmo email e senha do LibreLinkUp</p>
          <p><strong>5.</strong> Pronto! As leituras serão sincronizadas automaticamente a cada 5 minutos</p>
        </div>
      </div>
    </>
  );
}
