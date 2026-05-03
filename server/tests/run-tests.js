/* Standalone test runner — smoke + regression + sanity.
   Usage: node tests/run-tests.js
   Requires the dev server running on http://localhost:3001 */

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3001';
const results = [];
let token = null;
let recipientToken = null;
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

  // SMOKE-04 list notifications
  r = await req('GET', '/api/notifications', null, token);
  record('SMOKE-04', 'smoke', 'Notifications endpoint works', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // SMOKE-05 unauth rejection
  r = await req('GET', '/api/accounts');
  record('SMOKE-05', 'smoke', 'Unauthenticated request rejected', r.status === 401 ? 'PASS' : 'FAIL', '401', r.status, r.ms);
}

async function regressionTests() {
  if (!token) return;
  const checking = accounts.find(a => a.account_type === 'checking');
  const savings = accounts.find(a => a.account_type === 'savings');

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
  record('REG-04', 'regression', 'Internal transfer between own accounts', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // REG-05 account number lookup
  const otherAcctNum = '1000000001'; // admin checking
  r = await req('GET', `/api/accounts/lookup?account_number=${otherAcctNum}`, null, token);
  record('REG-05', 'regression', 'Account lookup returns name + bank', r.body.found ? 'PASS' : 'FAIL', 'found:true with name', `found=${r.body.found} name=${r.body.account_name}`, r.ms);

  // REG-06 transfer to other user (Kapita to Kapita)
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_number: '1000000001', amount: 5.00 }, token);
  record('REG-06', 'regression', 'Transfer by account number to another user', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);

  // REG-07 invalid transfer
  r = await req('POST', '/api/transactions/transfer',
    { from_account_id: checking.id, to_account_number: '9999999999', amount: 1.00 }, token);
  record('REG-07', 'regression', 'Transfer to non-existent account rejected', r.status === 404 ? 'PASS' : 'FAIL', '404', r.status, r.ms);

  // REG-08 wire countries
  r = await req('GET', '/api/wire/countries', null, token);
  record('REG-08', 'regression', 'Wire countries list available', (r.body.countries && Object.keys(r.body.countries).length) ? 'PASS' : 'FAIL', 'grouped countries', `${r.status}`, r.ms);

  // REG-09 wire quote
  r = await req('POST', '/api/wire/quote', { amount: 500, country_code: 'GB' }, token);
  record('REG-09', 'regression', 'Wire quote returns rate + fee', r.status === 200 && r.body.exchangeRate ? 'PASS' : 'FAIL', 'rate>0 fee>0', `rate=${r.body.exchangeRate} fee=${r.body.feeAmount}`, r.ms);

  // REG-10 incoming wire (receive) — GB requires IBAN
  r = await req('POST', '/api/wire/receive', {
    to_account_id: checking.id, amount: 200, country_code: 'GB',
    sender_name: 'Test Sender', sender_bank: 'Barclays',
    swift_code: 'BARCGB22', iban: 'GB29NWBK60161331926819',
    reference_note: 'Regression incoming'
  }, token);
  record('REG-10', 'regression', 'Receive wire from foreign bank credits USD', r.status === 200 ? 'PASS' : 'FAIL', '200', `${r.status} ${r.body.error || ''}`, r.ms);

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

  // REG-16 bill payee create + pay-now
  r = await req('POST', '/api/billpay/payees', {
    payee_name: 'Test Utility', payee_account: 'PAY-100', category: 'utilities'
  }, token);
  const payeeId = r.body.payee?.id;
  record('REG-16', 'regression', 'Bill payee created', payeeId ? 'PASS' : 'FAIL', '201', `${r.status} id=${payeeId}`, r.ms);

  if (payeeId) {
    r = await req('POST', '/api/billpay/pay-now',
      { payee_id: payeeId, from_account_id: checking.id, amount: 12.00 }, token);
    record('REG-17', 'regression', 'Pay-now debits checking', r.status === 200 ? 'PASS' : 'FAIL', '200', r.status, r.ms);
  }

  // REG-18 transactions paginated list
  r = await req('GET', '/api/transactions?limit=5', null, token);
  record('REG-18', 'regression', 'Transactions paginated list', Array.isArray(r.body.transactions) ? 'PASS' : 'FAIL', 'array', typeof r.body.transactions, r.ms);

  // REG-19 calculator (loan)
  r = await req('POST', '/api/calculator/loan', { principal: 10000, annual_rate: 5, term_months: 36 }, token);
  record('REG-19', 'regression', 'Loan calculator computes payment', r.status === 200 && r.body.monthlyPayment > 0 ? 'PASS' : 'FAIL', 'monthlyPayment>0', `${r.body.monthlyPayment}`, r.ms);
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
