import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiLogOut, FiSearch, FiX,
  FiHome, FiUsers, FiDollarSign, FiCreditCard, FiBarChart2, FiShield,
  FiCheckCircle, FiAlertTriangle, FiCreditCard as FiCard,
  FiSun, FiMoon, FiDroplet, FiCheck,
} from 'react-icons/fi';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NOTIFS = [
  { id: 1, type: 'success', Icon: FiCard,          text: 'Payment received successfully',    time: 'Just now'    },
  { id: 2, type: 'warning', Icon: FiAlertTriangle, text: 'Overdue loans need attention',     time: '1h ago'      },
  { id: 3, type: 'success', Icon: FiCheckCircle,   text: 'Daily report ready to export',     time: '3h ago'      },
];

const CMD_LINKS = [
  { to: '/',           label: 'Dashboard',       Icon: FiHome,      desc: 'Overview & stats'    },
  { to: '/customers',  label: 'Customers',        Icon: FiUsers,     desc: 'Manage clients'       },
  { to: '/loans',      label: 'Loans',            Icon: FiDollarSign,desc: 'View all loans'       },
  { to: '/repayments', label: 'Repayments',       Icon: FiCreditCard,desc: 'Payment records'      },
  { to: '/reports',    label: 'Reports',          Icon: FiBarChart2, desc: 'Analytics & exports'  },
  { to: '/users',      label: 'User Management',  Icon: FiShield,    desc: 'Admin only'           },
];

const THEME_ICONS = { morning: FiSun, afternoon: FiDroplet, evening: FiMoon, night: FiMoon };

