import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { UserPhase, SensorType, InsulinUse, UserRole } from '../types';
import { USER_PHASES, SENSOR_TYPES } from '../types';

interface OnboardingProps {
  onComplete: (data: {
    name: string;
    phase: UserPhase;
    sensor: SensorType;
    insulinUse: InsulinUse;
    role: UserRole;
  }) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [phase, setPhase] = useState<UserPhase | null>(null);
  const [sensor, setSensor] = useState<SensorType | null>(null);
  const [usesInsulin, setUsesInsulin] = useState<boolean | null>(null);
  const [insulinType, setInsulinType] = useState<'basal' | 'rapida' | 'ambas' | null>(null);

  const isPatientRole = role === 'paciente';
  const totalSteps = isPatientRole ? 6 : 3;

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return name.trim().length > 0;
      case 2: return role !== null;
      default: break;
    }
    if (!isPatientRole) return true;
    switch (step) {
      case 3: return phase !== null;
      case 4: return sensor !== null;
      case 5: return usesInsulin !== null && (usesInsulin === false || insulinType !== null);
      default: return false;
    }
  };

  const lastStep = isPatientRole ? 5 : 2;

  const handleNext = () => {
    if (step < lastStep) {
      setStep(step + 1);
    } else {
      onComplete({
        name: name.trim(),
        phase: isPatientRole ? phase! : 'outro',
        sensor: isPatientRole ? sensor! : 'Não utilizo sensor',
        insulinUse: isPatientRole && usesInsulin ? insulinType! : 'nao',
        role: role!,
      });
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        {/* Progress dots */}
        <div className="onboarding-progress">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="onboarding-step">
            <div className="onboarding-logo">
              <img src="/logo-192.png" alt="GlicoMama" />
            </div>
            <h2>Bem-vinda ao Glico Mama</h2>
            <p className="onboarding-subtitle">
              Seu acompanhamento inteligente de glicemia, maternidade e amamentação.
            </p>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2>Como gostaria de ser chamada?</h2>
            <p className="onboarding-subtitle">Este nome aparecerá no seu perfil</p>
            <input
              type="text"
              className="form-input onboarding-input"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2>Qual seu perfil?</h2>
            <p className="onboarding-subtitle">Isso define sua experiência no app</p>
            <div className="onboarding-options">
              <button
                className={`onboarding-option ${role === 'paciente' ? 'selected' : ''}`}
                onClick={() => setRole('paciente')}
              >
                <div className="onboarding-option-label">Paciente</div>
                <div className="onboarding-option-desc">Registro de glicemia, refeições e amamentação</div>
              </button>
              <button
                className={`onboarding-option ${role === 'medico' ? 'selected' : ''}`}
                onClick={() => setRole('medico')}
              >
                <div className="onboarding-option-label">Médico(a) / Profissional de Saúde</div>
                <div className="onboarding-option-desc">Visualizar dados de pacientes vinculados</div>
              </button>
              <button
                className={`onboarding-option ${role === 'familiar' ? 'selected' : ''}`}
                onClick={() => setRole('familiar')}
              >
                <div className="onboarding-option-label">Familiar / Cônjuge</div>
                <div className="onboarding-option-desc">Acompanhar dados de um ente querido</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Phase (patient only) */}
        {step === 3 && isPatientRole && (
          <div className="onboarding-step">
            <h2>Em qual fase você está?</h2>
            <div className="onboarding-options">
              {USER_PHASES.map((p) => (
                <button
                  key={p.value}
                  className={`onboarding-option ${phase === p.value ? 'selected' : ''}`}
                  onClick={() => setPhase(p.value)}
                >
                  <div className="onboarding-option-label">{p.label}</div>
                  {p.description && (
                    <div className="onboarding-option-desc">{p.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Sensor (patient only) */}
        {step === 4 && isPatientRole && (
          <div className="onboarding-step">
            <h2>Você utiliza?</h2>
            <div className="onboarding-options">
              {SENSOR_TYPES.map((s) => (
                <button
                  key={s}
                  className={`onboarding-option ${sensor === s ? 'selected' : ''}`}
                  onClick={() => setSensor(s)}
                >
                  <div className="onboarding-option-label">{s}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Insulin (patient only) */}
        {step === 5 && isPatientRole && (
          <div className="onboarding-step">
            <h2>Usa insulina?</h2>
            <div className="onboarding-options" style={{ gap: 10 }}>
              <button
                className={`onboarding-option ${usesInsulin === true ? 'selected' : ''}`}
                onClick={() => setUsesInsulin(true)}
              >
                <div className="onboarding-option-label">Sim</div>
              </button>
              <button
                className={`onboarding-option ${usesInsulin === false ? 'selected' : ''}`}
                onClick={() => { setUsesInsulin(false); setInsulinType(null); }}
              >
                <div className="onboarding-option-label">Não</div>
              </button>
            </div>

            {usesInsulin && (
              <div style={{ marginTop: 20 }}>
                <p className="onboarding-subtitle" style={{ marginBottom: 12 }}>Qual tipo?</p>
                <div className="onboarding-options" style={{ gap: 10 }}>
                  <button
                    className={`onboarding-option ${insulinType === 'basal' ? 'selected' : ''}`}
                    onClick={() => setInsulinType('basal')}
                  >
                    <div className="onboarding-option-label">Basal</div>
                  </button>
                  <button
                    className={`onboarding-option ${insulinType === 'rapida' ? 'selected' : ''}`}
                    onClick={() => setInsulinType('rapida')}
                  >
                    <div className="onboarding-option-label">Rápida</div>
                  </button>
                  <button
                    className={`onboarding-option ${insulinType === 'ambas' ? 'selected' : ''}`}
                    onClick={() => setInsulinType('ambas')}
                  >
                    <div className="onboarding-option-label">Ambas</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="onboarding-nav">
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={handleBack}>
              <ChevronLeft size={16} /> Voltar
            </button>
          ) : (
            <div />
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canNext()}
          >
            {step === 0 ? 'Começar' : step === lastStep ? 'Finalizar' : 'Próximo'}
            {step < lastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
