/**
 * EmoHarmony — Email Service (nodemailer)
 * Handles transactional emails: password reset, welcome, verification.
 *
 * Set these in backend/.env for production:
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your@gmail.com
 *   EMAIL_PASS=your_app_password        ← Gmail → 2FA → App Passwords
 *   EMAIL_FROM=EmoHarmony <your@gmail.com>
 *   FRONTEND_URL=http://localhost:3000
 */

const nodemailer = require("nodemailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Transport ─────────────────────────────────────────────────────────────────

function createTransporter() {
  // Production: real SMTP credentials from .env
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp.gmail.com",
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Development: Ethereal (fake inbox — check console for preview URL)
  console.log("📧 EMAIL_USER not set — using Ethereal test account");
  return null;  // will create async in sendEmail
}

async function getTransporter() {
  const t = createTransporter();
  if (t) return t;

  // Ethereal auto-account for dev
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host:   "smtp.ethereal.email",
    port:   587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

// ── Email Templates ───────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #030f0a;
  color: #e2e8f0;
  padding: 32px;
  max-width: 560px;
  margin: 0 auto;
  border-radius: 16px;
  border: 1px solid rgba(52,211,153,0.2);
`;

const LOGO_HTML = `
  <div style="text-align:center;margin-bottom:28px;">
    <h1 style="font-size:28px;font-weight:900;margin:0;">
      <span style="color:#fff;">Emo</span><span style="color:#34d399;">Harmony</span>
    </h1>
    <p style="color:#5a8a72;font-size:12px;margin:4px 0 0;">EEG Emotion Recognition Platform</p>
  </div>
`;

function passwordResetHTML(name, resetUrl) {
  return `
  <div style="${BASE_STYLE}">
    ${LOGO_HTML}
    <h2 style="color:#a7f3d0;font-size:18px;margin:0 0 12px;">Reset your password</h2>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${name}</strong>,<br/><br/>
      We received a request to reset your EmoHarmony password.
      Click the button below to create a new one. This link expires in <strong style="color:#34d399;">1 hour</strong>.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="
        background:linear-gradient(135deg,#10b981,#059669);
        color:#fff; font-weight:700; font-size:15px;
        padding:14px 36px; border-radius:12px;
        text-decoration:none; display:inline-block;
        box-shadow:0 4px 20px rgba(16,185,129,0.4);
      ">Reset Password</a>
    </div>
    <p style="color:#64748b;font-size:12px;line-height:1.6;">
      If you didn't request this, you can safely ignore this email — your password won't change.<br/><br/>
      Or copy this link: <a href="${resetUrl}" style="color:#34d399;word-break:break-all;">${resetUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid rgba(52,211,153,0.15);margin:24px 0;"/>
    <p style="color:#475569;font-size:11px;text-align:center;">
      EmoHarmony — EEG Emotion Recognition Research Platform<br/>
      This is an automated message, please do not reply.
    </p>
  </div>`;
}

function welcomeHTML(name) {
  return `
  <div style="${BASE_STYLE}">
    ${LOGO_HTML}
    <h2 style="color:#a7f3d0;font-size:18px;margin:0 0 12px;">Welcome to EmoHarmony! 🎉</h2>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#e2e8f0;">${name}</strong>,<br/><br/>
      Your account is ready. You can now upload EEG files and discover your emotional brain patterns
      using state-of-the-art ML models.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${FRONTEND_URL}/upload" style="
        background:linear-gradient(135deg,#10b981,#059669);
        color:#fff; font-weight:700; font-size:15px;
        padding:14px 36px; border-radius:12px;
        text-decoration:none; display:inline-block;
      ">Upload Your First EEG</a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(52,211,153,0.15);margin:24px 0;"/>
    <p style="color:#475569;font-size:11px;text-align:center;">
      EmoHarmony — EEG Emotion Recognition Research Platform
    </p>
  </div>`;
}

// ── Send helpers ──────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const fromAddr = process.env.EMAIL_FROM || "EmoHarmony <noreply@emoharmony.app>";
    const info = await transporter.sendMail({ from: fromAddr, to, subject, html });

    // In dev, log Ethereal preview URL
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`\n📧 Email preview (Ethereal): ${preview}\n`);
    }
    return info;
  } catch (err) {
    console.error("Email send failed:", err.message);
    throw err;
  }
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
  return sendEmail({
    to:      user.email,
    subject: "EmoHarmony — Reset your password",
    html:    passwordResetHTML(user.name, resetUrl),
  });
}

async function sendWelcomeEmail(user) {
  return sendEmail({
    to:      user.email,
    subject: "Welcome to EmoHarmony 🎉",
    html:    welcomeHTML(user.name),
  });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
