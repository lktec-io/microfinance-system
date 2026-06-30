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
  initial: { opacity: 0, y: 14, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.34, ease: [0,0,.2,1] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(2px)', transition: { duration: 0.18, ease: 'easeIn' } },
};

export default function Layout({ children }) {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const title = Object.entries(titles).find(([k]) =>
    location.pathname.startsWith(k) && (k === '/' ? location.pathname === '/' : true)
  )?.[1] || 'Baraka Microcredit';

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell">
      <div className="page-glow-bg" aria-hidden="true" />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div className={`main-area${sidebarCollapsed ? ' main-area--collapsed' : ''}`}>
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          collapsed={sidebarCollapsed}
        />
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
