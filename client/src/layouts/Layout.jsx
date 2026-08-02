import { useState, useEffect, useRef, Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar           from './Sidebar';
import Header            from './Header';
import BottomNav         from '../components/common/BottomNav';
import SecurityWatermark from '../components/common/SecurityWatermark';
import { useSecurityGuard } from '../hooks/useSecurityGuard';

const titles = {
  '/':           'Dashboard',
  '/customers':  'Customers',
  '/loans':      'Loans',
  '/repayments': 'Repayments',
  '/reports':    'Reports',
  '/users':      'User Management',
};

/*
 * AnimatedOutlet — calls useOutlet() to capture the current matched child
 * as a React element snapshot. Framer Motion's AnimatePresence can hold
 * the previous snapshot during its exit while mounting the next one.
 * This means the sidebar and header NEVER remount during navigation.
 */
function AnimatedOutlet() {
  const location = useLocation();
  const element  = useOutlet();

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.main
        key={location.pathname}
        className="page-content"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0, 0, 0.2, 1] } }}
      >
        <Suspense fallback={<div className="page-loading-spinner" aria-label="Loading…" />}>
          {element}
        </Suspense>
      </motion.main>
    </AnimatePresence>
  );
}

export default function Layout() {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location    = useLocation();
  const mainAreaRef = useRef(null);

  useSecurityGuard();

  useEffect(() => {
    function handleVisibility() {
      const el = mainAreaRef.current;
      if (!el) return;
      el.classList.toggle('tab-blurred', document.hidden);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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

      <SecurityWatermark />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div ref={mainAreaRef} className={`main-area${sidebarCollapsed ? ' main-area--collapsed' : ''}`}>
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(v => !v)}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
        />

        <AnimatedOutlet />

        <footer className="app-footer">
          Baraka Microcredit &copy; 2026 &mdash; All Rights Reserved.
        </footer>
      </div>

      <BottomNav />
    </div>
  );
}
