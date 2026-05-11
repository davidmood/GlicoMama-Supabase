import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthPageProps {
  onAuth: () => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : error.message);
    } else {
      onAuth();
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Conta criada! Verifique seu email para confirmar.');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') handleLogin();
    else if (mode === 'register') handleRegister();
    else handleReset();
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <img src="/logo-192.png" alt="GlicoMama" />
        </div>
        <h1 className="auth-title">Glico Mama</h1>
        <p className="auth-subtitle">
          {mode === 'login' && 'Entre na sua conta'}
          {mode === 'register' && 'Crie sua conta'}
          {mode === 'reset' && 'Recuperar senha'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <User size={18} className="auth-field-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <Mail size={18} className="auth-field-icon" />
            <input
              type="email"
              className="form-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="auth-field">
              <Lock size={18} className="auth-field-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={loading}
          >
            {loading ? 'Aguarde...' : (
              <>
                {mode === 'login' && 'Entrar'}
                {mode === 'register' && 'Criar conta'}
                {mode === 'reset' && 'Enviar email'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                Não tem conta? <strong>Cadastre-se</strong>
              </button>
              <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}>
                Esqueceu a senha?
              </button>
            </>
          )}
          {mode === 'register' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Já tem conta? <strong>Entre</strong>
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
