/*
 * Daily Operations & Cashflow — yesterday vs today, read only.
 *
 * Every figure is derived from data the system already holds; nothing is
 * typed, stored or carried over. Pure functions: no API, no React, no storage.
 */

export const BRANCH = { name: 'RAMOS MICRO-CREDIT', unit: 'Head Office · Ofisi Kuu' };

const dateOf = value => String(value ?? '').slice(0, 10);
const sumBy  = (rows, pick) => rows.reduce((s, r) => s + (Number(pick(r)) || 0), 0);

/** Local calendar day, n days back (never UTC — the branch works in local time). */
export function dayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * One day's figures.
 *
 * Inflows  = collections received that day (cash/bank wallet + M-Pesa wallet)
 *            plus the 10% form fees collected on loans booked that day.
 * Outflows = principal disbursed + operating expenses recorded that day.
 * BAKI     = inflows − outflows (the day's net movement).
 */
export function dayMetrics({ loans = [], repayments = [], expenses = [], customers = [] }, date) {
  const borrowerOf = new Map(loans.map(l => [String(l.id), l.customer_id]));
  const dayPayments = repayments.filter(r => dateOf(r.payment_date) === date);
  const cashPayments   = dayPayments.filter(r => r.payment_mode !== 'mobile_money');
  const mpesaPayments  = dayPayments.filter(r => r.payment_mode === 'mobile_money');
  const dayLoans    = loans.filter(l => dateOf(l.created_at) === date);
  const dayExpenses = expenses.filter(e => dateOf(e.expense_date) === date);
  const newClients  = customers.filter(c => dateOf(c.registration_date) === date && !c.group_id);

  const cashIn   = sumBy(cashPayments, r => r.amount);
  const mpesaIn  = sumBy(mpesaPayments, r => r.amount);
  const formFees = sumBy(dayLoans, l => l.processing_fee);
  const disbursed = sumBy(dayLoans, l => l.loan_amount);
  const spent     = sumBy(dayExpenses, e => e.amount);

  const inflows  = cashIn + mpesaIn + formFees;
  const outflows = disbursed + spent;

  return {
    date,
    cashIn,
    mpesaIn,
    formFees,
    disbursed,
    spent,
    expenseCount: dayExpenses.length,
    inflows,
    outflows,
    baki: inflows - outflows,
    // Attendance = distinct clients who actually paid that day (two loans, one client = one visit)
    attendance: new Set(
      dayPayments.map(r => borrowerOf.get(String(r.loan_id)) ?? r.customer_name ?? `receipt:${r.id}`)
    ).size,
    payments: dayPayments.length,
    loanCount: dayLoans.length,
    newClients: newClients.length,
  };
}

/** Today against yesterday: absolute difference, direction and percentage. */
export function change(today, yesterday) {
  const diff = (Number(today) || 0) - (Number(yesterday) || 0);
  const base = Math.abs(Number(yesterday) || 0);
  return {
    diff,
    dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    pct: base > 0 ? Math.round((diff / base) * 100) : null,
  };
}
