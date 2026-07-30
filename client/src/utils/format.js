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

export function fmtShort(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}
