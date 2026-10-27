import { Navigate, Route, Routes } from 'react-router-dom';
import { useDb } from './client/hooks/useDb';
import { useAuth } from './client/hooks/useAuth';
import { AppLayout } from './client/components/AppLayout';
import { LoginPage } from './client/pages/LoginPage';
import { SessionPage } from './client/pages/SessionPage';
import { HistoryPage } from './client/pages/HistoryPage';
import { CatalogPage } from './client/pages/CatalogPage';
import { LibraryPage } from './client/pages/LibraryPage';
import { StatsPage } from './client/pages/StatsPage';
import { SettingsPage } from './client/pages/SettingsPage';

export function App() {
  const { status, error, retry } = useDb();
  const { user, ready } = useAuth();

  if (status === 'loading') {
    return (
      <div className="state-screen">
        <div>
          <div className="spinner" />
          <p className="muted">Abriendo la base de datos local…</p>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="state-screen">
        <div className="card state-card">
          <h1 style={{ fontSize: '1.3rem' }}>Abierta en otra pestaña</h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {error} Cierra la otra pestaña (o esta) y vuelve a intentarlo: SQLite solo permite un
            propietario exclusivo del almacenamiento.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={retry}>
              Reintentar
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
          <h1 style={{ fontSize: '1.3rem' }}>No se pudo abrir la base de datos</h1>
          <p className="muted small" style={{ marginTop: 8 }}>
            {error}
          </p>
          <p className="dim small" style={{ marginTop: 8 }}>
            La app necesita un navegador con OPFS y un contexto seguro (HTTPS o localhost).
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn" onClick={retry}>
              Reintentar
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
