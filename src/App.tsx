import { Navigate, Route, Routes } from 'react-router-dom';
import { useDb } from './client/hooks/useDb';
import { useAuth } from './client/hooks/useAuth';
import { useI18n } from './client/i18n';
import { AppLayout } from './client/components/AppLayout';
import { LoginPage } from './client/pages/LoginPage';
import { SessionPage } from './client/pages/SessionPage';
import { HistoryPage } from './client/pages/HistoryPage';
import { CatalogPage } from './client/pages/CatalogPage';
import { LibraryPage } from './client/pages/LibraryPage';
import { StatsPage } from './client/pages/StatsPage';
import { SettingsPage } from './client/pages/SettingsPage';
import { TemplatesPage } from './client/pages/TemplatesPage';

export function App() {
  const { status, error, retry } = useDb();
  const { user, ready } = useAuth();
  const { t } = useI18n();

  if (status === 'loading') {
    return (
      <div className="state-screen">
        <div>
          <div className="spinner" />
          <p className="muted">{t('app.loadingDb')}</p>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="state-screen">
        <div className="card state-card">
          <h1 style={{ fontSize: '1.3rem' }}>{t('app.lockedTitle')}</h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {error ? `${error} ` : ''}
            {t('app.lockedBody')}
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={retry}>
              {t('app.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="state-screen">
        <div className="card state-card">
          <h1 style={{ fontSize: '1.3rem' }}>{t('app.errorTitle')}</h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {error}
          </p>
          <p className="dim small" style={{ marginTop: 8 }}>
            {t('app.errorBody')}
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn" onClick={retry}>
              {t('app.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="state-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/session" replace />} />
        <Route path="session" element={<SessionPage />} />
        <Route path="session/:date" element={<SessionPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/session" replace />} />
      </Route>
    </Routes>
  );
}
