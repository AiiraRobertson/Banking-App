# 300-Concurrency Load Test

**Run date:** 2026-10-05
**Host:** Windows, 4 logical CPUs, 7.9 GiB RAM, Node.js 24
**Target:** local Express API on temporary SQLite data; 1, 2, and 4 independent Node processes
**Detailed results:** [`load-300-results.json`](load-300-results.json)

## Summary

Each read scenario ran two waves of 300 simultaneous requests (600 requests total). Login ran one wave of 300 simultaneous requests. The request timeout was 60 seconds. All instance counts used the same temporary SQLite database and JWT secret. The frontend and real network load balancer were not part of this API capacity test.

| Instances | Endpoint | Success | Throughput | p50 | p95 | p99 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `GET /health` | 600/600 | 299 req/s | 436 ms | 1,178 ms | 1,181 ms |
| 2 | `GET /health` | 600/600 | 331 req/s | 383 ms | 1,096 ms | 1,108 ms |
| 4 | `GET /health` | 600/600 | 470 req/s | 247 ms | 717 ms | 725 ms |
| 1 | `GET /api/accounts` | 600/600 | 326 req/s | 264 ms | 662 ms | 781 ms |
| 2 | `GET /api/accounts` | 600/600 | 866 req/s | 190 ms | 233 ms | 238 ms |
| 4 | `GET /api/accounts` | 600/600 | 490 req/s | 244 ms | 472 ms | 497 ms |
| 1 | `POST /api/auth/login` | 52/300 | Not meaningful | 60,111 ms | 60,239 ms | 60,240 ms |
| 2 | `POST /api/auth/login` | 148/300 | Not meaningful | 60,003 ms | 60,066 ms | 60,071 ms |
| 4 | `POST /api/auth/login` | 234/300 | Not meaningful | 38,789 ms | 60,034 ms | 60,059 ms |

## Interpretation

- All health and authenticated account-read requests returned successfully. Two instances performed best for authenticated reads in this run, improving measured throughput from 326 to 866 requests/second and reducing p95 from 662 ms to 233 ms.
- Four instances did not improve account-read performance over two. On a four-logical-CPU host, additional processes compete for the same CPU and memory; more instances are not automatically faster.
- Login is the clear failure point for a 300-request burst. Login uses synchronous bcrypt work, so it blocks each Node process's event loop while password checks run. Even with four processes, 66 requests exceeded the 60-second client timeout. Do not interpret this burst result as sustainable login throughput.
- These results do not establish a safe production concurrent-user limit. The test is a local API burst, not a sustained browser workload, and excludes load balancers, TLS termination, remote databases, external email delivery, and production network latency.

## Safety And Test Configuration

The test used an isolated database under the system temporary directory and did not issue money-moving requests. `LOAD_TEST=1` disabled the global IP rate limiter on these local test processes. A local-only `E2E_BYPASS_TOKEN` allowed the test to profile login without tripping the per-IP auth limiter. Never enable these settings on a public or production server.

The load runner is [`load-300.js`](load-300.js). For another run, start each server from the `server` directory in a separate PowerShell terminal, using the same empty temporary database path and unique temporary secrets. Change `PORT` for each server:

```powershell
$env:PORT = '3301'
$env:DB_PATH = "$env:TEMP\kapita-load-test.db"
$env:JWT_SECRET = 'local-only-load-test-secret-change-me'
$env:LOAD_TEST = '1'
$env:E2E_BYPASS_TOKEN = 'local-only-load-test-bypass-change-me'
node server.js
```

In another PowerShell terminal, point the runner at the server URLs. The bypass token must match the server value:

```powershell
$env:TEST_BASES = 'http://127.0.0.1:3301,http://127.0.0.1:3302'
$env:CONCURRENCY = '300'
$env:REQUESTS_PER_USER = '2'
$env:E2E_BYPASS_TOKEN = 'local-only-load-test-bypass-change-me'
node tests/load-300.js
```

To test one or four instances, provide one URL or four URLs in `TEST_BASES` and start that many server processes. The load runner writes its detailed JSON report to `server/tests/load-300-results.json` by default. Use a fresh temporary database for each comparison and stop all test servers afterward.

## Next Capacity Work

1. Profile password verification separately and consider an asynchronous password-hashing approach or a dedicated authentication worker pool; preserve the existing password security parameters and validate any change with security review.
2. Repeat the read test with longer steady-state stages and a load generator on a separate host, collecting CPU, memory, event-loop delay, and SQLite busy/lock metrics.
3. Test write-heavy traffic separately against a disposable database. This run intentionally avoided writes.
4. Before scaling beyond one process in production, move rate-limit/account lockout state out of process memory and evaluate whether SQLite remains suitable for concurrent writes.