import { useEffect, useState } from 'react';
import { Share2, QrCode, Copy, Check, UserPlus, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { getSettings } from '../services/database';
import { createShareCode, getActiveShareCode, redeemShareCode, getMyViewers, removePatientLink } from '../services/sharing';
import type { PatientLink, UserRole } from '../types';

export default function SharePage() {
  const [role, setRole] = useState<UserRole>('paciente');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState<PatientLink[]>([]);

  // Doctor/familiar: code input
  const [inputCode, setInputCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const settings = await getSettings();
    setRole(settings.role || 'paciente');

    if (settings.role === 'paciente' || !settings.role) {
      const existing = await getActiveShareCode();
      if (existing) {
        setCode(existing.code);
        setExpiresAt(existing.expiresAt);
        generateQR(existing.code);
      }
      const v = await getMyViewers();
      setViewers(v);
    }
  }

  async function generateQR(codeStr: string) {
    try {
      const url = await QRCode.toDataURL(codeStr, {
        width: 200,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }

  async function handleGenerateCode() {
    setLoading(true);
    const result = await createShareCode();
    if (result) {
      setCode(result.code);
      setExpiresAt(result.expiresAt);
      await generateQR(result.code);
    }
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeem() {
    if (!inputCode.trim()) return;
    setRedeemLoading(true);
    setRedeemResult(null);
    const result = await redeemShareCode(inputCode);
    setRedeemResult({
      success: result.success,
      message: result.success ? 'Paciente vinculado com sucesso!' : (result.error || 'Erro desconhecido'),
    });
    if (result.success) setInputCode('');
    setRedeemLoading(false);
  }

  async function handleRemoveViewer(linkId: string) {
    if (!confirm('Remover acesso desta pessoa?')) return;
    await removePatientLink(linkId);
    setViewers(viewers.filter(v => v.id !== linkId));
  }

  const expiresFormatted = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '';

  if (role === 'paciente') {
    return (
      <>
        <div className="page-header">
          <h2>Compartilhar Dados</h2>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={18} style={{ color: 'var(--accent-purple)' }} />
              Código de Compartilhamento
            </h3>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Gere um código para compartilhar seus dados com seu médico, cônjuge ou familiar.
            O código expira em 24 horas.
          </p>

          {code ? (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: 16,
              }}>
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    style={{ width: 200, height: 200, borderRadius: 8 }}
                  />
                )}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: 'monospace',
                marginBottom: 8,
              }}>
                {code}
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', minWidth: 'auto' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, color: 'var(--text-muted)', fontSize: 12,
              }}>
                <Clock size={12} />
                Expira em: {expiresFormatted}
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleGenerateCode}
                disabled={loading}
                style={{ marginTop: 16 }}
              >
                <Share2 size={14} />
                {loading ? 'Gerando...' : 'Gerar Novo Código'}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleGenerateCode}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              <Share2 size={14} />
              {loading ? 'Gerando...' : 'Gerar Código de Compartilhamento'}
            </button>
          )}
        </div>

        {viewers.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={18} style={{ color: 'var(--accent-purple)' }} />
                Quem tem acesso
              </h3>
            </div>
            {viewers.map(v => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.patientName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {v.role === 'medico' ? 'Médico(a)' : 'Familiar'}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRemoveViewer(v.id)}
                  style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444' }}
                >
                  Revogar
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Doctor/Familiar view
  return (
    <>
      <div className="page-header">
        <h2>Adicionar Paciente</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} style={{ color: 'var(--accent-purple)' }} />
            Vincular Paciente
          </h3>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Digite o código de compartilhamento que o paciente gerou no app.
        </p>

        <div className="form-group">
          <label>Código</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: GLM-A3K9XY"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, textAlign: 'center' }}
          />
        </div>

        {redeemResult && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            background: redeemResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: redeemResult.success ? '#22c55e' : '#ef4444',
            border: `1px solid ${redeemResult.success ? '#22c55e' : '#ef4444'}`,
          }}>
            {redeemResult.message}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleRedeem}
          disabled={redeemLoading || !inputCode.trim()}
          style={{ width: '100%' }}
        >
          <UserPlus size={14} />
          {redeemLoading ? 'Vinculando...' : 'Vincular Paciente'}
        </button>
      </div>
    </>
  );
}
