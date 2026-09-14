export function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(str) {
  return str ? String(str).slice(0, 10) : '—';
}

export function fmtCurrency(n, currency = 'TZS') {
  return `${currency} ${fmt(n)}`;
}

export function cur(n) {
  return `TZS ${fmt(n)}`;
}

export function fmt0(n) {
  return Math.round(Number(n || 0)).toLocaleString('en-US');
}

export function fmtDay(str, opts = { day: '2-digit', month: 'short' }) {
  if (!str) return '—';
  const d = new Date(`${String(str).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', opts);
}

export function initials(name, max = 2) {
  if (!name) return '?';
  return String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, max).toUpperCase();
}

/**
 * 'YYYY-MM-DD HH:mm:ss' from a stored DATETIME. The API pool runs at +00:00,
 * so the wall-clock value round-trips unchanged — read it as text, never
 * through Date (which would shift it into the device timezone).
 */
export function fmtTimestamp(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : '';
}

export function fmtShort(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}
