/*
 * Client-side finance helpers.
 *
 * calcTotalPayable / calcDueDate mirror server/utils/helpers.js exactly so
 * every preview in the UI matches what the API will store. The server stays
 * the source of truth — values returned by the API are always displayed
 * after a loan is created.
 */

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function calcTotalPayable(principal, ratePercent) {
  const p = parseFloat(principal);
  const r = parseFloat(ratePercent);
  if (!(p > 0) || Number.isNaN(r)) return null;
  return parseFloat((p + (p * r / 100)).toFixed(2));
}

export function calcDueDate(startDate, value, unit) {
  if (!startDate || !(Number(value) > 0)) return null;
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return null;
  if (unit === 'days')   d.setDate(d.getDate() + Number(value));
  if (unit === 'weeks')  d.setDate(d.getDate() + Number(value) * 7);
  if (unit === 'months') d.setMonth(d.getMonth() + Number(value));
  return d.toISOString().slice(0, 10);
}

/** Full quote for a set of loan terms, or null when terms are incomplete. */
export function loanQuote({ loan_amount, interest_rate, duration_value, duration_unit, start_date }) {
  const total = calcTotalPayable(loan_amount, interest_rate);
  if (total == null) return null;
  const principal = parseFloat(loan_amount);
  const periods   = parseInt(duration_value, 10);
  return {
    principal,
    rate:        parseFloat(interest_rate),
    interest:    parseFloat((total - principal).toFixed(2)),
    total,
    periods:     periods > 0 ? periods : null,
    unit:        duration_unit,
    startDate:   start_date || todayISO(),
    dueDate:     calcDueDate(start_date || todayISO(), duration_value, duration_unit),
    installment: periods > 0 ? parseFloat((total / periods).toFixed(2)) : null,
  };
}

/**
 * Indicative equal-installment schedule. The system books a single due date
 * per loan; this split is guidance for the officer and the client only.
 */
export function indicativeSchedule(quote, limit = 60) {
  if (!quote?.periods) return [];
  const n = Math.min(quote.periods, limit);
  const rows = [];
  let remaining = quote.total;
  for (let i = 1; i <= n; i++) {
    const isLast = i === quote.periods;
    const amount = isLast ? parseFloat(remaining.toFixed(2)) : quote.installment;
    remaining = Math.max(0, parseFloat((remaining - amount).toFixed(2)));
    rows.push({ index: i, date: calcDueDate(quote.startDate, i, quote.unit), amount, remaining });
  }
  return rows;
}

/** Whole days from today until `dateStr` (negative when in the past). */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86_400_000);
}

/** Collected ÷ (collected + outstanding), as a percentage. */
export function collectionRate(collected, outstanding) {
  const c = Number(collected) || 0;
  const o = Number(outstanding) || 0;
  return c + o > 0 ? (c / (c + o)) * 100 : null;
}

export function monthKey(dateStr) {
  return dateStr ? String(dateStr).slice(0, 7) : '';
}

/** The last `n` calendar months as YYYY-MM keys, oldest first. */
export function lastMonthKeys(n) {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function monthLabel(key, style = 'short') {
  if (!key) return '';
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: style });
}

/* ── Client standing ───────────────────────────────────────────────── */

const GRADES = [
  { min: 80, letter: 'A', label: 'Excellent', tone: 'emerald' },
  { min: 65, letter: 'B', label: 'Good',      tone: 'emerald' },
  { min: 50, letter: 'C', label: 'Fair',      tone: 'amber'   },
  { min: 35, letter: 'D', label: 'Watch',     tone: 'amber'   },
  { min: 0,  letter: 'E', label: 'High risk', tone: 'crimson' },
];

export function gradeFor(score) {
  if (score == null) return { letter: '—', label: 'No history', tone: 'slate' };
  return GRADES.find(g => score >= g.min);
}

/**
 * Repayment score (0–100) derived from a client's loans in this system.
 * It is NOT a credit-bureau score: it rewards fully repaid loans and
 * repayment progress, and penalises overdue loans.
 */
export function clientStanding(loans = []) {
  const n       = loans.length;
  const count   = s => loans.filter(l => l.status === s).length;
  const active  = count('active');
  const pending = count('pending');
  const overdue = count('overdue');
  const paid    = count('paid');

  const open      = loans.filter(l => l.status !== 'paid');
  const exposure  = open.reduce((s, l) => s + (Number(l.balance) || 0), 0);
  const borrowed  = loans.reduce((s, l) => s + (Number(l.loan_amount) || 0), 0);
  const booked    = loans.filter(l => l.status !== 'pending');
  const payable   = booked.reduce((s, l) => s + (Number(l.total_payable) || 0), 0);
  const repaid    = booked.reduce((s, l) => s + (Number(l.amount_paid) || 0), 0);
  const progress  = payable > 0 ? repaid / payable : 0;

  let score = null;
  if (n > 0) {
    const raw = 55 + 30 * (paid / n) + 15 * progress - 55 * (overdue / n);
    score = Math.round(Math.max(0, Math.min(100, raw)));
  }

  const status = overdue > 0 ? 'overdue'
    : active + pending > 0 ? 'active'
    : n > 0 ? 'settled'
    : 'none';

  return { n, active, pending, overdue, paid, exposure, borrowed, repaid, payable, progress, score, grade: gradeFor(score), status };
}

export const STANDING_BADGE = {
  overdue: { label: 'In arrears', color: 'red'    },
  active:  { label: 'Borrowing',  color: 'orange' },
  settled: { label: 'Settled',    color: 'green'  },
  none:    { label: 'No loans',   color: 'gray'   },
};
