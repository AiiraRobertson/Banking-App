const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db/database');
const { handleValidation } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { generateAccountNumber } = require('../utils/accountNumber');
const { countries } = require('../utils/currencies');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' }
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
  body('zip_code').trim().notEmpty().withMessage('Postal code is required'),
  body('terms_accepted').equals('true').withMessage('You must accept the terms and conditions'),
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

router.post('/register', authLimiter, registerValidation, (req, res) => {
  const { email, password, first_name, last_name, nationality, date_of_birth, address, city, zip_code } = req.body;

  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const register = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, first_name, last_name, nationality, date_of_birth, address, city, zip_code, terms_accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(email, passwordHash, first_name, last_name, nationality, date_of_birth, address, city, zip_code, 1);

    const userId = result.lastInsertRowid;
    const accountNumber = generateAccountNumber('checking');

    db.prepare(
      'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)'
    ).run(userId, accountNumber, 'checking', 1000.00);

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(userId, 'Welcome!', 'Welcome to Kapita — move money, make moves. Your checking account has been created with a $1,000.00 bonus.', 'info');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return user;
  });

  const user = register();
  const token = generateToken(user);

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post('/login', authLimiter, loginValidation, (req, res) => {
  const { email, password } = req.body;

  if (isAccountLocked(email)) {
    return res.status(429).json({ error: 'Too many failed attempts for this account. Please try again in a few minutes.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailedLogin(email);
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
