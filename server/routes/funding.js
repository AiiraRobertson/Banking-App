const express = require('express');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const { body, header, param, query } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { getRate } = require('../utils/liveRates');
const { applyLockOnDeposit } = require('../utils/savingsLock');
const { sendTransactionAlert } = require('../utils/alerts');
const {
  getFlutterwaveConfig,
  isValidWebhook,
  createCardCheckout,
  createBankTransfer,
  verifyTransaction,
} = require('../utils/flutterwaveFunding');

const router = express.Router();
const SUPPORTED_CURRENCIES = new Set(['NGN', 'GHS']);
const MAX_SOURCE_AMOUNT = 1000000;
const QUOTE_TTL_MS = 5 * 60 * 1000;
const fundingActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: req => `user:${req.user.id}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

function createNotification(userId, title, message) {
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(userId, title, message, 'transaction');
}

function publicPayment(payment) {
  return {
    reference: payment.tx_ref,
    method: payment.method,
    status: payment.status,
    sourceAmount: payment.source_amount,
    sourceCurrency: payment.source_currency,
    creditedAmount: payment.usd_amount,
    creditedCurrency: 'USD',
    checkoutUrl: payment.checkout_url,
    transfer: payment.transfer_account ? {
      accountNumber: payment.transfer_account,
      bankName: payment.transfer_bank,
      reference: payment.transfer_reference,
      note: payment.transfer_note,
      expiresAt: payment.transfer_expires_at,
      amount: payment.transfer_amount ?? payment.source_amount,
      currency: payment.source_currency,
    } : null,
    createdAt: payment.created_at,
  };
}

function insertPendingPayment({ userId, accountId, quote, method, idempotencyKey }) {
  if (quote.method !== method) {
    const error = new Error('Funding quote was created for a different payment method');
    error.status = 409;
    throw error;
  }
  const existing = db.prepare(
    'SELECT * FROM external_funding WHERE user_id = ? AND idempotency_key = ?'
  ).get(userId, idempotencyKey);
  if (existing) {
    if (existing.quote_id !== quote.id || existing.method !== method || existing.account_id !== accountId) {
      const error = new Error('Idempotency key was already used for a different funding request');
      error.status = 409;
      throw error;
    }
    return { payment: existing, created: false };
  }

  const existingQuote = db.prepare(
    'SELECT * FROM external_funding WHERE quote_id = ?'
  ).get(quote.id);
  if (existingQuote) {
    if (existingQuote.user_id !== userId || existingQuote.method !== method || existingQuote.account_id !== accountId) {
      const error = new Error('Funding quote was already used for a different request');
      error.status = 409;
      throw error;
    }
    return { payment: existingQuote, created: false };
  }

  const txRef = randomUUID();
  const result = db.prepare(`
    INSERT INTO external_funding (
      user_id, account_id, quote_id, idempotency_key, provider, method, tx_ref,
      source_amount, source_currency, usd_per_source_unit, usd_amount
    ) VALUES (?, ?, ?, ?, 'flutterwave', ?, ?, ?, ?, ?, ?)
  `).run(
    userId, accountId, quote.id, idempotencyKey, method, txRef,
    quote.source_amount, quote.source_currency, quote.usd_per_source_unit, quote.usd_amount
  );
  return { payment: db.prepare('SELECT * FROM external_funding WHERE id = ?').get(result.lastInsertRowid), created: true };
}

function updatePaymentDetails(paymentId, updates) {
  db.prepare(`
    UPDATE external_funding
    SET checkout_url = ?, transfer_account = ?, transfer_bank = ?, transfer_amount = ?,
        transfer_reference = ?, transfer_note = ?, transfer_expires_at = ?,
        updated_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).run(
    updates.checkoutUrl || null,
    updates.transferAccount || null,
    updates.transferBank || null,
    updates.transferAmount || null,
    updates.transferReference || null,
    updates.transferNote || null,
    updates.transferExpiresAt || null,
    paymentId
  );
  return db.prepare('SELECT * FROM external_funding WHERE id = ?').get(paymentId);
}

