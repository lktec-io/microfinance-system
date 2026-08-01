import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiLogOut, FiSearch, FiX, FiCheck, FiTrash2,
  FiHome, FiUsers, FiDollarSign, FiCreditCard, FiBarChart2, FiShield,
  FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiUserPlus, FiRefreshCw,
  FiSun, FiCloud, FiMoon, FiCamera, FiUser,
} from 'react-icons/fi';
import { useAuth }          from '../context/AuthContext';
import { useTheme }         from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useProfileImage }  from '../context/ProfileContext';

/* ── Notification type config ───────────────────────────────────── */
const NOTIF_CFG = {
  danger:   { Icon: FiAlertTriangle, border: 'var(--red)',    bg: 'var(--red-lt)',             color: 'var(--red)'      },
  warning:  { Icon: FiAlertCircle,   border: 'var(--yellow)', bg: 'var(--yellow-lt)',           color: 'var(--yellow-dk)' },
  info:     { Icon: FiDollarSign,    border: 'var(--blue)',   bg: 'var(--blue-lt)',             color: 'var(--blue)'     },
  success:  { Icon: FiCheckCircle,   border: 'var(--green)',  bg: 'var(--green-lt)',            color: 'var(--green)'    },
  payment:  { Icon: FiCreditCard,    border: 'var(--orange)', bg: 'rgba(249,115,22,.10)',       color: 'var(--orange)'   },
  customer: { Icon: FiUserPlus,      border: 'var(--teal)',   bg: 'var(--teal-lt)',             color: 'var(--teal)'     },
};

const CMD_LINKS = [
  { to: '/',           label: 'Dashboard',      Icon: FiHome,       desc: 'Overview & stats'   },
  { to: '/customers',  label: 'Customers',       Icon: FiUsers,      desc: 'Manage clients'      },
  { to: '/loans',      label: 'Loans',           Icon: FiDollarSign, desc: 'View all loans'      },
  { to: '/repayments', label: 'Repayments',      Icon: FiCreditCard, desc: 'Payment records'     },
  { to: '/expenses',   label: 'Expenses',        Icon: FiCreditCard, desc: 'Track expenses'      },
  { to: '/reports',    label: 'Reports',         Icon: FiBarChart2,  desc: 'Analytics & exports' },
  { to: '/users',      label: 'User Management', Icon: FiShield,     desc: 'Admin only'          },
];

const THEME_ICONS = { morning: FiSun, afternoon: FiCloud, night: FiMoon };

const panelVariants = {
  hidden:  { opacity: 0, y: -10, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.2,  ease: [0, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } },
};

const bellRingAnim = {
  rotate: [0, -14, 12, -10, 8, -4, 3, 0],
  transition: { duration: 0.7, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 },
};

/* ── Hamburger icon (animated) ─────────────────────────────────── */
function HamburgerIcon({ open }) {
  return (
    <div className="hamburger-lines">
      <motion.span
        animate={open ? { rotate: 45, y: 7, width: '100%' } : { rotate: 0, y: 0, width: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }} />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.18 }} />
      <motion.span
        animate={open ? { rotate: -45, y: -7, width: '100%' } : { rotate: 0, y: 0, width: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }} />
    </div>
  );
}

