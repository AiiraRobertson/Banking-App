# Kapita — API Security & Vulnerability Test Scenarios

**Scope:** Express 5 + better-sqlite3 backend at `http://127.0.0.1:3001` (single-node) or via cluster mode.
**Audience:** internal QA / security review. These scenarios are intentional probes against **our own** application — do not run them against any other system.
**Credentials used in examples:** seeded user `john@example.com / User1234!`, seeded admin `admin@example.com / Admin1234!`.

This document maps proposed test cases to OWASP API Security Top 10 (2023) categories. Each scenario lists the **goal**, the **request** to issue, the **expected (secure) outcome**, and a **fail signature** that would indicate a vulnerability.

---

## How to use this document

1. Start a fresh server: `cd server && rm -f db/bank.db db/bank.db-wal db/bank.db-shm && node server.js`
2. Obtain a normal-user JWT and an admin JWT via `POST /api/auth/login`. Export them as `$USER_TOKEN` and `$ADMIN_TOKEN`.
3. Run scenarios case-by-case. Most use `curl`; a few require crafted payloads (documented inline).
4. Record results in a copy of the table at the bottom (§13).

---

## 1. Authentication & session integrity (OWASP API2:2023 — Broken Authentication)

| ID | Scenario | Request | Expected (PASS) | Fail signature |
|---|---|---|---|---|
| SEC-AUTH-01 | Missing token rejected | `GET /api/accounts` with no `Authorization` header | `401 {"error":"Authentication required"}` | Any 2xx, or any data leakage |
| SEC-AUTH-02 | Tampered JWT rejected | Take a valid JWT, flip the last byte of the signature, replay | `401 Invalid or expired token` | 2xx |
| SEC-AUTH-03 | `alg:none` JWT rejected | Forge a JWT with header `{"alg":"none","typ":"JWT"}` and no signature | `401` | 2xx (would mean `algorithms: ['HS256']` whitelist is bypassed) |
| SEC-AUTH-04 | Expired token rejected | Wait past `exp` (24h) or sign one with `expiresIn:-1s` using the real secret | `401` | 2xx |
| SEC-AUTH-05 | Token from different secret rejected | Sign a JWT with a wrong secret | `401` | 2xx |
| SEC-AUTH-06 | Role tampering rejected | Take a normal user JWT, decode it, change `role:"user"` → `role:"admin"`, re-encode without resigning | `401` (signature invalid) and admin routes still 403 | 2xx on admin route |
| SEC-AUTH-07 | Per-IP login limiter triggers | Submit 11 wrong-password logins in <15 min from one IP | The 11th returns `429 Too many attempts` | 401 returned forever (limiter not in effect) |
| SEC-AUTH-08 | Per-account login limiter triggers (NEW) | Submit 6 wrong-password logins for the same email from rotating IPs | The 6th returns `429 Too many failed attempts for this account` | All 401s (per-account lockout missing) |
| SEC-AUTH-09 | Successful login clears account lockout counter | After 3 failures, succeed; then 5 more failures should be required to lock | Lock not triggered until 5 *consecutive* fails post-success | Locked at 3rd fail (counter not cleared) |
| SEC-AUTH-10 | Login enumerates users via timing | Login with a valid email + wrong password vs an unknown email; compare response time | Both ~equal (bcrypt always runs) | Wide gap (>100 ms) — code returns early on missing user |
| SEC-AUTH-11 | Login enumerates users via response | Same as 10, compare response bodies | Identical `Invalid email or password` text | Different errors ("user not found" vs "wrong password") |
| SEC-AUTH-12 | Disabled-account login blocked | Admin disables a user, that user attempts login | `403 Account has been deactivated` | Login succeeds with valid creds |
| SEC-AUTH-13 | Inactive token still works after disable | User logs in, admin disables them, user calls `/api/accounts` with their existing token | **POTENTIAL ISSUE:** middleware does not re-check `is_active`. Document as accepted risk or fix. | (Document outcome) |

---

## 2. Authorization / Object access (OWASP API1:2023 — BOLA, API3:2023 — BOPLA)

