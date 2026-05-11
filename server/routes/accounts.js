const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { generateAccountNumber } = require('../utils/accountNumber');
const { isLocked, MIN_DAYS, MAX_DAYS } = require('../utils/savingsLock');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const accounts = db.prepare(
    'SELECT * FROM accounts WHERE user_id = ? AND is_active = 1 ORDER BY created_at'
  ).all(req.user.id);
  res.json({ accounts });
});

router.get('/lookup', [
  query('account_number').trim().matches(/^\d{10}$/).withMessage('Account number must be 10 digits'),
  handleValidation
], (req, res) => {
  const row = db.prepare(`
    SELECT a.account_number, a.account_type, u.first_name, u.last_name
    FROM accounts a
    JOIN users u ON a.user_id = u.id
    WHERE a.account_number = ? AND a.is_active = 1 AND u.is_active = 1
  `).get(req.query.account_number);

  if (!row) return res.json({ found: false });

  res.json({
    found: true,
    account_number: row.account_number,
    account_type: row.account_type,
    account_name: `${row.first_name} ${row.last_name}`,
    bank_name: 'Kapita'
  });
});

router.get('/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(req.params.id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json({ account });
});

router.post('/', [
  body('account_type').isIn(['checking', 'savings']).withMessage('Must be checking or savings'),
  handleValidation
], (req, res) => {
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM accounts WHERE user_id = ? AND is_active = 1'
  ).get(req.user.id).count;

  if (count >= 5) {
    return res.status(400).json({ error: 'Maximum of 5 accounts allowed' });
  }

  const accountNumber = generateAccountNumber(req.body.account_type);

  const result = db.prepare(
    'INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, 0.00)'
  ).run(req.user.id, accountNumber, req.body.account_type);

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'New Account', `Your new ${req.body.account_type} account (${accountNumber}) has been created.`, 'info');

  res.status(201).json({ account });
});

router.post('/:id/lock-savings', [
  param('id').isInt({ min: 1 }),
  body('days').isInt({ min: MIN_DAYS, max: MAX_DAYS })
    .withMessage(`Days must be between ${MIN_DAYS} and ${MAX_DAYS}`),
  handleValidation
], (req, res) => {
  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(req.params.id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.account_type !== 'savings') {
    return res.status(400).json({ error: 'Only savings accounts can be locked' });
  }
  if (isLocked(account)) {
    return res.status(400).json({ error: 'Savings account is already locked' });
  }

  const days = parseInt(req.body.days, 10);
  const matures = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'UPDATE accounts SET maturity_days = ?, matures_at = ? WHERE id = ?'
  ).run(days, matures, account.id);

  const refreshed = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);

  const maturityDate = new Date(matures).toLocaleDateString();
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(
    req.user.id,
    'Savings Mode Enabled',
    `Your savings account ${account.account_number} is locked for ${days} day${days === 1 ? '' : 's'}. Withdrawals resume on ${maturityDate}.`,
    'info'
  );

  res.json({ account: refreshed });
});

module.exports = router;
