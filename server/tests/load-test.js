/* Load / concurrency test for Kapita.
   Probes:
     1. /health (no auth)             — pure HTTP throughput
     2. /api/auth/login (POST)        — bcrypt + JWT signing (CPU-heavy)
     3. /api/accounts (GET, auth)     — JWT verify + DB read
     4. /api/transactions/transfer    — write path (DB transaction)
   Reports p50/p95/p99 latency, RPS, error rate per scenario.
   The global rate limiter is 200 req / 15 min, which would dominate the test;
   we set TEST_BYPASS_LIMIT=1 in env to send X-Forwarded-For headers that vary,
   defeating IP-based limiting (only valid for localhost capacity profiling). */

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3001';
const fs = require('fs');
const path = require('path');

function pct(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function probe(method, url, body, token, ip) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    await res.text();
    return { ok: res.status < 400, status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start, error: err.message };
  }
}

async function loginToken(ip) {
  const r = await probe('POST', `${BASE}/api/auth/login`,
    { email: 'john@example.com', password: 'User1234!' }, null, ip);
  if (!r.ok) return null;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email: 'john@example.com', password: 'User1234!' })
  });
  const j = await res.json();
  return j.token;
}

async function runScenario(name, concurrent, totalRequests, makeReq) {
  console.log(`\n→ ${name}: ${concurrent} concurrent × ${Math.ceil(totalRequests/concurrent)} batches`);
  const latencies = [];
  let ok = 0, fail = 0, errors = {};
  const startWall = Date.now();
  const batches = Math.ceil(totalRequests / concurrent);

  for (let b = 0; b < batches; b++) {
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      const idx = b * concurrent + i;
      const ip = `10.${(idx >> 16) & 0xff}.${(idx >> 8) & 0xff}.${idx & 0xff}`;
      promises.push(makeReq(ip));
    }
    const settled = await Promise.all(promises);
    for (const r of settled) {
      latencies.push(r.ms);
      if (r.ok) ok++;
      else { fail++; errors[r.status] = (errors[r.status] || 0) + 1; }
    }
  }

  const wallMs = Date.now() - startWall;
  return {
    name, concurrent, totalRequests,
    durationMs: wallMs,
    rps: Math.round((ok + fail) / (wallMs / 1000) * 10) / 10,
    successRate: Math.round((ok / (ok + fail)) * 10000) / 100,
    p50: pct(latencies, 0.50),
    p95: pct(latencies, 0.95),
    p99: pct(latencies, 0.99),
    max: Math.max(...latencies),
    errorBreakdown: errors
  };
}

async function main() {
  console.log(`Kapita load profiler — base=${BASE}`);
  console.log('='.repeat(70));

  const summary = [];
  const concurrencyLevels = [10, 25, 50, 100];

  // Get one good token for authenticated scenarios
  const token = await loginToken('10.0.0.1');
  if (!token) { console.error('Bootstrap login failed'); process.exit(1); }

  for (const c of concurrencyLevels) {
    const total = c * 10;
    const s1 = await runScenario(`/health @ c=${c}`, c, total,
      (ip) => probe('GET', `${BASE}/health`, null, null, ip));
    summary.push(s1);
    console.log(`  rps=${s1.rps} success=${s1.successRate}% p50=${s1.p50}ms p95=${s1.p95}ms p99=${s1.p99}ms`);
  }

  for (const c of [10, 25, 50]) {
    const total = c * 5;
    const s2 = await runScenario(`/api/auth/login @ c=${c} (bcrypt)`, c, total,
      (ip) => probe('POST', `${BASE}/api/auth/login`,
        { email: 'john@example.com', password: 'User1234!' }, null, ip));
    summary.push(s2);
    console.log(`  rps=${s2.rps} success=${s2.successRate}% p50=${s2.p50}ms p95=${s2.p95}ms p99=${s2.p99}ms`);
  }

  for (const c of [10, 25, 50, 100]) {
    const total = c * 10;
    const s3 = await runScenario(`/api/accounts @ c=${c} (auth read)`, c, total,
      (ip) => probe('GET', `${BASE}/api/accounts`, null, token, ip));
    summary.push(s3);
    console.log(`  rps=${s3.rps} success=${s3.successRate}% p50=${s3.p50}ms p95=${s3.p95}ms p99=${s3.p99}ms`);
  }

  // Need real account ids for transfers
  const acctRes = await fetch(`${BASE}/api/accounts`, { headers: { Authorization: `Bearer ${token}` } });
  const { accounts } = await acctRes.json();
  const checking = accounts.find(a => a.account_type === 'checking');
  const savings = accounts.find(a => a.account_type === 'savings');

  for (const c of [10, 25, 50]) {
    const total = c * 5;
    const s4 = await runScenario(`/api/transactions/transfer @ c=${c} (write)`, c, total,
      (ip) => probe('POST', `${BASE}/api/transactions/transfer`,
        { from_account_id: checking.id, to_account_id: savings.id, amount: 0.01 }, token, ip));
    summary.push(s4);
    console.log(`  rps=${s4.rps} success=${s4.successRate}% p50=${s4.p50}ms p95=${s4.p95}ms p99=${s4.p99}ms`);
  }

  fs.writeFileSync(
    path.join(__dirname, 'load-results.json'),
    JSON.stringify({ summary, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('\nResults written to tests/load-results.json');
}

main().catch(e => { console.error(e); process.exit(1); });
