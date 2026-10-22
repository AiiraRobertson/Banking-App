const express = require('express');
const { body, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { countries, getCountry } = require('../utils/currencies');
const { getBanksForCountry } = require('../utils/banks');
const { sendTransactionAlert } = require('../utils/alerts');
const { applyLockOnDeposit } = require('../utils/savingsLock');

const router = express.Router();
router.use(authenticate);

const ALLOWED_COUNTRIES = ['NG', 'GH'];
const supportedCountries = countries.filter(country => ALLOWED_COUNTRIES.includes(country.code));

function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

router.get('/countries', (req, res) => {
  res.json({
    countries: { africa: supportedCountries },
    restrictions: {
      outbound: 'External bank wires are unavailable. USD transfers are available to eligible Kapita users.',
      inboundCurrency: 'USD',
      countries: ALLOWED_COUNTRIES,
      simulationEnabled: process.env.NODE_ENV !== 'production'
    }
  });
});

router.get('/rates', (req, res) => {
  res.json({ rates: { USD: 1 }, baseCurrency: 'USD', source: 'USD-only incoming wires' });
});

router.get('/banks', [
  query('country_code').isString().isLength({ min: 2, max: 2 }),
  handleValidation
], (req, res) => {
  const code = String(req.query.country_code).toUpperCase();
  const country = getCountry(code);
  if (!country || !ALLOWED_COUNTRIES.includes(code)) {
    return res.status(400).json({ error: 'Wire services are currently limited to Nigeria and Ghana.' });
  }
  res.json({ country: country.name, banks: getBanksForCountry(code) });
});

router.get('/lookup-account', [
  query('account_number').trim().notEmpty(),
  handleValidation
], (req, res) => {
  const account = db.prepare(`
    SELECT a.account_number, a.account_type, a.currency, u.first_name, u.last_name
    FROM accounts a JOIN users u ON a.user_id = u.id
    WHERE a.account_number = ? AND a.is_active = 1 AND u.is_active = 1
  `).get(req.query.account_number);
  if (!account) return res.json({ found: false, bank_name: 'External bank wires are unavailable' });

  return res.json({
    found: true,
    bank_name: 'Kapita',
    account_type: account.account_type,
    currency: account.currency,
    holder_hint: `${account.first_name[0]}*** ${account.last_name[0]}***`
  });
});

router.post('/quote', (req, res) => {
  res.status(503).json({
    error: 'External bank wire quotes are unavailable. Use a same-currency transfer to an eligible Kapita user.'
  });
});

router.post('/send', (req, res) => {
  res.status(503).json({
    error: 'External bank wires are not configured. USD transfers are available to eligible Kapita users through Transfer.'
  });
});

router.post('/receive', [
  body('to_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01, max: 1000000 }),
  body('country_code').isString().isIn(ALLOWED_COUNTRIES),
  body('sender_name').trim().notEmpty().withMessage('Sender name is required'),
  body('sender_bank').trim().notEmpty().withMessage('Sender bank is required'),
  body('sender_account').optional().trim(),
  body('reference_note').optional().trim(),
  handleValidation
], (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Incoming wire simulation is development-only; real wires require verified settlement integration.' });
  }

  const {
    to_account_id: accountId,
    amount,
    country_code: countryCode,
    sender_name: senderName,
    sender_bank: senderBank,
    sender_account: senderAccount,
    reference_note: referenceNote
  } = req.body;
  const country = getCountry(countryCode);
  if (!country || !ALLOWED_COUNTRIES.includes(countryCode)) {
    return res.status(400).json({ error: 'Incoming wires are limited to Nigeria and Ghana.' });
  }

  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(accountId, req.user.id);
  if (!account) return res.status(404).json({ error: 'Receiving account not found.' });
  if (account.currency !== 'USD') {
    return res.status(400).json({ error: 'Incoming wires can only be credited to a USD account.' });
  }

  const usdAmount = Math.round(Number(amount) * 100) / 100;
  const receiveWire = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(usdAmount, account.id);
    applyLockOnDeposit(account.id);
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account.id).balance;
    const referenceId = uuidv4();
    const description = referenceNote || `Development simulated USD wire from ${senderName} (${country.name})`;
    const txResult = db.prepare(`
      INSERT INTO transactions (
        from_account_id, to_account_id, transaction_type, amount, balance_after,
        description, reference_id, status, currency
      ) VALUES (NULL, ?, 'wire_transfer', ?, ?, ?, ?, 'completed', 'USD')
    `).run(account.id, usdAmount, newBalance, description, referenceId);

    db.prepare(`
      INSERT INTO incoming_wire_transfers (
        transaction_id, recipient_user_id, recipient_account_id,
        sender_name, sender_bank, sender_account, sender_country, sender_region,
        source_currency, original_amount, exchange_rate, credited_amount,
        fee_amount, net_credited, reference_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'africa', 'USD', ?, 1, ?, 0, ?, ?)
    `).run(
      txResult.lastInsertRowid, req.user.id, account.id,
      senderName, senderBank, senderAccount || null, countryCode,
      usdAmount, usdAmount, usdAmount, referenceNote || null
    );

    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)')
      .run(req.user.id, 'Simulated USD Wire Received',
        `Development simulation: ${formatUsd(usdAmount)} from ${senderName} (${senderBank}) credited to ${account.account_number}. This is not verified external settlement.`,
        'transaction');
    return { referenceId, newBalance, amount: usdAmount };
  });

  const result = receiveWire();
  sendTransactionAlert({
    userId: req.user.id,
    direction: 'credit',
    amount: result.amount,
    accountNumber: account.account_number,
    balanceAfter: result.newBalance,
    counterparty: `Development-simulated wire from ${senderName} (${country.name})`,
    referenceId: result.referenceId,
    currency: 'USD'
  });
  res.json({
    message: 'Development wire simulation completed; this is not verified external settlement.',
    ...result,
    currency: 'USD',
    country: country.name,
    simulated: true
  });
});