User A and User B both exist. Find User B's `account_id` and `transaction_id` from the seed data or by registering a second test user.

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-AUTHZ-01 | Cannot read another user's accounts | User A's token, `GET /api/accounts/:id` for B's account | `404` or `403` | 200 with B's data |
| SEC-AUTHZ-02 | Cannot deposit into another user's account | A's token, `POST /api/transactions/deposit { account_id: <B's> }` | 4xx | 200 (funds materialise in B) |
| SEC-AUTHZ-03 | Cannot withdraw from another user's account | A's token, `POST /api/transactions/withdraw { account_id: <B's> }` | 4xx | 200 |
| SEC-AUTHZ-04 | Cannot transfer from someone else's account | A's token, `POST /api/transactions/transfer { from_account_id: <B's>, to_account_id: <A's>, amount: 1 }` | 4xx | 200 (theft) |
| SEC-AUTHZ-05 | Cannot read another user's transactions | A's token, `GET /api/transactions?account_id=<B's>` | empty list or 4xx | rows from B's history |
| SEC-AUTHZ-06 | Cannot fetch another user's notifications | A's token, `GET /api/notifications?user_id=<B>` (in case route accepts filter) | only A's | B's notifications returned |
| SEC-AUTHZ-07 | Cannot read another user's beneficiaries | A's token, `GET /api/beneficiaries/:id` where id belongs to B | 404 | 200 |
| SEC-AUTHZ-08 | Cannot delete another user's beneficiary | A's token, `DELETE /api/beneficiaries/:id` where id belongs to B | 404/403 | 200, row deleted |
| SEC-AUTHZ-09 | Cannot pay a bill from another user's account | A's token, `POST /api/billpay/pay-now { from_account_id: <B's>, payee_id: <A's> }` | 4xx | 200 |
| SEC-AUTHZ-10 | Cannot use another user's bill payee | A's token, `POST /api/billpay/pay-now { payee_id: <B's> }` | 4xx | 200 |
| SEC-AUTHZ-11 | Cannot send a wire from another user's account | A's token, `POST /api/wire/send { from_account_id: <B's>, ... }` | 4xx | 200 |
| SEC-AUTHZ-12 | Non-admin cannot reach admin routes | A's token (role=user), `GET /api/admin/stats` | `403 Insufficient permissions` | 200 with stats |
| SEC-AUTHZ-13 | Non-admin cannot disable users | A's token, `PATCH /api/admin/users/:id` | 403 | 200 |
| SEC-AUTHZ-14 | Mass-assignment on profile update | `PUT /api/profile {role:"admin", is_active:1, balance:9999}` | Only whitelisted fields persist; role unchanged | Role flipped to admin (Broken Object Property Level Authorization) |
| SEC-AUTHZ-15 | Mass-assignment on register | `POST /api/auth/register { ..., role:"admin" }` | New user is `role:"user"` | New user is admin |
| SEC-AUTHZ-16 | Mass-assignment on transfer | `POST /api/transactions/transfer { amount:1, fee:-100 }` (extra fields) | Extra fields ignored | Negative fee accepted, balance manipulated |

---

## 3. Resource consumption / rate limiting (OWASP API4:2023)

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-RATE-01 | Global limiter caps anonymous traffic | 201 GETs to `/health` from one IP within 15 min | 201st returns `429` (when `LOAD_TEST` is unset) | Continues 200 |
| SEC-RATE-02 | Body size limit enforced | `POST /api/auth/login` with a 20 KB JSON body | 413 Payload Too Large | 200 / 400 (body parsed) |
| SEC-RATE-03 | Pagination caps respected | `GET /api/admin/users?limit=1000000` | clamped to 100 | returns 1M rows or OOMs |
| SEC-RATE-04 | Negative pagination rejected | `GET /api/transactions?limit=-1&offset=-50` | 400 or coerced to safe defaults | 500 / SQL error |
| SEC-RATE-05 | Deep recursion / huge JSON | POST a deeply nested JSON object (10k levels) | 400 / 413 | crash, 500 |
| SEC-RATE-06 | Slowloris-style header drip | Open connection, send headers byte-by-byte | server times out request | hangs forever |
| SEC-RATE-07 | bcrypt CPU exhaustion | 200 parallel logins from rotating IPs | event loop stays responsive (`/health` < 500 ms p95 throughout) | `/health` blocked for seconds |

---

