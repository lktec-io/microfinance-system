/*
 * Scoped printing.
 *
 * The app blocks printing by default (`@media print { body { display: none } }`
 * in base.css) so a stray Ctrl+P cannot dump client data onto paper. That guard
 * stays: only a print STARTED BY THE APP marks the body, and only the surface
 * being printed is allowed through.
 *
 *   runPrint()                → prints the current page (page chrome removed)
 *   runPrint({ receipt: true }) → prints the hidden receipt surface only
 */

const ON = 'mf-print-on';
const RECEIPT = 'is-print-receipt';

/** Marks the body, prints, then always cleans up — even if the dialog is cancelled. */
export function runPrint({ receipt = false, onDone } = {}) {
  if (typeof window === 'undefined') return;
  const body = document.body;
  body.classList.add(ON);
  if (receipt) body.classList.add(RECEIPT);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    body.classList.remove(ON, RECEIPT);
    window.removeEventListener('afterprint', cleanup);
    onDone?.();
  };

  window.addEventListener('afterprint', cleanup);
  // Safety net: some browsers never fire afterprint (or the user dismisses silently)
  const timer = setTimeout(cleanup, 60000);

  try {
    // Let the browser paint the print surface before opening the dialog
    requestAnimationFrame(() => {
      window.print();
      // Chrome fires afterprint synchronously enough; this keeps Safari honest
      setTimeout(cleanup, 500);
    });
  } catch {
    clearTimeout(timer);
    cleanup();
  }
}
