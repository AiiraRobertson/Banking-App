const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions, please try again later' }
});

router.post('/contact', submitLimiter, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 5, max: 5000 }).withMessage('Message must be 5-5000 chars'),
  handleValidation
], (req, res) => {
  const { name, email, subject, message } = req.body;
  db.prepare(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
  ).run(name, email, subject, message);
  res.status(201).json({ message: 'Thanks for reaching out. Our team will respond within 1-2 business days.' });
});

router.post('/complaint', submitLimiter, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('category').isIn(['account', 'transaction', 'fees', 'service', 'security', 'other']),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 chars'),
  handleValidation
], (req, res) => {
  const { name, email, category, description } = req.body;
  const result = db.prepare(
    'INSERT INTO complaints (name, email, category, description) VALUES (?, ?, ?, ?)'
  ).run(name, email, category, description);
  res.status(201).json({
    message: 'Complaint registered. A case officer will contact you shortly.',
    case_id: `CMP-${String(result.lastInsertRowid).padStart(6, '0')}`
  });
});

router.post('/feedback', submitLimiter, [
  body('name').optional().trim().isLength({ max: 100 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('message').trim().isLength({ min: 5, max: 2000 }),
  handleValidation
], (req, res) => {
  const { name = null, email = null, rating, message } = req.body;
  db.prepare(
    'INSERT INTO feedback (name, email, rating, message) VALUES (?, ?, ?, ?)'
  ).run(name, email, rating, message);
  res.status(201).json({ message: 'Thank you for your feedback!' });
});

router.post('/reviews', submitLimiter, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('location').optional().trim().isLength({ max: 100 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('body').trim().isLength({ min: 10, max: 3000 }),
  handleValidation
], (req, res) => {
  const { name, location = null, rating, title, body: reviewBody } = req.body;
  db.prepare(
    'INSERT INTO reviews (name, location, rating, title, body) VALUES (?, ?, ?, ?, ?)'
  ).run(name, location, rating, title, reviewBody);
  res.status(201).json({ message: 'Review posted. Thanks for sharing!' });
});

router.get('/reviews', (req, res) => {
  const reviews = db.prepare(
    'SELECT id, name, location, rating, title, body, created_at FROM reviews WHERE is_published = 1 ORDER BY created_at DESC LIMIT 50'
  ).all();
  const stats = db.prepare(
    'SELECT COUNT(*) as count, AVG(rating) as average FROM reviews WHERE is_published = 1'
  ).get();
  res.json({
    reviews,
    stats: {
      count: stats.count,
      average: stats.count > 0 ? Math.round(stats.average * 10) / 10 : 0
    }
  });
});

module.exports = router;
