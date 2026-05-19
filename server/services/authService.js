const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND is_active = 1', [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]
  );
  return rows[0] || null;
}

async function emailExists(email) {
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  return rows.length > 0;
}

async function createUser({ name, email, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const safeRole = role === 'admin' ? 'admin' : 'staff';
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, safeRole]
  );
  return { id: result.insertId, name, email, role: safeRole };
}

async function getAllUsers() {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function updateUserById(id, { name, email, role, is_active, password }) {
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET name=?, email=?, role=?, is_active=?, password=? WHERE id=?',
      [name, email, role, is_active, hash, id]
    );
  } else {
    await pool.query(
      'UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?',
      [name, email, role, is_active, id]
    );
  }
}

async function deleteUserById(id) {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = {
  findUserByEmail, findUserById, emailExists, createUser,
  getAllUsers, updateUserById, deleteUserById,
  signToken, verifyPassword,
};
