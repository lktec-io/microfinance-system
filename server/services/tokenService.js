const crypto = require('crypto');

function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires  = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return { rawToken, hashed, expires };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { generateResetToken, hashToken };
