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

function signToken(user, rememberMe = false) {
  const expiresIn = rememberMe ? '7d' : (process.env.JWT_EXPIRES_IN || '8h');
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

async function setResetToken(userId, hashedToken, expires) {
  await pool.query(
    'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
    [hashedToken, expires, userId]
  );
}

async function findUserByResetToken(hashedToken) {
  // Step 1: check if the token exists at all (no expiry filter) so we can
  // distinguish "wrong token" from "correct token but expired".
  const [dbg] = await pool.query(
    `SELECT id,
            reset_password_expires        AS expires,
            NOW()                         AS mysql_now,
            UTC_TIMESTAMP()               AS utc_now,
            reset_password_expires > NOW()            AS ok_now,
            reset_password_expires > UTC_TIMESTAMP()  AS ok_utc
     FROM users
     WHERE reset_password_token = ?`,
    [hashedToken]
  );

  if (dbg.length === 0) {
    console.error('[reset-token] ❌ No user found for this token hash — possible token mismatch or already cleared');
  } else {
    const r = dbg[0];
    console.log(
      `[reset-token] 🔍 Token found (userId=${r.id})` +
      ` | expires=${r.expires}` +
      ` | NOW()=${r.mysql_now}` +
      ` | UTC_TIMESTAMP()=${r.utc_now}` +
      ` | ok_with_NOW=${r.ok_now}` +
      ` | ok_with_UTC=${r.ok_utc}`
    );
    if (!r.ok_now && r.ok_utc) {
      console.error('[reset-token] ⚠️  TIMEZONE BUG: NOW() is not UTC — NOW() rejects valid token but UTC_TIMESTAMP() accepts it');
    }
    if (!r.ok_utc) {
      console.error('[reset-token] ⏰ Token is genuinely expired (past UTC_TIMESTAMP())');
    }
  }

  // Step 2: Use UTC_TIMESTAMP() so the comparison is always UTC vs UTC,
  // regardless of MySQL server timezone or session timezone setting.
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > UTC_TIMESTAMP()',
    [hashedToken]
  );
  return rows[0] || null;
}

async function clearResetToken(userId) {
  await pool.query(
    'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
    [userId]
  );
}

async function updatePassword(userId, newPassword) {
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
}

async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = {
  findUserByEmail, findUserById, emailExists, createUser,
  getAllUsers, updateUserById, deleteUserById,
  signToken, verifyPassword,
  setResetToken, findUserByResetToken, clearResetToken, updatePassword,
};
