const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = user;
  res.json({ user: safe });
});

router.put('/', [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zip_code').optional().trim(),
  body('email_alerts').optional().isBoolean().toBoolean(),
  body('sms_alerts').optional().isBoolean().toBoolean(),
  body('alert_phone').optional({ nullable: true }).trim(),
  body('alert_min_amount').optional().isFloat({ min: 0 }).toFloat(),
  body('profile_photo').optional({ nullable: true })
    .custom((v) => {
      if (v === null || v === '') return true;
      if (typeof v !== 'string') throw new Error('Invalid photo');
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(v)) throw new Error('Photo must be an image data URL');
      if (v.length > 1_500_000) throw new Error('Photo too large');
      return true;
    }),
  handleValidation
], (req, res) => {
  const { first_name, last_name, phone, address, city, state, zip_code, email_alerts, sms_alerts, alert_phone, alert_min_amount, profile_photo } = req.body;

  db.prepare(`
    UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      zip_code = COALESCE(?, zip_code),
      email_alerts = COALESCE(?, email_alerts),
      sms_alerts = COALESCE(?, sms_alerts),
      alert_phone = COALESCE(?, alert_phone),
      alert_min_amount = COALESCE(?, alert_min_amount),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    first_name, last_name, phone, address, city, state, zip_code,
    email_alerts === undefined ? null : (email_alerts ? 1 : 0),
    sms_alerts === undefined ? null : (sms_alerts ? 1 : 0),
    alert_phone === undefined ? null : alert_phone,
    alert_min_amount === undefined ? null : alert_min_amount,
    req.user.id
  );

  if (profile_photo !== undefined) {
    const newPhoto = (profile_photo === null || profile_photo === '') ? null : profile_photo;
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(newPhoto, req.user.id);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const { password_hash, ...safe } = user;

  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'Profile Updated', 'Your profile information has been updated.', 'security');

  res.json({ user: safe });
});

router.put('/password', [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character'),
  handleValidation
], (req, res) => {
  const { current_password, new_password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, req.user.id);

  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'Password Changed', 'Your password has been changed successfully.', 'security');

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
