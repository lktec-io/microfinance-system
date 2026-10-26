const { pool } = require('../config/database');

/*
 * Reporting directories and the full financial statement.
 *
 * Read-only: every figure is derived from loans, repayments, expenses and the
 * group tables. Nothing here writes, and no financial rule is recalculated —
 * the fee, interest and refund values are the ones the loan was booked with.
 *
 * Revenue recognition (stated in the UI too): interest is recognised pro-rata
 * on money actually collected — a repayment contributes
 *   amount × (total_payable − loan_amount) / total_payable
 * to interest and the remainder to principal. Processing fees are recognised
 * in the month the loan was booked, since they are collected upfront.
 */

const num = v => Number(v || 0);

/** Tolerate a database that has not run migrations 004/005 yet. */
async function safeQuery(sql, params = [], fallback = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') return fallback;
    throw err;
  }
}

const INTEREST_SHARE = `CASE WHEN l.total_payable > 0
  THEN (l.total_payable - l.loan_amount) / l.total_payable ELSE 0 END`;

/* ── Directory 1: individual clients ──────────────────────────────────── */
async function getIndividuals() {
  const rows = await safeQuery(`
    SELECT c.id, c.full_name, c.phone, c.id_type, c.id_number, c.registration_date,
           COUNT(l.id)                                        AS loans,
           COALESCE(SUM(l.loan_amount), 0)                    AS principal,
           COALESCE(SUM(l.processing_fee), 0)                 AS fees,
           COALESCE(SUM(l.total_payable), 0)                  AS payable,
           COALESCE(SUM(l.amount_paid), 0)                    AS repaid,
           COALESCE(SUM(CASE WHEN l.status <> 'paid' THEN l.balance ELSE 0 END), 0) AS outstanding,
           COALESCE(SUM(l.status = 'overdue'), 0)              AS overdue_loans,
           COALESCE(SUM(l.status = 'active'), 0)               AS active_loans,
           MAX(l.created_at)                                   AS last_loan_at
      FROM customers c
      LEFT JOIN loans l ON l.customer_id = c.id
      LEFT JOIN client_groups g ON g.customer_id = c.id
     WHERE g.id IS NULL
     GROUP BY c.id
     ORDER BY outstanding DESC, c.full_name
  `);
  return rows.map(r => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone,
    id_type: r.id_type,
    id_number: r.id_number,
    registration_date: r.registration_date,
    loans: num(r.loans),
    principal: num(r.principal),
    fees: num(r.fees),
    payable: num(r.payable),
    repaid: num(r.repaid),
    outstanding: num(r.outstanding),
    overdue_loans: num(r.overdue_loans),
    active_loans: num(r.active_loans),
    last_loan_at: r.last_loan_at,
  }));
}

/* ── Directory 2: groups, with a per-member drill-down ────────────────── */
async function getGroups() {
  const groups = await safeQuery(`
    SELECT g.id, g.group_name, g.market_name, g.business_location, g.customer_id,
           leader.full_name    AS leader_name,
           leader.phone_number AS leader_phone,
           (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS members,
           COUNT(l.id)                                        AS loans,
           COALESCE(SUM(l.loan_amount), 0)                    AS principal,
           COALESCE(SUM(l.processing_fee), 0)                  AS fees,
           COALESCE(SUM(l.total_payable), 0)                   AS payable,
           COALESCE(SUM(l.amount_paid), 0)                     AS repaid,
           COALESCE(SUM(CASE WHEN l.status <> 'paid' THEN l.balance ELSE 0 END), 0) AS outstanding,
           COALESCE(SUM(l.status = 'overdue'), 0)              AS overdue_loans
      FROM client_groups g
      LEFT JOIN group_members leader ON leader.id = g.group_leader_id
      LEFT JOIN loans l ON l.group_id = g.id
     GROUP BY g.id
     ORDER BY outstanding DESC, g.group_name
  `);
  return groups.map(r => ({
    id: r.id,
    group_name: r.group_name,
    market_name: r.market_name,
    business_location: r.business_location,
    customer_id: r.customer_id,
    leader_name: r.leader_name,
    leader_phone: r.leader_phone,
    members: num(r.members),
    loans: num(r.loans),
    principal: num(r.principal),
    fees: num(r.fees),
    payable: num(r.payable),
    repaid: num(r.repaid),
    outstanding: num(r.outstanding),
    overdue_loans: num(r.overdue_loans),
  }));
}

