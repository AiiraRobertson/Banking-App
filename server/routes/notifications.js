const express = require('express');
const { query } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('unread_only').optional().isBoolean().toBoolean(),
  query('type').optional().isIn(['transaction', 'alert', 'info', 'security']),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { unread_only, type } = req.query;

  let where = 'WHERE user_id = ?';
  const params = [req.user.id];

  if (unread_only) {
    where += ' AND is_read = 0';
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM notifications ${where}`).get(...params).count;

  const notifications = db.prepare(`
    SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

router.get('/unread-count', (req, res) => {
  const { count } = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count });
});

router.put('/:id/read', (req, res) => {
  const result = db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ message: 'Notification marked as read' });
});

router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
