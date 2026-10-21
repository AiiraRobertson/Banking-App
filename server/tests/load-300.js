const os = require('os');
const fs = require('fs');
const path = require('path');

const targets = (process.env.TEST_BASES || 'http://127.0.0.1:3001')
  .split(',')
  .map(value => value.trim().replace(/\/$/, ''))
  .filter(Boolean);
const concurrency = Number(process.env.CONCURRENCY || 300);
const requestsPerUser = Number(process.env.REQUESTS_PER_USER || 2);
const outputPath = process.env.LOAD_REPORT || path.join(__dirname, 'load-300-results.json');
const email = process.env.TEST_USER_EMAIL || 'john@example.com';
const password = process.env.TEST_USER_PASSWORD || 'User1234!';
const bypassToken = process.env.E2E_BYPASS_TOKEN;

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2000) {
  throw new Error('CONCURRENCY must be an integer between 1 and 2000');
}
if (!Number.isInteger(requestsPerUser) || requestsPerUser < 1 || requestsPerUser > 20) {
  throw new Error('REQUESTS_PER_USER must be an integer between 1 and 20');
}
if (!targets.length) throw new Error('TEST_BASES must contain at least one server URL');

function percentile(values, p) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * p) - 1)];
}

function summarize(name, results, startedAt, durationMs) {
  const latencies = results.map(result => result.ms);
  const statuses = {};
  for (const result of results) {
    const status = String(result.status || 'network_error');
    statuses[status] = (statuses[status] || 0) + 1;
  }
  const successes = results.filter(result => result.ok).length;

  return {
    name,
    targetCount: targets.length,
    requests: results.length,
    successes,
    errors: results.length - successes,
    successRatePercent: Number((successes / results.length * 100).toFixed(2)),
    requestsPerSecond: Number((results.length / (durationMs / 1000)).toFixed(2)),
    durationMs,
    p50Ms: percentile(latencies, 0.50),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    maxMs: latencies.length ? Math.max(...latencies) : 0,
    statusCounts: statuses,
    perTarget: targets.map(target => {
      const targetResults = results.filter(result => result.target === target);
      const targetLatencies = targetResults.map(result => result.ms);
      const targetSuccesses = targetResults.filter(result => result.ok).length;
      return {
        target,
        requests: targetResults.length,
        successes: targetSuccesses,
        errors: targetResults.length - targetSuccesses,
        p50Ms: percentile(targetLatencies, 0.50),
        p95Ms: percentile(targetLatencies, 0.95),
        p99Ms: percentile(targetLatencies, 0.99),
        maxMs: targetLatencies.length ? Math.max(...targetLatencies) : 0,
      };
    }),
    startedAt,
  };
}

async function request(target, route, token, useBypass = false) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (useBypass && bypassToken) headers['x-e2e-bypass'] = bypassToken;
  const started = performance.now();
  try {
    const response = await fetch(`${target}${route}`, {
      headers,
      signal: AbortSignal.timeout(60000),
    });
    await response.arrayBuffer();
    return { target, status: response.status, ok: response.ok, ms: Math.round(performance.now() - started) };
  } catch (error) {
    return { target, status: 0, ok: false, ms: Math.round(performance.now() - started), error: error.message };
  }
}

async function login(target) {
  const headers = { 'Content-Type': 'application/json' };
  if (bypassToken) headers['x-e2e-bypass'] = bypassToken;
  const response = await fetch(`${target}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Bootstrap login failed (${response.status}) at ${target}`);
  const body = await response.json();
  if (!body.token) throw new Error(`Login response had no token at ${target}`);
  return body.token;
}

async function runBatches(name, route, token, requestCount, loginMode = false) {
  const results = [];
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const batches = Math.ceil(requestCount / concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const count = Math.min(concurrency, requestCount - batch * concurrency);
    const requests = Array.from({ length: count }, (_, offset) => {
      const index = batch * concurrency + offset;
      const target = targets[index % targets.length];
      if (!loginMode) return request(target, route, token);
      const requestStarted = performance.now();
      return login(target).then(() => ({ target, status: 200, ok: true, ms: Math.round(performance.now() - requestStarted) }))
        .catch(error => ({ target, status: Number(/\((\d+)\)/.exec(error.message)?.[1] || 0), ok: false, ms: Math.round(performance.now() - requestStarted), error: error.message }));
    });
    results.push(...await Promise.all(requests));
  }

  const durationMs = Math.round(performance.now() - started);
  return summarize(name, results, startedAt, durationMs);
}

async function main() {
  console.log(`Kapita 300-user profiler | concurrency=${concurrency} | instances=${targets.length}`);
  console.log(`Targets: ${targets.join(', ')}`);

  for (const target of targets) {
    const health = await request(target, '/health');
    if (!health.ok) throw new Error(`Health check failed at ${target}: HTTP ${health.status}`);
  }

  const token = await login(targets[0]);
  const report = {
    timestamp: new Date().toISOString(),
    host: { platform: process.platform, release: os.release(), cpuCount: os.cpus().length, totalMemoryBytes: os.totalmem() },
    configuration: { concurrency, requestsPerUser, targets, workload: 'health and authenticated reads are read-only; login uses the seeded demo account' },
    scenarios: [],
  };

  const health = await runBatches('GET /health', '/health', null, concurrency * requestsPerUser);
  report.scenarios.push(health);
  console.log(`${health.name}: ${health.successRatePercent}% success, ${health.requestsPerSecond} req/s, p95 ${health.p95Ms} ms`);

  const accounts = await runBatches('GET /api/accounts (authenticated)', '/api/accounts', token, concurrency * requestsPerUser);
  report.scenarios.push(accounts);
  console.log(`${accounts.name}: ${accounts.successRatePercent}% success, ${accounts.requestsPerSecond} req/s, p95 ${accounts.p95Ms} ms`);

  const logins = await runBatches('POST /api/auth/login (bcrypt)', '/api/auth/login', null, concurrency, true);
  report.scenarios.push(logins);
  console.log(`${logins.name}: ${logins.successRatePercent}% success, ${logins.requestsPerSecond} req/s, p95 ${logins.p95Ms} ms`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report: ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});