/*
 * Reference-counted page scroll lock.
 *
 * Every overlay (modal, drawer, palette) takes a lock and releases it on
 * close. The page only unlocks when the LAST overlay closes, so stacked or
 * quickly re-opened overlays can never leave the page frozen.
 */
let locks = 0;

export function lockScroll() {
  const root = document.documentElement;
  locks += 1;
  if (locks === 1) {
    const gap = window.innerWidth - root.clientWidth;
    root.style.setProperty('--mf-scrollbar-gap', `${Math.max(0, gap)}px`);
    root.classList.add('mf-scroll-locked');
  }

  let released = false;
  return function unlockScroll() {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      root.classList.remove('mf-scroll-locked');
      root.style.removeProperty('--mf-scrollbar-gap');
    }
  };
}
