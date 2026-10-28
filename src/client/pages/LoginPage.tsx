import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { LanguageSwitch } from '../components/LanguageSwitch';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();
  const { t, tError } = useI18n();
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
      setError(tError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-lang">
        <LanguageSwitch compact />
      </div>
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="brand-mark">GT</span>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Gym Tracker</div>
            <div className="eyebrow">{t('login.tagline')}</div>
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
            {t('login.signIn')}
          </button>
          <button
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            type="button"
          >
            {t('login.signUp')}
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === 'register' ? (
            <div className="field">
              <label htmlFor="name">{t('login.name')}</label>
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
            <label htmlFor="email">{t('login.email')}</label>
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
            <label htmlFor="password">{t('login.password')}</label>
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
            {busy
              ? t('login.checking')
              : mode === 'login'
                ? t('login.signIn')
                : t('login.signUp')}
          </button>
        </form>

        <p className="dim small" style={{ marginTop: 18 }}>
          {t('login.note')}
        </p>
      </div>
    </div>
  );
}
