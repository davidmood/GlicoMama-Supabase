import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DISCLAIMER_KEY = 'glicomama_disclaimer_accepted';

export default function Disclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!accepted) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertTriangle size={28} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Não se destina a decisões de tratamento
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 16 }}>
              As informações apresentadas neste aplicativo não devem ser usadas em tomadas de decisões de tratamento ou dosagem. Consulte o sistema de monitoramento de glicose e/ou um profissional de saúde.
            </p>
            <button className="btn btn-primary" onClick={handleAccept} style={{ width: '100%' }}>
              Entendi
            </button>
          </div>
          <button className="btn-icon" onClick={handleAccept} style={{ flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner">
      <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        As informações deste aplicativo não substituem orientação médica profissional. Consulte sempre seu médico.
      </p>
    </div>
  );
}
