import { useEffect, useState } from 'react';
import { Users, Search, UserPlus, Trash2 } from 'lucide-react';
import { getMyPatients, removePatientLink } from '../services/sharing';
import type { PatientLink } from '../types';

interface PatientsPageProps {
  onNavigate: (page: string) => void;
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

export default function PatientsPage({ onNavigate }: PatientsPageProps) {
  const [patients, setPatients] = useState<PatientLink[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoading(true);
    const data = await getMyPatients();
    setPatients(data);
    setLoading(false);
  }

  async function handleRemove(linkId: string, name: string) {
    if (!confirm(`Remover ${name} da sua lista de pacientes?`)) return;
    await removePatientLink(linkId);
    setPatients(patients.filter(p => p.id !== linkId));
  }

  const filtered = patients.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.patientName.toLowerCase().includes(q) ||
      p.patientCpf.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  });

  return (
    <>
      <div className="page-header">
        <h2>Meus Pacientes</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('share')}>
          <UserPlus size={14} /> Adicionar
        </button>
      </div>

      {patients.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ marginBottom: 8 }}>Nenhum paciente vinculado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Peça ao paciente para gerar um código de compartilhamento no app.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('share')}>
            <UserPlus size={14} /> Adicionar Paciente
          </button>
        </div>
      ) : (
        <div>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum paciente encontrado para "{search}"</p>
            </div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  marginBottom: 8,
                  transition: 'background 0.15s',
                }}
                onClick={() => onNavigate(`patient-detail:${p.patientId}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {p.patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.patientName}</div>
                    {p.patientCpf && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        CPF: {formatCpf(p.patientCpf)}
                      </div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {p.role === 'medico' ? 'Paciente' : 'Acompanhando'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={(e) => { e.stopPropagation(); handleRemove(p.id, p.patientName); }}
                  style={{ padding: '6px 8px', minWidth: 'auto', color: '#ef4444' }}
                  title="Remover paciente"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}

          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            {filtered.length} de {patients.length} paciente{patients.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </>
  );
}
