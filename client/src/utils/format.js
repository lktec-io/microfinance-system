export function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(str) {
  return str ? String(str).slice(0, 10) : '—';
}

export function fmtCurrency(n, currency = 'MWK') {
  return `${currency} ${fmt(n)}`;
}