export default function Header({ title, onMenuClick, open, collapsed }) {
  const { user, logout, isAdmin }     = useAuth();
  const { theme, setTheme, THEMES }   = useTheme();
  const { notifs, unread, markRead, markAllRead, remove, removeAll, refresh } = useNotifications();
  const { profileImg, setProfileImg } = useProfileImage();
  const navigate = useNavigate();

  const notifRef      = useRef(null);
  const cmdRef        = useRef(null);
  const profileRef    = useRef(null);
  const fileInputRef  = useRef(null);

  const [notifOpen,     setNotifOpen]     = useState(false);
  const [cmdOpen,       setCmdOpen]       = useState(false);
  const [cmdQuery,      setCmdQuery]      = useState('');
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadErr,     setUploadErr]     = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  /* ── Upload with progress ── */
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB');
      return;
    }
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    setUploading(true);
    setUploadPct(0);
    setUploadErr(false);

    try {
      if (cloudName && preset) {
        await new Promise((resolve, reject) => {
          const form = new FormData();
          form.append('file', file);
          form.append('upload_preset', preset);
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) setUploadPct(Math.round((evt.loaded / evt.total) * 90));
          };
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.secure_url) { setProfileImg(data.secure_url); setUploadPct(100); resolve(); }
              else reject(new Error('No URL returned'));
            } catch { reject(new Error('Parse error')); }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(form);
        });
      } else {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onprogress = (evt) => {
            if (evt.lengthComputable) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
          };
          reader.onload = (ev) => { setProfileImg(ev.target.result); resolve(); };
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      console.error('Profile upload failed:', err);
      setUploadErr(true);
    } finally {
      setUploading(false);
      setUploadPct(0);
      e.target.value = '';
    }
  }

  function handleRemovePhoto() {
    setProfileImg(null);
    setProfileOpen(false);
  }

  /* ── Outside click handlers ── */
  useEffect(() => {
    function handler(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false); setConfirmClear(false);
      }
      if (cmdOpen && cmdRef.current && !cmdRef.current.contains(e.target)) setCmdOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen, cmdOpen, profileOpen]);

  /* ESC key */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') {
        setCmdOpen(false); setNotifOpen(false); setConfirmClear(false); setProfileOpen(false);
      }
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

  const handleNotifToggle = useCallback(() => {
    setNotifOpen(v => { if (!v) refresh(); if (v) setConfirmClear(false); return !v; });
  }, [refresh]);

  function handleLogout() { logout(); navigate('/login'); }

  const filtered = cmdQuery.trim()
    ? CMD_LINKS.filter(l => {
        const q = cmdQuery.toLowerCase();
        return (l.label ?? '').toLowerCase().includes(q) ||
               (l.desc  ?? '').toLowerCase().includes(q);
      })
    : CMD_LINKS.filter(l => isAdmin || l.to !== '/users');

  return (
    <>
      <header className={`header${collapsed ? ' header--collapsed' : ''}`}>
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

          {/* ── NOTIFICATION CENTER ── */}
          <div className="notif-wrap" ref={notifRef}>
            <motion.button
              className={`header-icon-btn notif-bell-btn${notifOpen ? ' header-icon-btn--active' : ''}`}
              onClick={handleNotifToggle}
              aria-label="Notifications"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}>
              <motion.span
                style={{ display: 'flex', alignItems: 'center', transformOrigin: 'top center' }}
                animate={unread > 0 ? bellRingAnim : { rotate: 0 }}>
                <FiBell size={17} />
              </motion.span>
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span className="notif-badge" key={unread}
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div className="notif-panel"
                  variants={panelVariants} initial="hidden" animate="visible" exit="exit">
                  <div className="notif-panel-header">
                    <div className="notif-panel-left">
                      <FiBell size={14} style={{ flexShrink: 0 }} />
                      <span>Notifications</span>
                      {unread > 0 && <span className="notif-unread-chip">{unread} new</span>}
                    </div>
                    <div className="notif-panel-btns">
                      {unread > 0 && !confirmClear && (
                        <button className="notif-hdr-btn" onClick={markAllRead} title="Mark all read">
                          <FiCheck size={12} /> All read
                        </button>
                      )}
                      {notifs.length > 0 && (
                        confirmClear ? (
                          <div className="notif-confirm-row">
                            <span className="notif-confirm-text">Clear all?</span>
                            <button className="notif-confirm-yes"
                              onClick={() => { removeAll(); setConfirmClear(false); }}>Yes</button>
                            <button className="notif-confirm-no"
                              onClick={() => setConfirmClear(false)}>No</button>
                          </div>
                        ) : (
                          <button className="notif-hdr-btn notif-hdr-btn--danger"
                            onClick={() => setConfirmClear(true)} title="Clear all">
                            <FiTrash2 size={12} /> Clear
                          </button>
                        )
                      )}
                      {!confirmClear && (
                        <button className="notif-hdr-btn" onClick={() => setNotifOpen(false)}>
                          <FiX size={12} />
                        </button>
                      )}
                    </div>
                  </div>

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
                            <motion.div key={n.id}
                              className={`notif-card${n.read ? '' : ' notif-card--unread'}`}
                              style={{ borderLeftColor: cfg.border }}
                              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 14, height: 0, paddingTop: 0, paddingBottom: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.22 }}
                              layout>
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
                                  <motion.button className="notif-act-btn notif-act-btn--read"
                                    onClick={() => markRead(n.id)} title="Mark as read"
                                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                                    <FiCheck size={11} />
                                  </motion.button>
                                )}
                                <motion.button className="notif-act-btn notif-act-btn--del"
                                  onClick={() => remove(n.id)} title="Dismiss"
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                                  <FiX size={11} />
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                  <div className="notif-panel-footer">
                    <button className="notif-refresh-btn" onClick={refresh}>
                      <FiRefreshCw size={11} /> Refresh
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── THEME SWITCHER ── */}
          <div className="theme-seg">
            {THEMES.map((t) => {
              const TIcon = THEME_ICONS[t.id] || FiSun;
              const isActive = theme === t.id;
              return (
                <motion.button key={t.id}
                  className={`theme-seg-opt${isActive ? ' theme-seg-opt--active' : ''}`}
                  onClick={() => setTheme(t.id)} title={t.label}
                  whileTap={{ scale: 0.92 }}>
                  {isActive && (
                    <motion.div className="theme-seg-indicator" layoutId="theme-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <TIcon size={13} className="theme-seg-icon" />
                  <span className="theme-seg-label">{t.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Admin */}
          {isAdmin && (
            <motion.button className="header-icon-btn"
              onClick={() => navigate('/users')}
              aria-label="User Management" title="User Management"
              whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}>
              <FiShield size={15} />
            </motion.button>
          )}

          {/* ── PROFILE DROPDOWN ── */}
          {user && (
            <div className="profile-chip-wrap" ref={profileRef}>
              <motion.button
                className={`profile-chip${profileOpen ? ' profile-chip--open' : ''}`}
                onClick={() => setProfileOpen(v => !v)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Profile">
                <div className="header-avatar">
                  {uploading
                    ? <FiRefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} />
                    : profileImg
                    ? <img src={profileImg} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '.75rem', fontWeight: 700 }}>{initials}</span>
                  }
                </div>
                <div className="header-user-info">
                  <span className="header-user-name">{user.name}</span>
                  <span className="header-user-role">{user.role}</span>
                </div>
                <motion.span
                  className="profile-chip-caret"
                  animate={{ rotate: profileOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}>
                  ▾
                </motion.span>
              </motion.button>

              {/* Upload progress bar */}
              <AnimatePresence>
                {uploading && (
                  <motion.div className="upload-progress-bar"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div
                      className="upload-progress-fill"
                      animate={{ width: `${uploadPct}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Profile dropdown */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div className="profile-dropdown"
                    variants={panelVariants} initial="hidden" animate="visible" exit="exit">

                    {/* User identity */}
                    <div className="profile-dd-head">
                      <div className="profile-dd-avatar">
                        {profileImg
                          ? <img src={profileImg} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : <span>{initials}</span>
                        }
                      </div>
                      <div className="profile-dd-info">
                        <div className="profile-dd-name">{user.name}</div>
                        <div className="profile-dd-email">{user.email}</div>
                        <span className="profile-dd-role">{user.role}</span>
                      </div>
                    </div>

                    <div className="profile-dd-divider" />

                    {/* Actions */}
                    <button className="profile-dd-item"
                      onClick={() => { fileInputRef.current?.click(); setProfileOpen(false); }}>
                      <FiCamera size={14} />
                      <span>{profileImg ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {profileImg && (
                      <button className="profile-dd-item profile-dd-item--danger"
                        onClick={handleRemovePhoto}>
                        <FiX size={14} />
                        <span>Remove Photo</span>
                      </button>
                    )}

                    {uploadErr && (
                      <button className="profile-dd-item profile-dd-item--warn"
                        onClick={() => { setUploadErr(false); fileInputRef.current?.click(); setProfileOpen(false); }}>
                        <FiRefreshCw size={14} />
                        <span>Retry Upload</span>
                      </button>
                    )}

                    <div className="profile-dd-divider" />

                    <button className="profile-dd-item profile-dd-item--logout"
                      onClick={handleLogout}>
                      <FiLogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Hamburger — mobile only */}
          <motion.button
            className={`header-menu-btn${open ? ' header-menu-btn--open' : ''}`}
            onClick={onMenuClick}
            aria-label={open ? 'Close menu' : 'Open menu'}
            whileTap={{ scale: 0.9 }}>
            <HamburgerIcon open={open} />
          </motion.button>
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
