const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.TEST_BASE || 'http://127.0.0.1:3001';
let token;
let checking;

async function request(method, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('authenticated account owner can read only their own active account records', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john@example.com', password: 'User1234!' }),
  });
  assert.equal(loginResponse.status, 200);
  token = (await loginResponse.json()).token;

  const accountsResponse = await request('GET', '/api/accounts');
  assert.equal(accountsResponse.status, 200);
  const accounts = (await accountsResponse.json()).accounts;
  assert.ok(accounts.length > 0);
  checking = accounts.find(account => account.account_type === 'savings');

  const accountDetails = await request('GET', `/api/accounts/${checking.id}`);
  assert.equal(accountDetails.status, 200);
  assert.equal((await accountDetails.json()).account.account_number, checking.account_number);

  const lookup = await fetch(`${baseUrl}/api/accounts/lookup?account_number=${checking.account_number}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lookupBody = await lookup.json();
  assert.equal(lookup.status, 200);
  assert.equal(lookupBody.account_name, 'John Doe');
  assert.equal(lookupBody.bank_name, 'Kapita');

  const otherUsersAccount = await request('GET', '/api/accounts/1');
  if (checking.id !== 1) assert.equal(otherUsersAccount.status, 404);
});

test('card, bank, and crypto direct top-ups are rejected without balance changes', async () => {
  const beforeResponse = await request('GET', `/api/accounts/${checking.id}`);
  const beforeBalance = (await beforeResponse.json()).account.balance;
  const requests = [
    { method: 'card', details: { card_number: '4242424242424242' } },
    { method: 'bank', details: { bank_name: 'Example Bank', account_number: '12345678' } },
    { method: 'crypto', details: { network: 'BTC', tx_hash: 'a'.repeat(64) } },
  ];

  for (const funding of requests) {
    const response = await request('POST', '/api/funding/topup', {
      account_id: checking.id,
      amount: 25,
      ...funding,
    });
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, 'DIRECT_FUNDING_DISABLED');
  }

  const afterResponse = await request('GET', `/api/accounts/${checking.id}`);
  assert.equal(Math.round((await afterResponse.json()).account.balance * 100), Math.round(beforeBalance * 100));
});
