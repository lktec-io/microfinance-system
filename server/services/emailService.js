'use strict';

/**
 * Centralised SMTP email service — Brevo (or any SMTP provider)
 *
 * Architecture:
 *   - One reusable singleton transporter (never recreated per-request)
 *   - Startup health check: verifySmtp() — never crashes the server
 *   - Retry logic: 2 automatic retries with backoff on transient failures
 *   - Structured logs — SMTP password and reset tokens are never logged
 *
 * Public API:
 *   verifySmtp()          → call once on server startup
 *   sendResetEmail()      → forgot-password flow
 *   (extend below for OTP, notifications, loan reminders, reports…)
 */

const nodemailer = require('nodemailer');

// ─── Environment validation ────────────────────────────────────────────────
const REQUIRED_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

function checkEnv() {
  const missing = REQUIRED_VARS.filter(k => !process.env[k]);
  if (missing.length) {
    throw Object.assign(
      new Error(`Email service: missing env var(s): ${missing.join(', ')}`),
      { code: 'EMAIL_ENV_MISSING' }
    );
  }
}

// ─── Singleton transporter ─────────────────────────────────────────────────
let _transporter = null;

function buildTransporter() {
  checkEnv();
  const port   = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465; // true = SSL (port 465); false = STARTTLS (port 587)

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,     // never logged
    },
  });
}

function getTransporter() {
  if (!_transporter) {
    _transporter = buildTransporter();
  }
  return _transporter;
}

// ─── Startup health check ──────────────────────────────────────────────────
/**
 * Verifies SMTP connectivity and authentication at server startup.
 * NEVER throws — Express starts regardless of email status.
 * If verification fails, the transporter is reset so the next request retries.
 */
