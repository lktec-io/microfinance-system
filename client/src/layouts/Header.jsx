import { FiMoon, FiSun, FiBell, FiSettings } from 'react-icons/fi';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header({ title, onMenuClick }) {
  const { user }               = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <header className="header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <span /><span /><span />
      </button>

      <h1 className="header-title">{title}</h1>

      <div className="header-actions">
        <button
          className="header-icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <FiBell size={18} />
        </button>

        <button
          className="header-icon-btn header-settings-btn"
          aria-label="Settings"
          title="Settings"
        >
          <FiSettings size={17} />
        </button>

        <button
          className="header-theme-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
        </button>

        {user && (
          <div className="header-user">
            <div className="header-user-info">
              <span className="header-user-name">{user.name}</span>
              <span className="header-user-role">{user.role}</span>
            </div>
            <div className="header-avatar" aria-hidden="true">
              <span style={{ fontSize: '.78rem', fontWeight: 700 }}>{initials}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
