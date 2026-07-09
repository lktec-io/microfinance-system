// Lazy-load nodemailer so a missing module never crashes the server at startup.
// If nodemailer is not installed, all other API routes continue working normally.
// Only the forgot-password endpoint is affected until `npm install` is run.

let _transporter = null;
let _initError   = null;

const REQUIRED_ENV = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];

function getTransporter() {
  if (_transporter) return _transporter;
  if (_initError)   throw _initError;

  try {
    // Validate env vars before attempting to create the transporter
    const missing = REQUIRED_ENV.filter(k => !process.env[k]);
    if (missing.length > 0) {
      throw Object.assign(
        new Error(`Email service: missing environment variable(s): ${missing.join(', ')}`),
        { code: 'EMAIL_ENV_MISSING' }
      );
    }

    const nodemailer = require('nodemailer');
    const port   = Number(process.env.EMAIL_PORT) || 587;
    const secure = port === 465; // SSL for 465, STARTTLS for 587

    _transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port,
      secure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log(
      `[email] Transporter ready — host=${process.env.EMAIL_HOST}` +
      ` port=${port} secure=${secure} user=${process.env.EMAIL_USER}`
    );
    return _transporter;
  } catch (err) {
    _initError = err;
    console.error('[email] ❌ Failed to initialise transporter:', err.message);
    throw err;
  }
}

async function sendResetEmail(to, name, resetUrl) {
  const transporter = getTransporter();
  const firstName   = name ? name.split(' ')[0] : 'User';

  // Step 1: Verify SMTP connection and authentication BEFORE sending.
  // This surfaces auth failures, bad credentials, or connectivity issues clearly.
  console.log(`[email] Verifying SMTP connection (host=${process.env.EMAIL_HOST} port=${process.env.EMAIL_PORT})...`);
  try {
    await transporter.verify();
    console.log('[email] ✅ SMTP connection verified');
  } catch (err) {
    console.error('[email] ❌ SMTP verify failed');
    console.error(`[email]   message     : ${err.message}`);
    console.error(`[email]   code        : ${err.code        || 'n/a'}`);
    console.error(`[email]   responseCode: ${err.responseCode || 'n/a'}`);
    console.error(`[email]   command     : ${err.command      || 'n/a'}`);
    if (err.stack) console.error(err.stack);
    // Reset cached transporter so the next request retries (transient failures can recover)
    _transporter = null;
    throw Object.assign(
      new Error(`SMTP verification failed: ${err.message}`),
      { code: err.code || 'SMTP_VERIFY_FAILED', responseCode: err.responseCode }
    );
  }

  // Step 2: Send the email
  console.log(`[email] Sending reset email to ${to}...`);
  try {
    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to,
      subject: 'Reset Your Password — Baraka Microcredit',
      html:    buildResetEmailHtml(firstName, resetUrl),
    });
    console.log(`[email] ✅ Email sent — messageId=${info.messageId} response="${info.response}"`);
  } catch (err) {
    console.error('[email] ❌ sendMail failed');
    console.error(`[email]   message     : ${err.message}`);
    console.error(`[email]   code        : ${err.code        || 'n/a'}`);
    console.error(`[email]   responseCode: ${err.responseCode || 'n/a'}`);
    console.error(`[email]   command     : ${err.command      || 'n/a'}`);
    if (err.stack) console.error(err.stack);
    throw err;
  }
}

function buildResetEmailHtml(firstName, resetUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
  <style>
    body { margin: 0; padding: 0; background: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #123458 0%, #0D2749 100%); padding: 36px 40px 28px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #16A34A; letter-spacing: -.5px; margin-bottom: 4px; }
    .header-sub  { font-size: 13px; color: rgba(255,255,255,.65); letter-spacing: .04em; text-transform: uppercase; }
    .body  { padding: 36px 40px; }
    .greeting { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 14px; }
    .text  { font-size: 15px; color: #4B5563; line-height: 1.65; margin-bottom: 24px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #16A34A, #15803D); color: #fff !important; text-decoration: none !important; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 24px 0; }
    .url-fallback { font-size: 12px; color: #9CA3AF; word-break: break-all; text-align: center; }
    .warning { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400E; margin-bottom: 20px; }
    .footer { background: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 40px; text-align: center; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Baraka Microcredit</div>
      <div class="header-sub">Secure Loan Management System</div>
    </div>
    <div class="body">
      <div class="greeting">Hi ${firstName},</div>
      <p class="text">
        We received a request to reset the password for your Baraka Microcredit account.
        Click the button below to choose a new password. This link is valid for <strong>15 minutes</strong>.
      </p>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">Reset My Password</a>
      </div>
      <div class="warning">
        ⚠️ If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      </div>
      <hr class="divider" />
      <p class="url-fallback">If the button doesn't work, copy and paste this link into your browser:<br />${resetUrl}</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Baraka Microcredit &nbsp;·&nbsp; This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;
}

module.exports = { sendResetEmail };
