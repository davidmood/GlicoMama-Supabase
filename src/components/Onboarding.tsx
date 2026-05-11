import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { UserPhase, SensorType, InsulinUse } from '../types';
import { USER_PHASES, SENSOR_TYPES } from '../types';

interface OnboardingProps {
  onComplete: (data: {
    name: string;
    phase: UserPhase;
    sensor: SensorType;
    insulinUse: InsulinUse;
  }) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<UserPhase | null>(null);
  const [sensor, setSensor] = useState<SensorType | null>(null);
  const [usesInsulin, setUsesInsulin] = useState<boolean | null>(null);
  const [insulinType, setInsulinType] = useState<'basal' | 'rapida' | 'ambas' | null>(null);

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return name.trim().length > 0;
      case 2: return phase !== null;
      case 3: return sensor !== null;
      case 4: return usesInsulin !== null && (usesInsulin === false || insulinType !== null);
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        name: name.trim(),
        phase: phase!,
        sensor: sensor!,
        insulinUse: usesInsulin ? insulinType! : 'nao',
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
          {[0, 1, 2, 3, 4].map((i) => (
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

        {/* Step 2: Phase */}
        {step === 2 && (
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

        {/* Step 3: Sensor */}
        {step === 3 && (
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

        {/* Step 4: Insulin */}
        {step === 4 && (
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
            {step === 0 ? 'Começar' : step === 4 ? 'Finalizar' : 'Próximo'}
            {step < 4 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
