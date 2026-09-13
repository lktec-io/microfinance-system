import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar              from './Sidebar';
import Header               from './Header';
import { useSecurityGuard } from '../hooks/useSecurityGuard';
import { useMediaQuery }    from '../hooks/useMediaQuery';
import { lockScroll }       from '../utils/scrollLock';

const COLLAPSE_KEY  = 'mf_sidebar_collapsed';
const DESKTOP_QUERY = '(min-width: 1024px)';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed]   = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
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

  /* Route change: close the drawer and jump to the top (no smooth-scroll drift) */
  useEffect(() => {
    setMobileOpen(false);
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }, [pathname]);

  /* Growing into desktop width closes the drawer so no scroll lock lingers */
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  /* Drawer open: lock page scroll, close on Escape, restore focus on close */
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const opener  = document.activeElement;
    const release = lockScroll();
    const onKey = e => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      release();
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  const toggleCollapse = useCallback(() => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const openMobile  = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className={`mf-shell${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        isDesktop={isDesktop}
      />

      <div ref={mainRef} className="mf-main">
        <Header onOpenMobile={openMobile} mobileOpen={mobileOpen} />

        <main className="mf-content" id="main-content">
          <div key={pathname} className="mf-route">
            <Suspense fallback={<div className="mf-route-loader" aria-label="Loading" />}>
              {children}
            </Suspense>
          </div>
        </main>

        <footer className="mf-footer">
          <span>© {new Date().getFullYear()} Baraka Microcredit. All rights reserved.</span>
          <span>Secure session · activity is monitored</span>
        </footer>
      </div>
    </div>
  );
}
