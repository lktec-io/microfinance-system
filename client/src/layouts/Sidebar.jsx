import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut, FiChevronsLeft, FiChevronsRight, FiX } from 'react-icons/fi';
import { useAuth }         from '../context/AuthContext';
import { useProfileImage } from '../context/ProfileContext';
import { Avatar }          from '../components/ui';
import { visibleSections } from './navigation';

const CLOSE_RATIO    = 0.3;    // drag past 30% of the drawer width to close
const FLING_VELOCITY = 0.45;   // or flick left faster than this (px/ms)

export function BrandMark() {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="mf-brand-mark">BC</span>;
  return (
    <span className="mf-brand-mark mf-brand-mark--img">
      <img src="/logo.png" alt="" onError={() => setFailed(true)} />
    </span>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, isDesktop }) {
  const { user, logout, isAdmin } = useAuth();
  const { profileImg }            = useProfileImage();
  const navigate                  = useNavigate();

  const asideRef = useRef(null);
  const scrimRef = useRef(null);
  const closeRef = useRef(null);
  const drag     = useRef(null);
  const drawer   = !isDesktop;

  /* Closed drawer is off-screen: keep its links out of the tab order */
  useEffect(() => {
    if (asideRef.current) asideRef.current.inert = drawer && !mobileOpen;
  }, [drawer, mobileOpen]);

  /* Move focus into the drawer when it opens */
  useEffect(() => {
    if (!drawer || !mobileOpen) return undefined;
    const id = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [drawer, mobileOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  /* ── Swipe-to-close ─────────────────────────────────────────────── */
  function paintDrag(dx, width) {
    const el = asideRef.current;
    const scrim = scrimRef.current;
    if (el) el.style.transform = dx == null ? '' : `translate3d(${dx}px, 0, 0)`;
    if (scrim) scrim.style.opacity = dx == null ? '' : String(Math.max(0, 1 + dx / width));
  }

  function onTouchStart(e) {
    if (!drawer || !mobileOpen || e.touches.length !== 1) return;
    const t = e.touches[0];
    drag.current = {
      x0: t.clientX, y0: t.clientY, dx: 0, axis: null,
      width: asideRef.current?.offsetWidth || 300,
      lastX: t.clientX, lastT: e.timeStamp, velocity: 0,
    };
  }

  function onTouchMove(e) {
    const d = drag.current;
    if (!d) return;
    const t  = e.touches[0];
    const dx = t.clientX - d.x0;
    const dy = t.clientY - d.y0;

    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.axis === 'x') {
        asideRef.current?.classList.add('is-dragging');
        scrimRef.current?.classList.add('is-dragging');
      }
    }
    if (d.axis !== 'x') return;

    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (t.clientX - d.lastX) / dt;
    d.lastX = t.clientX;
    d.lastT = e.timeStamp;
    d.dx = Math.min(0, dx);
    paintDrag(d.dx, d.width);
  }

  function onTouchEnd() {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== 'x') return;
    asideRef.current?.classList.remove('is-dragging');
    scrimRef.current?.classList.remove('is-dragging');
    paintDrag(null);
    if (-d.dx > d.width * CLOSE_RATIO || d.velocity < -FLING_VELOCITY) onCloseMobile();
  }

  const touchHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };

  let linkIndex = 0;

  return (
    <>
      <div
        ref={scrimRef}
        className={`mf-scrim${mobileOpen ? ' is-visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
        {...touchHandlers}
      />

      <aside
        ref={asideRef}
        className={`mf-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
        role={drawer ? 'dialog' : undefined}
        aria-modal={drawer && mobileOpen ? true : undefined}
        aria-label="Main menu"
        {...touchHandlers}
      >
        <div className="mf-sidebar__brand">
          <BrandMark />
          <div className="mf-sidebar__brand-text">
            <span className="mf-sidebar__brand-name">Baraka Microcredit</span>
            <span className="mf-sidebar__brand-tag">Lending Platform</span>
          </div>
          <button ref={closeRef} type="button" className="mf-sidebar__icon-btn mf-sidebar__close"
            onClick={onCloseMobile} aria-label="Close menu">
            <FiX size={20} />
          </button>
        </div>

        <nav className="mf-sidebar__nav" aria-label="Primary">
          {visibleSections(isAdmin).map(section => (
            <div className="mf-nav-section" key={section.label}>
              <div className="mf-nav-section__label">{section.label}</div>
              {section.items.map(({ to, label, Icon, end }) => {
                const i = linkIndex++;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    data-label={label}
                    style={{ '--i': i }}
                    onClick={onCloseMobile}
                    className={({ isActive }) => `mf-nav-link${isActive ? ' is-active' : ''}`}
                  >
                    <Icon className="mf-nav-link__icon" />
                    <span className="mf-nav-link__label">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mf-sidebar__foot">
          <div className="mf-sidebar__user">
            <Avatar name={user?.name} src={profileImg} size={36} dark />
            <div className="mf-sidebar__user-text">
              <span className="mf-sidebar__user-name">{user?.name}</span>
              <span className="mf-sidebar__user-role">{user?.role}</span>
            </div>
            <button type="button" className="mf-sidebar__icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
              <FiLogOut size={17} />
            </button>
          </div>
          <button
            type="button"
            className="mf-sidebar__collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronsRight size={15} /> : <FiChevronsLeft size={15} />}
            <span>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