async function settleVerifiedFunding(payment, providerTransactionId, verifyProviderTransaction = verifyTransaction) {
  const verified = await verifyProviderTransaction(providerTransactionId);
  if (String(verified.id) !== String(providerTransactionId) || verified.tx_ref !== payment.tx_ref) {
    return { valid: false, reason: 'Provider transaction reference or currency did not match' };
  }

  if (verified.status !== 'successful') {
    if (['failed', 'cancelled', 'canceled'].includes(String(verified.status).toLowerCase())) {
      const finalStatus = String(verified.status).toLowerCase() === 'failed' ? 'failed' : 'cancelled';
      db.prepare(`
        UPDATE external_funding
        SET status = ?, provider_transaction_id = ?, failure_reason = ?, updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(finalStatus, String(verified.id), 'Provider reported an unsuccessful payment', payment.id);
    }
    const current = db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id);
    return { valid: true, payment: publicPayment(current) };
  }

  if (verified.currency !== payment.source_currency) {
    db.prepare(`
      UPDATE external_funding
      SET status = 'failed', provider_transaction_id = ?, failure_reason = ?,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(String(verified.id), 'Provider verified a different currency; review required', payment.id);
    return { valid: true, payment: publicPayment(db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id)) };
  }

  const normalizedMethod = String(verified.payment_type || '').toLowerCase().replace(/[-_\s]/g, '');
  const expectedMethod = payment.method === 'card' ? 'card' : 'banktransfer';
  if (normalizedMethod !== expectedMethod) {
    db.prepare(`
      UPDATE external_funding
      SET status = 'failed', provider_transaction_id = ?, failure_reason = ?,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(String(verified.id), 'Provider verified a different payment method; review required', payment.id);
    return { valid: true, payment: publicPayment(db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id)) };
  }

  const verifiedAmount = Math.round(Number(verified.amount) * 100);
  const expectedAmount = Math.round(payment.source_amount * 100);
  if (!Number.isFinite(verifiedAmount) || verifiedAmount !== expectedAmount) {
    db.prepare(`
      UPDATE external_funding
      SET status = 'failed', provider_transaction_id = ?, failure_reason = ?,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(String(verified.id), 'Provider verified a different amount; review/refund required', payment.id);
    return { valid: true, payment: publicPayment(db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id)) };
  }

  const complete = db.transaction(() => {
    const current = db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id);
    if (!current) return { payment: null, newlyCompleted: false };
    if (current.status !== 'pending') {
      return { payment: current, newlyCompleted: false };
    }

    const duplicateProviderPayment = db.prepare(
      'SELECT id FROM external_funding WHERE provider_transaction_id = ? AND id != ?'
    ).get(String(verified.id), current.id);
    if (duplicateProviderPayment) {
      const error = new Error('Provider transaction has already been applied');
      error.code = 'DUPLICATE_PROVIDER_TRANSACTION';
      throw error;
    }

    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ? AND is_active = 1')
      .run(current.usd_amount, current.account_id, current.user_id);
    applyLockOnDeposit(current.account_id);
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
    ).get(current.account_id, current.user_id);
    if (!account) throw new Error('Funding account is no longer active');

    const transactionResult = db.prepare(`
      INSERT INTO transactions (
        from_account_id, to_account_id, transaction_type, amount, balance_after,
        description, reference_id
      ) VALUES (NULL, ?, 'deposit', ?, ?, ?, ?)
    `).run(
      current.account_id,
      current.usd_amount,
      account.balance,
      `Flutterwave sandbox ${current.method} funding (${current.source_amount.toFixed(2)} ${current.source_currency})`,
      current.tx_ref
    );
    db.prepare(`
      INSERT INTO deposit_sources (transaction_id, method, card_brand, card_last4, bank_name, external_ref)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      transactionResult.lastInsertRowid,
      current.method === 'card' ? 'card' : 'bank',
      current.method === 'card' ? verified.card?.type || null : null,
      current.method === 'card' ? verified.card?.last_4digits || null : null,
      current.method === 'bank_transfer' ? current.transfer_bank : null,
      `flutterwave:${verified.id}`
    );
    createNotification(
      current.user_id,
      'Sandbox deposit received',
      `$${current.usd_amount.toFixed(2)} sandbox funds were credited to account ${account.account_number}.`
    );
    db.prepare(`
      UPDATE external_funding
      SET status = 'completed', provider_transaction_id = ?, transaction_id = ?,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(String(verified.id), transactionResult.lastInsertRowid, current.id);

    return {
      payment: { ...current, status: 'completed', provider_transaction_id: String(verified.id), transaction_id: transactionResult.lastInsertRowid },
      newlyCompleted: true,
    };
  });

  const completion = complete();
  const completed = completion.payment;
  if (completion.newlyCompleted && completed?.status === 'completed') {
    const account = db.prepare('SELECT account_number, balance FROM accounts WHERE id = ?').get(completed.account_id);
    sendTransactionAlert({
      userId: completed.user_id,
      direction: 'credit',
      amount: completed.usd_amount,
      accountNumber: account.account_number,
      balanceAfter: account.balance,
      counterparty: `Flutterwave sandbox ${completed.method}`,
      referenceId: completed.tx_ref,
    });
  }
  const refreshed = db.prepare('SELECT * FROM external_funding WHERE id = ?').get(payment.id);
  return { valid: true, payment: publicPayment(refreshed) };
}

