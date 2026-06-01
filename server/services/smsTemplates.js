function n(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(d) {
  return d ? String(d).slice(0, 10) : '—';
}

/* ── 1. Thank You SMS ─────────────────────────────────────────── */
function thankYou(customerName, loan) {
  return (
    `Habari, ${customerName},\n\n` +
    `Baraka Microcredit tunakushukuru kwa kuchagua huduma zetu.\n\n` +
    `Mkopo wako wa TZS ${n(loan.loan_amount)} umeidhinishwa na kutolewa kikamilifu.\n\n` +
    `Kiasi cha kurejesha ni TZS ${n(loan.total_payable)} kabla ya tarehe ${fmtDate(loan.due_date)}.\n\n` +
    `Tunakutakia mafanikio katika matumizi ya mkopo huu.\n\n` +
    `Baraka Microcredit`
  );
}

/* ── 2. Reminder SMS ──────────────────────────────────────────── */
function reminder(customerName, loan) {
  return (
    `Habari, ${customerName},\n\n` +
    `Tunapenda kukukumbusha kuwa kiasi cha mkopo unachodaiwa ni TZS ${n(loan.balance)}.\n\n` +
    `Tafadhali hakikisha unakamilisha malipo yako kabla ya tarehe ${fmtDate(loan.due_date)}.\n\n` +
    `Kwa maelezo zaidi wasiliana na Baraka Microcredit.\n\n` +
    `Asante.`
  );
}

/* ── 3. Overdue SMS ───────────────────────────────────────────── */
function overdue(customerName, loan) {
  return (
    `Habari, ${customerName},\n\n` +
    `Mkopo wako wa TZS ${n(loan.balance)} ulikuwa unadaiwa tarehe ${fmtDate(loan.due_date)} na sasa umechelewa.\n\n` +
    `Tafadhali wasiliana nasi mara moja kuzuia hatua zaidi.\n\n` +
    `Baraka Microcredit`
  );
}

module.exports = { thankYou, reminder, overdue };
