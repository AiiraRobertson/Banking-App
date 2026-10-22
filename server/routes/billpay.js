const express = require('express');
const { body, param } = require('express-validator');
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
  res.status(503).json({
    error: 'Scheduled bill payments are unavailable until a verified bill-payment provider is configured.',
    code: 'BILL_PAYMENT_PROVIDER_UNAVAILABLE'
  });
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
  res.status(503).json({
    error: 'Bill payments are unavailable until a verified bill-payment provider is configured.',
    code: 'BILL_PAYMENT_PROVIDER_UNAVAILABLE'
  });
});

module.exports = router;
