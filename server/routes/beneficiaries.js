const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', [
  query('q').optional().isString().trim(),
  query('type').optional().isIn(['internal', 'external', 'wire']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
], (req, res) => {
  const q = (req.query.q || '').trim();
  const type = req.query.type;
  const limit = parseInt(req.query.limit) || 50;

  let sql = 'SELECT * FROM beneficiaries WHERE user_id = ?';
  const params = [req.user.id];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (q) {
    sql += ' AND (LOWER(account_name) LIKE ? OR LOWER(account_number) LIKE ? OR LOWER(IFNULL(nickname, \'\')) LIKE ? OR LOWER(IFNULL(bank_name, \'\')) LIKE ?)';
    const pattern = `%${q.toLowerCase()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  sql += ' ORDER BY use_count DESC, last_used_at DESC, account_name ASC LIMIT ?';
  params.push(limit);

  const beneficiaries = db.prepare(sql).all(...params);
  res.json({ beneficiaries });
});

router.post('/', [
  body('account_name').trim().notEmpty().withMessage('Account name is required').isLength({ max: 100 }),
  body('account_number').trim().notEmpty().withMessage('Account number is required').isLength({ max: 50 }),
  body('nickname').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('bank_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('bank_country').optional({ checkFalsy: true }).trim().isLength({ max: 2 }),
  body('swift_code').optional({ checkFalsy: true }).trim().isLength({ max: 11 }),
  body('iban').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('routing_number').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('type').optional().isIn(['internal', 'external', 'wire']),
  body('currency').optional({ checkFalsy: true }).trim().isLength({ max: 3 }),
  handleValidation
], (req, res) => {
  const {
    nickname, account_name, account_number, bank_name, bank_country,
    swift_code, iban, routing_number, type, currency
  } = req.body;
  const finalType = type || 'internal';

  const existing = db.prepare(
    'SELECT id FROM beneficiaries WHERE user_id = ? AND account_number = ? AND type = ?'
  ).get(req.user.id, account_number, finalType);

  if (existing) {
    db.prepare(`
      UPDATE beneficiaries SET
        nickname = COALESCE(?, nickname),
        account_name = ?,
        bank_name = COALESCE(?, bank_name),
        bank_country = COALESCE(?, bank_country),
        swift_code = COALESCE(?, swift_code),
        iban = COALESCE(?, iban),
        routing_number = COALESCE(?, routing_number),
        currency = COALESCE(?, currency)
      WHERE id = ?
    `).run(
      nickname || null, account_name, bank_name || null, bank_country || null,
      swift_code || null, iban || null, routing_number || null, currency || null,
      existing.id
    );
    const updated = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(existing.id);
    return res.json({ message: 'Beneficiary updated', beneficiary: updated });
  }

  const result = db.prepare(`
    INSERT INTO beneficiaries (
      user_id, nickname, account_name, account_number, bank_name, bank_country,
      swift_code, iban, routing_number, type, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, nickname || null, account_name, account_number, bank_name || null,
    bank_country || null, swift_code || null, iban || null, routing_number || null,
    finalType, currency || null
  );

  const created = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Beneficiary saved', beneficiary: created });
});

router.post('/:id/touch', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const result = db.prepare(
    'UPDATE beneficiaries SET use_count = use_count + 1, last_used_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Beneficiary not found' });
  res.json({ message: 'Updated' });
});

router.delete('/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const result = db.prepare(
    'DELETE FROM beneficiaries WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Beneficiary not found' });
  res.json({ message: 'Beneficiary deleted' });
});

module.exports = router;
