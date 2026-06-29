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
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          Baraka Microcredit &copy; 2026 &mdash; All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}
