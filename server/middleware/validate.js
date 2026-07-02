// Lightweight input sanitizer — strips HTML tags and trims strings
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj) {
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      clean[key] = val.replace(/<[^>]*>/g, '').trim();
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// Rate-limit map (simple in-memory, per IP)
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 20;

function rateLimitLogin(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, start: now };

  if (now - rec.start > WINDOW_MS) {
    rec.count = 0;
    rec.start = now;
  }

  rec.count++;
  attempts.set(ip, rec);

  if (rec.count > MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many login attempts. Try again later.' });
  }
  next();
}

// Rate-limit for forgot-password (5 attempts per 15 min per IP)
const forgotAttempts = new Map();
const FORGOT_MAX = 5;

function rateLimitForgotPassword(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const rec = forgotAttempts.get(ip) || { count: 0, start: now };

  if (now - rec.start > WINDOW_MS) {
    rec.count = 0;
    rec.start = now;
  }

  rec.count++;
  forgotAttempts.set(ip, rec);

  if (rec.count > FORGOT_MAX) {
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }
  next();
}

// Validate required fields helper
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || String(val).trim() === '';
    });
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

module.exports = { sanitizeBody, rateLimitLogin, rateLimitForgotPassword, requireFields };
