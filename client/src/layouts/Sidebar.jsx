import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut, FiChevronsLeft, FiChevronsRight, FiX } from 'react-icons/fi';
import { useAuth }         from '../context/AuthContext';
import { useProfileImage } from '../context/ProfileContext';
import { Avatar }          from '../components/ui';
import { visibleSections } from './navigation';

export function BrandMark() {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="mf-brand-mark">BC</span>;
  return (
    <span className="mf-brand-mark mf-brand-mark--img">
      <img src="/logo.png" alt="" onError={() => setFailed(true)} />
    </span>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout, isAdmin } = useAuth();
  const { profileImg }            = useProfileImage();
  const navigate                  = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <div className={`mf-scrim${mobileOpen ? ' is-visible' : ''}`} onClick={onCloseMobile} aria-hidden="true" />

      <aside
        className={`mf-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
        aria-label="Primary navigation"
      >
        <div className="mf-sidebar__brand">
          <BrandMark />
          <div className="mf-sidebar__brand-text">
            <span className="mf-sidebar__brand-name">Baraka Microcredit</span>
            <span className="mf-sidebar__brand-tag">Lending Platform</span>
          </div>
          <button type="button" className="mf-sidebar__icon-btn mf-sidebar__close" onClick={onCloseMobile} aria-label="Close menu">
            <FiX size={15} />
          </button>
        </div>

        <nav className="mf-sidebar__nav">
          {visibleSections(isAdmin).map(section => (
            <div className="mf-nav-section" key={section.label}>
              <div className="mf-nav-section__label">{section.label}</div>
              {section.items.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  data-label={label}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `mf-nav-link${isActive ? ' is-active' : ''}`}
                >
                  <Icon size={16} className="mf-nav-link__icon" />
                  <span className="mf-nav-link__label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mf-sidebar__foot">
          <div className="mf-sidebar__user">
            <Avatar name={user?.name} src={profileImg} size={32} dark />
            <div className="mf-sidebar__user-text">
              <span className="mf-sidebar__user-name">{user?.name}</span>
              <span className="mf-sidebar__user-role">{user?.role}</span>
            </div>
            <button type="button" className="mf-sidebar__icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
              <FiLogOut size={14} />
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
