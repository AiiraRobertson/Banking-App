const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

process.env.DB_PATH = ':memory:';
process.env.FLW_MODE = 'sandbox';
process.env.FLW_SECRET_KEY = 'FLWSECK_TEST-test-key';
process.env.FLW_WEBHOOK_SECRET = 'test-webhook-secret-value-at-least-32';
process.env.FLW_REDIRECT_URL = 'http://localhost:5173/add-money';
process.env.FLW_ENABLE_CARD_NGN = 'true';
process.env.FLW_ENABLE_CARD_GHS = 'true';
process.env.FLW_ENABLE_BANK_TRANSFER_NGN = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-for-funding-integrity';

const db = require('../db/database');
const { initializeDatabase } = require('../db/schema');
initializeDatabase();
const fundingRouter = require('../routes/funding');
const {
  getFlutterwaveConfig,
  isValidWebhook,
  createCardCheckout,
  createBankTransfer,
} = require('../utils/flutterwaveFunding');
const settleVerifiedFunding = fundingRouter.settleVerifiedFunding;

test('card checkout uses provider-hosted UI and does not send cardholder data', async () => {
  let request;
  const result = await createCardCheckout({
    reference: randomUUID(),
    amount: 1250,
    currency: 'NGN',
    email: 'person@example.test',
    name: 'Demo User',
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({ status: 'success', data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/test' } }),
      };
    },
  });

  assert.equal(request.url, 'https://api.flutterwave.com/v3/payments');
  assert.equal(request.options.headers.Authorization, `Bearer ${process.env.FLW_SECRET_KEY}`);
  assert.equal(request.body.payment_options, 'card');
  assert.equal(request.body.currency, 'NGN');
  assert.equal(request.body.customer.email, 'person@example.test');
  assert.equal('card_number' in request.body, false);
  assert.equal('cvv' in request.body, false);
  assert.match(result.link, /^https:\/\/checkout\.flutterwave\.com\//);
});

test('local bank transfer requests use provider-issued transfer collection', async () => {
  let request;
  await createBankTransfer({
    reference: randomUUID(),
    amount: 22.5,
    currency: 'GHS',
    email: 'person@example.test',
    name: 'Demo User',
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({ status: 'success', data: { meta: { authorization: { transfer_account: 'provider-issued' } } } }),
      };
    },
  });
  assert.equal(request.url, 'https://api.flutterwave.com/v3/charges?type=bank_transfer');
  assert.equal(request.body.currency, 'GHS');
  assert.equal(request.body.amount, '22.50');
  assert.equal(request.body.email, 'person@example.test');
});

test('funding is enabled only with explicit Flutterwave sandbox configuration', () => {
  assert.deepEqual(getFlutterwaveConfig(), {
    configured: true,
    mode: 'sandbox',
    card: true,
    cardCurrencies: ['NGN', 'GHS'],
    bankTransfer: true,
    bankTransferCurrencies: ['NGN'],
    crypto: false,
  });
  assert.equal(getFlutterwaveConfig({
    FLW_MODE: 'live',
    FLW_SECRET_KEY: 'FLWSECK_TEST-test-key',
    FLW_WEBHOOK_SECRET: process.env.FLW_WEBHOOK_SECRET,
    FLW_REDIRECT_URL: 'https://example.test/add-money',
    NODE_ENV: 'production',
  }).configured, false);
  assert.equal(getFlutterwaveConfig({}).configured, false);
});

test('Flutterwave webhook signature must match the configured secret', () => {
  assert.equal(isValidWebhook({ get: () => process.env.FLW_WEBHOOK_SECRET }), true);
  assert.equal(isValidWebhook({ get: () => 'wrong-secret' }), false);
  assert.equal(isValidWebhook({ get: () => undefined }), false);
});

