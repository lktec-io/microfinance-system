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

import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/forms.css';
import './styles/tables.css';
import './styles/dashboard.css';
import './styles/utilities.css';
import './styles/sms.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
