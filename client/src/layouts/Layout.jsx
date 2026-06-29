import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header  from './Header';

const titles = {
  '/':           'Dashboard',
  '/customers':  'Customers',
  '/loans':      'Loans',
  '/repayments': 'Repayments',
  '/reports':    'Reports',
  '/users':      'User Management',
};

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.38, ease: [0, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0, y: -8, filter: 'blur(2px)',
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = Object.entries(titles).find(([k]) =>
    location.pathname.startsWith(k) && (k === '/' ? location.pathname === '/' : true)
  )?.[1] || 'Baraka Microcredit';

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            className="page-content"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <footer className="app-footer">
          Baraka Microcredit &copy; 2026 &mdash; All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}
