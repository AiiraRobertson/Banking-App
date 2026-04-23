const express = require('express');
const { query, param } = require('express-validator');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
      (SELECT COUNT(*) FROM users WHERE created_at >= date('now', '-30 days')) as new_users_30d,
      (SELECT COUNT(*) FROM accounts) as total_accounts,
      (SELECT COALESCE(SUM(balance), 0) FROM accounts) as total_deposits,
      (SELECT COUNT(*) FROM transactions WHERE created_at >= datetime('now', '-24 hours')) as transactions_24h,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= datetime('now', '-24 hours')) as volume_24h,
      (SELECT COUNT(*) FROM transactions) as total_transactions
  `).get();

  res.json({ stats });
});

router.get('/users', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search;

  let where = '';
  const params = [];

  if (search) {
    where = 'WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;

  const users = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM accounts WHERE user_id = u.id AND is_active = 1) as account_count,
      (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE user_id = u.id AND is_active = 1) as total_balance
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

router.get('/users/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const user = db.prepare(`
    SELECT id, email, first_name, last_name, phone, address, city, state, zip_code, role, is_active, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(req.params.id);
  const recentTransactions = db.prepare(`
    SELECT t.*, fa.account_number as from_account_number, ta.account_number as to_account_number
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.from_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
      OR t.to_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
    ORDER BY t.created_at DESC LIMIT 10
  `).all(req.params.id, req.params.id);

  res.json({ user, accounts, recentTransactions });
});

router.put('/users/:id/status', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own status' });

  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStatus, req.params.id);

  res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
});

router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['deposit', 'withdrawal', 'transfer', 'bill_payment']),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { type } = req.query;

  let where = '';
  const params = [];

  if (type) {
    where = 'WHERE t.transaction_type = ?';
    params.push(type);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${where}`).get(...params).count;

  const transactions = db.prepare(`
    SELECT t.*,
      fa.account_number as from_account_number,
      ta.account_number as to_account_number,
      fu.first_name || ' ' || fu.last_name as from_user_name,
      tu.first_name || ' ' || tu.last_name as to_user_name
    FROM transactions t
    LEFT JOIN accounts fa ON t.from_account_id = fa.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN users fu ON fa.user_id = fu.id
    LEFT JOIN users tu ON ta.user_id = tu.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

router.get('/accounts', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;

  const accounts = db.prepare(`
    SELECT a.*, u.first_name || ' ' || u.last_name as owner_name, u.email as owner_email
    FROM accounts a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    accounts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

module.exports = router;
