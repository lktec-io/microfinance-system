import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App';

// Suppress browser-extension proxy errors that cannot be caught by the app
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const msg = (e?.message ?? '').toLowerCase();
    const src = (e?.filename ?? '').toLowerCase();
    if (msg.includes('disconnected port') || msg.includes('message channel closed') ||
        src.includes('extension') || src.includes('chrome-extension') || src.includes('moz-extension')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', (e) => {
    const msg = ((e?.reason?.message ?? String(e?.reason ?? '')) || '').toLowerCase();
    if (msg.includes('disconnected port') || msg.includes('message channel closed') ||
        msg.includes('chrome-extension') || msg.includes('extension')) {
      e.preventDefault();
    }
  });
}

/* Legacy page-specific styles (Expenses, Reports, Users, LoanDetail).
   Loaded first so the new design system below wins on shared classes. */
import './styles/legacy/components.css';
import './styles/legacy/forms.css';
import './styles/legacy/layout.css';
import './styles/legacy/tables.css';
import './styles/legacy/dashboard.css';
import './styles/legacy/utilities.css';

/* Fintech design system */
import './styles/app/tokens.css';
import './styles/app/base.css';
import './styles/app/elements.css';
import './styles/app/patterns.css';
import './styles/app/shell.css';
import './styles/app/auth.css';
import './styles/app/modules.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
