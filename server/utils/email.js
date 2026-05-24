const crypto = require('crypto');
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Kapita <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:5175';
const IS_PROD = process.env.NODE_ENV === 'production';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verificationExpiry() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}

function passwordResetExpiry() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return d.toISOString();
}

function buildVerifyUrl(token) {
  return `${APP_URL.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildResetUrl(token) {
  return `${APP_URL.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

function emailShell({ heading, body, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#4338ca);width:48px;height:48px;border-radius:12px;text-align:center;line-height:48px;color:#fff;font-weight:700;font-size:20px;">K</div>
      <h1 style="margin:24px 0 8px;font-size:22px;color:#111827;">${heading}</h1>
      <p style="color:#4b5563;line-height:1.6;font-size:15px;margin:0 0 24px;">${body}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">${ctaLabel}</a>
      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.5;">
        If the button doesn't work, paste this URL into your browser:<br>
        <span style="color:#4f46e5;word-break:break-all;">${ctaUrl}</span>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">${footerNote}</p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0;">Kapita — Move money. Make moves.</p>
  </div>
</body></html>`;
}

async function sendOrSimulate({ purpose, to, subject, html, link }) {
  if (!resend) {
    console.log(`[email:dev] ${purpose} link for ${to}: ${link}`);
    return { delivered: false, simulated: true, link };
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[email] resend error (${purpose}):`, error);
      if (!IS_PROD) {
        console.log(`[email:fallback] ${purpose} link for ${to}: ${link}`);
        return { delivered: false, simulated: true, link, providerError: error.message };
      }
      return { delivered: false, error: error.message || 'Send failed', link };
    }
    return { delivered: true, link };
  } catch (err) {
    console.error(`[email] threw (${purpose}):`, err);
    if (!IS_PROD) {
      console.log(`[email:fallback] ${purpose} link for ${to}: ${link}`);
      return { delivered: false, simulated: true, link, providerError: err.message };
    }
    return { delivered: false, error: err.message, link };
  }
}

async function sendVerificationEmail({ to, firstName, token }) {
  const verifyUrl = buildVerifyUrl(token);
  const html = emailShell({
    heading: `Verify your email${firstName ? `, ${firstName}` : ''}`,
    body: `Thanks for joining Kapita. Tap the button below to confirm this is your email address. The link expires in 24 hours.`,
    ctaLabel: 'Verify email',
    ctaUrl: verifyUrl,
    footerNote: `Didn't sign up for Kapita? You can safely ignore this email.`,
  });
  const result = await sendOrSimulate({ purpose: 'verification', to, subject: 'Verify your Kapita email', html, link: verifyUrl });
  return { ...result, verifyUrl: result.link };
}

async function sendPasswordResetEmail({ to, firstName, token }) {
  const resetUrl = buildResetUrl(token);
  const html = emailShell({
    heading: `Reset your password${firstName ? `, ${firstName}` : ''}`,
    body: `We received a request to reset your Kapita password. Tap the button below to choose a new one. The link expires in 30 minutes.`,
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    footerNote: `Didn't request a reset? You can safely ignore this email — your password won't change.`,
  });
  const result = await sendOrSimulate({ purpose: 'password reset', to, subject: 'Reset your Kapita password', html, link: resetUrl });
  return { ...result, resetUrl: result.link };
}

module.exports = {
  generateToken,
  hashToken,
  verificationExpiry,
  passwordResetExpiry,
  buildVerifyUrl,
  buildResetUrl,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
