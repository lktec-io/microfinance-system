import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiSearch, FiBell, FiChevronDown, FiChevronRight, FiCheck, FiX,
  FiTrash2, FiRefreshCw, FiCamera, FiLogOut, FiShield,
  FiAlertTriangle, FiAlertCircle, FiDollarSign, FiCheckCircle, FiCreditCard, FiUserPlus,
} from 'react-icons/fi';
import { useAuth }          from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useProfileImage }  from '../context/ProfileContext';
import { useDismiss }       from '../hooks/useDismiss';
import { useSystemStatus }  from '../hooks/useSystemStatus';
import { Avatar }           from '../components/ui';
import CommandPalette       from './CommandPalette';
import { matchRoute }       from './navigation';

const NOTIF_ICON = {
  danger:   FiAlertTriangle,
  warning:  FiAlertCircle,
  info:     FiDollarSign,
  success:  FiCheckCircle,
  payment:  FiCreditCard,
  customer: FiUserPlus,
};

const STATUS_LABEL = {
  checking:    'Checking systems',
  operational: 'All systems operational',
  degraded:    'Degraded performance',
  offline:     'API unreachable',
};

/* ── System status pill ────────────────────────────────────────────── */
function SystemStatus({ status, latency, checkedAt }) {
  const title = checkedAt
    ? `${STATUS_LABEL[status]} · checked ${new Date(checkedAt).toLocaleTimeString('en-GB')}`
    : STATUS_LABEL[status];
  return (
    <span className={`mf-status mf-status--${status}`} title={title} role="status">
      <span className="mf-status__dot" />
      <span className="mf-status__label">{status === 'operational' ? 'Operational' : STATUS_LABEL[status]}</span>
      {latency != null && <span className="mf-status__latency">{latency}ms</span>}
    </span>
  );
}

