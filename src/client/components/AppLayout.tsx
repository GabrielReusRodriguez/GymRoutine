import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import {
  IconCatalog,
  IconHistory,
  IconLibrary,
  IconLogout,
  IconSettings,
  IconStats,
  IconTemplate,
  IconToday,
} from './Icons';
import { LanguageSwitch } from './LanguageSwitch';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const links = [
    { to: '/session', label: t('nav.today'), icon: IconToday },
    { to: '/templates', label: t('nav.templates'), icon: IconTemplate },
    { to: '/history', label: t('nav.history'), icon: IconHistory },
    { to: '/library', label: t('nav.library'), icon: IconLibrary },
    { to: '/catalog', label: t('nav.catalog'), icon: IconCatalog },
    { to: '/stats', label: t('nav.stats'), icon: IconStats },
    { to: '/settings', label: t('nav.settings'), icon: IconSettings },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">GT</span>
          <span className="brand-name">
            Gym Tracker
            <span className="brand-sub">{t('app.brandSub')}</span>
          </span>
        </div>

        <nav className="nav">
          {links.map(({ to, label, icon: Icon }) => (
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
          <LanguageSwitch compact />
          <div className="user-chip">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={logout}>
            <IconLogout width={15} height={15} /> {t('nav.logout')}
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
