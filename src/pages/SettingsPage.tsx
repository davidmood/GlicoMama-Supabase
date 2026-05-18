import { useEffect, useState, useRef } from 'react';
import { Settings, Moon, Database, Trash2, Download, Upload, Save, Clock, Bell } from 'lucide-react';
import { getSettings, getAllRecords, deleteAllRecords } from '../services/database';
import type { UserSettings } from '../types';
import { exportToCSV, exportToPDF } from '../services/export';
import { createBackup, downloadBackup, importBackup, listAutoBackups, restoreAutoBackup, type AutoBackupInfo } from '../services/backup';
import { requestNotificationPermission, sendTestNotification } from '../services/notifications';
import { DisclaimerBanner } from '../components/Disclaimer';

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSettingsChange: () => void;
}

export default function SettingsPage({ darkMode, onToggleDarkMode, onSettingsChange }: SettingsPageProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [autoBackups, setAutoBackups] = useState<AutoBackupInfo[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, recs] = await Promise.all([getSettings(), getAllRecords()]);
    setSettings(s);
    setRecordCount(recs.length);
    setAutoBackups(listAutoBackups());
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteAllRecords();
      showStatus('Todos os registros foram apagados');
      loadData();
      onSettingsChange();
    } catch {
      showStatus('Erro ao apagar os dados');
    }
  };

  const handleExportAll = async () => {
    const records = await getAllRecords();
    exportToCSV(records);
  };

  const handleExportPDF = async () => {
    const records = await getAllRecords();
    await exportToPDF(records, settings?.name ?? 'Usuário');
  };

  const handleManualBackup = async () => {
    const backup = await createBackup();
    downloadBackup(backup);
    showStatus(`Backup baixado com ${backup.records.length} registros`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showStatus('Importando...');
      const result = await importBackup(file);
      showStatus(`Importados ${result.records} registros com sucesso!`);
      loadData();
      onSettingsChange();
    } catch (err) {
      console.error('Import error:', err);
      const msg = err instanceof Error ? err.message : 'Arquivo de backup inválido';
      showStatus(`Erro ao importar: ${msg}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestoreAutoBackup = async (key: string, date: string) => {
    const dateStr = new Date(date).toLocaleDateString('pt-BR');
    if (!confirm(`Restaurar backup de ${dateStr}? Os registros do backup serão adicionados aos dados atuais.`)) return;
    try {
      const result = await restoreAutoBackup(key);
      showStatus(`Restaurados ${result.records} registros do backup de ${dateStr}`);
      loadData();
      onSettingsChange();
    } catch {
      showStatus('Erro ao restaurar backup');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Configurações</h2>
      </div>

      {statusMsg && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 8,
          background: statusMsg.startsWith('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${statusMsg.startsWith('Erro') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: statusMsg.startsWith('Erro') ? '#ef4444' : '#22c55e',
          fontSize: 13, fontWeight: 500,
        }}>
          {statusMsg}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--accent-purple)' }} />
            Aparência
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Moon size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Modo Escuro</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tema escuro para uso noturno</div>
            </div>
          </div>
          <div
            className={`toggle-switch ${darkMode ? 'active' : ''}`}
            onClick={onToggleDarkMode}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent-purple)' }} />
            Notificações
          </h3>
        </div>
        <div style={{ padding: '12px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            As notificações são usadas para lembretes de glicemia pós 1h e 2h.
            {typeof Notification !== 'undefined' && (
              <span style={{ display: 'block', marginTop: 4, fontWeight: 500, color: Notification.permission === 'granted' ? '#22c55e' : Notification.permission === 'denied' ? '#ef4444' : '#f59e0b' }}>
                Status: {Notification.permission === 'granted' ? 'Ativadas' : Notification.permission === 'denied' ? 'Bloqueadas (ative nas configurações do navegador)' : 'Não solicitadas'}
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={async () => {
              const granted = await requestNotificationPermission();
              showStatus(granted ? 'Notificações ativadas!' : 'Permissão de notificação negada. Ative nas configurações do navegador.');
            }}>
              <Bell size={14} /> Ativar Notificações
            </button>
            <button className="btn btn-primary" onClick={async () => {
              showStatus('Enviando notificação de teste...');
              await sendTestNotification();
              showStatus('Notificação de teste enviada!');
            }}>
              <Bell size={14} /> Testar Notificação
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} style={{ color: 'var(--accent-purple)' }} />
            Dados
          </h3>
        </div>

        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Registros salvos</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{recordCount} registros na nuvem</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportAll}>
            <Download size={14} /> Exportar CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            <Download size={14} /> Exportar PDF
          </button>
          <button className="btn btn-danger" onClick={handleClearData}>
            <Trash2 size={14} /> Apagar todos os dados
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={18} style={{ color: 'var(--accent-purple)' }} />
            Backup & Restauração
          </h3>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          O app faz backup automático diariamente à meia-noite, mantendo os últimos 7 dias.
          Você também pode fazer backup manual ou importar de um arquivo.
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={handleManualBackup}>
            <Download size={14} /> Baixar Backup (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Importar Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>

        {autoBackups.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              Backups Automáticos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {autoBackups.map((b) => (
                <div key={b.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {new Date(b.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.recordCount} registros • {new Date(b.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => handleRestoreAutoBackup(b.key, b.date)}
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Sobre</h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
          <p><strong>Glicemia & Mama</strong> v1.0.0</p>
          <p>App de controle de glicemia gestacional e amamentação.</p>
          <p>Dados armazenados na nuvem (Supabase).</p>
          <p>Instale como PWA para usar offline no celular.</p>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}
