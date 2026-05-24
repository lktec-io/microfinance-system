import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMoon, FiSun, FiBell, FiSettings, FiLogOut,
  FiCheckCircle, FiAlertTriangle, FiX, FiCreditCard,
} from 'react-icons/fi';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NOTIFS = [
  { id: 1, type: 'success', Icon: FiCreditCard,    text: 'Payment received successfully',    time: 'Just now'   },
  { id: 2, type: 'warning', Icon: FiAlertTriangle, text: 'Overdue loans need your attention', time: '1 hour ago' },
  { id: 3, type: 'success', Icon: FiCheckCircle,   text: 'Daily report is ready to export',  time: '3 hours ago'},
];

export default function Header({ title, onMenuClick }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme }    = useTheme();
  const navigate                  = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef                  = useRef(null);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  useEffect(() => {
    if (!notifOpen) return;
    function onOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [notifOpen]);

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <header className="header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <span /><span /><span />
      </button>

      <h1 className="header-title">{title}</h1>

      <div className="header-actions">

        {/* Notifications */}
        <div className="notif-wrap" ref={notifRef}>
          <button
            className={`header-icon-btn${notifOpen ? ' header-icon-btn--active' : ''}`}
            aria-label="Notifications"
            onClick={() => setNotifOpen(v => !v)}
            title="Notifications"
          >
            <FiBell size={17} />
            <span className="notif-badge">3</span>
          </button>

          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <span>Notifications</span>
                <button className="notif-close-btn" onClick={() => setNotifOpen(false)}>
                  <FiX size={14} />
                </button>
              </div>
              <div className="notif-list">
                {NOTIFS.map(({ id, type, Icon, text, time }) => (
                  <div key={id} className={`notif-item notif-item--${type}`}>
                    <div className="notif-icon-wrap">
                      <Icon size={14} />
                    </div>
                    <div className="notif-body">
                      <p>{text}</p>
                      <span>{time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notif-footer">All notifications</div>
            </div>
          )}
        </div>

        {/* Settings — admin only */}
        {isAdmin && (
          <button
            className="header-icon-btn"
            aria-label="User Management"
            title="User Management"
            onClick={() => navigate('/users')}
          >
            <FiSettings size={16} />
          </button>
        )}

        {/* Theme toggle */}
        <button
          className="header-theme-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <FiMoon size={17} /> : <FiSun size={17} />}
        </button>

        {/* Logout */}
        <button
          className="header-icon-btn header-logout-btn"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <FiLogOut size={16} />
        </button>

        {/* User info — desktop only */}
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