function createPendingFunding({ sourceAmount = 250, usdAmount = 2.5 } = {}) {
  const userId = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, email_alerts, sms_alerts)
    VALUES (?, 'test-hash', 'Test', 'User', 0, 0)
  `).run(`${randomUUID()}@example.test`).lastInsertRowid;
  const accountId = db.prepare(`
    INSERT INTO accounts (user_id, account_number, account_type, balance)
    VALUES (?, ?, 'checking', 0)
  `).run(userId, `${Math.floor(1000000000 + Math.random() * 8999999999)}`).lastInsertRowid;
  const quoteId = randomUUID();
  const txRef = randomUUID();
  const idempotencyKey = randomUUID();
  db.prepare(`
    INSERT INTO funding_quotes (
      id, user_id, account_id, method, source_amount, source_currency, usd_per_source_unit,
      usd_amount, rate_source, rate_fetched_at, expires_at
    ) VALUES (?, ?, ?, 'card', ?, 'NGN', ?, ?, 'live', ?, ?)
  `).run(quoteId, userId, accountId, sourceAmount, usdAmount / sourceAmount, usdAmount,
    new Date().toISOString(), new Date(Date.now() + 300000).toISOString());
  const paymentId = db.prepare(`
    INSERT INTO external_funding (
      user_id, account_id, quote_id, idempotency_key, provider, method, tx_ref,
      source_amount, source_currency, usd_per_source_unit, usd_amount
    ) VALUES (?, ?, ?, ?, 'flutterwave', 'card', ?, ?, 'NGN', ?, ?)
  `).run(userId, accountId, quoteId, idempotencyKey, txRef, sourceAmount,
    usdAmount / sourceAmount, usdAmount).lastInsertRowid;
  return {
    payment: db.prepare('SELECT * FROM external_funding WHERE id = ?').get(paymentId),
    accountId,
    userId,
    txRef,
  };
}

test('only a matching provider-verified payment credits an account, and duplicate verification is idempotent', async () => {
  const { payment, accountId, txRef } = createPendingFunding();
  const verifyProviderTransaction = async (id) => ({
    id: Number(id),
    tx_ref: txRef,
    currency: 'NGN',
    payment_type: 'card',
    amount: 250,
    status: 'successful',
    card: { type: 'VISA', last_4digits: '4242' },
  });

  const first = await settleVerifiedFunding(payment, '123456', verifyProviderTransaction);
  const duplicate = await settleVerifiedFunding(payment, '123456', verifyProviderTransaction);
  const account = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId);
  const transactions = db.prepare(
    "SELECT COUNT(*) AS count FROM transactions WHERE reference_id = ?"
  ).get(txRef);

  assert.equal(first.valid, true);
  assert.equal(first.payment.status, 'completed');
  assert.equal(duplicate.payment.status, 'completed');
  assert.equal(account.balance, 2.5);
  assert.equal(transactions.count, 1);
});

test('mismatched provider references and amounts never credit the balance', async () => {
  const { payment, accountId, txRef } = createPendingFunding({ sourceAmount: 500, usdAmount: 5 });
  const mismatch = await settleVerifiedFunding(payment, '123457', async (id) => ({
    id: Number(id),
    tx_ref: 'different-reference',
    currency: 'NGN',
    payment_type: 'card',
    amount: 500,
    status: 'successful',
  }));
  assert.equal(mismatch.valid, false);
  assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 0);

  const amountMismatch = await settleVerifiedFunding(payment, '123458', async (id) => ({
    id: Number(id),
    tx_ref: txRef,
    currency: 'NGN',
    payment_type: 'card',
    amount: 499.99,
    status: 'successful',
  }));
  assert.equal(amountMismatch.valid, true);
  assert.equal(amountMismatch.payment.status, 'failed');
  assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 0);
});

test('pending provider payments do not credit an account', async () => {
  const { payment, accountId, txRef } = createPendingFunding();
  const result = await settleVerifiedFunding(payment, '123459', async (id) => ({
    id: Number(id),
    tx_ref: txRef,
    currency: 'NGN',
    payment_type: 'card',
    amount: 250,
    status: 'pending',
  }));
  assert.equal(result.payment.status, 'pending');
  assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 0);
});

test('verified currency or payment-method mismatches are not credited', async () => {
  const currencyFunding = createPendingFunding();
  const currencyResult = await settleVerifiedFunding(currencyFunding.payment, '123460', async id => ({
    id: Number(id),
    tx_ref: currencyFunding.txRef,
    currency: 'GHS',
    payment_type: 'card',
    amount: 250,
    status: 'successful',
  }));
  assert.equal(currencyResult.payment.status, 'failed');
  assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(currencyFunding.accountId).balance, 0);

  const methodFunding = createPendingFunding();
  const methodResult = await settleVerifiedFunding(methodFunding.payment, '123461', async id => ({
    id: Number(id),
    tx_ref: methodFunding.txRef,
    currency: 'NGN',
    payment_type: 'bank_transfer',
    amount: 250,
    status: 'successful',
  }));
  assert.equal(methodResult.payment.status, 'failed');
  assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(methodFunding.accountId).balance, 0);
});

test('legacy direct deposit endpoint cannot change a balance', async () => {
  const { accountId } = createPendingFunding();
  const balanceBefore = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance;
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/transactions', require('../routes/transactions'));
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/transactions/deposit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt.sign({ id: 1, email: 'test@example.test', role: 'user' }, process.env.JWT_SECRET)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account_id: accountId, amount: 100 }),
    });
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, 'DIRECT_FUNDING_DISABLED');
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, balanceBefore);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('authenticated sandbox checkout and signed webhook credit the balance once', async () => {
  const { accountId, userId } = createPendingFunding();
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/funding', fundingRouter);
  const server = app.listen(0, '127.0.0.1');
  const nativeFetch = global.fetch;
  let createdCheckoutCount = 0;
  let verifiedReference;

  global.fetch = async (url, options = {}) => {
    if (new URL(url).hostname === '127.0.0.1') return nativeFetch(url, options);
    if (String(url).startsWith('https://open.er-api.com/')) {
      return { ok: true, json: async () => ({ result: 'success', rates: { NGN: 1500, GHS: 15 } }) };
    }
    if (String(url).endsWith('/v3/payments')) {
      createdCheckoutCount += 1;
      return {
        ok: true,
        json: async () => ({ status: 'success', data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/test' } }),
      };
    }
    if (String(url).includes('/v3/transactions/')) {
      const id = Number(String(url).match(/transactions\/(\d+)\/verify/)[1]);
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            id,
            tx_ref: verifiedReference,
            currency: 'NGN',
            payment_type: 'card',
            amount: 1500,
            status: 'successful',
          },
        }),
      };
    }
    throw new Error(`Unexpected provider request: ${url}`);
  };

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api/funding`;
    const authorization = `Bearer ${jwt.sign({ id: userId, email: 'test@example.test', role: 'user' }, process.env.JWT_SECRET)}`;
    const quoteResponse = await nativeFetch(`${baseUrl}/quote`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, amount: 1500, currency: 'NGN', method: 'card' }),
    });
    assert.equal(quoteResponse.status, 200);
    const quote = await quoteResponse.json();
    assert.equal(quote.usdAmount, 1);
    const checkoutResponse = await nativeFetch(`${baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ quote_id: quote.quoteId, method: 'card' }),
    });
    assert.equal(checkoutResponse.status, 201);
    const checkout = await checkoutResponse.json();
    assert.equal(checkout.payment.status, 'pending');
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 0);

    verifiedReference = 'unrelated-reference';
    const spoofedCallback = await nativeFetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref: checkout.payment.reference, transaction_id: '9001' }),
    });
    assert.equal(spoofedCallback.status, 400);
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 0);

    verifiedReference = checkout.payment.reference;
    const webhook = {
      event: 'charge.completed',
      data: { id: 9002, tx_ref: checkout.payment.reference, status: 'successful' },
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const webhookResponse = await nativeFetch(`${baseUrl}/flutterwave/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'verif-hash': process.env.FLW_WEBHOOK_SECRET },
        body: JSON.stringify(webhook),
      });
      assert.equal(webhookResponse.status, 200);
    }
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(accountId).balance, 1);
    assert.equal(db.prepare(
      'SELECT COUNT(*) AS count FROM transactions WHERE reference_id = ?'
    ).get(checkout.payment.reference).count, 1);
    assert.equal(createdCheckoutCount, 1);
  } finally {
    global.fetch = nativeFetch;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
