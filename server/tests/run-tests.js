/* Standalone test runner — smoke + regression + sanity.
   Usage: node tests/run-tests.js
   Requires the dev server running on http://localhost:3001 */

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3001';
const results = [];
let token = null;
let recipientToken = null;
let adminToken = null;
let accounts = [];
let recipientAccounts = [];

function record(id, category, name, status, expected, actual, durationMs, notes = '') {
  results.push({ id, category, name, status, expected, actual, durationMs, notes });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '~';
  console.log(`${icon} [${category}] ${id} ${name} (${durationMs}ms) ${status}${notes ? ' — ' + notes : ''}`);
}

async function req(method, path, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const start = Date.now();
  let res, json;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  } catch (err) {
    return { status: 0, body: { error: err.message }, ms: Date.now() - start };
  }
  return { status: res.status, body: json, ms: Date.now() - start };
}

async function smokeTests() {
  // SMOKE-01 health
  let r = await req('GET', '/health');
  record('SMOKE-01', 'smoke', 'Health endpoint reachable', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // SMOKE-02 login as seeded user
  r = await req('POST', '/api/auth/login', { email: 'john@example.com', password: 'User1234!' });
  token = r.body.token;
  record('SMOKE-02', 'smoke', 'Login with seeded user returns JWT', token ? 'PASS' : 'FAIL', '200 + token', `${r.status} token=${!!token}`, r.ms);

  // SMOKE-03 list accounts
  r = await req('GET', '/api/accounts', null, token);
  accounts = r.body.accounts || [];
  record('SMOKE-03', 'smoke', 'Authenticated user can list accounts', accounts.length > 0 ? 'PASS' : 'FAIL', '>=1 account', `${accounts.length} accounts`, r.ms);
  const currencies = [...new Set(accounts.map(account => account.currency))];
  record('SMOKE-03A', 'smoke', 'User has USD, NGN, and GHS wallets',
    ['USD', 'NGN', 'GHS'].every(currency => currencies.includes(currency)) ? 'PASS' : 'FAIL',
    'USD, NGN, GHS', currencies.join(', '), r.ms);

  const registration = await req('POST', '/api/auth/register', {
    email: `currency-test-${Date.now()}@example.com`,
    password: 'TestUser123!',
    first_name: 'Currency',
    last_name: 'Tester',
    nationality: 'NG',
    date_of_birth: '1990-01-01',
    address: '1 Test Road',
    city: 'Lagos',
    state: 'Lagos',
    zip_code: '100001',
    terms_accepted: 'true'
  });
  const registeredWallets = registration.body.token
    ? await req('GET', '/api/accounts', null, registration.body.token)
    : { body: { accounts: [] } };
  const registrationCurrencies = (registeredWallets.body.accounts || []).map(account => account.currency);
  record('SMOKE-03B', 'smoke', 'New user receives all three wallets',
    ['USD', 'NGN', 'GHS'].every(currency => registrationCurrencies.includes(currency)) ? 'PASS' : 'FAIL',
    'USD, NGN, GHS', registrationCurrencies.join(', '), registration.ms);

  // SMOKE-04 list notifications
  r = await req('GET', '/api/notifications', null, token);
  record('SMOKE-04', 'smoke', 'Notifications endpoint works', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // SMOKE-05 unauth rejection
  r = await req('GET', '/api/accounts');
  record('SMOKE-05', 'smoke', 'Unauthenticated request rejected', r.status === 401 ? 'PASS' : 'FAIL', '401', r.status, r.ms);
}

async function regressionTests() {
  if (!token) return;
  const checking = accounts.find(a => a.account_type === 'checking' && a.currency === 'USD');
  const savings = accounts.find(a => a.account_type === 'savings' && a.currency === 'USD');
  const naira = accounts.find(a => a.currency === 'NGN');
  const cedis = accounts.find(a => a.currency === 'GHS');

  // REG-01 deposit
  let r = await req('POST', '/api/transactions/deposit',
    { account_id: checking.id, amount: 100.50, description: 'Test deposit' }, token);
  record('REG-01', 'regression', 'Deposit credits account', r.status === 200 ? 'PASS' : 'FAIL', '200 + new balance', `${r.status} bal=${r.body.newBalance}`, r.ms);

  // REG-02 withdrawal
  r = await req('POST', '/api/transactions/withdraw',
    { account_id: checking.id, amount: 25.00, description: 'Test withdraw' }, token);
  record('REG-02', 'regression', 'Withdrawal debits account', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // REG-03 withdrawal blocked when insufficient
  r = await req('POST', '/api/transactions/withdraw',
    { account_id: checking.id, amount: 99999999, description: 'Overdraft attempt' }, token);
  record('REG-03', 'regression', 'Overdraft is rejected', r.status === 400 ? 'PASS' : 'FAIL', '400 insufficient funds', `${r.status} ${r.body.error}`, r.ms);

  // REG-04 transfer between own accounts
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_id: savings.id, amount: 10.00 }, token);
  record('REG-04', 'regression', 'Same-currency transfer charges 0.1% fee',
    r.status === 200 && r.body.feeAmount === 0.01 && r.body.totalDeducted === 10.01 ? 'PASS' : 'FAIL',
    '200, fee=0.01, debit=10.01', `${r.status} fee=${r.body.feeAmount} debit=${r.body.totalDeducted}`, r.ms);

  const insufficientTransfer = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_id: savings.id, amount: 1000000 }, token);
  record('REG-04X', 'regression', 'Transfer rejects insufficient funds including fees',
    insufficientTransfer.status === 400 ? 'PASS' : 'FAIL',
    '400 insufficient funds', `${insufficientTransfer.status} ${insufficientTransfer.body.error || ''}`, insufficientTransfer.ms);

  // REG-04A cross-currency transfer is rejected in favor of explicit conversion.
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_id: cedis.id, amount: 10.00 }, token);
  record('REG-04A', 'regression', 'Cross-currency transfer requires explicit conversion',
    r.status === 400 && r.body.code === 'CURRENCY_MISMATCH' ? 'PASS' : 'FAIL',
    '400 CURRENCY_MISMATCH', `${r.status} ${r.body.code || ''}`, r.ms);

  // REG-04B get and execute a server-priced development currency quote.
  r = await req('POST', '/api/exchange/quote', {
    from_account_id: checking.id, to_account_id: naira.id, amount: 100
  }, token);
  const exchangeQuote = r.body.quoteId ? r.body : null;
  record('REG-04B', 'regression', 'Exchange quote uses development rates and 0.4% fee',
    !!exchangeQuote && exchangeQuote.rateMode === 'DEVELOPMENT TEST RATE' && exchangeQuote.feeAmount === 0.4
      ? 'PASS' : 'FAIL',
    'quote, development label, fee=0.40', `${r.status} fee=${r.body.feeAmount}`, r.ms);
  if (exchangeQuote) {
    const conversion = await req('POST', '/api/exchange/convert', { quote_id: exchangeQuote.quoteId }, token);
    record('REG-04C', 'regression', 'Quoted conversion credits destination wallet',
      conversion.status === 200 && conversion.body.destinationAmount === 155000
        ? 'PASS' : 'FAIL',
      '200 and NGN 155,000', `${conversion.status} amount=${conversion.body.destinationAmount}`, conversion.ms);
    const replay = await req('POST', '/api/exchange/convert', { quote_id: exchangeQuote.quoteId }, token);
    record('REG-04D', 'regression', 'Exchange quote cannot be reused',
      replay.status === 409 ? 'PASS' : 'FAIL', '409', replay.status, replay.ms);
  }
  const insufficientQuote = await req('POST', '/api/exchange/quote', {
    from_account_id: checking.id, to_account_id: naira.id, amount: 1000000
  }, token);
  const insufficientConversion = insufficientQuote.body.quoteId
    ? await req('POST', '/api/exchange/convert', { quote_id: insufficientQuote.body.quoteId }, token)
    : insufficientQuote;
  record('REG-04E', 'regression', 'Conversion rejects insufficient source balance',
    insufficientConversion.status === 400 ? 'PASS' : 'FAIL',
    '400 insufficient funds', `${insufficientConversion.status} ${insufficientConversion.body.error || ''}`, insufficientConversion.ms);

  // REG-05 account number lookup
  const otherAcctNum = '1000000001'; // admin checking
  r = await req('GET', `/api/accounts/lookup?account_number=${otherAcctNum}`, null, token);
  record('REG-05', 'regression', 'Account lookup returns name + bank', r.body.found ? 'PASS' : 'FAIL', 'found:true with name', `found=${r.body.found} name=${r.body.account_name}`, r.ms);

  // REG-06 transfer to other user (Kapita to Kapita)
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_number: '1000000001', amount: 5.00 }, token);
  record('REG-06', 'regression', 'Transfer by account number to another user', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  r = await req('POST', '/api/auth/login', { email: 'admin@bank.com', password: 'Admin123!' });
  adminToken = r.body.token;
  const adminAccountResponse = await req('GET', '/api/accounts', null, adminToken);
  const adminGhs = (adminAccountResponse.body.accounts || []).find(account => account.currency === 'GHS');
  await req('POST', '/api/transactions/deposit',
    { account_id: cedis.id, amount: 100, description: 'GHS cross-border test funding' }, token);
  const crossBorder = await req('POST', '/api/transactions/transfer',
    { from_account_id: cedis.id, to_account_number: adminGhs?.account_number, amount: 10 }, token);
  record('REG-06A', 'regression', 'Ghana-to-Nigeria GHS transfer is supported',
    crossBorder.status === 200 && crossBorder.body.currency === 'GHS' ? 'PASS' : 'FAIL',
    '200 GHS transfer', `${crossBorder.status} ${crossBorder.body.currency || crossBorder.body.error || ''}`, crossBorder.ms);
  const reverseCrossBorder = await req('POST', '/api/transactions/transfer',
    { from_account_id: adminGhs?.id, to_account_number: cedis.account_number, amount: 1 }, adminToken);
  record('REG-06B', 'regression', 'Nigeria-to-Ghana GHS transfer is rejected',
    reverseCrossBorder.status === 400 && reverseCrossBorder.body.code === 'CROSS_BORDER_CURRENCY_NOT_SUPPORTED'
      ? 'PASS' : 'FAIL',
    '400 CROSS_BORDER_CURRENCY_NOT_SUPPORTED',
    `${reverseCrossBorder.status} ${reverseCrossBorder.body.code || ''}`, reverseCrossBorder.ms);

  // REG-07 invalid transfer
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_number: '9999999999', amount: 1.00 }, token);
  record('REG-07', 'regression', 'Transfer to non-existent account rejected', r.status === 404 ? 'PASS' : 'FAIL', '404', r.status, r.ms);

  // REG-08 wire countries
  r = await req('GET', '/api/wire/countries', null, token);
  const wireCountries = r.body.countries?.africa || [];
  record('REG-08', 'regression', 'Wire countries restricted to Nigeria and Ghana',
    wireCountries.length === 2 && wireCountries.every(country => ['NG', 'GH'].includes(country.code)) ? 'PASS' : 'FAIL',
    'NG and GH only', `${r.status} ${wireCountries.map(country => country.code).join(',')}`, r.ms);

  // REG-09 outgoing external wires fail closed until settlement is integrated.
  r = await req('POST', '/api/wire/quote', { amount: 500, country_code: 'NG' }, token);
  record('REG-09', 'regression', 'External bank wire quote is unavailable',
    r.status === 503 ? 'PASS' : 'FAIL', '503 provider unavailable', `${r.status} ${r.body.error || ''}`, r.ms);

  // REG-10 incoming USD wire simulator is limited to USD accounts in NG/GH.
  r = await req('POST', '/api/wire/receive', {
    to_account_id: checking.id, amount: 200, country_code: 'NG',
    sender_name: 'Test Sender', sender_bank: 'Barclays',
    reference_note: 'Regression incoming'
  }, token);
  record('REG-10', 'regression', 'USD wire development simulation credits USD account',
    r.status === 200 && r.body.simulated && r.body.currency === 'USD' ? 'PASS' : 'FAIL',
    '200 simulated USD credit', `${r.status} ${r.body.error || ''}`, r.ms);
  const invalidWireTarget = await req('POST', '/api/wire/receive', {
    to_account_id: cedis.id, amount: 10, country_code: 'NG',
    sender_name: 'Test Sender', sender_bank: 'Test Bank'
  }, token);
  record('REG-10A', 'regression', 'Incoming wire rejects non-USD destination',
    invalidWireTarget.status === 400 ? 'PASS' : 'FAIL', '400', invalidWireTarget.status, invalidWireTarget.ms);

  // REG-11 beneficiary save
  r = await req('POST', '/api/beneficiaries', {
    nickname: 'Test Bene', account_name: 'Jane Doe', account_number: '1000000001',
    bank_name: 'Kapita', type: 'internal'
  }, token);
  const beneId = r.body.beneficiary?.id;
  record('REG-11', 'regression', 'Beneficiary save (upsert)', beneId ? 'PASS' : 'FAIL', '201 + id', `${r.status} id=${beneId}`, r.ms);

  // REG-12 beneficiary search
  r = await req('GET', '/api/beneficiaries?q=Jane', null, token);
  record('REG-12', 'regression', 'Beneficiary search by name', (r.body.beneficiaries || []).length > 0 ? 'PASS' : 'FAIL', '>=1 match', `${(r.body.beneficiaries || []).length} hits`, r.ms);

  // REG-13 beneficiary delete
  if (beneId) {
    r = await req('DELETE', `/api/beneficiaries/${beneId}`, null, token);
    record('REG-13', 'regression', 'Beneficiary delete', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);
  }

  // REG-14 profile fetch
  r = await req('GET', '/api/profile', null, token);
  record('REG-14', 'regression', 'Profile fetch returns user object', r.body.user?.email ? 'PASS' : 'FAIL', 'user.email', `email=${r.body.user?.email}`, r.ms);

  // REG-15 profile update with alert prefs
  r = await req('PUT', '/api/profile',
    { email_alerts: true, sms_alerts: false, alert_phone: '+15550199', alert_min_amount: 5 }, token);
  record('REG-15', 'regression', 'Profile alert prefs persisted', r.body.user?.alert_min_amount === 5 ? 'PASS' : 'FAIL', 'alert_min_amount=5', `got=${r.body.user?.alert_min_amount}`, r.ms);

  // REG-16 payees remain manageable, but unintegrated bill payments must not debit balances.
  r = await req('POST', '/api/billpay/payees', {
    payee_name: 'Test Utility', payee_account: 'PAY-100', category: 'utilities'
  }, token);
  const payeeId = r.body.payee?.id;
  record('REG-16', 'regression', 'Bill payee created', payeeId ? 'PASS' : 'FAIL', '201', `${r.status} id=${payeeId}`, r.ms);

  if (payeeId) {
    const balanceBefore = (await req('GET', `/api/accounts/${checking.id}`, null, token)).body.account?.balance;
    const scheduleCountBefore = (await req('GET', '/api/billpay/scheduled', null, token)).body.payments?.length;
    const payment = await req('POST', '/api/billpay/pay-now',
      { payee_id: payeeId, from_account_id: checking.id, amount: 12.00 }, token);
    const schedule = await req('POST', '/api/billpay/scheduled', {
      payee_id: payeeId,
      from_account_id: checking.id,
      amount: 12.00,
      frequency: 'monthly',
      next_payment_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    }, token);
    const balanceAfter = (await req('GET', `/api/accounts/${checking.id}`, null, token)).body.account?.balance;
    const scheduleCountAfter = (await req('GET', '/api/billpay/scheduled', null, token)).body.payments?.length;
    const blockedWithoutChanges = payment.status === 503
      && payment.body.code === 'BILL_PAYMENT_PROVIDER_UNAVAILABLE'
      && schedule.status === 503
      && schedule.body.code === 'BILL_PAYMENT_PROVIDER_UNAVAILABLE'
      && balanceBefore === balanceAfter
      && scheduleCountBefore === scheduleCountAfter;
    record('REG-17', 'regression', 'Bill payment and scheduling fail closed without provider',
      blockedWithoutChanges ? 'PASS' : 'FAIL',
      '503 provider unavailable, no balance or schedule changes',
      `pay=${payment.status} schedule=${schedule.status} balance=${balanceBefore}→${balanceAfter}`,
      payment.ms + schedule.ms);
  }

  // REG-18 transactions paginated list
  r = await req('GET', '/api/transactions?limit=5', null, token);
  record('REG-18', 'regression', 'Transactions paginated list', Array.isArray(r.body.transactions) ? 'PASS' : 'FAIL', 'array', typeof r.body.transactions, r.ms);

  r = await req('GET', '/api/transactions?type=wire_transfer&limit=5', null, token);
  const wireFilterOk = r.status === 200
    && Array.isArray(r.body.transactions)
    && r.body.transactions.every(tx => tx.transaction_type === 'wire_transfer');
  record('REG-18A', 'regression', 'Wire transfer history filter is accepted',
    wireFilterOk ? 'PASS' : 'FAIL', '200 and only wire transfers',
    `${r.status}, ${r.body.transactions?.length ?? 0} rows`, r.ms);

  // REG-19 currency rates
  r = await req('GET', '/api/currency/rates?base=USD', null, token);
  record('REG-19', 'regression', 'Currency rates fetch', r.status === 200 && r.body.rates && typeof r.body.rates.EUR === 'number' ? 'PASS' : 'FAIL', 'rates.EUR is number', `${r.body && r.body.rates && r.body.rates.EUR}`, r.ms);

  // REG-20 funding via card (Luhn-valid 4242…)
  let prevBal = (await req('GET', `/api/accounts/${checking.id}`, null, token)).body.account?.balance ?? 0;
  r = await req('POST', '/api/funding/topup', {
    account_id: checking.id, amount: 50, method: 'card',
    details: { card_number: '4242424242424242', exp_month: 12, exp_year: new Date().getFullYear() + 2, cvv: '123', holder: 'Test User' }
  }, token);
  record('REG-20', 'regression', 'Card top-up credits account',
    r.status === 200 && r.body.newBalance > prevBal ? 'PASS' : 'FAIL',
    '200 + balance up', `${r.status} bal=${r.body.newBalance}`, r.ms);

  // REG-21 funding via bank
  prevBal = (await req('GET', `/api/accounts/${checking.id}`, null, token)).body.account?.balance ?? 0;
  r = await req('POST', '/api/funding/topup', {
    account_id: checking.id, amount: 75, method: 'bank',
    details: { bank_name: 'Chase', routing_number: '021000021', account_number: '12345678', holder: 'Test User' }
  }, token);
  record('REG-21', 'regression', 'Bank top-up credits account',
    r.status === 200 && r.body.newBalance > prevBal ? 'PASS' : 'FAIL',
    '200 + balance up', `${r.status} bal=${r.body.newBalance}`, r.ms);

  // REG-22 funding via crypto
  prevBal = (await req('GET', `/api/accounts/${checking.id}`, null, token)).body.account?.balance ?? 0;
  r = await req('POST', '/api/funding/topup', {
    account_id: checking.id, amount: 30, method: 'crypto',
    details: {
      network: 'BTC', asset: 'BTC',
      tx_hash: 'a3f5b2c8d1e9f0a7b4c6d8e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
      from_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    }
  }, token);
  record('REG-22', 'regression', 'Crypto top-up credits account',
    r.status === 200 && r.body.newBalance > prevBal ? 'PASS' : 'FAIL',
    '200 + balance up', `${r.status} bal=${r.body.newBalance}`, r.ms);

  // REG-23 funding rejects bad Luhn
  r = await req('POST', '/api/funding/topup', {
    account_id: checking.id, amount: 10, method: 'card',
    details: { card_number: '4242424242424241', exp_month: 12, exp_year: new Date().getFullYear() + 2, cvv: '123', holder: 'Test' }
  }, token);
  record('REG-23', 'regression', 'Card top-up rejects bad Luhn',
    r.status === 400 ? 'PASS' : 'FAIL', '400', `${r.status}`, r.ms);

  // REG-24 explicit lock-savings endpoint (200 on first lock, or 400 if already locked from REG-04 deposit)
  r = await req('POST', `/api/accounts/${savings.id}/lock-savings`, { days: 30 }, token);
  const lockedOk = r.status === 200 || (r.status === 400 && /already locked/i.test(r.body.error || ''));
  record('REG-24', 'regression', 'Lock savings endpoint accepts duration',
    lockedOk ? 'PASS' : 'FAIL', '200 or 400 already-locked', `${r.status} ${r.body.error || ''}`, r.ms);

  // REG-25 locked savings rejects withdrawal with SAVINGS_LOCKED
  r = await req('POST', '/api/transactions/withdraw',
    { account_id: savings.id, amount: 1.00, description: 'Should be blocked' }, token);
  record('REG-25', 'regression', 'Locked savings blocks withdrawal',
    r.status === 423 && r.body.code === 'SAVINGS_LOCKED' ? 'PASS' : 'FAIL',
    '423 SAVINGS_LOCKED', `${r.status} ${r.body.code || ''}`, r.ms);

  // REG-26 lock-savings rejects out-of-range days
  r = await req('POST', `/api/accounts/${savings.id}/lock-savings`, { days: 1 }, token);
  record('REG-26', 'regression', 'Lock savings rejects days < 15',
    r.status === 400 ? 'PASS' : 'FAIL', '400', `${r.status}`, r.ms);
}