export default function Header({ title, onMenuClick, collapsed }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, setTheme, isDark, THEMES } = useTheme();
  const navigate   = useNavigate();
  const notifRef   = useRef(null);
  const themeRef   = useRef(null);
  const cmdRef     = useRef(null);

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [themeOpen,   setThemeOpen]   = useState(false);
  const [cmdOpen,     setCmdOpen]     = useState(false);
  const [cmdQuery,    setCmdQuery]    = useState('');

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Close panels on outside click
  useEffect(() => {
    function handler(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (themeOpen && themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (cmdOpen && cmdRef.current && !cmdRef.current.contains(e.target)) setCmdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen, themeOpen, cmdOpen]);

  // ESC closes command palette
  useEffect(() => {
    if (!cmdOpen) return;
    const fn = (e) => { if (e.key === 'Escape') setCmdOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [cmdOpen]);

  // Ctrl/Cmd + K opens command palette
  useEffect(() => {
    const fn = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const filtered = cmdQuery.trim()
    ? CMD_LINKS.filter(l =>
        l.label.toLowerCase().includes(cmdQuery.toLowerCase()) ||
        l.desc.toLowerCase().includes(cmdQuery.toLowerCase())
      )
    : CMD_LINKS.filter(l => isAdmin || l.to !== '/users');

  const ThemeIcon = THEME_ICONS[theme] || (isDark ? FiMoon : FiSun);

  return (
    <>
      <header className={`header${collapsed ? ' header--collapsed' : ''}`}>
        <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <span /><span /><span />
        </button>

        <h1 className="header-title">{title}</h1>

        {/* Search */}
        <div className="header-search">
          <FiSearch size={14} className="header-search-icon" />
          <input
            className="header-search-input"
            placeholder="Search…"
            readOnly
            onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
            onFocus={() => { setCmdOpen(true); setCmdQuery(''); }}
          />
          <span className="header-search-shortcut">⌘K</span>
        </div>

        <div className="header-spacer" />

        <div className="header-actions">
          {/* Notifications */}
          <div className="notif-wrap" ref={notifRef}>
            <button
              className={`header-icon-btn${notifOpen ? ' header-icon-btn--active' : ''}`}
              onClick={() => setNotifOpen(v => !v)}
              aria-label="Notifications"
              title="Notifications"
            >
              <FiBell size={17} />
              <span className="notif-badge">3</span>
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div className="notif-panel"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0,0,.2,1] }}>
                  <div className="notif-panel-header">
                    <span>Notifications</span>
                    <button className="notif-close-btn" onClick={() => setNotifOpen(false)}>
                      <FiX size={13} />
                    </button>
                  </div>
                  <div className="notif-list">
                    {NOTIFS.map(({ id, type, Icon, text, time }, i) => (
                      <motion.div key={id} className={`notif-item notif-item--${type}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.055, duration: 0.2 }}>
                        <div className="notif-icon-wrap"><Icon size={13} /></div>
                        <div className="notif-body"><p>{text}</p><span>{time}</span></div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="notif-footer">View all notifications</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme selector */}
          <div className="theme-selector-wrap" ref={themeRef}>
            <button
              className={`header-theme-btn${themeOpen ? ' header-icon-btn--active' : ''}`}
              onClick={() => setThemeOpen(v => !v)}
              aria-label="Change theme"
              title="Change theme"
            >
              <ThemeIcon size={17} />
            </button>

            <AnimatePresence>
              {themeOpen && (
                <motion.div className="theme-panel"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0,0,.2,1] }}>
                  <div className="theme-panel-title">Appearance</div>
                  {THEMES.map(t => (
                    <motion.button key={t.id}
                      className={`theme-option${theme === t.id ? ' theme-option--active' : ''}`}
                      onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                      whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                      <div className="theme-option-dots">
                        <div className="theme-dot" style={{ background: t.dot }} />
                        <div className="theme-dot" style={{ background: t.accent }} />
                      </div>
                      <div className="theme-option-info">
                        <span className="theme-option-name">{t.label}</span>
                        <span className="theme-option-desc">{t.desc}</span>
                      </div>
                      {theme === t.id && <FiCheck size={13} className="theme-check" />}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin settings */}
          {isAdmin && (
            <button className="header-icon-btn" onClick={() => navigate('/users')}
              aria-label="User Management" title="User Management">
              <FiShield size={15} />
            </button>
          )}

          {/* Logout */}
          <button className="header-icon-btn header-logout-btn"
            onClick={handleLogout} aria-label="Sign out" title="Sign out">
            <FiLogOut size={16} />
          </button>

          {/* Profile chip — desktop only */}
          {user && (
            <div className="header-user">
              <div className="header-user-info">
                <span className="header-user-name">{user.name}</span>
                <span className="header-user-role">{user.role}</span>
              </div>
              <div className="header-avatar" aria-hidden="true">
                <span style={{ fontSize: '.75rem', fontWeight: 700 }}>{initials}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div className="cmd-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            <motion.div className="cmd-panel" ref={cmdRef}
              initial={{ opacity: 0, scale: 0.94, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
              <div className="cmd-input-wrap">
                <FiSearch size={16} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                <input
                  autoFocus
                  className="cmd-input"
                  placeholder="Search pages…"
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setCmdOpen(false);
                    if (e.key === 'Enter' && filtered[0]) {
                      navigate(filtered[0].to);
                      setCmdOpen(false);
                    }
                  }}
                />
                <button onClick={() => setCmdOpen(false)}
                  style={{ background: 'var(--gray-100)', border: '1px solid var(--border)', borderRadius: 6, padding: '.15rem .45rem', fontSize: '.72rem', color: 'var(--gray-500)', cursor: 'none' }}>
                  ESC
                </button>
              </div>
              <div className="cmd-results">
                <div className="cmd-section-label">Navigate to</div>
                {filtered.length === 0
                  ? <div className="cmd-empty">No results for "{cmdQuery}"</div>
                  : filtered.map(({ to, label, Icon, desc }) => (
                    <motion.button key={to} className="cmd-result-item"
                      onClick={() => { navigate(to); setCmdOpen(false); }}
                      whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
                      <div className="cmd-result-icon"><Icon size={14} /></div>
                      <div>
                        <div className="cmd-result-label">{label}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', marginTop: '.06rem' }}>{desc}</div>
                      </div>
                    </motion.button>
                  ))
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
