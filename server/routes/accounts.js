const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { generateAccountNumber } = require('../utils/accountNumber');

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
    bank_name: 'SecureBank'
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

module.exports = router;
