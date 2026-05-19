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
      SUM(status='active')  AS active,
      SUM(status='pending') AS pending,
      SUM(status='paid')    AS paid,
      SUM(status='overdue') AS overdue
    FROM loans
  `);
  return {
    customers:     customers.total,
    total_loans:   loans.total,
    loans_amount:  loans.total_amount,
    repayments:    repayments.total,
    collected:     repayments.total_amount,
    outstanding:   outstanding.total,
    active_loans:  activeLoans.total,
    overdue_loans: overdueLoans.total,
    loan_status:   byStatus,
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

module.exports = { getSummary, getRecent, getDaily, getMonthly, getOverdue };
