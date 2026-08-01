const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

router.use(authenticate);

/* ── GET /api/expenses — list with optional filters ── */
router.get('/', asyncHandler(async (req, res) => {
  const { search, category, date_from, date_to } = req.query;
  let sql = `
    SELECT e.*, u.name AS created_by_name
    FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (e.name LIKE ? OR e.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND e.category = ?';
    params.push(category);
  }
  if (date_from) {
    sql += ' AND e.expense_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND e.expense_date <= ?';
    params.push(date_to);
  }
  sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}));

/* ── GET /api/expenses/summary — totals for dashboard & reports ── */
router.get('/summary', asyncHandler(async (req, res) => {
  const [[totals]] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM expenses'
  );
  const [monthly] = await pool.query(`
    SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month,
           SUM(amount)  AS total,
           COUNT(*)     AS count
    FROM expenses
    GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 12
  `);
  const [recent] = await pool.query(`
    SELECT e.*, u.name AS created_by_name
    FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT 5
  `);
  res.json({ total: Number(totals.total), count: Number(totals.count), monthly, recent });
}));

/* ── GET /api/expenses/:id ── */
router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.*, u.name AS created_by_name
     FROM expenses e LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = ?`,
    [req.params.id]
  );
  if (!rows[0]) return fail(res, 'Expense not found', 404);
  res.json(rows[0]);
}));

/* ── POST /api/expenses ── */
router.post('/', asyncHandler(async (req, res) => {
  const { name, category, amount, expense_date, description } = req.body;
  if (!name || !category || !amount || !expense_date) {
    return fail(res, 'Name, category, amount and date are required');
  }
  const [result] = await pool.query(
    'INSERT INTO expenses (name, category, amount, expense_date, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [name.trim(), category, parseFloat(amount), expense_date, description || null, req.user.id]
  );
  const [newRow] = await pool.query(
    `SELECT e.*, u.name AS created_by_name
     FROM expenses e LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = ?`,
    [result.insertId]
  );
  res.status(201).json(newRow[0]);
}));

/* ── PUT /api/expenses/:id ── */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, category, amount, expense_date, description } = req.body;
  if (!name || !category || !amount || !expense_date) {
    return fail(res, 'Name, category, amount and date are required');
  }
  const [check] = await pool.query('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
  if (!check[0]) return fail(res, 'Expense not found', 404);
  await pool.query(
    'UPDATE expenses SET name=?, category=?, amount=?, expense_date=?, description=? WHERE id=?',
    [name.trim(), category, parseFloat(amount), expense_date, description || null, req.params.id]
  );
  const [updated] = await pool.query(
    `SELECT e.*, u.name AS created_by_name
     FROM expenses e LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = ?`,
    [req.params.id]
  );
  res.json(updated[0]);
}));

/* ── DELETE /api/expenses/:id ── */
router.delete('/:id', asyncHandler(async (req, res) => {
  const [check] = await pool.query('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
  if (!check[0]) return fail(res, 'Expense not found', 404);
  await pool.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Expense deleted' });
}));

module.exports = router;
