function n(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

/* ── Kiswahili: Thank You (after loan disbursed) ──────────────── */
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

/* ── Kiswahili: Payment Reminder ──────────────────────────────── */
function reminder(customerName, loan) {
  return (
    `Habari, ${customerName},\n\n` +
    `Tunapenda kukukumbusha kuwa una salio la mkopo la TZS ${n(loan.balance)}.\n\n` +
    `Tafadhali hakikisha unakamilisha malipo yako kabla ya tarehe ${fmtDate(loan.due_date)}.\n\n` +
    `Kwa maelezo zaidi wasiliana na Baraka Microcredit.\n\n` +
    `Asante.`
  );
}

/* ── Cron job templates (kept for automated daily jobs) ──────── */
function repaymentReminder(customerName, balance, dueDate) {
  return (
    `Habari, ${customerName},\n\n` +
    `Tunapenda kukukumbusha kuwa una salio la mkopo la TZS ${n(balance)}.\n\n` +
    `Tafadhali hakikisha unakamilisha malipo yako kabla ya tarehe ${fmtDate(dueDate)}.\n\n` +
    `Kwa maelezo zaidi wasiliana na Baraka Microcredit.\n\nAsante.`
  );
}

function overdueNotice(customerName, balance, dueDate) {
  return (
    `Habari, ${customerName},\n\n` +
    `Mkopo wako wa TZS ${n(balance)} ulikuwa unadaiwa tarehe ${fmtDate(dueDate)} na sasa umechelewa.\n\n` +
    `Tafadhali wasiliana nasi mara moja kuzuia hatua zaidi.\n\n` +
    `Baraka Microcredit`
  );
}

module.exports = { thankYou, reminder, repaymentReminder, overdueNotice };
