const crypto = require('crypto');
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Kapita <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:5175';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verificationExpiry() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}

function buildVerifyUrl(token) {
  return `${APP_URL.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

function verifyEmailHtml({ firstName, verifyUrl }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#4338ca);width:48px;height:48px;border-radius:12px;text-align:center;line-height:48px;color:#fff;font-weight:700;font-size:20px;">K</div>
      <h1 style="margin:24px 0 8px;font-size:22px;color:#111827;">Verify your email${firstName ? `, ${firstName}` : ''}</h1>
      <p style="color:#4b5563;line-height:1.6;font-size:15px;margin:0 0 24px;">
        Thanks for joining Kapita. Tap the button below to confirm this is your email address. The link expires in 24 hours.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px;">Verify email</a>
      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.5;">
        If the button doesn't work, paste this URL into your browser:<br>
        <span style="color:#4f46e5;word-break:break-all;">${verifyUrl}</span>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
        Didn't sign up for Kapita? You can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0;">Kapita — Move money. Make moves.</p>
  </div>
</body></html>`;
}

async function sendVerificationEmail({ to, firstName, token }) {
  const verifyUrl = buildVerifyUrl(token);
  if (!resend) {
    console.log(`[email:dev] verification link for ${to}: ${verifyUrl}`);
    return { delivered: false, simulated: true, verifyUrl };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: 'Verify your Kapita email',
      html: verifyEmailHtml({ firstName, verifyUrl }),
    });
    if (error) {
      console.error('[email] resend error:', error);
      return { delivered: false, error: error.message || 'Send failed', verifyUrl };
    }
    return { delivered: true, verifyUrl };
  } catch (err) {
    console.error('[email] threw:', err);
    return { delivered: false, error: err.message, verifyUrl };
  }
}

module.exports = {
  generateToken,
  verificationExpiry,
  buildVerifyUrl,
  sendVerificationEmail,
};
