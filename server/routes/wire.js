const express = require('express');
const { body, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { countries, exchangeRates, fees, calculateFee, convertCurrency, getCountry, getDeliveryEstimate } = require('../utils/currencies');

const router = express.Router();
router.use(authenticate);

router.get('/countries', (req, res) => {
  const grouped = {
    north_america: countries.filter(c => c.region === 'north_america'),
    europe: countries.filter(c => c.region === 'europe'),
    africa: countries.filter(c => c.region === 'africa'),
  };
  res.json({ countries: grouped, fees });
});

router.get('/rates', (req, res) => {
  res.json({ rates: exchangeRates, baseCurrency: 'USD' });
});

router.get('/lookup-account', [
  query('account_number').trim().notEmpty().withMessage('Account number is required'),
  handleValidation
], (req, res) => {
  const { account_number } = req.query;

  const account = db.prepare(
    'SELECT a.account_number, a.account_type, u.first_name, u.last_name FROM accounts a JOIN users u ON a.user_id = u.id WHERE a.account_number = ? AND a.is_active = 1'
  ).get(account_number);

  if (account) {
    const holderHint = account.first_name[0] + '***' + ' ' + account.last_name[0] + '***';
    return res.json({
      found: true,
      bank_name: 'SecureBank',
      account_type: account.account_type,
      holder_hint: holderHint
    });
  }

  const prefix = account_number.slice(0, 2);
  const prefixNum = parseInt(prefix, 10);
  let bank_name = 'Unknown Bank';
  if (prefixNum >= 10 && prefixNum <= 29) bank_name = 'SecureBank (Inactive)';
  else if (prefixNum >= 30 && prefixNum <= 39) bank_name = 'National Trust Bank';
  else if (prefixNum >= 40 && prefixNum <= 49) bank_name = 'Pacific Commerce Bank';
  else if (prefixNum >= 50 && prefixNum <= 59) bank_name = 'Heritage Savings Bank';
  else if (prefixNum >= 60 && prefixNum <= 69) bank_name = 'Continental Federal Bank';
  else if (prefixNum >= 70 && prefixNum <= 79) bank_name = 'Atlantic Union Bank';
  else if (prefixNum >= 80 && prefixNum <= 89) bank_name = 'Global Finance Bank';
  else if (prefixNum >= 90 && prefixNum <= 99) bank_name = 'Premier Credit Bank';

  res.json({ found: false, bank_name, note: 'External account' });
});

router.post('/quote', [
  body('amount').isFloat({ min: 1, max: 1000000 }).withMessage('Amount must be between $1 and $1,000,000'),
  body('country_code').isString().isLength({ min: 2, max: 2 }),
  handleValidation
], (req, res) => {
  const { amount, country_code } = req.body;
  const country = getCountry(country_code);
  if (!country) return res.status(400).json({ error: 'Unsupported country' });

  const amt = Math.round(amount * 100) / 100;
  const feeAmount = calculateFee(amt, country.region);
  const { rate, converted } = convertCurrency(amt, country.currency);
  const totalDeducted = Math.round((amt + feeAmount) * 100) / 100;
  const deliveryEstimate = getDeliveryEstimate(country.region);

  res.json({
    originalAmount: amt,
    currency: country.currency,
    exchangeRate: rate,
    convertedAmount: converted,
    feeAmount,
    totalDeducted,
    deliveryEstimate,
    deliveryDays: fees[country.region].deliveryDays,
    country: country.name,
    region: country.region
  });
});

router.post('/send', [
  body('from_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 1, max: 1000000 }).withMessage('Amount must be between $1 and $1,000,000'),
  body('country_code').isString().isLength({ min: 2, max: 2 }),
  body('recipient_name').trim().notEmpty().withMessage('Recipient name is required'),
  body('recipient_bank').trim().notEmpty().withMessage('Bank name is required'),
  body('recipient_account').trim().notEmpty().withMessage('Account number is required'),
  body('swift_code').optional().trim(),
  body('iban').optional().trim(),
  body('routing_number').optional().trim(),
  body('description').optional().trim(),
  handleValidation
], (req, res) => {
  const {
    from_account_id, amount, country_code,
    recipient_name, recipient_bank, recipient_account,
    swift_code, iban, routing_number, description
  } = req.body;

  const country = getCountry(country_code);
  if (!country) return res.status(400).json({ error: 'Unsupported country' });

  if (country.requiresSwift && !swift_code) {
    return res.status(400).json({ error: 'SWIFT/BIC code is required for this country' });
  }
  if (country.requiresIban && !iban) {
    return res.status(400).json({ error: 'IBAN is required for this country' });
  }
  if (country.requiresRouting && !routing_number) {
    return res.status(400).json({ error: 'Routing number is required for this country' });
  }

  const amt = Math.round(amount * 100) / 100;
  const feeAmount = calculateFee(amt, country.region);
  const totalDeducted = Math.round((amt + feeAmount) * 100) / 100;
  const { rate, converted } = convertCurrency(amt, country.currency);
  const deliveryEstimate = getDeliveryEstimate(country.region);

  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(from_account_id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.balance < totalDeducted) {
    return res.status(400).json({ error: `Insufficient funds. You need ${totalDeducted.toFixed(2)} (${amt.toFixed(2)} + ${feeAmount.toFixed(2)} fee)` });
  }

  const sendWire = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(totalDeducted, account.id);
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account.id).balance;

    const refId = uuidv4();
    const txResult = db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id, status)
      VALUES (?, NULL, 'wire_transfer', ?, ?, ?, ?, 'completed')
    `).run(account.id, totalDeducted, newBalance,
      description || `Wire transfer to ${recipient_name} (${country.name})`, refId);

    db.prepare(`
      INSERT INTO wire_transfers (
        transaction_id, sender_user_id, recipient_name, recipient_bank, recipient_account,
        swift_code, iban, routing_number, recipient_country, recipient_region,
        currency, original_amount, exchange_rate, converted_amount,
        fee_amount, total_deducted, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txResult.lastInsertRowid, req.user.id, recipient_name, recipient_bank, recipient_account,
      swift_code || null, iban || null, routing_number || null,
      country_code, country.region, country.currency,
      amt, rate, converted, feeAmount, totalDeducted, deliveryEstimate
    );

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, 'Wire Transfer Sent',
      `${country.flag} $${amt.toFixed(2)} (${country.currency} ${converted.toFixed(2)}) sent to ${recipient_name} in ${country.name}. Fee: $${feeAmount.toFixed(2)}. Est. delivery: ${fees[country.region].deliveryDays}.`,
      'transaction');

    if (newBalance < 100) {
      db.prepare(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
      ).run(req.user.id, 'Low Balance Alert',
        `Your account ${account.account_number} balance is $${newBalance.toFixed(2)}.`, 'alert');
    }

    return { referenceId: refId, newBalance, converted, feeAmount, totalDeducted, deliveryEstimate };
  });

  const result = sendWire();
  res.json({
    message: 'Wire transfer initiated successfully',
    ...result,
    currency: country.currency,
    exchangeRate: rate,
    country: country.name,
    deliveryDays: fees[country.region].deliveryDays
  });
});

router.get('/history', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
], (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM wire_transfers WHERE sender_user_id = ?'
  ).get(req.user.id).count;

  const transfers = db.prepare(`
    SELECT w.*, t.reference_id, t.created_at as transaction_date, a.account_number
    FROM wire_transfers w
    JOIN transactions t ON w.transaction_id = t.id
    JOIN accounts a ON t.from_account_id = a.id
    WHERE w.sender_user_id = ?
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  res.json({
    transfers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

router.get('/:id', (req, res) => {
  const transfer = db.prepare(`
    SELECT w.*, t.reference_id, t.amount as tx_amount, t.balance_after, t.created_at as transaction_date, a.account_number
    FROM wire_transfers w
    JOIN transactions t ON w.transaction_id = t.id
    JOIN accounts a ON t.from_account_id = a.id
    WHERE w.id = ? AND w.sender_user_id = ?
  `).get(req.params.id, req.user.id);

  if (!transfer) return res.status(404).json({ error: 'Wire transfer not found' });

  const country = getCountry(transfer.recipient_country);
  res.json({ transfer: { ...transfer, country_name: country?.name, flag: country?.flag } });
});

module.exports = router;
