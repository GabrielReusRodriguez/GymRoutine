import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  IconCatalog,
  IconHistory,
  IconLibrary,
  IconLogout,
  IconSettings,
  IconStats,
  IconToday,
} from './Icons';

const LINKS = [
  { to: '/session', label: 'Hoy', icon: IconToday },
  { to: '/history', label: 'Histórico', icon: IconHistory },
  { to: '/library', label: 'Biblioteca', icon: IconLibrary },
  { to: '/catalog', label: 'Catálogo', icon: IconCatalog },
  { to: '/stats', label: 'Estadísticas', icon: IconStats },
  { to: '/settings', label: 'Ajustes', icon: IconSettings },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">GT</span>
          <span className="brand-name">
            Gym Tracker
            <span className="brand-sub">Registro local</span>
          </span>
        </div>

        <nav className="nav">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={logout}>
            <IconLogout width={15} height={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
