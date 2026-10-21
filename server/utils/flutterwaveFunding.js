const API_URL = 'https://api.flutterwave.com/v3';
const REQUEST_TIMEOUT_MS = 15000;
const { timingSafeEqual } = require('crypto');

function getFlutterwaveConfig(env = process.env) {
  const redirectUrl = env.FLW_REDIRECT_URL;
  let validRedirect = false;
  try {
    const parsed = new URL(redirectUrl);
    validRedirect = parsed.protocol === 'https:' ||
      (env.NODE_ENV !== 'production' && parsed.hostname === 'localhost' && parsed.protocol === 'http:');
  } catch {
    validRedirect = false;
  }

  const credentialsConfigured = env.FLW_MODE === 'sandbox' &&
    /^FLWSECK_TEST-[\w-]+$/.test(env.FLW_SECRET_KEY || '') &&
    typeof env.FLW_WEBHOOK_SECRET === 'string' &&
    env.FLW_WEBHOOK_SECRET.length >= 32 &&
    validRedirect;

  const cardCurrencies = credentialsConfigured
    ? ['NGN', 'GHS'].filter(currency => env[`FLW_ENABLE_CARD_${currency}`] === 'true')
    : [];
  const bankTransferCurrencies = credentialsConfigured
    ? ['NGN', 'GHS'].filter(currency => env[`FLW_ENABLE_BANK_TRANSFER_${currency}`] === 'true')
    : [];

  return {
    configured: credentialsConfigured,
    mode: credentialsConfigured ? 'sandbox' : null,
    card: cardCurrencies.length > 0,
    cardCurrencies,
    bankTransfer: bankTransferCurrencies.length > 0,
    bankTransferCurrencies,
    crypto: false,
  };
}

function isValidWebhook(req, secret = process.env.FLW_WEBHOOK_SECRET) {
  const signature = req.get('verif-hash');
  if (!secret || !signature) return false;
  const signatureBytes = Buffer.from(signature);
  const secretBytes = Buffer.from(secret);
  if (signatureBytes.length !== secretBytes.length) return false;
  return timingSafeEqual(signatureBytes, secretBytes);
}

async function flutterwaveRequest(path, { method = 'GET', body, fetchImpl = fetch } = {}) {
  const { configured } = getFlutterwaveConfig();
  if (!configured) {
    const error = new Error('Flutterwave sandbox is not configured');
    error.code = 'PROVIDER_UNAVAILABLE';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
      const error = new Error('Flutterwave could not process this funding request');
      error.code = 'PROVIDER_REQUEST_FAILED';
      throw error;
    }
    return result.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function createCardCheckout({ reference, amount, currency, email, name, phone, fetchImpl }) {
  return flutterwaveRequest('/payments', {
    method: 'POST',
    fetchImpl,
    body: {
      tx_ref: reference,
      amount: amount.toFixed(2),
      currency,
      redirect_url: process.env.FLW_REDIRECT_URL,
      payment_options: 'card',
      customer: { email, name, phonenumber: phone || undefined },
      customizations: { title: 'Kapita sandbox funding', description: 'Simulated account deposit' },
    },
  });
}

async function createBankTransfer({ reference, amount, currency, email, name, phone, fetchImpl }) {
  return flutterwaveRequest('/charges?type=bank_transfer', {
    method: 'POST',
    fetchImpl,
    body: {
      tx_ref: reference,
      amount: amount.toFixed(2),
      currency,
      email,
      fullname: name,
      phone_number: phone || undefined,
    },
  });
}

async function verifyTransaction(transactionId, fetchImpl) {
  if (!/^\d+$/.test(String(transactionId))) {
    const error = new Error('Valid provider transaction ID required');
    error.code = 'INVALID_PROVIDER_TRANSACTION';
    throw error;
  }
  return flutterwaveRequest(`/transactions/${encodeURIComponent(transactionId)}/verify`, { fetchImpl });
}

module.exports = {
  getFlutterwaveConfig,
  isValidWebhook,
  createCardCheckout,
  createBankTransfer,
  verifyTransaction,
};
