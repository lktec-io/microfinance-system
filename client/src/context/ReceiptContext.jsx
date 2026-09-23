import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import LoanReceipt from '../components/common/LoanReceipt';
import { useAuth } from './AuthContext';
import { runPrint } from '../utils/print';

const ReceiptContext = createContext(null);

/**
 * Holds the one hidden receipt surface for the whole app.
 *
 * Any screen can call `printReceipt(loan)`; the receipt is rendered into a
 * portal on <body>, the browser print dialog opens, and the surface is torn
 * down afterwards. Nothing about the page underneath changes.
 */
export function ReceiptProvider({ children }) {
  const auth = useAuth();
  const [receipt, setReceipt] = useState(null);

  const printReceipt = useCallback(loan => {
    if (!loan) return;
    setReceipt({ loan, printedAt: new Date().toISOString() });
    runPrint({ receipt: true, onDone: () => setReceipt(null) });
  }, []);

  const value = useMemo(() => ({ printReceipt }), [printReceipt]);

  return (
    <ReceiptContext.Provider value={value}>
      {children}
      {receipt && createPortal(
        <div className="mf-print-surface" aria-hidden="true">
          <LoanReceipt loan={receipt.loan} printedAt={receipt.printedAt} issuedBy={auth?.user?.name} />
        </div>,
        document.body,
      )}
    </ReceiptContext.Provider>
  );
}

/** `const { printReceipt } = usePrintReceipt();` — safe outside the provider too. */
export function usePrintReceipt() {
  return useContext(ReceiptContext) ?? { printReceipt: () => {} };
}
