import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiLogOut, FiSearch, FiX, FiCheck, FiTrash2,
  FiHome, FiUsers, FiDollarSign, FiCreditCard, FiBarChart2, FiShield,
  FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiUserPlus, FiRefreshCw,
  FiSun, FiCloud, FiMoon,
} from 'react-icons/fi';
import { useAuth }          from '../context/AuthContext';
import { useTheme }         from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

/* ── Notification type config ───────────────────────────────────── */
const NOTIF_CFG = {
  danger:   { Icon: FiAlertTriangle, border: 'var(--red)',    bg: 'var(--red-lt)',             color: 'var(--red)'      },
  warning:  { Icon: FiAlertCircle,   border: 'var(--yellow)', bg: 'var(--yellow-lt)',           color: 'var(--yellow-dk)' },
  info:     { Icon: FiDollarSign,    border: 'var(--blue)',   bg: 'var(--blue-lt)',             color: 'var(--blue)'     },
  success:  { Icon: FiCheckCircle,   border: 'var(--green)',  bg: 'var(--green-lt)',            color: 'var(--green)'    },
  payment:  { Icon: FiCreditCard,    border: 'var(--orange)', bg: 'rgba(249,115,22,.10)',       color: 'var(--orange)'   },
  customer: { Icon: FiUserPlus,      border: 'var(--teal)',   bg: 'var(--teal-lt)',             color: 'var(--teal)'     },
};

/* ── Command palette links ──────────────────────────────────────── */
const CMD_LINKS = [
  { to: '/',           label: 'Dashboard',      Icon: FiHome,       desc: 'Overview & stats'   },
  { to: '/customers',  label: 'Customers',       Icon: FiUsers,      desc: 'Manage clients'      },
  { to: '/loans',      label: 'Loans',           Icon: FiDollarSign, desc: 'View all loans'      },
  { to: '/repayments', label: 'Repayments',      Icon: FiCreditCard, desc: 'Payment records'     },
  { to: '/reports',    label: 'Reports',         Icon: FiBarChart2,  desc: 'Analytics & exports' },
  { to: '/users',      label: 'User Management', Icon: FiShield,     desc: 'Admin only'          },
];

const THEME_ICONS = { morning: FiSun, afternoon: FiCloud, evening: FiMoon };

const panelVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.18, ease: [0, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.14 } },
};