router.post('/flutterwave/webhook', async (req, res, next) => {
  if (!getFlutterwaveConfig().configured) {
    return res.status(503).json({ error: 'Funding provider is not configured' });
  }
  if (!isValidWebhook(req)) {
    return res.status(401).json({ error: 'Invalid provider webhook signature' });
  }

  const data = req.body?.data;
  const txRef = data?.tx_ref;
  if (req.body?.event !== 'charge.completed' || !txRef || !data?.id) {
    return res.status(200).json({ received: true });
  }

  const payment = db.prepare(
    'SELECT * FROM external_funding WHERE tx_ref = ? AND provider = ?'
  ).get(txRef, 'flutterwave');
  if (!payment) {
    console.warn('Ignoring Flutterwave webhook for an unknown funding reference');
    return res.status(200).json({ received: true });
  }

  try {
    const result = await settleVerifiedFunding(payment, data.id);
    if (!result.valid) return res.status(400).json({ error: result.reason });
    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
});

router.use(authenticate);

router.get('/methods', (req, res) => {
  const config = getFlutterwaveConfig();
  res.json({
    mode: config.mode,
    cardCurrencies: config.cardCurrencies,
    bankTransferCurrencies: config.bankTransferCurrencies,
    methods: {
      card: config.card,
      bankTransfer: config.bankTransfer,
      crypto: false,
    },
    unavailable: {
      crypto: 'A licensed crypto payment provider and approved merchant account are required.',
      giftCard: 'No authorized gift-card redemption provider is configured.',
    },
  });
});

router.post('/quote', [
  fundingActionLimiter,
  body('account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01, max: MAX_SOURCE_AMOUNT }),
  body('currency').isIn([...SUPPORTED_CURRENCIES]),
  body('method').isIn(['card', 'bank_transfer']),
  handleValidation,
], async (req, res, next) => {
  const config = getFlutterwaveConfig();
  const methodCurrencies = req.body.method === 'card'
    ? config.cardCurrencies
    : config.bankTransferCurrencies;
  if (!config.configured || !methodCurrencies.includes(req.body.currency)) {
    return res.status(503).json({ error: 'This funding method is not configured for the selected currency.' });
  }
  const account = db.prepare(
    'SELECT id FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(req.body.account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  try {
    const sourceAmount = Math.round(Number(req.body.amount) * 100) / 100;
    const quoteRate = await getRate(req.body.currency);
    const rateAgeMs = Date.now() - quoteRate.fetchedAt;
    if (quoteRate.source !== 'live' || !quoteRate.rate || rateAgeMs > 15 * 60 * 1000) {
      return res.status(503).json({ error: 'A fresh live exchange rate is unavailable. Please try again shortly.' });
    }
    const usdPerSourceUnit = 1 / quoteRate.rate;
    const usdAmount = Math.round(sourceAmount * usdPerSourceUnit * 100) / 100;
    if (!Number.isFinite(usdAmount) || usdAmount < 0.01) {
      return res.status(400).json({ error: 'Amount is too small to convert to USD' });
    }

    const quoteId = randomUUID();
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
    db.prepare(`
      INSERT INTO funding_quotes (
        id, user_id, account_id, method, source_amount, source_currency, usd_per_source_unit,
        usd_amount, rate_source, rate_fetched_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      quoteId, req.user.id, account.id, req.body.method, sourceAmount, req.body.currency,
      usdPerSourceUnit, usdAmount, 'open.er-api.com',
      new Date(quoteRate.fetchedAt).toISOString(), expiresAt
    );

    res.json({
      quoteId,
      sourceAmount,
      sourceCurrency: req.body.currency,
      usdAmount,
      usdPerSourceUnit,
      rateSource: 'open.er-api.com',
      rateFetchedAt: new Date(quoteRate.fetchedAt).toISOString(),
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', [
  fundingActionLimiter,
  body('quote_id').isUUID(),
  body('method').isIn(['card', 'bank_transfer']),
  header('idempotency-key').isUUID(),
  handleValidation,
], async (req, res, next) => {
  const config = getFlutterwaveConfig();
  if (!config.configured) {
    return res.status(503).json({
      error: 'Flutterwave sandbox is not configured. No payment was started.',
      code: 'FUNDING_PROVIDER_UNAVAILABLE',
    });
  }
  const idempotencyKey = req.get('Idempotency-Key');
  const quote = db.prepare(
    'SELECT * FROM funding_quotes WHERE id = ? AND user_id = ?'
  ).get(req.body.quote_id, req.user.id);
  if (!quote || Date.parse(quote.expires_at) <= Date.now()) {
    return res.status(400).json({ error: 'Funding quote is missing or expired. Request a new quote.' });
  }
  const account = db.prepare(
    'SELECT a.* FROM accounts a WHERE a.id = ? AND a.user_id = ? AND a.is_active = 1'
  ).get(quote.account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (!SUPPORTED_CURRENCIES.has(quote.source_currency)) {
    return res.status(400).json({ error: 'Funding currency is not supported' });
  }
  const methodCurrencies = req.body.method === 'card'
    ? config.cardCurrencies
    : config.bankTransferCurrencies;
  if (!methodCurrencies.includes(quote.source_currency)) {
    return res.status(400).json({ error: 'This payment method is not enabled for the selected currency' });
  }

  const user = db.prepare(
    'SELECT email, first_name, last_name, phone FROM users WHERE id = ? AND is_active = 1'
  ).get(req.user.id);
  if (!user) return res.status(403).json({ error: 'Active user account required' });

  let created;
  try {
    created = db.transaction(() => insertPendingPayment({
      userId: req.user.id,
      accountId: account.id,
      quote,
      method: req.body.method,
      idempotencyKey,
    }))();
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message });
    return next(error);
  }

  if (!created.created) return res.json({ payment: publicPayment(created.payment) });
  const fullName = `${user.first_name} ${user.last_name}`.trim();

  try {
    if (req.body.method === 'card') {
      const result = await createCardCheckout({
        reference: created.payment.tx_ref,
        amount: quote.source_amount,
        currency: quote.source_currency,
        email: user.email,
        name: fullName,
        phone: user.phone,
      });
      if (!result?.link || !result.link.startsWith('https://checkout.flutterwave.com/')) {
        const error = new Error('Provider did not return a valid hosted checkout URL');
        error.code = 'INVALID_PROVIDER_RESPONSE';
        throw error;
      }
      const payment = updatePaymentDetails(created.payment.id, { checkoutUrl: result.link });
      return res.status(201).json({ payment: publicPayment(payment) });
    }

    const result = await createBankTransfer({
      reference: created.payment.tx_ref,
      amount: quote.source_amount,
      currency: quote.source_currency,
      email: user.email,
      name: fullName,
      phone: user.phone,
    });
    const authorization = result?.meta?.authorization;
    if (!authorization?.transfer_account || !authorization?.transfer_bank) {
      const error = new Error('Provider did not return bank transfer instructions');
      error.code = 'INVALID_PROVIDER_RESPONSE';
      throw error;
    }
    const payment = updatePaymentDetails(created.payment.id, {
      transferAccount: String(authorization.transfer_account),
      transferBank: authorization.transfer_bank,
      transferAmount: Number(authorization.transfer_amount) || quote.source_amount,
      transferReference: authorization.transfer_reference || created.payment.tx_ref,
      transferNote: authorization.transfer_note || null,
      transferExpiresAt: authorization.account_expiration || null,
    });
    return res.status(201).json({ payment: publicPayment(payment) });
  } catch (error) {
    if (error.code === 'PROVIDER_UNAVAILABLE') {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    if (error.code === 'PROVIDER_REQUEST_FAILED') {
      db.prepare(`
        UPDATE external_funding
        SET status = 'failed', failure_reason = ?, updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run('Provider rejected payment initiation; no funds were credited', created.payment.id);
    }
    console.error('Flutterwave sandbox funding initialization failed:', error.message);
    const payment = db.prepare('SELECT * FROM external_funding WHERE id = ?').get(created.payment.id);
    const ambiguous = payment.status === 'pending';
    return res.status(ambiguous ? 503 : 502).json({
      error: ambiguous
        ? 'Payment initiation could not be confirmed. Do not start another payment yet; this request will remain pending while the provider is reconciled.'
        : 'Payment provider rejected this request. No funds were credited.',
      code: ambiguous ? 'PROVIDER_RESULT_UNKNOWN' : 'PROVIDER_REQUEST_FAILED',
      payment: ambiguous ? publicPayment(payment) : undefined,
    });
  }
});

router.post('/verify', [
  fundingActionLimiter,
  body('tx_ref').isUUID(),
  body('transaction_id').isString().matches(/^\d+$/),
  handleValidation,
], async (req, res, next) => {
  const payment = db.prepare(
    'SELECT * FROM external_funding WHERE tx_ref = ? AND user_id = ?'
  ).get(req.body.tx_ref, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Funding request not found' });
  if (payment.status !== 'pending') {
    return res.json({ payment: publicPayment(payment) });
  }

  try {
    const result = await settleVerifiedFunding(payment, req.body.transaction_id);
    if (!result.valid) return res.status(400).json({ error: result.reason });
    return res.json({ payment: result.payment });
  } catch (error) {
    next(error);
  }
});

router.get('/payments', [
  query('limit').optional().isInt({ min: 1, max: 10 }),
  handleValidation,
], (req, res) => {
  const limit = Number(req.query.limit || 5);
  const payments = db.prepare(`
    SELECT * FROM external_funding
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(req.user.id, limit);
  res.json({ payments: payments.map(publicPayment) });
});

router.get('/payments/:tx_ref', [
  param('tx_ref').isUUID(),
  handleValidation,
], (req, res) => {
  const payment = db.prepare(
    'SELECT * FROM external_funding WHERE tx_ref = ? AND user_id = ?'
  ).get(req.params.tx_ref, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Funding request not found' });
  res.json({ payment: publicPayment(payment) });
});

router.post('/topup', (req, res) => {
  res.status(410).json({
    error: 'Direct account top-ups are unavailable. Only verified provider payments can credit an account.',
    code: 'DIRECT_FUNDING_DISABLED',
  });
});

module.exports = router;
module.exports.settleVerifiedFunding = settleVerifiedFunding;
