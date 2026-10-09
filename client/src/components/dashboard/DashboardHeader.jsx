import { useEffect, useState } from 'react';
import { FiRefreshCw, FiPlus } from 'react-icons/fi';

/** Good morning / afternoon / evening, from the viewer's own clock. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DATE_FMT = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

/**
 * Live clock, isolated in its own component.
 *
 * Keeping the ticking state here means the minute tick re-renders this line
 * only — the dashboard, its tiles and its charts are untouched, and no API
 * call is made.
 */
function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      // re-align to the top of the next minute instead of drifting
      timer = setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    timer = setTimeout(tick, 60000 - (Date.now() % 60000));
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <span>{now.toLocaleDateString('en-GB', DATE_FMT)}</span>
      <span className="mf-dhead__sep" aria-hidden="true">·</span>
      <time className="mf-dhead__clock" dateTime={now.toISOString()}>
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </time>
    </>
  );
}

/**
 * Minimal white dashboard header: greeting, user, date, live clock and the
 * two actions. No gradient, no accent rule, no avatar — separation comes from
 * the surface and spacing alone.
 */
export default function DashboardHeader({ user, onRefresh, refreshing, onAddLoan, canAddLoan = true }) {
  const name = user?.name || 'there';

  return (
    <header className="mf-dhead">
      <div className="mf-dhead__text">
        <h1 className="mf-dhead__title">
          {greetingFor()}, <strong>{name}</strong>
        </h1>
        <p className="mf-dhead__meta"><Clock /></p>
      </div>

      <div className="mf-dhead__actions no-print">
        <button type="button" className="mf-btn mf-btn--ghost" onClick={onRefresh} disabled={refreshing}
          aria-busy={refreshing || undefined}>
          <FiRefreshCw size={14} className={refreshing ? 'mf-spin' : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        {canAddLoan && (
          <button type="button" className="mf-btn mf-btn--primary" onClick={onAddLoan}>
            <FiPlus size={15} /> Quick Add Loan
          </button>
        )}
      </div>
    </header>
  );
}