## 4. Injection (OWASP API8:2023 — Security Misconfiguration / Injection)

The app uses parameterised queries (`db.prepare(...).run(...)`), so most SQL injection is structural. These probes confirm that.

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-INJ-01 | SQL in login email | `POST /api/auth/login {email:"' OR 1=1--", password:"x"}` | 400 (validator rejects non-email) | 200 with token |
| SEC-INJ-02 | SQL in account number lookup | `GET /api/accounts/lookup?account_number=' OR '1'='1` | 404 / 400, no rows leaked | dump of accounts |
| SEC-INJ-03 | SQL in admin search | `GET /api/admin/users?search=%' UNION SELECT password_hash,...--` | sanitized via parameterised LIKE — no extra columns leak | password hashes returned |
| SEC-INJ-04 | NoSQL-style operator in JSON | `POST /api/auth/login {email:{"$ne":null}, password:{"$ne":null}}` | 400 (validator requires string email) | 200 token |
| SEC-INJ-05 | Path traversal in static fallback | `GET /../../../etc/passwd` (or `..\\..\\windows\\win.ini`) | 404 / served `index.html` | file contents returned |
| SEC-INJ-06 | XSS stored in description | `POST /api/transactions/deposit {description:"<img src=x onerror=alert(1)>"}` | persisted as text; client renders escaped | rendered as live HTML in UI |
| SEC-INJ-07 | XSS in beneficiary nickname | save a beneficiary with `<script>` in nickname; view list | escaped | script executes |
| SEC-INJ-08 | HTML injection in alert email body | trigger an alert with description `</p><script>` | logged literal in `[EMAIL ALERT]`; if real SMTP added, must be HTML-escaped before send | unescaped HTML in template |
| SEC-INJ-09 | Header injection via user-supplied data | `email` containing `\r\nBcc:` | rejected by validator (normalizeEmail) | email header injected if SMTP wired |
| SEC-INJ-10 | Prototype pollution | `POST /api/profile {"__proto__":{"isAdmin":true}}` | ignored; subsequent requests do not gain admin | object pollution observed elsewhere |

---

## 5. Business-logic abuse (OWASP API6:2023 — Unrestricted Access to Sensitive Business Flows)

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-BIZ-01 | Negative-amount deposit rejected | `POST /api/transactions/deposit {amount:-100}` | 400 | 200, balance decreases or other account credited |
| SEC-BIZ-02 | Negative-amount withdrawal rejected | `POST /api/transactions/withdraw {amount:-100}` | 400 | 200, balance increases |
| SEC-BIZ-03 | Negative transfer rejected | `POST /api/transactions/transfer {amount:-50}` | 400 | 200, "from" gains, "to" loses (theft) |
| SEC-BIZ-04 | Zero / sub-cent amount rejected | `amount:0` or `amount:0.001` | 400 | 200 |
| SEC-BIZ-05 | Float precision abuse | Repeated `0.1 + 0.2`-style amounts; verify cents math | balances stay exact | drift / lost cents over many ops |
| SEC-BIZ-06 | Overdraft prevented under concurrency | Two parallel withdrawals each = full balance | one succeeds, one returns 400 | both succeed; balance goes negative |
| SEC-BIZ-07 | Transfer to self forbidden or no-op | `from_account_id == to_account_id` | 400 or no double-entry | inflated transaction history with no effect on net balance |
| SEC-BIZ-08 | Large amount cap | `amount: 1e18` | 400 | 200 (integer overflow, JS Number precision loss) |
| SEC-BIZ-09 | Wire receive without IBAN where required | `POST /api/wire/receive {country_code:"GB"}` (no IBAN) | 400 | 200 (compliance bypass) |
| SEC-BIZ-10 | Replay of transfer | Replay the exact same transfer payload 50× rapidly | each succeeds (idempotent ID would help) or all are independent debits | duplicate IDs / silent dedupe with no error trail |
| SEC-BIZ-11 | Bill pay to deleted payee | Delete payee, then `POST /api/billpay/pay-now {payee_id: <deleted>}` | 4xx | 200 |
| SEC-BIZ-12 | Unlimited registrations from one IP | 1000 `POST /api/auth/register` calls in a minute | 429 once limiter trips | all succeed (resource exhaustion, spam) |
| SEC-BIZ-13 | Loan calc DoS | `POST /api/calculator/loan {term_months: 9_999_999}` | clamped or 400 | hangs / OOM |

