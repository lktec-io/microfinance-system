import { createPortal } from 'react-dom';
import { useLayoutEffect, useState } from 'react';
import { lockScroll } from '../../utils/scrollLock';

/*
 * Renders children into a dedicated host at the end of <body>.
 *
 * The page scroll lock is held ONLY while the host actually contains an
 * overlay. A portal that stays mounted with nothing inside — e.g. one that
 * wraps <AnimatePresence> on the User Management page — therefore never
 * freezes page scrolling. Exit animations keep the lock until they finish.
 */
export default function ModalPortal({ children }) {
  const [host] = useState(() => document.createElement('div'));

  useLayoutEffect(() => {
    host.className = 'mf-portal';
    document.body.appendChild(host);

    let release = null;
    const sync = () => {
      const open = host.childElementCount > 0;
      if (open && !release) release = lockScroll();
      if (!open && release) {
        release();
        release = null;
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(host, { childList: true });
    sync();

    return () => {
      observer.disconnect();
      if (release) release();
      host.remove();
    };
  }, [host]);

  return createPortal(children, host);
}