router.get('/incoming', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const offset = (page - 1) * limit;
  const total = db.prepare(
    'SELECT COUNT(*) AS count FROM incoming_wire_transfers WHERE recipient_user_id = ?'
  ).get(req.user.id).count;
  const transfers = db.prepare(`
    SELECT i.*, t.reference_id, t.created_at AS transaction_date, a.account_number, a.currency AS account_currency
    FROM incoming_wire_transfers i
    JOIN transactions t ON i.transaction_id = t.id
    JOIN accounts a ON i.recipient_account_id = a.id
    WHERE i.recipient_user_id = ?
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset).map(transfer => ({
    ...transfer,
    country_name: getCountry(transfer.sender_country)?.name
  }));

  res.json({ transfers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/history', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const offset = (page - 1) * limit;
  const total = db.prepare(
    'SELECT COUNT(*) AS count FROM wire_transfers WHERE sender_user_id = ?'
  ).get(req.user.id).count;
  const transfers = db.prepare(`
    SELECT w.*, t.reference_id, t.created_at AS transaction_date, a.account_number
    FROM wire_transfers w
    JOIN transactions t ON w.transaction_id = t.id
    JOIN accounts a ON t.from_account_id = a.id
    WHERE w.sender_user_id = ?
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);
  res.json({ transfers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/:id', (req, res) => {
  const transfer = db.prepare(`
    SELECT w.*, t.reference_id, t.amount AS tx_amount, t.balance_after,
      t.created_at AS transaction_date, a.account_number
    FROM wire_transfers w
    JOIN transactions t ON w.transaction_id = t.id
    JOIN accounts a ON t.from_account_id = a.id
    WHERE w.id = ? AND w.sender_user_id = ?
  `).get(req.params.id, req.user.id);
  if (!transfer) return res.status(404).json({ error: 'Wire transfer not found' });
  res.json({ transfer: { ...transfer, country_name: getCountry(transfer.recipient_country)?.name } });
});

module.exports = router;
