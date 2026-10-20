const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.TEST_BASE || 'http://127.0.0.1:3001';
let token;
let checking;
const get = async path => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
const post = async (path, body) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('authenticated outbound API exposes only NG/GH and country-specific supported banks', async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john@example.com', password: 'User1234!' }),
  });
  assert.equal(login.status, 200);
  token = (await login.json()).token;
  assert.ok(token);

  const [destinationResponse, nigeriaResponse, ghanaResponse] = await Promise.all([
    get('/api/wire/destinations'),
    get('/api/wire/outbound-banks?country_code=NG'),
    get('/api/wire/outbound-banks?country_code=GH'),
  ]);
  assert.equal(destinationResponse.status, 200);
  const { destinations } = await destinationResponse.json();
  assert.deepEqual(destinations.map(country => country.code), ['NG', 'GH']);
  assert.equal(destinations[0].currency, 'NGN');
  assert.equal(destinations[1].currency, 'GHS');

  const nigeria = await nigeriaResponse.json();
  const ghana = await ghanaResponse.json();
  assert.equal(nigeriaResponse.status, 200);
  assert.equal(ghanaResponse.status, 200);
  assert.equal(nigeria.banks.length, 8);
  assert.equal(ghana.banks.length, 6);
  assert.ok(!nigeria.banks.some(bank => ghana.banks.some(ghanaBank => ghanaBank.name === bank.name)));

  const unsupportedBanks = await get('/api/wire/outbound-banks?country_code=GB');
  assert.equal(unsupportedBanks.status, 400);
  assert.equal((await unsupportedBanks.json()).code, 'UNSUPPORTED_DESTINATION_COUNTRY');

  const accountResponse = await get('/api/accounts');
  checking = (await accountResponse.json()).accounts.find(account => account.account_type === 'checking');
  assert.ok(checking);
});

test('direct unsupported wire submissions are rejected without changing balance or history', async () => {
  const beforeAccountResponse = await get(`/api/accounts/${checking.id}`);
  const beforeHistoryResponse = await get('/api/wire/history?limit=100');
  const beforeAccount = (await beforeAccountResponse.json()).account;
  const beforeHistory = (await beforeHistoryResponse.json()).pagination;

  const basePayload = {
    from_account_id: checking.id,
    amount: 10,
    country_code: 'NG',
    recipient_name: 'API test recipient',
    recipient_bank: 'Guaranty Trust Bank',
    recipient_account: '0123456789',
    swift_code: 'GTBINGLA',
  };
  const cases = [
    { ...basePayload, country_code: 'GB' },
    { ...basePayload, recipient_bank: 'Unsupported Bank' },
    { ...basePayload, recipient_bank: 'GCB Bank', swift_code: 'GHCBGHAC' },
    { ...basePayload, recipient_account: '1234' },
    { ...basePayload, amount: 0 },
    { ...basePayload, amount: -5 },
  ];

  for (const payload of cases) {
    const response = await post('/api/wire/send', payload);
    assert.equal(response.status, 400, JSON.stringify(await response.json()));
  }

  const afterAccountResponse = await get(`/api/accounts/${checking.id}`);
  const afterHistoryResponse = await get('/api/wire/history?limit=100');
  const afterAccount = (await afterAccountResponse.json()).account;
  const afterHistory = (await afterHistoryResponse.json()).pagination;
  assert.equal(afterAccount.balance, beforeAccount.balance);
  assert.equal(afterHistory.total, beforeHistory.total);
});