---

## 6. Sensitive data exposure (OWASP API3:2023)

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-DATA-01 | `password_hash` never serialised | Inspect every endpoint's user object | `password_hash` absent everywhere | hash present in any response |
| SEC-DATA-02 | JWT secret never echoed | grep responses for `process.env.JWT_SECRET` value | absent | leaked in error / debug field |
| SEC-DATA-03 | Stack traces not exposed in prod | Trigger 500 with malformed JSON; `NODE_ENV=production` | generic error, no stack | full stack trace in body |
| SEC-DATA-04 | `.env`, `bank.db`, `bank.db-wal` not served | `GET /.env`, `GET /db/bank.db` | 404 | 200 with file contents |
| SEC-DATA-05 | Other users' PII not in admin list for non-admins | normal user calling admin route | 403 | leak |
| SEC-DATA-06 | Logs do not contain raw passwords | Force a failed login; inspect `server.log` | password not present | password printed |
| SEC-DATA-07 | Account number not enumerable | `GET /api/accounts/lookup?account_number=1000000000` ... `1000000099` brute force | rate-limited; or returns minimal info (name only) by design | unlimited enumeration of every customer name |

---

## 7. CORS / browser-trust boundary (OWASP API8 — Misconfiguration)

| ID | Scenario | Request | Expected | Fail signature |
|---|---|---|---|---|
| SEC-CORS-01 | Disallowed origin rejected | `Origin: https://evil.com` on any API call | no `Access-Control-Allow-Origin` for that origin | header echoed back, credentials allowed |
| SEC-CORS-02 | `Origin: null` (file://, sandbox) rejected | API call with `Origin: null` | not allowlisted | allowed |
| SEC-CORS-03 | Preflight for `Authorization` header | `OPTIONS` from allowed origin with `Access-Control-Request-Headers: authorization` | 204 + `Access-Control-Allow-Headers: authorization` | 4xx (legit clients break) |
| SEC-CORS-04 | Wildcard with credentials | check `Access-Control-Allow-Origin: *` is **not** combined with `Allow-Credentials: true` | spec-compliant | both present (browser will reject anyway, but is a misconfig signal) |

---

## 8. Security headers (Helmet baseline)

Run `curl -sI http://127.0.0.1:3001/health` and verify:

| ID | Header | Expected |
|---|---|---|
| SEC-HDR-01 | `Content-Security-Policy` | present |
| SEC-HDR-02 | `Strict-Transport-Security` | present (when behind HTTPS) |
| SEC-HDR-03 | `X-Content-Type-Options` | `nosniff` |
| SEC-HDR-04 | `X-Frame-Options` | `SAMEORIGIN` or `DENY` |
| SEC-HDR-05 | `Referrer-Policy` | restrictive (`no-referrer` / `strict-origin-when-cross-origin`) |
| SEC-HDR-06 | `RateLimit-*` / `X-RateLimit-*` | present (express-rate-limit) |
| SEC-HDR-07 | `X-Powered-By` | absent (helmet removes it) |

---

## 9. Token & session lifecycle

| ID | Scenario | Steps | Expected | Fail signature |
|---|---|---|---|---|
| SEC-SESS-01 | Logout invalidates token | (No logout endpoint exists today.) Document: tokens are valid until `exp`. | accepted risk OR add token blacklist / shorter `exp` | (decision item) |
| SEC-SESS-02 | Password change invalidates old tokens | Change password, replay old JWT | **POTENTIAL ISSUE:** old token still valid until exp. Add `password_changed_at` claim check. | (decision item) |
| SEC-SESS-03 | JWT `exp` is not absent or 0 | decode any issued token | `exp` present, ~24h ahead | infinite tokens |
| SEC-SESS-04 | JWT `alg` matches whitelist | inspect server middleware | `algorithms: ['HS256']` enforced | accepts RS256-signed forgery (key confusion) |

---

## 10. Audit & integrity

| ID | Scenario | Steps | Expected | Fail signature |
|---|---|---|---|---|
| SEC-AUD-01 | Every transfer writes a log row | Run a transfer; check `transactions` and `notifications` tables | both populated | silent transfer (financial loss without audit trail) |
| SEC-AUD-02 | Alert log captures debit/credit pipeline | Make a deposit ≥ user's `alert_min_amount`; check `alert_log` | row present with correct direction & amount | missing |
| SEC-AUD-03 | Failed transactions roll back atomically | Force a failure mid-transfer (e.g., killable by transient error) and inspect balances | both legs roll back; no half-debits | one side moved, other did not |
| SEC-AUD-04 | Admin actions traceable | Admin disables a user — find evidence in DB or log | recorded somewhere | no trail |

---

## 11. Reproducible test commands (copy-paste)

```bash
# Set up
BASE=http://127.0.0.1:3001
USER_TOKEN=$(curl -s $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"john@example.com","password":"User1234!"}' | jq -r .token)
ADMIN_TOKEN=$(curl -s $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' | jq -r .token)

# SEC-AUTH-03 — alg:none forgery (must be rejected)
H=$(printf '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
P=$(printf '{"id":1,"email":"a@b.c","role":"admin"}' | base64 | tr -d '=' | tr '/+' '_-')
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/admin/stats \
  -H "Authorization: Bearer $H.$P."

# SEC-AUTH-08 — per-account lockout
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "attempt $i -> %{http_code}\n" $BASE/api/auth/login \
    -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: 10.0.0.$i" \
    -d '{"email":"john@example.com","password":"WRONG_PASS!"}'
done
# Expect: 401, 401, 401, 401, 401, 429

# SEC-AUTHZ-04 — cross-user transfer attempt
curl -s $BASE/api/transactions/transfer \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"from_account_id":<B_ACCT_ID>,"to_account_id":<A_ACCT_ID>,"amount":1}'
# Expect: 4xx

# SEC-AUTHZ-12 — non-admin hits admin
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/admin/stats \
  -H "Authorization: Bearer $USER_TOKEN"
# Expect: 403

# SEC-BIZ-01 — negative amount
curl -s $BASE/api/transactions/deposit \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"account_id":<ACCT>,"amount":-100,"description":"neg"}'
# Expect: 400

# SEC-INJ-01 — SQL in login
curl -s $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"'"'"' OR 1=1--","password":"x"}'
# Expect: 400 validation error

# SEC-CORS-01 — bad origin
curl -s -I $BASE/api/accounts -H 'Origin: https://evil.example' \
  -H "Authorization: Bearer $USER_TOKEN" | grep -i access-control
# Expect: header absent or restricted

# SEC-HDR — verify helmet baseline
curl -sI $BASE/health
# Expect: content-security-policy, x-content-type-options: nosniff, no x-powered-by
```

---

## 12. Suggested automation

Add a `tests/security-tests.js` runner mirroring `tests/run-tests.js`:

- One async function per category (auth, authz, rate, inj, biz, data, cors, hdr).
- Each case records `{id, category, expected, actual, status: 'PASS'|'FAIL'|'INFO'}` to `tests/security-results.json`.
- CI gate: `summary.fail === 0` blocks merge; `INFO` rows (e.g., SEC-SESS-01 documented limitations) do not.

This keeps the security suite distinct from functional tests so a security regression never hides under a functional pass count.

---

## 13. Result-tracking template

Copy this section per run; fill `Actual` and `Status`.

| ID | Scenario | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|
| SEC-AUTH-01 | Missing token rejected | 401 | | | |
| SEC-AUTH-02 | Tampered JWT rejected | 401 | | | |
| SEC-AUTH-03 | alg:none rejected | 401 | | | |
| ... | ... | ... | | | |

Final summary line:

```
SECURITY RUN <date>: PASS=__ / FAIL=__ / INFO=__  build=<git sha>
```

---

## 14. Out of scope (call out explicitly)

- Network-layer testing (TLS config, mTLS) — depends on deployment, not on the app code.
- Frontend-only XSS that does not round-trip through the API.
- Third-party dependency CVEs — track via `npm audit` in CI separately.
- DoS at the OS / kernel level (SYN floods etc.).
- Physical / cloud-account attacks (Azure RBAC, GitHub Actions secrets) — covered in separate infra threat model.
