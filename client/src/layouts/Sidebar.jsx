import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdPeople, MdAccountBalance,
  MdPayments, MdBarChart, MdAdminPanelSettings,
  MdLogout, MdClose,
} from 'react-icons/md';

const links = [
  { to: '/',           label: 'Dashboard',  Icon: MdDashboard,           adminOnly: false },
  { to: '/customers',  label: 'Customers',  Icon: MdPeople,              adminOnly: false },
  { to: '/loans',      label: 'Loans',      Icon: MdAccountBalance,      adminOnly: false },
  { to: '/repayments', label: 'Repayments', Icon: MdPayments,            adminOnly: false },
  { to: '/reports',    label: 'Reports',    Icon: MdBarChart,            adminOnly: false },
  { to: '/users',      label: 'Users',      Icon: MdAdminPanelSettings,  adminOnly: true  },
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
  return <span className="sidebar-logo">MF</span>;
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
          <span className="sidebar-title">MicroFinance</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <MdClose size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">Main</div>

        <nav className="sidebar-nav">
          {links.filter(l => !l.adminOnly || isAdmin).map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-icon"><Icon size={18} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <MdLogout size={15} /> Sign Out
          </button>
        </div>

      </aside>
    </>
  );
}