async function verifySmtp() {
  console.log('\n[email] ─── SMTP Health Check ─────────────────────');
  try {
    checkEnv();
    await getTransporter().verify();
    console.log('[email] ✅ SMTP Connected');
    console.log(`[email]    Provider : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`[email]    User     : ${process.env.SMTP_USER}`);
    console.log('[email]    Status   : Ready to send emails');
  } catch (err) {
    _transporter = null; // Allow retry on next request
    console.error('[email] ✗  SMTP Connection Failed');
    console.error(`[email]    Reason : ${err.message}`);
    console.error(`[email]    Code   : ${err.code || 'n/a'}`);
    console.error('[email]    ⚠️  Forgot-password emails will fail until SMTP is fixed');
  }
  console.log('[email] ────────────────────────────────────────────\n');
}

// ─── Core send with retry ──────────────────────────────────────────────────
const RETRY_DELAYS_MS = [1000, 2000]; // 2 retries after the first attempt

async function sendMail({ to, subject, html }) {
  let lastErr;
  const totalAttempts = 1 + RETRY_DELAYS_MS.length; // 3

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const info = await getTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
      console.log(`[email] ✅ Sent | to=${to} | messageId=${info.messageId} | response="${info.response}"`);
      return info;
    } catch (err) {
      lastErr = err;
      console.error(`[email] ❌ Attempt ${attempt}/${totalAttempts} failed`);
      console.error(`[email]    to          : ${to}`);
      console.error(`[email]    error       : ${err.message}`);
      console.error(`[email]    code        : ${err.code        || 'n/a'}`);
      console.error(`[email]    responseCode: ${err.responseCode || 'n/a'}`);
      console.error(`[email]    command     : ${err.command      || 'n/a'}`);

      if (attempt < totalAttempts) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        console.log(`[email]    Retrying in ${delay}ms… (attempt ${attempt + 1}/${totalAttempts})`);
        await new Promise(r => setTimeout(r, delay));
        // Rebuild transporter so we get a fresh connection on the next attempt
        _transporter = null;
      }
    }
  }

  console.error(`[email] ❌ All ${totalAttempts} attempts exhausted for to=${to}`);
  throw lastErr;
}

// ─── Public senders ────────────────────────────────────────────────────────

/**
 * Sends a password-reset link email.
 * The caller (authController.forgotPassword) handles errors and HTTP responses.
 */
async function sendResetEmail(to, name, resetUrl) {
  console.log(`[email] Preparing password reset email | to=${to}`);
  const firstName = name ? name.split(' ')[0] : 'User';
  await sendMail({
    to,
    subject: 'Reset Your Password — Baraka Microcredit',
    html:    buildResetHtml(firstName, resetUrl),
  });
}

// ─── HTML Templates ────────────────────────────────────────────────────────

function buildResetHtml(firstName, resetUrl) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Reset Your Password — Baraka Microcredit</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* ── Resets ── */
    *, *::before, *::after { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img   { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body  { margin: 0 !important; padding: 0 !important; background-color: #F0F4F8; width: 100% !important; }

    /* ── Responsive ── */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .content-pad     { padding: 32px 24px !important; }
      .header-pad      { padding: 32px 24px 28px !important; }
      .footer-pad      { padding: 24px !important; }
      .cta-btn         { display: block !important; width: 100% !important; text-align: center !important; }
      .logo-text       { font-size: 22px !important; }
    }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      body, .outer-bg               { background-color: #0D1117 !important; }
      .card                         { background-color: #161B22 !important; }
      .body-text                    { color: #C9D1D9 !important; }
      .heading-text                 { color: #F0F6FC !important; }
      .muted-text                   { color: #8B949E !important; }
      .divider                      { border-top-color: #30363D !important; }
      .expiry-box                   { background-color: #0D1F3C !important; border-color: #1D4070 !important; }
      .expiry-text                  { color: #58A6FF !important; }
      .warning-box                  { background-color: #2D1F0A !important; border-color: #5E3C08 !important; }
      .warning-text                 { color: #E3B341 !important; }
      .fallback-box                 { background-color: #0D1117 !important; border-color: #30363D !important; }
      .fallback-text                { color: #8B949E !important; }
      .footer-card                  { background-color: #0D1117 !important; border-top-color: #21262D !important; }
      .footer-text                  { color: #6E7681 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F0F4F8;width:100%!important;">

  <!-- Outer wrapper -->
  <table role="presentation" class="outer-bg" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#F0F4F8;width:100%;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- ═══ Email Card ═══ -->
        <table role="presentation" class="email-container card" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 40px rgba(15,23,42,0.12);">

          <!-- ── Header ── -->
          <tr>
            <td class="header-pad"
                style="background:linear-gradient(150deg,#091E3A 0%,#0F2B52 50%,#0D3562 100%);
                       padding:40px 48px 32px;text-align:center;">

              <!-- Logo mark (SVG, works without external hosting) -->
              <div style="margin-bottom:14px;">
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none"
                     xmlns="http://www.w3.org/2000/svg"
                     style="display:block;margin:0 auto;">
                  <circle cx="26" cy="26" r="26" fill="rgba(22,163,74,0.18)"/>
                  <circle cx="26" cy="26" r="19" stroke="rgba(22,163,74,0.35)" stroke-width="1.5" fill="none"/>
                  <text x="26" y="31" font-size="18" font-weight="800" fill="#22C55E"
                        text-anchor="middle" font-family="Arial,sans-serif">B</text>
                </svg>
              </div>

              <div class="logo-text"
                   style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;
                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                          margin-bottom:6px;">
                Baraka Microcredit
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.14em;
                          text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:20px;">
                Secure Loan Management System
              </div>

              <!-- Badge -->
              <div style="display:inline-block;background:rgba(255,255,255,0.08);
                          border:1px solid rgba(255,255,255,0.15);border-radius:99px;
                          padding:7px 18px;">
                <span style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;
                             font-family:Arial,sans-serif;">
                  🔐&nbsp; Password Reset Request
                </span>
              </div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td class="content-pad" style="padding:40px 48px;background:#FFFFFF;">

              <p class="heading-text"
                 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0F172A;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                Hi ${firstName},
              </p>
              <p class="body-text"
                 style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.75;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                We received a request to reset the password for your Baraka Microcredit account.
                Click the button below to choose a new password.
              </p>

              <!-- Expiry notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:28px;">
                <tr>
                  <td class="expiry-box"
                      style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;
                             padding:14px 18px;">
                    <p class="expiry-text"
                       style="margin:0;font-size:13px;color:#1D4ED8;line-height:1.6;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      <strong>⏱ Time-sensitive:</strong>&nbsp;
                      This reset link expires in <strong>15 minutes</strong>.
                      After that you will need to request a new one.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA button — table-based for Outlook compatibility -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                     align="center" style="margin:0 auto 32px;">
                <tr>
                  <td align="center"
                      style="border-radius:10px;
                             background:linear-gradient(135deg,#16A34A 0%,#15803D 100%);
                             box-shadow:0 6px 20px rgba(22,163,74,0.38);">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                                 xmlns:w="urn:schemas-microsoft-com:office:word"
                                 href="${resetUrl}"
                                 style="height:52px;v-text-anchor:middle;width:240px;"
                                 arcsize="12%"
                                 strokecolor="#15803D"
                                 fillcolor="#16A34A">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">
                        Reset My Password
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a class="cta-btn" href="${resetUrl}" target="_blank"
                       style="display:inline-block;padding:16px 44px;font-size:15px;font-weight:700;
                              color:#FFFFFF!important;text-decoration:none!important;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                              letter-spacing:0.02em;border-radius:10px;line-height:1;
                              mso-hide:all;">
                      Reset My Password &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:28px;">
                <tr>
                  <td class="warning-box"
                      style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;
                             padding:16px 18px;">
                    <p class="warning-text"
                       style="margin:0;font-size:13px;color:#92400E;line-height:1.65;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      <strong>⚠️ Security Notice:</strong>&nbsp;
                      If you did <strong>not</strong> request this password reset, please ignore this email.
                      Your account password will remain unchanged and no action is required.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider + fallback URL -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="divider"
                      style="border-top:1px solid #E2E8F0;padding-top:24px;">
                    <p class="muted-text"
                       style="margin:0 0 10px;font-size:12px;color:#94A3B8;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="fallback-box"
                            style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;
                                   padding:12px 16px;">
                          <p class="fallback-text"
                             style="margin:0;font-size:11px;color:#64748B;word-break:break-all;
                                    font-family:'Courier New',Courier,monospace;line-height:1.5;">
                            ${resetUrl}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td class="footer-card footer-pad"
                style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:28px 48px;
                       text-align:center;">
              <p class="footer-text"
                 style="margin:0 0 6px;font-size:12px;color:#94A3B8;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                &copy; ${year} Baraka Microcredit &nbsp;&middot;&nbsp; All rights reserved
              </p>
              <p class="footer-text"
                 style="margin:0 0 6px;font-size:12px;color:#94A3B8;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                This is an automated message &mdash; please do not reply to this email.
              </p>
              <p class="footer-text"
                 style="margin:0;font-size:12px;color:#94A3B8;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                Need help? Contact your system administrator.
              </p>
            </td>
          </tr>

        </table>
        <!-- End email card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

module.exports = { verifySmtp, sendResetEmail };
