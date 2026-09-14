const { pool } = require('../config/database');

async function getSummary() {
  const [[customers]]    = await pool.query('SELECT COUNT(*) AS total FROM customers');
  const [[loans]]        = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(loan_amount),0) AS total_amount FROM loans');
  const [[repayments]]   = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM repayments');
  const [[outstanding]]  = await pool.query("SELECT COALESCE(SUM(balance),0) AS total FROM loans WHERE status NOT IN ('paid')");
  const [[activeLoans]]  = await pool.query("SELECT COUNT(*) AS total FROM loans WHERE status = 'active'");
  const [[overdueLoans]] = await pool.query("SELECT COUNT(*) AS total FROM loans WHERE status = 'overdue'");
  const [[byStatus]]     = await pool.query(`
    SELECT
      COALESCE(SUM(status='active'),  0) AS active,
      COALESCE(SUM(status='pending'), 0) AS pending,
      COALESCE(SUM(status='paid'),    0) AS paid,
      COALESCE(SUM(status='overdue'), 0) AS overdue
    FROM loans
  `);
  return {
    customers:     Number(customers.total    || 0),
    total_loans:   Number(loans.total        || 0),
    loans_amount:  Number(loans.total_amount || 0),
    repayments:    Number(repayments.total   || 0),
    collected:     Number(repayments.total_amount || 0),
    outstanding:   Number(outstanding.total  || 0),
    active_loans:  Number(activeLoans.total  || 0),
    overdue_loans: Number(overdueLoans.total || 0),
    loan_status: {
      active:  Number(byStatus?.active  || 0),
      pending: Number(byStatus?.pending || 0),
      paid:    Number(byStatus?.paid    || 0),
      overdue: Number(byStatus?.overdue || 0),
    },
  };
}

async function getRecent() {
  const [recentRepayments] = await pool.query(`
    SELECT r.id, r.receipt_number, r.amount, r.payment_date,
           c.full_name AS customer_name, l.id AS loan_id
    FROM repayments r
    JOIN loans l     ON l.id = r.loan_id
    JOIN customers c ON c.id = l.customer_id
    ORDER BY r.created_at DESC LIMIT 8
  `);
  const [recentCustomers] = await pool.query(`
    SELECT c.id, c.full_name, c.phone, c.registration_date,
           COUNT(l.id) AS loan_count
    FROM customers c
    LEFT JOIN loans l ON l.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC LIMIT 6
  `);
  const [recentLoans] = await pool.query(`
    SELECT l.id, l.loan_amount, l.total_payable, l.balance,
           l.status, l.due_date, c.full_name AS customer_name
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    ORDER BY l.created_at DESC LIMIT 6
  `);
  return { repayments: recentRepayments, customers: recentCustomers, loans: recentLoans };
}

async function getDaily() {
  const [loans] = await pool.query(`
    SELECT DATE(created_at) AS date, COUNT(*) AS loans_issued, SUM(loan_amount) AS total_issued
    FROM loans
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  const [repayments] = await pool.query(`
    SELECT DATE(payment_date) AS date, COUNT(*) AS payments, SUM(amount) AS total_collected
    FROM repayments
    WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(payment_date)
    ORDER BY date DESC
  `);
  return { loans, repayments };
}

async function getMonthly() {
  const [loans] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
           COUNT(*) AS loans_issued, SUM(loan_amount) AS total_issued
    FROM loans
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month ORDER BY month DESC
  `);
  const [repayments] = await pool.query(`
    SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
           COUNT(*) AS payments, SUM(amount) AS total_collected
    FROM repayments
    WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month ORDER BY month DESC
  `);
  return { loans, repayments };
}

async function getOverdue() {
  const [rows] = await pool.query(`
    SELECT l.*, c.full_name AS customer_name, c.phone AS customer_phone
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    WHERE l.due_date < CURDATE() AND l.status IN ('active','overdue')
    ORDER BY l.due_date ASC
  `);
  return rows;
}

/**
 * Mobile-money agent fees (makato), kept separate from loan collections.
 * `amount` on each repayment is what was credited to the loan; `agent_fee`
 * is the commission portion of the money the client sent.
 */
async function getCommissions() {
  const [[totals]] = await pool.query(`
    SELECT COUNT(*)                          AS count,
           COALESCE(SUM(agent_fee), 0)       AS total_fees,
           COALESCE(SUM(amount_sent), 0)     AS total_sent,
           COALESCE(SUM(amount), 0)          AS total_credited,
           COALESCE(SUM(CASE WHEN DATE_FORMAT(payment_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
                             THEN agent_fee ELSE 0 END), 0) AS month_fees
    FROM repayments
    WHERE payment_mode = 'mobile_money'
  `);
  const [byProvider] = await pool.query(`
    SELECT COALESCE(mobile_provider, 'other') AS provider,
           COUNT(*)                           AS count,
           COALESCE(SUM(agent_fee), 0)        AS total_fees
    FROM repayments
    WHERE payment_mode = 'mobile_money'
    GROUP BY provider
    ORDER BY total_fees DESC
  `);
  const [recent] = await pool.query(`
    SELECT r.id, r.receipt_number, r.agent_fee, r.amount_sent, r.amount,
           r.mobile_provider, r.payment_date, r.paid_at, r.loan_id,
           c.full_name AS customer_name
    FROM repayments r
    JOIN loans l     ON l.id = r.loan_id
    JOIN customers c ON c.id = l.customer_id
    WHERE r.payment_mode = 'mobile_money'
    ORDER BY COALESCE(r.paid_at, r.created_at) DESC
    LIMIT 6
  `);
  return {
    count:          Number(totals.count || 0),
    total_fees:     Number(totals.total_fees || 0),
    total_sent:     Number(totals.total_sent || 0),
    total_credited: Number(totals.total_credited || 0),
    month_fees:     Number(totals.month_fees || 0),
    by_provider:    byProvider.map(p => ({ provider: p.provider, count: Number(p.count), total_fees: Number(p.total_fees) })),
    recent,
  };
}

module.exports = { getSummary, getRecent, getDaily, getMonthly, getOverdue, getCommissions };
