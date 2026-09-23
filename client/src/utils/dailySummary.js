/*
 * Daily Operations & Cashflow Summary — the paper sheet, digitised.
 *
 * Two kinds of figure live on this sheet:
 *   AUTO   — computed from what the system already knows for the chosen day
 *            (collections split cash / M-Pesa, form fees, disbursements,
 *             expenses, new clients).
 *   MANUAL — carried in by the operator (Lala Jana, Faini, Double, Malengo,
 *            attendance, notes). Kept as a per-date draft in this browser.
 *
 * Everything here is pure: no API, no React, no storage side effects except
 * the clearly marked draft helpers.
 */

export const MAX_MONEY  = 999999999.99;
export const MAX_COUNT  = 100000;
export const CODE_RE    = /^[A-Za-z0-9/\- ]{0,40}$/;
export const DRAFT_KEY  = date => `mf_daily_${date}`;
export const BRANCH     = { name: 'RAMOS MICRO-CREDIT', unit: 'Head Office · Ofisi Kuu' };

/** Blank manual side of the sheet. */
export const EMPTY_MANUAL = {
  cash_lala_jana: '', cash_double: '', cash_faini: '', cash_ongezeko: '',
  mm_lala_jana: '',   mm_double: '',   mm_faini: '',   mm_ongezeko: '', mm_makato: '',
  code_number: '',    target: '',
  att_total: '', att_active: '', att_arrived: '', att_absent: '', att_double: '', att_passive: '',
  notes: '',
};

/** Money fields that Section A / B mask for restricted roles. */
export const MONEY_FIELDS = [
  'cash_lala_jana', 'cash_double', 'cash_faini', 'cash_ongezeko',
  'mm_lala_jana', 'mm_double', 'mm_faini', 'mm_ongezeko', 'mm_makato', 'target',
];
const COUNT_FIELDS = ['att_total', 'att_active', 'att_arrived', 'att_absent', 'att_double', 'att_passive'];

export const num = v => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const dateOf = value => String(value ?? '').slice(0, 10);
const sumBy  = (rows, pick) => rows.reduce((s, r) => s + (Number(pick(r)) || 0), 0);

/* ── Draft storage (per date, this browser only) ────────────────────── */
export function loadDraft(date) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(date));
    return raw ? { ...EMPTY_MANUAL, ...JSON.parse(raw) } : { ...EMPTY_MANUAL };
  } catch { return { ...EMPTY_MANUAL }; }
}

export function saveDraft(date, manual) {
  try {
    localStorage.setItem(DRAFT_KEY(date), JSON.stringify(manual));
    return true;
  } catch { return false; }          // private mode / storage full — the sheet still works
}

export function clearDraft(date) {
  try { localStorage.removeItem(DRAFT_KEY(date)); } catch { /* nothing to clear */ }
}

/* ── Validation ─────────────────────────────────────────────────────── */
const ERR = {
  money: { en: 'Enter an amount between 0 and 999,999,999.', sw: 'Weka kiasi kati ya 0 na 999,999,999.' },
  count: { en: 'Enter a whole number of people.',            sw: 'Weka idadi kamili ya watu.' },
  code:  { en: 'Letters, digits, "-" or "/" only (max 40).', sw: 'Herufi, tarakimu, "-" au "/" pekee (isizidi 40).' },
};

/** Field-level errors plus soft attendance warnings. Never throws. */
export function validate(manual) {
  const errors = {};
  const filled = key => String(manual[key] ?? '').trim() !== '';

  for (const key of MONEY_FIELDS) {
    if (!filled(key)) continue;
    const n = num(manual[key]);
    if (!(n >= 0) || n > MAX_MONEY) errors[key] = ERR.money;
  }
  for (const key of COUNT_FIELDS) {
    if (!filled(key)) continue;
    const n = num(manual[key]);
    if (!Number.isInteger(n) || n < 0 || n > MAX_COUNT) errors[key] = ERR.count;
  }
  if (filled('code_number') && !CODE_RE.test(manual.code_number)) errors.code_number = ERR.code;

  const warnings = [];
  const total = num(manual.att_total);
  const split = num(manual.att_arrived) + num(manual.att_absent);
  if (total > 0 && (filled('att_arrived') || filled('att_absent')) && split !== total) {
    warnings.push({
      en: `Waliofika + Wasiofika = ${split}, but Idadi is ${total}.`,
      sw: `Waliofika + Wasiofika = ${split}, lakini Idadi ni ${total}.`,
    });
  }
  return { errors, warnings, valid: Object.keys(errors).length === 0 };
}