/* ── Notification center ───────────────────────────────────────────── */
function NotificationCenter() {
  const { notifs, unread, markRead, markAllRead, remove, removeAll, refresh } = useNotifications();
  const [open, setOpen]         = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const ref = useRef(null);

  const close = useCallback(() => { setOpen(false); setConfirm(false); }, []);
  useDismiss(ref, open, close);

  function toggle() {
    if (!open) refresh();
    setConfirm(false);
    setOpen(v => !v);
  }

  return (
    <div className="mf-pop-anchor" ref={ref}>
      <button type="button" className={`mf-header-btn${open ? ' is-open' : ''}`} onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} aria-expanded={open}>
        <FiBell size={16} />
        {unread > 0 && <span className="mf-header-btn__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="mf-popover" role="dialog" aria-label="Notifications">
          <div className="mf-popover__head">
            <span className="mf-popover__title">
              Notifications
              {unread > 0 && <span className="badge badge--orange">{unread} new</span>}
            </span>
            {unread > 0 && (
              <button type="button" className="mf-link-btn" onClick={markAllRead}>
                <FiCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <div className="mf-empty">
              <span className="mf-empty__icon"><FiBell size={17} /></span>
              <div className="mf-empty__title">You're all caught up</div>
              <div>No new notifications</div>
            </div>
          ) : (
            <div className="mf-notif-list">
              {notifs.map(n => {
                const Icon = NOTIF_ICON[n.type] || FiBell;
                return (
                  <div key={n.id} className={`mf-notif${n.read ? '' : ' is-unread'}`}>
                    <span className={`mf-notif__icon mf-notif__icon--${n.type}`}><Icon size={14} /></span>
                    <div>
                      <div className="mf-notif__title">{n.title}</div>
                      <div className="mf-notif__desc">{n.desc}</div>
                      <div className="mf-notif__time">{n.timeAgo}</div>
                    </div>
                    <div className="mf-notif__actions">
                      {!n.read && (
                        <button type="button" className="mf-icon-btn" onClick={() => markRead(n.id)} title="Mark as read" aria-label="Mark as read">
                          <FiCheck size={11} />
                        </button>
                      )}
                      <button type="button" className="mf-icon-btn mf-icon-btn--danger" onClick={() => remove(n.id)} title="Dismiss" aria-label="Dismiss">
                        <FiX size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mf-popover__foot">
            <button type="button" className="mf-link-btn" onClick={refresh}>
              <FiRefreshCw size={11} /> Refresh
            </button>
            {notifs.length > 0 && (confirm ? (
              <span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center', fontSize: 12 }}>
                Clear all?
                <button type="button" className="mf-btn mf-btn--danger mf-btn--sm" onClick={() => { removeAll(); setConfirm(false); }}>Yes</button>
                <button type="button" className="mf-btn mf-btn--sm" onClick={() => setConfirm(false)}>No</button>
              </span>
            ) : (
              <button type="button" className="mf-link-btn" style={{ color: 'var(--mf-crimson-600)' }} onClick={() => setConfirm(true)}>
                <FiTrash2 size={11} /> Clear all
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Profile menu (photo upload logic preserved from previous header) ─ */
function ProfileMenu({ system }) {
  const { user, logout, isAdmin }     = useAuth();
  const { profileImg, setProfileImg } = useProfileImage();
  const navigate = useNavigate();
  const [open, setOpen]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState(false);
  const ref     = useRef(null);
  const fileRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <div className="mf-pop-anchor" ref={ref}>
      <button type="button" className={`mf-profile-btn${open ? ' is-open' : ''}`} onClick={() => setOpen(v => !v)}
        aria-label="Account menu" aria-expanded={open}>
        {uploading
          ? <span className="mf-avatar" style={{ width: 30, height: 30 }}><FiRefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /></span>
          : <Avatar name={user.name} src={profileImg} size={30} />}
        <span className="mf-profile-btn__text">
          <span className="mf-profile-btn__name">{user.name}</span>
          <span className="mf-profile-btn__role">{user.role}</span>
        </span>
        <FiChevronDown size={14} className="mf-profile-btn__caret" />
      </button>

      {uploading && <div className="mf-upload-bar"><span style={{ width: `${uploadPct}%` }} /></div>}

      {open && (
        <div className="mf-popover mf-popover--sm" role="menu">
          <div className="mf-menu__head">
            <Avatar name={user.name} src={profileImg} size={38} />
            <div style={{ minWidth: 0 }}>
              <div className="mf-strong" style={{ fontSize: 13 }}>{user.name}</div>
              <div className="mf-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              <span className="badge badge--orange" style={{ marginTop: '.35rem' }}>{user.role}</span>
            </div>
          </div>
          <div className={`mf-menu__status mf-status--${system.status}`} role="status">
            <span className="mf-status__dot" />
            {STATUS_LABEL[system.status]}
            {system.latency != null && <span className="mf-status__latency">{system.latency}ms</span>}
          </div>
          <div className="mf-menu">
            <button type="button" className="mf-menu__item" role="menuitem"
              onClick={() => { fileRef.current?.click(); setOpen(false); }}>
              <FiCamera size={14} /> {profileImg ? 'Change photo' : 'Upload photo'}
            </button>
            {profileImg && (
              <button type="button" className="mf-menu__item" role="menuitem"
                onClick={() => { setProfileImg(null); setOpen(false); }}>
                <FiX size={14} /> Remove photo
              </button>
            )}
            {uploadErr && (
              <button type="button" className="mf-menu__item" role="menuitem"
                onClick={() => { setUploadErr(false); fileRef.current?.click(); setOpen(false); }}>
                <FiRefreshCw size={14} /> Retry upload
              </button>
            )}
            {isAdmin && (
              <button type="button" className="mf-menu__item" role="menuitem"
                onClick={() => { navigate('/users'); setOpen(false); }}>
                <FiShield size={14} /> User management
              </button>
            )}
            <div className="mf-menu__sep" />
            <button type="button" className="mf-menu__item mf-menu__item--danger" role="menuitem" onClick={handleLogout}>
              <FiLogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────── */
export default function Header({ onOpenMobile, mobileOpen }) {
  const { pathname } = useLocation();
  const system = useSystemStatus();
  const { section, item, detail } = matchRoute(pathname);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="mf-header">
        <button type="button" className="mf-header-btn mf-header__menu" onClick={onOpenMobile}
          aria-label="Open menu" aria-expanded={mobileOpen}>
          <FiMenu size={20} />
        </button>

        <nav className="mf-crumbs" aria-label="Breadcrumb">
          <span className="mf-crumbs__section">{section}</span>
          <FiChevronRight size={13} className="mf-crumbs__sep" />
          <span className="mf-crumbs__current">{item.label}</span>
          {detail && (
            <>
              <FiChevronRight size={13} className="mf-crumbs__sep" />
              <span className="mf-crumbs__detail">#{detail}</span>
            </>
          )}
        </nav>

        <button type="button" className="mf-header__search" onClick={() => setCmdOpen(true)} aria-label="Search (Ctrl+K)">
          <FiSearch size={14} />
          <span className="mf-header__search-label">Search or jump to…</span>
          <span className="mf-kbd">Ctrl K</span>
        </button>

        <div className="mf-header__actions">
          <SystemStatus {...system} />
          <NotificationCenter />
          <span className="mf-header__divider" />
          <ProfileMenu system={system} />
        </div>
      </header>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </>
  );
}
