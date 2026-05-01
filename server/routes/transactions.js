const express = require('express');
const { body, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const amountValidation = body('amount')
  .isFloat({ min: 0.01, max: 1000000 }).withMessage('Amount must be between $0.01 and $1,000,000');

const accountValidation = body('account_id')
  .isInt({ min: 1 }).withMessage('Valid account ID required');

function getUserAccount(accountId, userId) {
  return db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(accountId, userId);
}

function createNotification(userId, title, message, type = 'transaction') {
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(userId, title, message, type);
}

router.post('/deposit', [accountValidation, amountValidation, handleValidation], (req, res) => {
  const { account_id, amount, description } = req.body;
  const amt = Math.round(amount * 100) / 100;

  const account = getUserAccount(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const deposit = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amt, account_id);
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account_id).balance;

    const refId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
      VALUES (NULL, ?, 'deposit', ?, ?, ?, ?)
    `).run(account_id, amt, newBalance, description || 'Deposit', refId);

    createNotification(req.user.id, 'Deposit Received',
      `$${amt.toFixed(2)} deposited to account ${account.account_number}.`);

    return { referenceId: refId, newBalance };
  });

  const result = deposit();
  res.json({ message: 'Deposit successful', ...result });
});

router.post('/withdraw', [accountValidation, amountValidation, handleValidation], (req, res) => {
  const { account_id, amount, description } = req.body;
  const amt = Math.round(amount * 100) / 100;

  const account = getUserAccount(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const withdraw = db.transaction(() => {
    const update = db.prepare(
      'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?'
    ).run(amt, account_id, amt);
    if (update.changes === 0) {
      const err = new Error('Insufficient funds');
      err.status = 400;
      throw err;
    }
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account_id).balance;

    const refId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
      VALUES (?, NULL, 'withdrawal', ?, ?, ?, ?)
    `).run(account_id, amt, newBalance, description || 'Withdrawal', refId);

    createNotification(req.user.id, 'Withdrawal Processed',
      `$${amt.toFixed(2)} withdrawn from account ${account.account_number}.`);

    if (newBalance < 100) {
      createNotification(req.user.id, 'Low Balance Alert',
        `Your account ${account.account_number} balance is $${newBalance.toFixed(2)}.`, 'alert');
    }

    return { referenceId: refId, newBalance };
  });

  try {
    const result = withdraw();
    res.json({ message: 'Withdrawal successful', ...result });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    throw err;
  }
});

router.post('/transfer', [
  body('from_account_id').isInt({ min: 1 }).withMessage('Valid source account required'),
  body('to_account_id').optional().isInt({ min: 1 }),
  body('to_account_number').optional().isString().isLength({ min: 10, max: 10 }),
  amountValidation,
  handleValidation
], (req, res) => {
  const { from_account_id, to_account_id, to_account_number, amount, description } = req.body;
  const amt = Math.round(amount * 100) / 100;

  const fromAccount = getUserAccount(from_account_id, req.user.id);
  if (!fromAccount) return res.status(404).json({ error: 'Source account not found' });

  if (!to_account_id && !to_account_number) {
    return res.status(400).json({ error: 'Destination account is required' });
  }

  let toAccount;
  if (to_account_id) {
    toAccount = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
    ).get(to_account_id, req.user.id);
  } else {
    toAccount = db.prepare(
      'SELECT * FROM accounts WHERE account_number = ? AND is_active = 1'
    ).get(to_account_number);
  }

  if (!toAccount) return res.status(404).json({ error: 'Destination account not found' });
  if (fromAccount.id === toAccount.id) return res.status(400).json({ error: 'Cannot transfer to the same account' });

  const transfer = db.transaction(() => {
    const debit = db.prepare(
      'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?'
    ).run(amt, fromAccount.id, amt);
    if (debit.changes === 0) {
      const err = new Error('Insufficient funds');
      err.status = 400;
      throw err;
    }
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amt, toAccount.id);

    const newFromBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(fromAccount.id).balance;
    const refId = uuidv4();

    db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
      VALUES (?, ?, 'transfer', ?, ?, ?, ?)
    `).run(fromAccount.id, toAccount.id, amt, newFromBalance, description || 'Transfer', refId);

    createNotification(req.user.id, 'Transfer Sent',
      `$${amt.toFixed(2)} transferred from account ${fromAccount.account_number}.`);

    if (toAccount.user_id !== req.user.id) {
      createNotification(toAccount.user_id, 'Transfer Received',
        `$${amt.toFixed(2)} received in account ${toAccount.account_number}.`);
    }

    if (newFromBalance < 100) {
      createNotification(req.user.id, 'Low Balance Alert',
        `Your account ${fromAccount.account_number} balance is $${newFromBalance.toFixed(2)}.`, 'alert');
    }

    return { referenceId: refId, newBalance: newFromBalance };
  });

  try {
    const result = transfer();
    res.json({ message: 'Transfer successful', ...result });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    throw err;
  }
});

router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['deposit', 'withdrawal', 'transfer', 'bill_payment']),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601(),
  query('account_id').optional().isInt({ min: 1 }).toInt(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { type, from_date, to_date, account_id } = req.query;

  let where = `WHERE (t.from_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
    OR t.to_account_id IN (SELECT id FROM accounts WHERE user_id = ?))`;
  const params = [req.user.id, req.user.id];

  if (type) {
    where += ' AND t.transaction_type = ?';
    params.push(type);
  }
  if (from_date) {
    where += ' AND t.created_at >= ?';
    params.push(from_date);
  }
  if (to_date) {
    where += ' AND t.created_at <= ?';
    params.push(to_date);
  }
  if (account_id) {
    where += ' AND (t.from_account_id = ? OR t.to_account_id = ?)';
    params.push(account_id, account_id);
  }

  const countQuery = `SELECT COUNT(*) as total FROM transactions t ${where}`;
  const total = db.prepare(countQuery).get(...params).total;

  const dataQuery = `
    SELECT t.*,
      fa.account_number as from_account_number,
      ta.account_number as to_account_number
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const transactions = db.prepare(dataQuery).all(...params, limit, offset);

  res.json({
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

router.get('/:id', (req, res) => {
  const transaction = db.prepare(`
    SELECT t.*,
      fa.account_number as from_account_number,
      ta.account_number as to_account_number
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.id = ?
    AND (t.from_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
      OR t.to_account_id IN (SELECT id FROM accounts WHERE user_id = ?))
  `).get(req.params.id, req.user.id, req.user.id);

  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ transaction });
});

module.exports = router;
