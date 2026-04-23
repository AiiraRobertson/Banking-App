const express = require('express');
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/payees', (req, res) => {
  const payees = db.prepare(
    'SELECT * FROM bill_payees WHERE user_id = ? AND is_active = 1 ORDER BY payee_name'
  ).all(req.user.id);
  res.json({ payees });
});

router.post('/payees', [
  body('payee_name').trim().notEmpty().withMessage('Payee name is required'),
  body('payee_account').trim().notEmpty().withMessage('Payee account is required'),
  body('category').isIn(['utilities', 'telecom', 'insurance', 'credit_card', 'rent', 'other']),
  body('nickname').optional().trim(),
  handleValidation
], (req, res) => {
  const { payee_name, payee_account, category, nickname } = req.body;
  const result = db.prepare(
    'INSERT INTO bill_payees (user_id, payee_name, payee_account, category, nickname) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, payee_name, payee_account, category, nickname || null);

  const payee = db.prepare('SELECT * FROM bill_payees WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ payee });
});

router.put('/payees/:id', [
  param('id').isInt({ min: 1 }),
  body('payee_name').optional().trim().notEmpty(),
  body('payee_account').optional().trim().notEmpty(),
  body('category').optional().isIn(['utilities', 'telecom', 'insurance', 'credit_card', 'rent', 'other']),
  body('nickname').optional().trim(),
  handleValidation
], (req, res) => {
  const payee = db.prepare(
    'SELECT * FROM bill_payees WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(req.params.id, req.user.id);

  if (!payee) return res.status(404).json({ error: 'Payee not found' });

  const { payee_name, payee_account, category, nickname } = req.body;
  db.prepare(`
    UPDATE bill_payees SET
      payee_name = COALESCE(?, payee_name),
      payee_account = COALESCE(?, payee_account),
      category = COALESCE(?, category),
      nickname = COALESCE(?, nickname)
    WHERE id = ?
  `).run(payee_name, payee_account, category, nickname, req.params.id);

  const updated = db.prepare('SELECT * FROM bill_payees WHERE id = ?').get(req.params.id);
  res.json({ payee: updated });
});

router.delete('/payees/:id', (req, res) => {
  const result = db.prepare(
    'UPDATE bill_payees SET is_active = 0 WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Payee not found' });
  res.json({ message: 'Payee deleted' });
});

router.get('/scheduled', (req, res) => {
  const payments = db.prepare(`
    SELECT sp.*, bp.payee_name, bp.category, a.account_number
    FROM scheduled_payments sp
    JOIN bill_payees bp ON sp.payee_id = bp.id
    JOIN accounts a ON sp.from_account_id = a.id
    WHERE sp.user_id = ? AND sp.status IN ('active', 'paused')
    ORDER BY sp.next_payment_date
  `).all(req.user.id);
  res.json({ payments });
});

router.post('/scheduled', [
  body('payee_id').isInt({ min: 1 }),
  body('from_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01, max: 1000000 }),
  body('frequency').isIn(['once', 'weekly', 'biweekly', 'monthly']),
  body('next_payment_date').isISO8601(),
  body('end_date').optional().isISO8601(),
  handleValidation
], (req, res) => {
  const { payee_id, from_account_id, amount, frequency, next_payment_date, end_date } = req.body;

  const payee = db.prepare('SELECT * FROM bill_payees WHERE id = ? AND user_id = ?').get(payee_id, req.user.id);
  if (!payee) return res.status(404).json({ error: 'Payee not found' });

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1').get(from_account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const result = db.prepare(`
    INSERT INTO scheduled_payments (user_id, from_account_id, payee_id, amount, frequency, next_payment_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, from_account_id, payee_id, amount, frequency, next_payment_date, end_date || null);

  const payment = db.prepare('SELECT * FROM scheduled_payments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ payment });
});

router.put('/scheduled/:id', [
  param('id').isInt({ min: 1 }),
  body('status').optional().isIn(['active', 'paused', 'cancelled']),
  body('amount').optional().isFloat({ min: 0.01, max: 1000000 }),
  handleValidation
], (req, res) => {
  const payment = db.prepare(
    'SELECT * FROM scheduled_payments WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!payment) return res.status(404).json({ error: 'Scheduled payment not found' });

  const { status, amount } = req.body;
  if (status) db.prepare('UPDATE scheduled_payments SET status = ? WHERE id = ?').run(status, req.params.id);
  if (amount) db.prepare('UPDATE scheduled_payments SET amount = ? WHERE id = ?').run(amount, req.params.id);

  const updated = db.prepare('SELECT * FROM scheduled_payments WHERE id = ?').get(req.params.id);
  res.json({ payment: updated });
});

router.delete('/scheduled/:id', (req, res) => {
  const result = db.prepare(
    'UPDATE scheduled_payments SET status = ? WHERE id = ? AND user_id = ?'
  ).run('cancelled', req.params.id, req.user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Scheduled payment not found' });
  res.json({ message: 'Scheduled payment cancelled' });
});

router.post('/pay-now', [
  body('payee_id').isInt({ min: 1 }),
  body('from_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01, max: 1000000 }),
  handleValidation
], (req, res) => {
  const { payee_id, from_account_id, amount } = req.body;
  const amt = Math.round(amount * 100) / 100;

  const payee = db.prepare('SELECT * FROM bill_payees WHERE id = ? AND user_id = ?').get(payee_id, req.user.id);
  if (!payee) return res.status(404).json({ error: 'Payee not found' });

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1').get(from_account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.balance < amt) return res.status(400).json({ error: 'Insufficient funds' });

  const pay = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amt, from_account_id);
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(from_account_id).balance;

    const refId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
      VALUES (?, NULL, 'bill_payment', ?, ?, ?, ?)
    `).run(from_account_id, amt, newBalance, `Bill payment to ${payee.payee_name}`, refId);

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, 'Bill Payment Processed',
      `$${amt.toFixed(2)} paid to ${payee.payee_name} from account ${account.account_number}.`, 'transaction');

    return { referenceId: refId, newBalance };
  });

  const result = pay();
  res.json({ message: 'Payment successful', ...result });
});

module.exports = router;
