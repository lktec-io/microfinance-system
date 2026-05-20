import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = Object.entries(titles).find(([k]) =>
    location.pathname.startsWith(k) && (k === '/' ? location.pathname === '/' : true)
  )?.[1] || 'MicroFinance';

  /* Lock body scroll while mobile sidebar is open */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  /* Close sidebar on route change */
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
