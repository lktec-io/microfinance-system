import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiDollarSign, FiCreditCard,
  FiBarChart2, FiShield, FiLogOut, FiX,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';

const mainLinks = [
  { to: '/',           label: 'Dashboard',       Icon: FiHome       },
  { to: '/customers',  label: 'Customers',        Icon: FiUsers      },
  { to: '/loans',      label: 'Loans',            Icon: FiDollarSign },
  { to: '/repayments', label: 'Repayments',       Icon: FiCreditCard },
  { to: '/reports',    label: 'Reports',          Icon: FiBarChart2  },
];
const adminLinks = [
  { to: '/users', label: 'User Management', Icon: FiShield },
];

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 900);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 900);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

const navContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};
const navItem = {
  hidden:  { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
};
const mobileItem = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};

function BrandLogo({ small }) {
  const [imgErr, setImgErr] = useState(false);
  const sz = small ? 30 : 34;
  if (!imgErr) {
    return (
      <img src="/logo.png" alt="Logo"
        className={small ? 'sidebar-mobile-logo-img' : 'sidebar-logo-img'}
        onError={() => setImgErr(true)}
        style={{ width: sz, height: sz, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
      />
    );
  }
  return small
    ? <div className="sidebar-mobile-logo">BC</div>
    : <span className="sidebar-logo">BC</span>;
}

/* ── DESKTOP SIDEBAR ── */
function DesktopSidebar({ collapsed, onToggle }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      {onToggle && (
        <button className="sidebar-collapse-btn" onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <FiChevronRight size={12} /> : <FiChevronLeft size={12} />}
        </button>
      )}

      {/* Brand */}
      <div className="sidebar-brand">
        <BrandLogo />
        {!collapsed && <span className="sidebar-title">Baraka Microcredit</span>}
      </div>

      {/* Nav */}
      <div className="sidebar-scroll">
        {!collapsed && <div className="sidebar-section-label">Main</div>}
        <motion.nav className="sidebar-nav" variants={navContainer} initial="hidden" animate="visible">
          {mainLinks.map(({ to, label, Icon }) => (
            <motion.div key={to} variants={navItem}>
              <NavLink to={to} end={to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}>
                <motion.span className="sidebar-icon"
                  whileHover={{ scale: 1.12, rotate: 4 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                  <Icon size={16} />
                </motion.span>
                {!collapsed && <span className="sidebar-link-label">{label}</span>}
                {collapsed && <span className="sidebar-link-tooltip">{label}</span>}
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>

        {isAdmin && (
          <>
            {!collapsed && <div className="sidebar-section-label sidebar-section-label--spaced">Admin</div>}
            <nav className="sidebar-nav" style={{ marginTop: collapsed ? '.5rem' : 0 }}>
              {adminLinks.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}>
                  <span className="sidebar-icon"><Icon size={16} /></span>
                  {!collapsed && <span className="sidebar-link-label">{label}</span>}
                  {collapsed && <span className="sidebar-link-tooltip">{label}</span>}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <motion.div className="sidebar-avatar"
            whileHover={{ scale: 1.06 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
            {user?.name?.[0]?.toUpperCase()}
          </motion.div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <motion.button className="btn-logout" onClick={handleLogout}
            whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
            <FiLogOut size={13} /> Sign Out
          </motion.button>
        )}
      </div>
    </aside>
  );
}

/* ── MOBILE SIDEBAR (floating centered panel) ── */
function MobileSidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); onClose(); }
  function handleNav() { onClose(); }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div className="sidebar-overlay" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} />

          {/* Floating panel */}
          <motion.div
            className="sidebar-mobile"
            style={{ position: 'fixed', top: '50%', left: '50%' }}
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-48%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.92, x: '-50%', y: '-48%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div className="sidebar-mobile-header">
              <div className="sidebar-mobile-brand">
                <BrandLogo small />
                <span className="sidebar-mobile-title">Baraka Microcredit</span>
              </div>
              <button className="sidebar-mobile-close" onClick={onClose} aria-label="Close menu">
                <FiX size={15} />
              </button>
            </div>

            {/* Nav */}
            <div className="sidebar-mobile-scroll">
              <div className="sidebar-mobile-section-label">Navigation</div>
              <motion.div variants={navContainer} initial="hidden" animate="visible">
                {mainLinks.map(({ to, label, Icon }) => (
                  <motion.div key={to} variants={mobileItem}>
                    <NavLink to={to} end={to === '/'}
                      className={({ isActive }) =>
                        `sidebar-mobile-link${isActive ? ' sidebar-mobile-link--active' : ''}`}
                      onClick={handleNav}>
                      <span className="sidebar-mobile-icon"><Icon size={17} /></span>
                      {label}
                    </NavLink>
                  </motion.div>
                ))}
              </motion.div>

              {isAdmin && (
                <>
                  <div className="sidebar-mobile-section-label" style={{ marginTop: '.4rem' }}>Admin</div>
                  {adminLinks.map(({ to, label, Icon }) => (
                    <NavLink key={to} to={to}
                      className={({ isActive }) =>
                        `sidebar-mobile-link${isActive ? ' sidebar-mobile-link--active' : ''}`}
                      onClick={handleNav}>
                      <span className="sidebar-mobile-icon"><Icon size={17} /></span>
                      {label}
                    </NavLink>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sidebar-mobile-footer">
              <div className="sidebar-mobile-user">
                <div className="sidebar-mobile-avatar">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="sidebar-mobile-user-name">{user?.name}</div>
                  <div className="sidebar-mobile-user-role">{user?.role}</div>
                </div>
              </div>
              <button className="sidebar-mobile-logout" onClick={handleLogout}>
                <FiLogOut size={13} /> Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── MAIN EXPORT ── */
export default function Sidebar({ open, onClose, collapsed, onToggle }) {
  const isMobile = useIsMobile();
  return isMobile
    ? <MobileSidebar open={open} onClose={onClose} />
    : <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />;
}