export default function Header({ title, onMenuClick, collapsed }) {
  const { user, logout, isAdmin }           = useAuth();
  const { theme, setTheme, isDark, THEMES } = useTheme();
  const { notifs, unread, markRead, markAllRead, remove, removeAll, refresh } = useNotifications();
  const navigate = useNavigate();

  const notifRef = useRef(null);
  const themeRef = useRef(null);
  const cmdRef   = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [cmdOpen,   setCmdOpen]   = useState(false);
  const [cmdQuery,  setCmdQuery]  = useState('');

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  /* Close panels on outside click */
  useEffect(() => {
    function handler(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (themeOpen && themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (cmdOpen   && cmdRef.current   && !cmdRef.current.contains(e.target))   setCmdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen, themeOpen, cmdOpen]);

  /* ESC key */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') { setCmdOpen(false); setNotifOpen(false); setThemeOpen(false); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  /* Ctrl/Cmd+K */
  useEffect(() => {
    const fn = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  /* Refresh notifs when panel opens */
  const handleNotifToggle = useCallback(() => {
    setNotifOpen(v => {
      if (!v) refresh();
      return !v;
    });
  }, [refresh]);

  function handleLogout() { logout(); navigate('/login'); }

  const ThemeIcon = THEME_ICONS[theme] || (isDark ? FiMoon : FiSun);

  const filtered = cmdQuery.trim()
    ? CMD_LINKS.filter(l =>
        l.label.toLowerCase().includes(cmdQuery.toLowerCase()) ||
        l.desc.toLowerCase().includes(cmdQuery.toLowerCase())
      )
    : CMD_LINKS.filter(l => isAdmin || l.to !== '/users');

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

          {/* ── NOTIFICATION CENTER ──────────────────────── */}
          <div className="notif-wrap" ref={notifRef}>
            <motion.button
              className={`header-icon-btn${notifOpen ? ' header-icon-btn--active' : ''}`}
              onClick={handleNotifToggle}
              aria-label="Notifications"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
            >
              <FiBell size={17} />
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    className="notif-badge"
                    key={unread}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    exit={{ scale: 0.5,   opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  className="notif-panel"
                  variants={panelVariants}
                  initial="hidden" animate="visible" exit="exit"
                >
                  {/* Panel header */}
                  <div className="notif-panel-header">
                    <div className="notif-panel-left">
                      <FiBell size={14} style={{ flexShrink: 0 }} />
                      <span>Notifications</span>
                      {unread > 0 && (
                        <span className="notif-unread-chip">{unread} new</span>
                      )}
                    </div>
                    <div className="notif-panel-btns">
                      {unread > 0 && (
                        <button className="notif-hdr-btn" onClick={markAllRead} title="Mark all as read">
                          <FiCheck size={12} /> All read
                        </button>
                      )}
                      {notifs.length > 0 && (
                        <button className="notif-hdr-btn notif-hdr-btn--danger" onClick={removeAll} title="Clear all">
                          <FiTrash2 size={12} /> Clear
                        </button>
                      )}
                      <button className="notif-hdr-btn" onClick={() => setNotifOpen(false)}>
                        <FiX size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Notification list */}
                  {notifs.length === 0 ? (
                    <div className="notif-empty">
                      <div className="notif-empty-icon"><FiBell size={22} /></div>
                      <p>You're all caught up!</p>
                      <span>No new notifications</span>
                    </div>
                  ) : (
                    <div className="notif-list">
                      <AnimatePresence initial={false}>
                        {notifs.map((n, i) => {
                          const cfg = NOTIF_CFG[n.type] || NOTIF_CFG.info;
                          const { Icon } = cfg;
                          return (
                            <motion.div
                              key={n.id}
                              className={`notif-card${n.read ? '' : ' notif-card--unread'}`}
                              style={{ borderLeftColor: cfg.border }}
                              initial={{ opacity: 0, x: -14 }}
                              animate={{ opacity: 1,  x: 0  }}
                              exit={{ opacity: 0, x: 14, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.22, ease: [0, 0, 0.2, 1] }}
                              layout
                            >
                              <div className="notif-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
                                <Icon size={14} />
                              </div>
                              <div className="notif-card-body">
                                <div className="notif-card-title">
                                  {n.title}
                                  {!n.read && <span className="notif-dot" />}
                                </div>
                                <div className="notif-card-desc">{n.desc}</div>
                                <div className="notif-card-time">{n.timeAgo}</div>
                              </div>
                              <div className="notif-card-actions">
                                {!n.read && (
                                  <motion.button
                                    className="notif-act-btn notif-act-btn--read"
                                    onClick={() => markRead(n.id)}
                                    title="Mark as read"
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <FiCheck size={11} />
                                  </motion.button>
                                )}
                                <motion.button
                                  className="notif-act-btn notif-act-btn--del"
                                  onClick={() => remove(n.id)}
                                  title="Dismiss"
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiX size={11} />
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="notif-panel-footer">
                    <button className="notif-refresh-btn" onClick={refresh}>
                      <FiRefreshCw size={11} /> Refresh
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── THEME SELECTOR ───────────────────────────── */}
          <div className="theme-selector-wrap" ref={themeRef}>
            <motion.button
              className={`header-icon-btn header-theme-btn${themeOpen ? ' header-icon-btn--active' : ''}`}
              onClick={() => setThemeOpen(v => !v)}
              aria-label="Change theme"
              title={`Theme: ${theme}`}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
            >
              <ThemeIcon size={17} />
            </motion.button>

            <AnimatePresence>
              {themeOpen && (
                <motion.div
                  className="theme-panel"
                  variants={panelVariants}
                  initial="hidden" animate="visible" exit="exit"
                >
                  <div className="theme-panel-title">Appearance</div>
                  {THEMES.map(t => {
                    const TIcon = THEME_ICONS[t.id] || FiSun;
                    const active = theme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        className={`theme-option${active ? ' theme-option--active' : ''}`}
                        onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                        whileHover={{ x: 3 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      >
                        <div className="theme-icon-wrap" style={{
                          background: t.id === 'evening' ? '#0A1628' : t.dot,
                          border: `1.5px solid ${active ? t.accent : 'var(--border)'}`,
                        }}>
                          <TIcon size={13} style={{ color: t.accent }} />
                        </div>
                        <div className="theme-option-info">
                          <span className="theme-option-name">{t.label}</span>
                          <span className="theme-option-desc">{t.desc}</span>
                        </div>
                        {active && (
                          <motion.span
                            className="theme-check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          >
                            <FiCheck size={13} />
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin shield */}
          {isAdmin && (
            <motion.button
              className="header-icon-btn"
              onClick={() => navigate('/users')}
              aria-label="User Management"
              title="User Management"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
            >
              <FiShield size={15} />
            </motion.button>
          )}

          {/* Logout */}
          <motion.button
            className="header-icon-btn header-logout-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
          >
            <FiLogOut size={16} />
          </motion.button>

          {/* Profile chip */}
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

      {/* ── Command Palette ─────────────────────────────────────── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div className="cmd-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            <motion.div className="cmd-panel" ref={cmdRef}
              initial={{ opacity: 0, scale: 0.94, y: -16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.94,    y: -16 }}
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
                    if (e.key === 'Enter' && filtered[0]) { navigate(filtered[0].to); setCmdOpen(false); }
                  }}
                />
                <button onClick={() => setCmdOpen(false)}
                  style={{ background: 'var(--gray-100)', border: '1px solid var(--border)', borderRadius: 6, padding: '.15rem .45rem', fontSize: '.72rem', color: 'var(--gray-500)' }}>
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
                      whileHover={{ x: 3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
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
