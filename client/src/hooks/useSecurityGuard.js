import { useEffect } from 'react';

export function useSecurityGuard() {
  useEffect(() => {
    function onContextMenu(e) {
      e.preventDefault();
    }

    function onKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      const key  = e.key.toLowerCase();

      // Block print
      if (ctrl && key === 'p') { e.preventDefault(); return; }
      // Block save-as
      if (ctrl && key === 's') { e.preventDefault(); return; }
      // Block devtools (F12, Ctrl+Shift+I/J/C, Ctrl+U)
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) { e.preventDefault(); return; }
      if (ctrl && key === 'u') { e.preventDefault(); return; }
    }

    function onDragStart(e) {
      if (
        e.target.tagName === 'IMG' ||
        e.target.closest?.('table') ||
        e.target.closest?.('.customer-grid') ||
        e.target.closest?.('.loan-grid')
      ) {
        e.preventDefault();
      }
    }

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown',     onKeyDown);
    document.addEventListener('dragstart',   onDragStart, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown',     onKeyDown);
      document.removeEventListener('dragstart',   onDragStart);
    };
  }, []);
}