/* ── The sheet ──────────────────────────────────────────────────────── */
/**
 * Build the day's sheet from the system data + the operator's entries.
 * `data` holds the raw lists already loaded by the page.
 */
export function computeSheet({ date, loans = [], repayments = [], expenses = [], customers = [] }, manual = EMPTY_MANUAL) {
  const dayPayments = repayments.filter(r => dateOf(r.payment_date) === date);
  const cashPayments   = dayPayments.filter(r => r.payment_mode !== 'mobile_money');
  const mobilePayments = dayPayments.filter(r => r.payment_mode === 'mobile_money');

  const dayLoans    = loans.filter(l => dateOf(l.created_at) === date);
  const dayExpenses = expenses.filter(e => dateOf(e.expense_date) === date);
  const dayClients  = customers.filter(c => dateOf(c.registration_date) === date && !c.group_id);

  // Section A · column 1 — hand cash wallet
  const cash = {
    lalaJana:   num(manual.cash_lala_jana),
    collections: sumBy(cashPayments, r => r.amount),
    double:     num(manual.cash_double),
    faini:      num(manual.cash_faini),
    formFees:   sumBy(dayLoans, l => l.processing_fee),
    ongezeko:   num(manual.cash_ongezeko),
  };
  cash.total = cash.lalaJana + cash.collections + cash.double + cash.faini + cash.formFees + cash.ongezeko;

  // Section A · column 2 — mobile money wallet (withdrawal fees are a deduction)
  const autoMakato = sumBy(mobilePayments, r => r.agent_fee);
  const mobile = {
    lalaJana:    num(manual.mm_lala_jana),
    collections: sumBy(mobilePayments, r => r.amount),
    double:      num(manual.mm_double),
    faini:       num(manual.mm_faini),
    ongezeko:    num(manual.mm_ongezeko),
    makato:      String(manual.mm_makato ?? '').trim() === '' ? autoMakato : num(manual.mm_makato),
    autoMakato,
  };
  mobile.total = mobile.lalaJana + mobile.collections + mobile.double + mobile.faini + mobile.ongezeko - mobile.makato;

  // Section B — outflows & balancing
  const disbursed = sumBy(dayLoans, l => l.loan_amount);
  const spent     = sumBy(dayExpenses, e => e.amount);
  const grandIn   = cash.total + mobile.total;
  const totalOut  = disbursed + spent;
  const outflow = {
    disbursed,
    expenses: spent,
    expenseCount: dayExpenses.length,
    target: num(manual.target),
    codeNumber: String(manual.code_number ?? '').trim(),
    grandIn,
    totalOut,
    baki: grandIn - totalOut,
  };

  // Section C — attendance & new clients
  const openLoans = loans.filter(l => l.status !== 'paid' && Number(l.balance) > 0);
  const attendance = {
    total:    String(manual.att_total ?? '').trim() === '' ? new Set(openLoans.map(l => l.customer_id)).size : num(manual.att_total),
    active:   String(manual.att_active ?? '').trim() === '' ? openLoans.filter(l => l.status === 'active').length : num(manual.att_active),
    arrived:  num(manual.att_arrived),
    absent:   num(manual.att_absent),
    double:   num(manual.att_double),
    passive:  num(manual.att_passive),
    newCount: dayClients.length,
  };

  return {
    date,
    cash,
    mobile,
    outflow,
    attendance,
    newClients: dayClients.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone })),
    counts: {
      payments: dayPayments.length,
      cashPayments: cashPayments.length,
      mobilePayments: mobilePayments.length,
      loans: dayLoans.length,
    },
  };
}