/**
 * One group's member-by-member history: agreed shares across all of the
 * group's loans, what each member has actually paid, and their incentive.
 */
async function getGroupMembers(groupId) {
  const rows = await safeQuery(`
    SELECT m.id, m.full_name, m.phone_number, m.identity_type, m.identity_number,
           b.business_name, b.business_type,
           COUNT(DISTINCT glm.loan_id)                        AS loans,
           COALESCE(SUM(glm.agreed_share), 0)                  AS target,
           COALESCE(SUM(glm.refund_amount), 0)                 AS refund_total,
           COALESCE(SUM(CASE WHEN glm.refund_status = 'eligible' THEN glm.refund_amount ELSE 0 END), 0) AS refund_due,
           COALESCE(SUM(CASE WHEN glm.refund_status = 'paid'     THEN glm.refund_amount ELSE 0 END), 0) AS refund_paid,
           COALESCE(SUM(glm.refund_status = 'forfeited'), 0)    AS forfeited,
           (SELECT COALESCE(SUM(r.amount), 0) FROM repayments r WHERE r.group_member_id = m.id) AS paid,
           (SELECT COUNT(*) FROM repayments r WHERE r.group_member_id = m.id)                   AS payments,
           (SELECT MAX(r.payment_date) FROM repayments r WHERE r.group_member_id = m.id)        AS last_payment
      FROM group_members m
      LEFT JOIN member_businesses b   ON b.member_id = m.id
      LEFT JOIN group_loan_members glm ON glm.group_member_id = m.id
     WHERE m.group_id = ?
     GROUP BY m.id
     ORDER BY m.full_name
  `, [groupId]);

  return rows.map(r => {
    const target = num(r.target);
    const paid = num(r.paid);
    return {
      id: r.id,
      full_name: r.full_name,
      phone_number: r.phone_number,
      identity_type: r.identity_type,
      identity_number: r.identity_number,
      business_name: r.business_name,
      business_type: r.business_type,
      loans: num(r.loans),
      target,
      paid,
      balance: Math.max(0, Math.round((target - paid) * 100) / 100),
      progress: target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0,
      payments: num(r.payments),
      last_payment: r.last_payment,
      refund_total: num(r.refund_total),
      refund_due: num(r.refund_due),
      refund_paid: num(r.refund_paid),
      forfeited: num(r.forfeited),
    };
  });
}

