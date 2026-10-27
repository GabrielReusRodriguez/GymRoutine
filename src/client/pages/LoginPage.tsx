import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register({ email, name, password });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="brand-mark">GT</span>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Gym Tracker</div>
            <div className="eyebrow">Tus datos viven en este navegador</div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 18 }}>
          <button
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            type="button"
          >
            Crear cuenta
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === 'register' ? (
            <div className="field">
              <label htmlFor="name">Nombre</label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                minLength={2}
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
            />
          </div>

          {error ? <div className="alert">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Comprobando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="dim small" style={{ marginTop: 18 }}>
          Las cuentas se guardan en la base de datos local de este navegador. No hay recuperación de
          contraseña: si la pierdes, perderás el acceso a ese perfil.
        </p>
      </div>
    </div>
  );
}
