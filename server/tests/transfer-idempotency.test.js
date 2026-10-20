const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const baseUrl = process.env.TEST_BASE || 'http://127.0.0.1:3001';
let userToken;
let adminToken;
let sender;
let recipient;

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

async function getAccount(token, accountId) {
  const response = await fetch(`${baseUrl}/api/accounts/${accountId}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  return (await response.json()).account;
}

test('repeating the same internal transfer request credits once and replays the response', async () => {
  userToken = await login('john@example.com', 'User1234!');
  adminToken = await login('admin@bank.com', 'Admin123!');
  const [senderAccountsResponse, recipientAccountsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/accounts`, { headers: { Authorization: `Bearer ${userToken}` } }),
    fetch(`${baseUrl}/api/accounts`, { headers: { Authorization: `Bearer ${adminToken}` } }),
  ]);
  sender = (await senderAccountsResponse.json()).accounts.find(account => account.account_type === 'checking');
  recipient = (await recipientAccountsResponse.json()).accounts.find(account => account.account_type === 'checking');
  assert.ok(sender && recipient);

  const [senderBefore, recipientBefore] = await Promise.all([
    getAccount(userToken, sender.id),
    getAccount(adminToken, recipient.id),
  ]);
  const key = randomUUID();
  const payload = { from_account_id: sender.id, to_account_number: recipient.account_number, amount: 0.01, description: 'Idempotency test' };
  const send = () => fetch(`${baseUrl}/api/transactions/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });

  const first = await send();
  const firstBody = await first.json();
  assert.equal(first.status, 200);
  const replay = await send();
  const replayBody = await replay.json();
  assert.equal(replay.status, 200);
  assert.deepEqual(replayBody, firstBody);

  const [senderAfter, recipientAfter] = await Promise.all([
    getAccount(userToken, sender.id),
    getAccount(adminToken, recipient.id),
  ]);
  assert.equal(Math.round((senderBefore.balance - senderAfter.balance) * 100), 1);
  assert.equal(Math.round((recipientAfter.balance - recipientBefore.balance) * 100), 1);

  const reusedKey = await fetch(`${baseUrl}/api/transactions/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ ...payload, amount: 0.02 }),
  });
  assert.equal(reusedKey.status, 409);
  assert.equal((await reusedKey.json()).code, 'IDEMPOTENCY_KEY_REUSED');
});
