const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db/database');
const { handleValidation } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { generateAccountNumber } = require('../utils/accountNumber');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' }
});

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
  const { email, password, first_name, last_name } = req.body;

  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const register = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, first_name, last_name);

    const userId = result.lastInsertRowid;
    const accountNumber = generateAccountNumber('checking');

    db.prepare(
      'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)'
    ).run(userId, accountNumber, 'checking', 1000.00);

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(userId, 'Welcome!', 'Welcome to SecureBank! Your checking account has been created with a $1,000.00 bonus.', 'info');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return user;
  });

  const user = register();
  const token = generateToken(user);

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post('/login', authLimiter, loginValidation, (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account has been deactivated' });
  }

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
