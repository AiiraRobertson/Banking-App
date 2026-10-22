const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendTransactionAlert } = require('../utils/alerts');
const { applyLockOnDeposit, ensureWithdrawAllowed } = require('../utils/savingsLock');

const router = express.Router();
router.use(authenticate);

const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'GHS'];
const EXCHANGE_FEE_RATE = 0.004;
const QUOTE_LIFETIME_MS = 5 * 60 * 1000;

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDevelopmentRates() {
  const rates = {
    USD: 1,
    NGN: Number(process.env.DEV_FX_NGN_PER_USD ?? 1550),
    GHS: Number(process.env.DEV_FX_GHS_PER_USD ?? 14.8)
  };
  if (!Number.isFinite(rates.NGN) || rates.NGN <= 0 || !Number.isFinite(rates.GHS) || rates.GHS <= 0) {
    return null;
  }
  return rates;
}

function getOwnedAccount(accountId, userId) {
  return db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(accountId, userId);
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

router.post('/quote', [
  body('from_account_id').isInt({ min: 1 }),
  body('to_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01, max: 1000000 }),
  handleValidation
], (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Development test exchange rates are disabled in production.' });
  }

  const rates = getDevelopmentRates();
  if (!rates) return res.status(503).json({ error: 'Development FX rates are misconfigured.' });

  const fromAccount = getOwnedAccount(req.body.from_account_id, req.user.id);
  const toAccount = getOwnedAccount(req.body.to_account_id, req.user.id);
  if (!fromAccount || !toAccount) return res.status(404).json({ error: 'Source or destination account not found.' });
  if (fromAccount.id === toAccount.id) return res.status(400).json({ error: 'Choose two different accounts.' });
  if (!SUPPORTED_CURRENCIES.includes(fromAccount.currency) || !SUPPORTED_CURRENCIES.includes(toAccount.currency)) {
    return res.status(400).json({ error: 'Unsupported account currency.' });
  }
  if (fromAccount.currency === toAccount.currency) {
    return res.status(400).json({ error: 'Choose accounts with different currencies.' });
  }

  const lockError = ensureWithdrawAllowed(fromAccount);
  if (lockError) return res.status(lockError.status).json({ error: lockError.message, code: lockError.code });

  const sourceAmount = roundMoney(Number(req.body.amount));
  const feeAmount = roundMoney(sourceAmount * EXCHANGE_FEE_RATE);
  const totalDeducted = roundMoney(sourceAmount + feeAmount);
  const exchangeRate = rates[toAccount.currency] / rates[fromAccount.currency];
  const destinationAmount = roundMoney(sourceAmount * exchangeRate);
  if (destinationAmount <= 0) return res.status(400).json({ error: 'Amount is too small to convert.' });

  const quoteId = uuidv4();
  const expiresAt = new Date(Date.now() + QUOTE_LIFETIME_MS).toISOString();
  db.prepare(`
    INSERT INTO currency_exchange_quotes (
      id, user_id, from_account_id, to_account_id, source_amount,
      fee_amount, destination_amount, exchange_rate, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    quoteId, req.user.id, fromAccount.id, toAccount.id, sourceAmount,
    feeAmount, destinationAmount, exchangeRate, expiresAt
  );

  res.json({
    quoteId,
    fromCurrency: fromAccount.currency,
    toCurrency: toAccount.currency,
    sourceAmount,
    feeAmount,
    feeRate: EXCHANGE_FEE_RATE,
    totalDeducted,
    destinationAmount,
    exchangeRate,
    rateMode: 'DEVELOPMENT TEST RATE',
    ratesPerUsd: rates,
    expiresAt
  });
});

router.post('/convert', [
  body('quote_id').isUUID(),
  handleValidation
], (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Development test exchange rates are disabled in production.' });
  }

  const quote = db.prepare(
    'SELECT * FROM currency_exchange_quotes WHERE id = ? AND user_id = ?'
  ).get(req.body.quote_id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Exchange quote not found.' });
  if (quote.used_at) return res.status(409).json({ error: 'This exchange quote has already been used.' });
  if (Date.parse(quote.expires_at) <= Date.now()) return res.status(410).json({ error: 'Exchange quote expired. Request a new quote.' });

  const fromAccount = getOwnedAccount(quote.from_account_id, req.user.id);
  const toAccount = getOwnedAccount(quote.to_account_id, req.user.id);
  if (!fromAccount || !toAccount) return res.status(404).json({ error: 'Source or destination account not found.' });
  const lockError = ensureWithdrawAllowed(fromAccount);
  if (lockError) return res.status(lockError.status).json({ error: lockError.message, code: lockError.code });

  const convert = db.transaction(() => {
    const markUsed = db.prepare(
      'UPDATE currency_exchange_quotes SET used_at = datetime(\'now\') WHERE id = ? AND used_at IS NULL'
    ).run(quote.id);
    if (markUsed.changes === 0) {
      const err = new Error('This exchange quote has already been used.');
      err.status = 409;
      throw err;
    }

    const totalDeducted = roundMoney(quote.source_amount + quote.fee_amount);
    const debit = db.prepare(
      'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?'
    ).run(totalDeducted, fromAccount.id, totalDeducted);
    if (debit.changes === 0) {
      const err = new Error(`Insufficient funds. You need ${formatMoney(totalDeducted, fromAccount.currency)} including the ${formatMoney(quote.fee_amount, fromAccount.currency)} fee.`);
      err.status = 400;
      throw err;
    }
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
      .run(quote.destination_amount, toAccount.id);
    applyLockOnDeposit(toAccount.id);

    const newSourceBalance = getOwnedAccount(fromAccount.id, req.user.id).balance;
    const newDestinationBalance = getOwnedAccount(toAccount.id, req.user.id).balance;
    const referenceId = uuidv4();
    const description = `Currency conversion: ${fromAccount.currency} to ${toAccount.currency}`;
    db.prepare(`
      INSERT INTO transactions (
        from_account_id, to_account_id, transaction_type, amount, balance_after,
        description, reference_id, currency, destination_currency, fee_amount,
        destination_amount, destination_balance_after, exchange_rate
      ) VALUES (?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fromAccount.id, toAccount.id, quote.source_amount, newSourceBalance,
      description, referenceId, fromAccount.currency, toAccount.currency,
      quote.fee_amount, quote.destination_amount, newDestinationBalance, quote.exchange_rate
    );

    const message = `${formatMoney(quote.source_amount, fromAccount.currency)} converted to ${formatMoney(quote.destination_amount, toAccount.currency)}. Fee: ${formatMoney(quote.fee_amount, fromAccount.currency)}.`;
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)')
      .run(req.user.id, 'Currency Conversion', message, 'transaction');

    return {
      referenceId,
      sourceAmount: quote.source_amount,
      feeAmount: quote.fee_amount,
      totalDeducted,
      destinationAmount: quote.destination_amount,
      exchangeRate: quote.exchange_rate,
      fromCurrency: fromAccount.currency,
      toCurrency: toAccount.currency,
      newSourceBalance,
      newDestinationBalance
    };
  });

  try {
    const result = convert();
    sendTransactionAlert({
      userId: req.user.id,
      direction: 'debit',
      amount: result.totalDeducted,
      accountNumber: fromAccount.account_number,
      balanceAfter: result.newSourceBalance,
      counterparty: `Currency conversion to ${result.toCurrency}`,
      referenceId: result.referenceId,
      currency: result.fromCurrency
    });
    sendTransactionAlert({
      userId: req.user.id,
      direction: 'credit',
      amount: result.destinationAmount,
      accountNumber: toAccount.account_number,
      balanceAfter: result.newDestinationBalance,
      counterparty: `Currency conversion from ${result.fromCurrency}`,
      referenceId: result.referenceId,
      currency: result.toCurrency
    });
    res.json({ message: 'Currency conversion successful', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

module.exports = router;