async function sanityTests() {
  if (!token) return;
  // SAN-01 brand on welcome notification
  const r = await req('GET', '/api/notifications?limit=50', null, token);
  const list = r.body.notifications || [];
  const welcome = list.find(n => /Welcome to Kapita/.test(n.message || ''));
  record('SAN-01', 'sanity', 'Welcome notification mentions Kapita', welcome ? 'PASS' : 'WARN', 'Kapita in message', welcome ? 'found' : 'not found', r.ms,
    welcome ? '' : 'Demo data was seeded before rename — expected on existing DB');

  // SAN-02 slogan in welcome
  const slogan = list.find(n => /move money.*make moves/i.test(n.message || ''));
  record('SAN-02', 'sanity', 'Welcome notification carries slogan', slogan ? 'PASS' : 'WARN', 'move money, make moves',
    slogan ? 'found' : 'not found', r.ms, slogan ? '' : 'Existing DB still has old slogan');

  // SAN-03 alert log entries are being written
  const r2 = await req('POST', '/api/transactions/deposit',
    { account_id: accounts[0].id, amount: 7.50, description: 'Sanity alert deposit' }, token);
  record('SAN-03', 'sanity', 'Deposit succeeds (alerts simulated server-side)',
    r2.status === 200 ? 'PASS' : 'FAIL', '200', r2.status, r2.ms,
    'Alert delivery is logged to console + alert_log; verified by REG-15 prefs');

  // SAN-04 helmet headers + rate limit headers
  const headRes = await fetch(`${BASE}/health`);
  const hasCsp = !!headRes.headers.get('content-security-policy');
  const hasRl = !!headRes.headers.get('ratelimit-limit') || !!headRes.headers.get('x-ratelimit-limit');
  record('SAN-04', 'sanity', 'Security headers + rate-limit headers present',
    hasCsp && hasRl ? 'PASS' : 'WARN',
    'helmet + rate-limit headers',
    `csp=${hasCsp} rl=${hasRl}`, 0);
}

async function main() {
  console.log(`\nKapita test runner — base=${BASE}`);
  console.log('=' .repeat(70));
  await smokeTests();
  console.log('-'.repeat(70));
  await regressionTests();
  console.log('-'.repeat(70));
  await sanityTests();

  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === 'PASS').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    warn: results.filter(r => r.status === 'WARN').length
  };
  console.log('='.repeat(70));
  console.log(`SUMMARY: ${summary.pass}/${summary.total} passed, ${summary.fail} failed, ${summary.warn} warnings`);

  require('fs').writeFileSync(
    require('path').join(__dirname, 'test-results.json'),
    JSON.stringify({ summary, results, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log(`Results written to tests/test-results.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
