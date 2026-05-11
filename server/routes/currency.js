const express = require('express');
const { query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

async function fetchRates(base) {
  const url = `https://open.er-api.com/v6/latest/${base}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);
  const json = await res.json();
  if (json.result !== 'success' || !json.rates) {
    throw new Error(json['error-type'] || 'Unsupported base currency');
  }
  return {
    base: json.base_code,
    rates: json.rates,
    updatedAt: new Date((json.time_last_update_unix || Date.now() / 1000) * 1000).toISOString(),
    fetchedAt: Date.now()
  };
}

async function getRatesCached(base) {
  const cached = cache.get(base);
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (fresh) return { ...cached, stale: false };

  try {
    const fetched = await fetchRates(base);
    cache.set(base, fetched);
    return { ...fetched, stale: false };
  } catch (err) {
    if (cached) return { ...cached, stale: true };
    throw err;
  }
}

const baseValidator = query('base')
  .optional()
  .isString().isLength({ min: 3, max: 3 }).isAlpha()
  .withMessage('base must be a 3-letter currency code');

router.get('/rates', [baseValidator, handleValidation], async (req, res) => {
  const base = (req.query.base || 'USD').toUpperCase();
  try {
    const data = await getRatesCached(base);
    res.json({
      base: data.base,
      updatedAt: data.updatedAt,
      stale: data.stale,
      rates: data.rates
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not fetch rates' });
  }
});

router.get('/convert', [
  query('from').isString().isLength({ min: 3, max: 3 }).isAlpha().withMessage('from must be a 3-letter currency code'),
  query('to').isString().isLength({ min: 3, max: 3 }).isAlpha().withMessage('to must be a 3-letter currency code'),
  query('amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
  handleValidation
], async (req, res) => {
  const from = req.query.from.toUpperCase();
  const to = req.query.to.toUpperCase();
  const amount = parseFloat(req.query.amount);

  try {
    const data = await getRatesCached(from);
    const rate = data.rates[to];
    if (typeof rate !== 'number') {
      return res.status(400).json({ error: `Unknown target currency: ${to}` });
    }
    const result = Math.round(amount * rate * 10000) / 10000;
    res.json({
      from,
      to,
      amount,
      rate,
      result,
      updatedAt: data.updatedAt,
      stale: data.stale
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not convert' });
  }
});

module.exports = router;
