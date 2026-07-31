import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiUsers, FiDollarSign, FiBarChart2 } from 'react-icons/fi';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard', Icon: FiHome       },
  { to: '/customers', label: 'Clients',   Icon: FiUsers      },
  { to: '/loans',     label: 'Loans',     Icon: FiDollarSign },
  { to: '/reports',   label: 'Reports',   Icon: FiBarChart2  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) => `bnav-item${isActive ? ' bnav-item--active' : ''}`}>
          {({ isActive }) => (
            <>
              <div className="bnav-icon-wrap">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="bnav-pill"
                      layoutId="bnav-pill"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                <motion.span
                  className="bnav-icon"
                  animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  whileTap={{ scale: 0.78 }}>
                  <Icon size={20} />
                </motion.span>
              </div>
              <motion.span
                className="bnav-label"
                animate={{ opacity: isActive ? 1 : 0.5 }}>
                {label}
              </motion.span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
