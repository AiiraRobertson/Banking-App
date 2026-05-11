const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendTransactionAlert } = require('../utils/alerts');
const { applyLockOnDeposit } = require('../utils/savingsLock');

const router = express.Router();
router.use(authenticate);

const VALID_METHODS = ['card', 'bank', 'crypto'];
const VALID_NETWORKS = ['BTC', 'ETH', 'SOL', 'TRON', 'BSC', 'POLYGON'];

function luhnValid(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '').split('').reverse().map(Number);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function detectCardBrand(cardNumber) {
  const n = cardNumber.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  if (/^35/.test(n)) return 'JCB';
  return 'Card';
}

function shortRef(prefix) {
  return `${prefix}-${uuidv4().split('-')[0].toUpperCase()}`;
}

function validateMethodDetails(method, details) {
  if (!details || typeof details !== 'object') return 'details object is required';
  const currentYear = new Date().getFullYear();

  if (method === 'card') {
    const num = String(details.card_number || '').replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(num)) return 'card_number must be 13-19 digits';
    if (!luhnValid(num)) return 'card_number failed Luhn check';
    const m = parseInt(details.exp_month, 10);
    const y = parseInt(details.exp_year, 10);
    if (!(m >= 1 && m <= 12)) return 'exp_month must be 1-12';
    if (!(y >= currentYear && y <= currentYear + 10)) return 'exp_year must be within 10 years';
    if (!/^\d{3,4}$/.test(String(details.cvv || ''))) return 'cvv must be 3-4 digits';
    if (!String(details.holder || '').trim()) return 'holder is required';
    return null;
  }

  if (method === 'bank') {
    if (!String(details.bank_name || '').trim()) return 'bank_name is required';
    if (!/^\d{9}$/.test(String(details.routing_number || ''))) return 'routing_number must be 9 digits';
    if (!/^\d{4,17}$/.test(String(details.account_number || ''))) return 'account_number must be 4-17 digits';
    if (!String(details.holder || '').trim()) return 'holder is required';
    return null;
  }

  if (method === 'crypto') {
    if (!VALID_NETWORKS.includes(String(details.network || '').toUpperCase())) {
      return `network must be one of ${VALID_NETWORKS.join(', ')}`;
    }
    if (!/^[A-Za-z]{2,10}$/.test(String(details.asset || ''))) return 'asset must be 2-10 letters';
    if (!/^[A-Fa-f0-9]{16,128}$/.test(String(details.tx_hash || ''))) return 'tx_hash must be 16-128 hex chars';
    if (!/^[A-Za-z0-9]{16,128}$/.test(String(details.from_address || ''))) return 'from_address must be 16-128 alphanumeric chars';
    return null;
  }

  return 'unsupported method';
}

router.post('/topup', [
  body('account_id').isInt({ min: 1 }).withMessage('Valid account ID required'),
  body('amount').isFloat({ min: 0.01, max: 1000000 }).withMessage('Amount must be between $0.01 and $1,000,000'),
  body('method').isIn(VALID_METHODS).withMessage(`method must be one of ${VALID_METHODS.join(', ')}`),
  handleValidation
], (req, res) => {
  const { account_id, amount, method, details } = req.body;
  const amt = Math.round(amount * 100) / 100;

  const detailsErr = validateMethodDetails(method, details);
  if (detailsErr) return res.status(400).json({ errors: [{ field: 'details', message: detailsErr }] });

  const account = db.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1'
  ).get(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  let sourceRow;
  let counterpartyLabel;
  let externalRef;

  if (method === 'card') {
    const num = details.card_number.replace(/\s+/g, '');
    const brand = detectCardBrand(num);
    const last4 = num.slice(-4);
    externalRef = shortRef('CARD');
    sourceRow = {
      method, external_ref: externalRef,
      card_brand: brand, card_last4: last4, card_holder: String(details.holder).trim()
    };
    counterpartyLabel = `${brand} •••${last4}`;
  } else if (method === 'bank') {
    const routingLast4 = String(details.routing_number).slice(-4);
    const accountLast4 = String(details.account_number).slice(-4);
    externalRef = shortRef('ACH');
    sourceRow = {
      method, external_ref: externalRef,
      bank_name: String(details.bank_name).trim(),
      bank_routing_last4: routingLast4,
      bank_account_last4: accountLast4,
      bank_holder: String(details.holder).trim()
    };
    counterpartyLabel = `${sourceRow.bank_name} ••${accountLast4}`;
  } else {
    const network = String(details.network).toUpperCase();
    const asset = String(details.asset).toUpperCase();
    externalRef = details.tx_hash;
    sourceRow = {
      method, external_ref: externalRef,
      crypto_network: network,
      crypto_asset: asset,
      crypto_tx_hash: details.tx_hash,
      crypto_from_address: details.from_address
    };
    const shortHash = `${details.tx_hash.slice(0, 6)}…${details.tx_hash.slice(-4)}`;
    counterpartyLabel = `${asset} on ${network} (${shortHash})`;
  }

  const description =
    method === 'card' ? `Card top-up — ${counterpartyLabel}` :
    method === 'bank' ? `Bank transfer from ${counterpartyLabel}` :
    `Crypto deposit ${counterpartyLabel}`;

  const topUp = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amt, account_id);
    applyLockOnDeposit(account_id);
    const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account_id).balance;

    const refId = uuidv4();
    const txInsert = db.prepare(`
      INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
      VALUES (NULL, ?, 'deposit', ?, ?, ?, ?)
    `).run(account_id, amt, newBalance, description, refId);
    const transactionId = txInsert.lastInsertRowid;

    db.prepare(`
      INSERT INTO deposit_sources (
        transaction_id, method, external_ref,
        card_brand, card_last4, card_holder,
        bank_name, bank_routing_last4, bank_account_last4, bank_holder,
        crypto_network, crypto_asset, crypto_tx_hash, crypto_from_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId, sourceRow.method, sourceRow.external_ref,
      sourceRow.card_brand || null, sourceRow.card_last4 || null, sourceRow.card_holder || null,
      sourceRow.bank_name || null, sourceRow.bank_routing_last4 || null, sourceRow.bank_account_last4 || null, sourceRow.bank_holder || null,
      sourceRow.crypto_network || null, sourceRow.crypto_asset || null, sourceRow.crypto_tx_hash || null, sourceRow.crypto_from_address || null
    );

    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, 'Funds Added',
      `$${amt.toFixed(2)} added to account ${account.account_number} via ${method}.`,
      'transaction');

    return { referenceId: refId, newBalance };
  })();

  sendTransactionAlert({
    userId: req.user.id,
    direction: 'credit',
    amount: amt,
    accountNumber: account.account_number,
    balanceAfter: topUp.newBalance,
    counterparty: counterpartyLabel,
    referenceId: topUp.referenceId
  });

  res.json({
    message: 'Top-up successful',
    referenceId: topUp.referenceId,
    newBalance: topUp.newBalance,
    method,
    externalRef,
    summary: counterpartyLabel
  });
});

module.exports = router;
