/*
 * Client-side finance helpers.
 *
 * calcTotalPayable / calcDueDate / countInstallments / calcInstallmentAmount
 * mirror server/utils/helpers.js exactly so every preview in the UI matches
 * what the API stores. The server stays the source of truth — values
 * returned by the API are always displayed after a loan is created.
 */

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Local (device) calendar date as YYYY-MM-DD. */
export function localDateISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EAT = 'Africa/Dar_es_Salaam';

/**
 * Tanzania (EAT) wall-clock time as 'YYYY-MM-DDTHH:mm:ss' — the value format of
 * <input type="datetime-local" step="1">. Independent of the device timezone so
 * payment times match the server's clock. Falls back to device time if the
 * browser lacks timezone data.
 */
export function nowEatInput(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: EAT, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d);
    const get = type => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    const p = n => String(n).padStart(2, '0');
    return `${localDateISO(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
}

/** 'YYYY-MM-DDTHH:mm[:ss]' → 'YYYY-MM-DD HH:mm:ss' (the API timestamp format). */
export function inputToTimestamp(value) {
  if (!value) return '';
  const [date, time = '00:00:00'] = String(value).split('T');
  const [h = '00', m = '00', s = '00'] = time.split(':');
  return `${date} ${h.padStart(2, '0')}:${m.padStart(2, '0')}:${String(s).slice(0, 2).padStart(2, '0')}`;
}

export function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Processing fee (ada ya fomu): % of principal paid upfront on every new loan. Mirrors the server. */
export const PROCESSING_FEE_RATE = 10;
/** Group incentive: % of principal refunded after on-time full repayment. Mirrors the server. */
export const GROUP_REFUND_RATE = 5;

const percentOf = (amount, rate) => {
  const a = parseFloat(amount);
  return a > 0 ? parseFloat((a * rate / 100).toFixed(2)) : null;
};
export const processingFee = principal => percentOf(principal, PROCESSING_FEE_RATE);
export const groupRefund   = principal => percentOf(principal, GROUP_REFUND_RATE);

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

/* ── Repayment frequency ───────────────────────────────────────────── */

export const FREQUENCIES = {
  daily:   { unit: 'days',   step: 1 },
  weekly:  { unit: 'days',   step: 7 },
  monthly: { unit: 'months', step: 1 },
};
export const FREQUENCY_ORDER = ['daily', 'weekly', 'monthly'];

/** Installments from start to due date — first installment one period after start. */
export function countInstallments(startDate, dueDate, frequency) {
  const f     = FREQUENCIES[frequency];
  const start = isoDate(startDate);
  const due   = isoDate(dueDate);
  if (!f || !start || !due) return null;
  if (due <= start) return 1;
  let n = 0;
  let cursor = start;
  while (cursor < due && n < 3660) {
    n += 1;
    cursor = calcDueDate(start, n * f.step, f.unit);
  }
  return n;
}

export function calcInstallmentAmount(total, count) {
  const t = parseFloat(total);
  return count > 0 && t > 0 ? parseFloat((t / count).toFixed(2)) : null;
}

/** Full quote for a set of loan terms, or null when terms are incomplete. */
export function loanQuote({ loan_amount, interest_rate, duration_value, duration_unit, start_date, repayment_frequency, loan_type }) {
  const total = calcTotalPayable(loan_amount, interest_rate);
  if (total == null) return null;
  const principal = parseFloat(loan_amount);
  const periods   = parseInt(duration_value, 10);
  const startDate = start_date || todayISO();
  const dueDate   = calcDueDate(startDate, duration_value, duration_unit);
  const frequency = FREQUENCIES[repayment_frequency] ? repayment_frequency : null;
  const installmentCount = frequency && dueDate ? countInstallments(startDate, dueDate, frequency) : null;
  return {
    principal,
    rate:        parseFloat(interest_rate),
    interest:    parseFloat((total - principal).toFixed(2)),
    total,
    periods:     periods > 0 ? periods : null,
    unit:        duration_unit,
    startDate,
    dueDate,
    frequency,
    installmentCount,
    installment: calcInstallmentAmount(total, installmentCount),
    loanType:        loan_type === 'group' ? 'group' : 'individual',
    processingFee:   processingFee(principal),                              // paid upfront, not repaid
    refundIncentive: loan_type === 'group' ? groupRefund(principal) : null, // group only
  };
}

/** Installment schedule for a quote (dates follow the repayment frequency). */
export function indicativeSchedule(quote, limit = 60) {
  if (!quote?.frequency || !quote.installmentCount || !quote.installment) return [];
  const f = FREQUENCIES[quote.frequency];
  const n = Math.min(quote.installmentCount, limit);
  const rows = [];
  let remaining = quote.total;
  for (let i = 1; i <= n; i++) {
    const isLast = i === quote.installmentCount;
    const amount = isLast ? parseFloat(remaining.toFixed(2)) : quote.installment;
    remaining = Math.max(0, parseFloat((remaining - amount).toFixed(2)));
    rows.push({ index: i, date: calcDueDate(quote.startDate, i * f.step, f.unit), amount, remaining });
  }
  return rows;
}

/**
 * Where a loan stands against its installment plan today.
 * Returns null for loans without a plan (legacy single-payment loans).
 */
export function repaymentStatus(loan, today = nowEatInput().slice(0, 10)) {
  const frequency = loan?.repayment_frequency;
  const count     = Number(loan?.installment_count);
  const amount    = Number(loan?.installment_amount);
  if (!FREQUENCIES[frequency] || !(count > 0) || !(amount > 0)) return null;

  const f     = FREQUENCIES[frequency];
  const start = isoDate(loan.start_date);
  const total = Number(loan.total_payable) || 0;
  const paid  = Number(loan.amount_paid) || 0;

  let due = 0;
  for (let i = 1; i <= count; i++) {
    if (calcDueDate(start, i * f.step, f.unit) <= today) due = i;
    else break;
  }
  const expected = due >= count ? total : parseFloat((due * amount).toFixed(2));
  const diff     = parseFloat((paid - expected).toFixed(2));
  const covered  = Math.min(count, Math.floor((paid + 0.005) / amount));

  return {
    frequency, count, amount, total, paid, due, expected,
    arrears:   diff < 0 ? -diff : 0,
    ahead:     diff > 0 ? diff : 0,
    covered,
    remaining: Math.max(0, count - covered),
    nextDue:   due < count ? calcDueDate(start, (due + 1) * f.step, f.unit) : null,
  };
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
