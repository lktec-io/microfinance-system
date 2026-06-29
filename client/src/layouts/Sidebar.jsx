import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiDollarSign, FiCreditCard,
  FiBarChart2, FiShield, FiLogOut, FiX,
} from 'react-icons/fi';

const mainLinks = [
  { to: '/',           label: 'Dashboard',  Icon: FiHome       },
  { to: '/customers',  label: 'Customers',  Icon: FiUsers      },
  { to: '/loans',      label: 'Loans',      Icon: FiDollarSign },
  { to: '/repayments', label: 'Repayments', Icon: FiCreditCard },
  { to: '/reports',    label: 'Reports',    Icon: FiBarChart2  },
];

const adminLinks = [
  { to: '/users', label: 'User Management', Icon: FiShield },
];

function BrandLogo() {
  const [imgErr, setImgErr] = useState(false);
  if (!imgErr) {
    return (
      <img
        src="/logo.png"
        alt="Logo"
        className="sidebar-logo-img"
        onError={() => setImgErr(true)}
      />
    );
  }
  return <span className="sidebar-logo">BC</span>;
}

function NavSection({ links, open, onClose, offset = 0 }) {
  return (
    <nav className="sidebar-nav">
      {links.map(({ to, label, Icon }, idx) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          onClick={onClose}
          style={open ? { '--nav-delay': `${(idx + offset) * 0.045}s` } : {}}
        >
          <span className="sidebar-icon"><Icon size={17} /></span>
          <span className="sidebar-link-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>

        <div className="sidebar-brand">
          <BrandLogo />
          <span className="sidebar-title">Baraka Microcredit</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <FiX size={18} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section-label">Main</div>
          <NavSection links={mainLinks} open={open} onClose={onClose} offset={0} />

          {isAdmin && (
            <>
              <div className="sidebar-section-label sidebar-section-label--spaced">Administration</div>
              <NavSection links={adminLinks} open={open} onClose={onClose} offset={mainLinks.length} />
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <FiLogOut size={14} /> Sign Out
          </button>
        </div>

      </aside>
    </>
  );
}
