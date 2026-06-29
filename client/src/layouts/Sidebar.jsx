import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const navContainerVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.1 },
  },
};

const navItemVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: {
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
};

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

function NavSection({ links, onClose }) {
  return (
    <motion.nav
      className="sidebar-nav"
      variants={navContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {links.map(({ to, label, Icon }) => (
        <motion.div key={to} variants={navItemVariants}>
          <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <motion.span
              className="sidebar-icon"
              whileHover={{ scale: 1.15, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Icon size={17} />
            </motion.span>
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        </motion.div>
      ))}
    </motion.nav>
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
      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>

        {/* Brand */}
        <motion.div
          className="sidebar-brand"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 26 }}
        >
          <BrandLogo />
          <span className="sidebar-title">Baraka Microcredit</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <FiX size={18} />
          </button>
        </motion.div>

        {/* Nav */}
        <div className="sidebar-scroll">
          <motion.div
            className="sidebar-section-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            Main
          </motion.div>
          <NavSection links={mainLinks} onClose={onClose} />

          {isAdmin && (
            <>
              <motion.div
                className="sidebar-section-label sidebar-section-label--spaced"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Administration
              </motion.div>
              <NavSection links={adminLinks} onClose={onClose} />
            </>
          )}
        </div>

        {/* Footer */}
        <motion.div
          className="sidebar-footer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 240, damping: 28 }}
        >
          <div className="sidebar-user">
            <motion.div
              className="sidebar-avatar"
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </motion.div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <motion.button
            className="btn-logout"
            onClick={handleLogout}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            <FiLogOut size={14} /> Sign Out
          </motion.button>
        </motion.div>

      </aside>
    </>
  );
}
