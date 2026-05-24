const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db/database');
const { handleValidation } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { generateAccountNumber } = require('../utils/accountNumber');
const { countries } = require('../utils/currencies');
const {
  generateToken: makeVerifyToken,
  verificationExpiry,
  sendVerificationEmail,
  hashToken,
  passwordResetExpiry,
  sendPasswordResetEmail,
} = require('../utils/email');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const E2E_BYPASS_TOKEN = process.env.E2E_BYPASS_TOKEN;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  skip: (req) => Boolean(E2E_BYPASS_TOKEN) && req.get('x-e2e-bypass') === E2E_BYPASS_TOKEN,
});

// Per-account login limiter — complements the per-IP authLimiter so a shared
// NAT egress can't be locked out by a single attacker hammering one account,
// and a single targeted account is protected even if the attacker rotates IPs.
// In-memory; in cluster mode this is per-worker (a determined attacker hitting
// different workers gets WORKER_COUNT × ACCOUNT_MAX attempts before lockout).
// Move to Redis if exact global limits are required.
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_FAILS = 5;
const accountAttempts = new Map();

function recordFailedLogin(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = accountAttempts.get(key) || { count: 0, firstAt: now };
  if (now - entry.firstAt > ACCOUNT_WINDOW_MS) {
    entry.count = 1;
    entry.firstAt = now;
  } else {
    entry.count += 1;
  }
  accountAttempts.set(key, entry);
}

function clearFailedLogins(email) {
  accountAttempts.delete(email.toLowerCase());
}

function isAccountLocked(email) {
  const entry = accountAttempts.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() - entry.firstAt > ACCOUNT_WINDOW_MS) {
    accountAttempts.delete(email.toLowerCase());
    return false;
  }
  return entry.count >= ACCOUNT_MAX_FAILS;
}

const validCountryCodes = countries.map(c => c.code);

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('nationality').isIn(validCountryCodes).withMessage('Valid nationality is required'),
  body('date_of_birth').isDate().withMessage('Valid date of birth is required')
    .custom(value => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())))) {
        throw new Error('You must be at least 18 years old');
      }
      return true;
    }),
  body('address').trim().notEmpty().withMessage('Home address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('zip_code').trim().notEmpty().withMessage('Postal code is required'),
  body('terms_accepted').equals('true').withMessage('You must accept the terms and conditions'),
  body('profile_photo').optional({ checkFalsy: true })
    .custom((v) => {
      if (typeof v !== 'string') throw new Error('Invalid photo');
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(v)) throw new Error('Photo must be an image data URL');
      if (v.length > 1_500_000) throw new Error('Photo too large');
      return true;
    }),
  handleValidation
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

router.post('/register', authLimiter, registerValidation, async (req, res) => {
  const { email, password, first_name, last_name, nationality, date_of_birth, address, city, state, zip_code, profile_photo } = req.body;

  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const verifyToken = makeVerifyToken();
  const verifyExpires = verificationExpiry();

  const register = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, first_name, last_name, nationality, date_of_birth, address, city, state, zip_code, profile_photo, terms_accepted, verification_token, verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(email, passwordHash, first_name, last_name, nationality, date_of_birth, address, city, state || null, zip_code, profile_photo || null, 1, verifyToken, verifyExpires);

    const userId = result.lastInsertRowid;
    const accountNumber = generateAccountNumber('checking');

    db.prepare(
      'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)'
    ).run(userId, accountNumber, 'checking', 1000.00);

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(userId, 'Welcome!', 'Welcome to Kapita — move money, make moves. Your checking account has been created with a $1,000.00 bonus. Verify your email to unlock all features.', 'info');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return user;
  });

  const user = register();
  const token = generateToken(user);

  // Fire-and-log: don't block registration on email delivery.
  sendVerificationEmail({ to: user.email, firstName: user.first_name, token: verifyToken })
    .catch((err) => console.error('[register] verification email failed:', err));

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.get('/verify-email', (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Verification token is required' });

  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

  if (user.email_verified) {
    return res.json({ message: 'Email already verified', email: user.email, alreadyVerified: true });
  }

  if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired. Please request a new one.', expired: true });
  }

  db.prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires_at = NULL, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(user.id);

  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(user.id, 'Email Verified', 'Your email address has been confirmed. All account features are now unlocked.', 'security');

  res.json({ message: 'Email verified successfully', email: user.email });
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many verification emails sent. Please wait a few minutes.' },
  skip: (req) => Boolean(E2E_BYPASS_TOKEN) && req.get('x-e2e-bypass') === E2E_BYPASS_TOKEN,
});

router.post('/resend-verification', resendLimiter, authenticate, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.json({ message: 'Email already verified', alreadyVerified: true });

  const verifyToken = makeVerifyToken();
  const verifyExpires = verificationExpiry();

  db.prepare(
    'UPDATE users SET verification_token = ?, verification_expires_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(verifyToken, verifyExpires, user.id);

  const result = await sendVerificationEmail({ to: user.email, firstName: user.first_name, token: verifyToken });
  if (!result.delivered && !result.simulated) {
    return res.status(502).json({ error: 'Could not send verification email. Please try again later.' });
  }

  res.json({ message: 'Verification email sent. Check your inbox.', simulated: !!result.simulated });
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Please wait a few minutes.' },
  skip: (req) => Boolean(E2E_BYPASS_TOKEN) && req.get('x-e2e-bypass') === E2E_BYPASS_TOKEN,
});

const forgotValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidation,
];

const resetValidation = [
  body('token').isString().isLength({ min: 32 }).withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character'),
  handleValidation,
];

// Forgot password: always returns success to avoid leaking which emails exist.
router.post('/forgot-password', forgotLimiter, forgotValidation, async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.is_active) {
    return res.json(genericResponse);
  }

  const rawToken = makeVerifyToken();
  const tokenHash = hashToken(rawToken);
  const expires = passwordResetExpiry();

  db.prepare(
    `UPDATE users SET password_reset_token_hash = ?, password_reset_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(tokenHash, expires, user.id);

  const result = await sendPasswordResetEmail({ to: user.email, firstName: user.first_name, token: rawToken });

  // In dev / fallback mode, surface simulated:true so the UI can show "logged to console"
  res.json({ ...genericResponse, simulated: !!result.simulated });
});

router.post('/reset-password', authLimiter, resetValidation, (req, res) => {
  const { token, password } = req.body;
  const tokenHash = hashToken(token);

  const user = db.prepare('SELECT * FROM users WHERE password_reset_token_hash = ?').get(tokenHash);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }
  if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.', expired: true });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(
    `UPDATE users SET password_hash = ?, password_reset_token_hash = NULL, password_reset_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`
  ).run(passwordHash, user.id);

  clearFailedLogins(user.email);

  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

router.post('/login', authLimiter, loginValidation, (req, res) => {
  const { email, password } = req.body;
  const bypass = Boolean(E2E_BYPASS_TOKEN) && req.get('x-e2e-bypass') === E2E_BYPASS_TOKEN;

  if (!bypass && isAccountLocked(email)) {
    return res.status(429).json({ error: 'Too many failed attempts for this account. Please try again in a few minutes.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    if (!bypass) recordFailedLogin(email);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account has been deactivated' });
  }

  clearFailedLogins(email);
  const token = generateToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: sanitizeUser(user) });
});

module.exports = router;
