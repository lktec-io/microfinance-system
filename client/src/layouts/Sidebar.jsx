import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useProfileImage } from '../context/ProfileContext';
import {
  FiHome, FiUsers, FiDollarSign, FiCreditCard,
  FiBarChart2, FiShield, FiLogOut, FiX,
  FiChevronLeft, FiChevronRight, FiFileText,
} from 'react-icons/fi';

const mainLinks = [
  { to: '/',           label: 'Dashboard',       Icon: FiHome       },
  { to: '/customers',  label: 'Customers',        Icon: FiUsers      },
  { to: '/loans',      label: 'Loans',            Icon: FiDollarSign },
  { to: '/repayments', label: 'Repayments',       Icon: FiCreditCard },
  { to: '/expenses',   label: 'Expenses',         Icon: FiFileText   },
  { to: '/reports',    label: 'Reports',          Icon: FiBarChart2  },
];
const adminLinks = [
  { to: '/users', label: 'User Management', Icon: FiShield },
];

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 900);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

const navContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
};
const navItem = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
};
const drawerOverlay = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};
const drawerPanel = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 34, mass: 0.9 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};
const drawerItemVar = {
  hidden:  { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
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
  const { profileImg } = useProfileImage();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      {onToggle && (
        <motion.button className="sidebar-collapse-btn" onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}>
          {collapsed ? <FiChevronRight size={12} /> : <FiChevronLeft size={12} />}
        </motion.button>
      )}

      {/* Brand */}
      <div className="sidebar-brand">
        <BrandLogo />
        {!collapsed && <span className="sidebar-title">Baraka Microcredit</span>}
      </div>

      {/* Nav */}
      <div className="sidebar-scroll">
        {!collapsed && <div className="sidebar-section-label">Main</div>}

        <LayoutGroup id="sidebar-desktop-nav">
          <motion.nav className="sidebar-nav" variants={navContainer} initial="hidden" animate="visible">
            {mainLinks.map(({ to, label, Icon }) => (
              <motion.div key={to} variants={navItem}>
                <NavLink to={to} end={to === '/'}
                  className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          className="sidebar-link-active-bg"
                          layoutId="sidebar-active-bg"
                          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        />
                      )}
                      <motion.span className="sidebar-icon"
                        whileHover={{ scale: 1.15 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                        <Icon size={16} />
                      </motion.span>
                      {!collapsed && <span className="sidebar-link-label">{label}</span>}
                      {collapsed && <span className="sidebar-link-tooltip">{label}</span>}
                    </>
                  )}
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
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            className="sidebar-link-active-bg"
                            layoutId="sidebar-active-bg"
                            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                          />
                        )}
                        <span className="sidebar-icon"><Icon size={16} /></span>
                        {!collapsed && <span className="sidebar-link-label">{label}</span>}
                        {collapsed && <span className="sidebar-link-tooltip">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </LayoutGroup>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <motion.div className="sidebar-avatar"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            style={profileImg ? { padding: 0, overflow: 'hidden' } : {}}>
            {profileImg
              ? <img src={profileImg} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : user?.name?.[0]?.toUpperCase()}
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
  const { profileImg } = useProfileImage();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); onClose(); }
  function handleNav() { onClose(); }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="sidebar-overlay"
            variants={drawerOverlay}
            initial="hidden" animate="visible" exit="exit"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            className="sidebar-drawer"
            variants={drawerPanel}
            initial="hidden" animate="visible" exit="exit"
          >
            {/* Header */}
            <div className="sidebar-drawer-header">
              <div className="sidebar-drawer-brand">
                <BrandLogo small />
                <span className="sidebar-drawer-title">Baraka Microcredit</span>
              </div>
              <motion.button
                className="sidebar-drawer-close"
                onClick={onClose}
                aria-label="Close menu"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <FiX size={16} />
              </motion.button>
            </div>

            {/* Nav */}
            <div className="sidebar-drawer-scroll">
              <div className="sidebar-drawer-label">Navigation</div>
              <LayoutGroup id="sidebar-drawer-nav">
                <motion.nav
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } } }}>
                  {mainLinks.map(({ to, label, Icon }) => (
                    <motion.div key={to} variants={drawerItemVar}>
                      <NavLink to={to} end={to === '/'}
                        className={({ isActive }) =>
                          `sidebar-drawer-link${isActive ? ' sidebar-drawer-link--active' : ''}`
                        }
                        onClick={handleNav}>
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.div
                                className="drawer-link-active-bg"
                                layoutId="drawer-active-bg"
                                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                              />
                            )}
                            <motion.span
                              className="sidebar-drawer-icon"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.85 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                              <Icon size={18} />
                            </motion.span>
                            <span className="sidebar-drawer-link-label">{label}</span>
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  ))}
                </motion.nav>

                {isAdmin && (
                  <>
                    <div className="sidebar-drawer-label" style={{ marginTop: '.55rem' }}>Admin</div>
                    <motion.nav
                      initial="hidden"
                      animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.055 } } }}>
                      {adminLinks.map(({ to, label, Icon }) => (
                        <motion.div key={to} variants={drawerItemVar}>
                          <NavLink to={to}
                            className={({ isActive }) =>
                              `sidebar-drawer-link${isActive ? ' sidebar-drawer-link--active' : ''}`
                            }
                            onClick={handleNav}>
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <motion.div
                                    className="drawer-link-active-bg"
                                    layoutId="drawer-active-bg"
                                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                                  />
                                )}
                                <motion.span className="sidebar-drawer-icon"
                                  whileHover={{ scale: 1.2 }}
                                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                                  <Icon size={18} />
                                </motion.span>
                                <span className="sidebar-drawer-link-label">{label}</span>
                              </>
                            )}
                          </NavLink>
                        </motion.div>
                      ))}
                    </motion.nav>
                  </>
                )}
              </LayoutGroup>
            </div>

            {/* Footer */}
            <div className="sidebar-drawer-footer">
              <div className="sidebar-drawer-user">
                <div className="sidebar-drawer-avatar"
                  style={profileImg ? { padding: 0, overflow: 'hidden' } : {}}>
                  {profileImg
                    ? <img src={profileImg} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    : user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="sidebar-drawer-user-info">
                  <div className="sidebar-drawer-user-name">{user?.name}</div>
                  <div className="sidebar-drawer-user-role">{user?.role}</div>
                </div>
              </div>
              <motion.button
                className="sidebar-drawer-logout"
                onClick={handleLogout}
                whileHover={{ x: 2 }} whileTap={{ scale: 0.96 }}>
                <FiLogOut size={13} /> Sign Out
              </motion.button>
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
