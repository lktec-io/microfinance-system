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

/* Drawer (right-slide) animation variants */
const drawerOverlay = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};
const drawerPanel = {
  hidden:  { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 32, mass: 0.8 } },
  exit:    { x: '100%', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};
const drawerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};
const drawerItem = {
  hidden:  { opacity: 0, x: 22 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
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

/* ── MOBILE SIDEBAR (premium right-slide drawer) ── */
function MobileSidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); onClose(); }
  function handleNav() { onClose(); }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            className="sidebar-overlay"
            variants={drawerOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Right-slide glass drawer */}
          <motion.aside
            className="sidebar-drawer"
            variants={drawerPanel}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Drawer header */}
            <div className="sidebar-drawer-header">
              <div className="sidebar-drawer-brand">
                <BrandLogo small />
                <span className="sidebar-drawer-title">Baraka Microcredit</span>
              </div>
              <button className="sidebar-drawer-close" onClick={onClose} aria-label="Close menu">
                <FiX size={16} />
              </button>
            </div>

            {/* Nav */}
            <div className="sidebar-drawer-scroll">
              <div className="sidebar-drawer-label">Navigation</div>
              <motion.nav variants={drawerContainer} initial="hidden" animate="visible">
                {mainLinks.map(({ to, label, Icon }) => (
                  <motion.div key={to} variants={drawerItem}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `sidebar-drawer-link${isActive ? ' sidebar-drawer-link--active' : ''}`
                      }
                      onClick={handleNav}
                    >
                      <motion.span
                        className="sidebar-drawer-icon"
                        whileHover={{ scale: 1.2, rotate: 8 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                      >
                        <Icon size={18} />
                      </motion.span>
                      <span className="sidebar-drawer-link-label">{label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </motion.nav>

              {isAdmin && (
                <>
                  <div className="sidebar-drawer-label" style={{ marginTop: '.55rem' }}>Admin</div>
                  <motion.nav variants={drawerContainer} initial="hidden" animate="visible">
                    {adminLinks.map(({ to, label, Icon }) => (
                      <motion.div key={to} variants={drawerItem}>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `sidebar-drawer-link${isActive ? ' sidebar-drawer-link--active' : ''}`
                          }
                          onClick={handleNav}
                        >
                          <motion.span
                            className="sidebar-drawer-icon"
                            whileHover={{ scale: 1.2, rotate: 8 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                          >
                            <Icon size={18} />
                          </motion.span>
                          <span className="sidebar-drawer-link-label">{label}</span>
                        </NavLink>
                      </motion.div>
                    ))}
                  </motion.nav>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sidebar-drawer-footer">
              <div className="sidebar-drawer-user">
                <div className="sidebar-drawer-avatar">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="sidebar-drawer-user-info">
                  <div className="sidebar-drawer-user-name">{user?.name}</div>
                  <div className="sidebar-drawer-user-role">{user?.role}</div>
                </div>
              </div>
              <button className="sidebar-drawer-logout" onClick={handleLogout}>
                <FiLogOut size={13} /> Sign Out
              </button>
            </div>
          </motion.aside>
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