/* ── The full financial statement ─────────────────────────────────────── */
async function getStatement() {
  const [[portfolio = {}]] = await pool.query(`
    SELECT COUNT(*)                                    AS loans,
           COALESCE(SUM(loan_amount), 0)               AS principal,
           COALESCE(SUM(total_payable), 0)             AS payable,
           COALESCE(SUM(total_payable - loan_amount), 0) AS interest_booked,
           COALESCE(SUM(amount_paid), 0)               AS repaid,
           COALESCE(SUM(CASE WHEN status <> 'paid' THEN balance ELSE 0 END), 0) AS outstanding,
           COALESCE(SUM(status = 'overdue'), 0)        AS overdue_loans,
           COALESCE(SUM(status = 'active'), 0)         AS active_loans,
           COALESCE(SUM(status = 'paid'), 0)           AS closed_loans
      FROM loans
  `);

  const feeRows = await safeQuery(
    'SELECT COALESCE(SUM(processing_fee), 0) AS fees FROM loans', [], [{ fees: 0 }]);
  const splitRows = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN loan_type = 'group' THEN loan_amount ELSE 0 END), 0) AS group_principal,
           COALESCE(SUM(CASE WHEN loan_type = 'group' THEN 1 ELSE 0 END), 0)           AS group_loans,
           COALESCE(SUM(CASE WHEN loan_type <> 'group' OR loan_type IS NULL THEN loan_amount ELSE 0 END), 0) AS individual_principal,
           COALESCE(SUM(CASE WHEN loan_type <> 'group' OR loan_type IS NULL THEN 1 ELSE 0 END), 0)           AS individual_loans
      FROM loans
  `, [], [{}]);
  const refundRows = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN refund_status = 'eligible' THEN refund_incentive_amount ELSE 0 END), 0) AS loan_due,
           COALESCE(SUM(CASE WHEN refund_status = 'paid'     THEN refund_incentive_amount ELSE 0 END), 0) AS loan_paid
      FROM loans
  `, [], [{}]);
  const memberRefundRows = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN refund_status = 'eligible' THEN refund_amount ELSE 0 END), 0) AS member_due,
           COALESCE(SUM(CASE WHEN refund_status = 'paid'     THEN refund_amount ELSE 0 END), 0) AS member_paid
      FROM group_loan_members
  `, [], [{}]);
  const expenseRows = await safeQuery(
    'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM expenses', [], [{ total: 0, count: 0 }]);

  /*
   * Portfolio at risk. PAR  = outstanding on loans already past their due date.
   *                   PAR30 = outstanding on loans more than 30 days past due.
   * Both are expressed against the gross outstanding portfolio.
   */
  const [[risk = {}]] = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN status <> 'paid' AND due_date < CURDATE() THEN balance ELSE 0 END), 0) AS par_balance,
           COALESCE(SUM(CASE WHEN status <> 'paid' AND due_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN balance ELSE 0 END), 0) AS par30_balance,
           COALESCE(SUM(CASE WHEN status <> 'paid' AND due_date < CURDATE() THEN 1 ELSE 0 END), 0) AS par_loans
      FROM loans
  `);

  /* The accrued refundable liability: everything promised and not yet paid out */
  const liabilityRows = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN refund_status IN ('pending', 'eligible') THEN refund_amount ELSE 0 END), 0) AS accrued,
           COALESCE(SUM(CASE WHEN refund_status = 'pending'   THEN refund_amount ELSE 0 END), 0) AS pending,
           COALESCE(SUM(CASE WHEN refund_status = 'forfeited' THEN refund_amount ELSE 0 END), 0) AS forfeited,
           COUNT(*)                                                                              AS allocations
      FROM group_loan_members
  `, [], [{}]);
  const loanLiabilityRows = await safeQuery(`
    SELECT COALESCE(SUM(CASE WHEN refund_status IN ('pending', 'eligible') THEN refund_incentive_amount ELSE 0 END), 0) AS accrued
      FROM loans WHERE loan_type = 'group'
  `, [], [{}]);

  /* Fees and interest by sector — the income statement matrix */
  const sectorFees = await safeQuery(`
    SELECT CASE WHEN loan_type = 'group' THEN 'group' ELSE 'individual' END AS sector,
           COALESCE(SUM(processing_fee), 0) AS fees,
           COUNT(*)                         AS loans
      FROM loans GROUP BY sector
  `);
  const sectorInterest = await safeQuery(`
    SELECT CASE WHEN l.loan_type = 'group' THEN 'group' ELSE 'individual' END AS sector,
           COALESCE(SUM(r.amount * (${INTEREST_SHARE})), 0) AS interest,
           COALESCE(SUM(r.amount), 0)                       AS collected,
           COUNT(*)                                          AS payments
      FROM repayments r JOIN loans l ON l.id = r.loan_id
     GROUP BY sector
  `);
  const sector = key => {
    const f = sectorFees.find(x => x.sector === key) || {};
    const i = sectorInterest.find(x => x.sector === key) || {};
    const fees$ = num(f.fees);
    const interest$ = Math.round(num(i.interest) * 100) / 100;
    return {
      loans: num(f.loans),
      fees: fees$,
      interest: interest$,
      collected: num(i.collected),
      payments: num(i.payments),
      revenue: Math.round((fees$ + interest$) * 100) / 100,
    };
  };

  /* Monthly trend: collections split into interest and principal, fees by booking month */
  const collected = await safeQuery(`
    SELECT DATE_FORMAT(r.payment_date, '%Y-%m')                   AS month,
           COALESCE(SUM(r.amount), 0)                             AS collected,
           COALESCE(SUM(r.amount * (${INTEREST_SHARE})), 0)       AS interest,
           COUNT(*)                                               AS payments
      FROM repayments r
      JOIN loans l ON l.id = r.loan_id
     WHERE r.payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY month
     ORDER BY month
  `);
  const booked = await safeQuery(`
    SELECT DATE_FORMAT(created_at, '%Y-%m')        AS month,
           COALESCE(SUM(loan_amount), 0)           AS disbursed,
           COALESCE(SUM(processing_fee), 0)        AS fees,
           COUNT(*)                                AS loans
      FROM loans
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY month
     ORDER BY month
  `);
  const spent = await safeQuery(`
    SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
     WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY month
     ORDER BY month
  `);

  const months = [...new Set([...collected, ...booked, ...spent].map(r => r.month))].sort();

  const trend = months.map(m => {
    const c = collected.find(r => r.month === m) || {};
    const b = booked.find(r => r.month === m) || {};
    const e = spent.find(r => r.month === m) || {};
    const interest = Math.round(num(c.interest) * 100) / 100;
    const fees = num(b.fees);
    const expenses = num(e.expenses);
    return {
      month: m,
      collected: num(c.collected),
      disbursed: num(b.disbursed),
      interest,
      fees,
      expenses,
      revenue: Math.round((interest + fees) * 100) / 100,
      net: Math.round((interest + fees - expenses) * 100) / 100,
    };
  });

  const fees = num(feeRows[0]?.fees);
  const interestEarned = trend.reduce((s, m) => s + m.interest, 0);
  const expenses = num(expenseRows[0]?.total);

  return {
    generated_at: new Date().toISOString(),
    portfolio: {
      loans: num(portfolio.loans),
      principal_disbursed: num(portfolio.principal),
      total_payable: num(portfolio.payable),
      interest_booked: num(portfolio.interest_booked),
      total_repaid: num(portfolio.repaid),
      outstanding: num(portfolio.outstanding),
      active_loans: num(portfolio.active_loans),
      overdue_loans: num(portfolio.overdue_loans),
      closed_loans: num(portfolio.closed_loans),
      individual_loans: num(splitRows[0]?.individual_loans),
      individual_principal: num(splitRows[0]?.individual_principal),
      group_loans: num(splitRows[0]?.group_loans),
      group_principal: num(splitRows[0]?.group_principal),
      par_balance: num(risk.par_balance),
      par30_balance: num(risk.par30_balance),
      par_loans: num(risk.par_loans),
      par_pct: num(portfolio.outstanding) > 0
        ? Math.round((num(risk.par_balance) / num(portfolio.outstanding)) * 1000) / 10 : 0,
      par30_pct: num(portfolio.outstanding) > 0
        ? Math.round((num(risk.par30_balance) / num(portfolio.outstanding)) * 1000) / 10 : 0,
    },
    sectors: {
      individual: sector('individual'),
      group: sector('group'),
    },
    liabilities: {
      /* 5% refundable incentives promised to group members and not yet paid */
      refundable_accrued: Math.round((num(liabilityRows[0]?.accrued) + num(loanLiabilityRows[0]?.accrued)) * 100) / 100,
      refundable_pending: num(liabilityRows[0]?.pending),
      refundable_forfeited: num(liabilityRows[0]?.forfeited),
      allocations: num(liabilityRows[0]?.allocations),
    },
    income: {
      processing_fees: fees,
      interest_recognised: Math.round(interestEarned * 100) / 100,
      revenue: Math.round((fees + interestEarned) * 100) / 100,
      expenses,
      net: Math.round((fees + interestEarned - expenses) * 100) / 100,
      expense_count: num(expenseRows[0]?.count),
    },
    refunds: {
      loan_due: num(refundRows[0]?.loan_due),
      loan_paid: num(refundRows[0]?.loan_paid),
      member_due: num(memberRefundRows[0]?.member_due),
      member_paid: num(memberRefundRows[0]?.member_paid),
    },
    trend,
  };
}

/* ── Tier 3 · debit/credit transaction ledger ─────────────────────────────
   Inflow  = repayments banked.  Outflow = principal disbursed.
   The running balance walks the window forward from an opening balance, so
   the column reconciles like a bank statement instead of starting at zero. */
async function getLedger({ from, to, limit = 200 } = {}) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
  const since = from || null;
  const until = to || null;

  const inflow = await safeQuery(`
    SELECT r.id, r.payment_date AS date, r.created_at, r.amount, r.receipt_number AS reference,
           c.full_name AS entity, l.id AS loan_id, l.loan_type,
           g.group_name, m.full_name AS member_name
      FROM repayments r
      JOIN loans l     ON l.id = r.loan_id
      JOIN customers c ON c.id = l.customer_id
      LEFT JOIN client_groups g ON g.id = l.group_id
      LEFT JOIN group_members m ON m.id = r.group_member_id
     WHERE (? IS NULL OR r.payment_date >= ?) AND (? IS NULL OR r.payment_date <= ?)
     ORDER BY r.payment_date DESC, r.id DESC
     LIMIT ?
  `, [since, since, until, until, cap]);

  const outflow = await safeQuery(`
    SELECT l.id, DATE(l.created_at) AS date, l.created_at, l.loan_amount AS amount,
           CONCAT('LN-', LPAD(l.id, 6, '0')) AS reference,
           c.full_name AS entity, l.id AS loan_id, l.loan_type, g.group_name, NULL AS member_name
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      LEFT JOIN client_groups g ON g.id = l.group_id
     WHERE (? IS NULL OR DATE(l.created_at) >= ?) AND (? IS NULL OR DATE(l.created_at) <= ?)
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT ?
  `, [since, since, until, until, cap]);

  const entries = [
    ...inflow.map(r => ({
      id: `in-${r.id}`, date: r.date, reference: r.reference,
      entity: r.member_name ? `${r.member_name} · ${r.group_name || r.entity}` : r.entity,
      account_type: r.loan_type === 'group' ? 'group' : 'individual',
      loan_id: r.loan_id, member: r.member_name || null,
      inflow: num(r.amount), outflow: 0, kind: 'repayment',
    })),
    ...outflow.map(r => ({
      id: `out-${r.id}`, date: r.date, reference: r.reference,
      entity: r.group_name || r.entity,
      account_type: r.loan_type === 'group' ? 'group' : 'individual',
      loan_id: r.loan_id, member: null,
      inflow: 0, outflow: num(r.amount), kind: 'disbursement',
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)))
    .slice(0, cap);

  /*
   * Opening balance = gross outstanding today, unwound back over the window.
   * Walking oldest → newest then re-reversing keeps the arithmetic honest.
   */
  const [[current = {}]] = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN status <> 'paid' THEN balance ELSE 0 END), 0) AS outstanding FROM loans");
  const closing = num(current.outstanding);
  const net = entries.reduce((s, e) => s + e.outflow - e.inflow, 0);
  const opening = Math.round((closing - net) * 100) / 100;

  let running = opening;
  const oldestFirst = [...entries].reverse().map(e => {
    running = Math.round((running + e.outflow - e.inflow) * 100) / 100;
    return { ...e, balance: running };
  });

  return {
    from: since, to: until, limit: cap,
    opening_balance: opening,
    closing_balance: closing,
    total_inflow: Math.round(entries.reduce((s, e) => s + e.inflow, 0) * 100) / 100,
    total_outflow: Math.round(entries.reduce((s, e) => s + e.outflow, 0) * 100) / 100,
    count: entries.length,
    entries: oldestFirst.reverse(),
  };
}

module.exports = { getIndividuals, getGroups, getGroupMembers, getStatement, getLedger };
