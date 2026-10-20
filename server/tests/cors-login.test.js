const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.TEST_BASE || 'http://localhost:3001';
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

async function preflight(origin) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    },
  });
}

test('login preflight allows each configured local frontend origin', async () => {
  for (const origin of allowedOrigins) {
    const response = await preflight(origin);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('access-control-allow-methods') || '', /POST/);
    const headers = response.headers.get('access-control-allow-headers') || '';
    assert.match(headers, /content-type/i);
    assert.match(headers, /authorization/i);
  }
});

test('login preflight does not grant an unapproved origin access', async () => {
  const response = await preflight('http://evil.example');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('login accepts valid credentials and rejects invalid credentials', async () => {
  const validResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: 'http://127.0.0.1:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'john@example.com', password: 'User1234!' }),
  });
  assert.equal(validResponse.status, 200);
  assert.equal(validResponse.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
  assert.ok((await validResponse.json()).token);

  const invalidResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'john@example.com', password: 'incorrect-password' }),
  });
  assert.equal(invalidResponse.status, 401);
  assert.equal(invalidResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal((await invalidResponse.json()).error, 'Invalid email or password');
});
