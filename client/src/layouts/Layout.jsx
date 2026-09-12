import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar              from './Sidebar';
import Header               from './Header';
import SecurityWatermark    from '../components/common/SecurityWatermark';
import { useSecurityGuard } from '../hooks/useSecurityGuard';

const COLLAPSE_KEY = 'mf_sidebar_collapsed';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed]   = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  useSecurityGuard();

  /* Blur sensitive content while the tab is hidden */
  useEffect(() => {
    function onVisibility() {
      mainRef.current?.classList.toggle('tab-blurred', document.hidden);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* Route change: close mobile drawer, return to top */
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleCollapse = useCallback(() => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className={`mf-shell${collapsed ? ' is-collapsed' : ''}`}>
      <SecurityWatermark />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <div ref={mainRef} className="mf-main">
        <Header onOpenMobile={() => setMobileOpen(true)} />

        <main className="mf-content" id="main-content">
          <div key={pathname} className="mf-route">
            <Suspense fallback={<div className="mf-route-loader" aria-label="Loading" />}>
              {children}
            </Suspense>
          </div>
        </main>

        <footer className="mf-footer">
          <span>© {new Date().getFullYear()} Baraka Microcredit. All rights reserved.</span>
          <span className="mf-footer__meta">Secure session · activity is monitored</span>
        </footer>
      </div>
    </div>
  );
}
