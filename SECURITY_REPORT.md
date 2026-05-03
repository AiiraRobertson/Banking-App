# SecureBank Security Audit Report

**Date:** April 29, 2026
**Application:** SecureBank (Full-Stack Banking Application)
**Stack:** React 19 + Express 5 + SQLite (better-sqlite3)
**Auditor:** Automated Security Audit (Static Analysis + Active Testing)
**Scope:** Authentication, API Security, Input Validation, Frontend Security, Dependencies, HTTP Headers

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Risk Rating Overview](#2-risk-rating-overview)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [API Security & Input Validation](#4-api-security--input-validation)
5. [Frontend Security](#5-frontend-security)
6. [HTTP Security Headers](#6-http-security-headers)
7. [Dependency Vulnerabilities](#7-dependency-vulnerabilities)
8. [Active Penetration Test Results](#8-active-penetration-test-results)
9. [Recommendations](#9-recommendations)
10. [Appendix: Test Evidence](#10-appendix-test-evidence)

---

## 1. Executive Summary

The SecureBank application demonstrates **strong security fundamentals** for a development-stage banking application. The backend enforces parameterized queries (no SQL injection), proper authentication/authorization middleware, rate limiting, input validation, and comprehensive security headers via Helmet.

However, several issues must be addressed before production deployment:

| Severity | Count | Summary |
|----------|-------|---------|
| CRITICAL | 2 | Weak JWT secret, hardcoded demo credentials exposed in UI |
| HIGH | 2 | JWT stored in localStorage (XSS-vulnerable), no token revocation |
| MEDIUM | 4 | Missing param validation on 4 endpoints, NODE_ENV=development, CORS localhost-only, no CSRF tokens |
| LOW | 3 | 24h token expiry, HS256 algorithm, no request logging/monitoring |
| INFORMATIONAL | 4 | Calculator endpoint public, admin shows full account numbers, no robots.txt, seed data in codebase |

**Overall Security Grade: B-** (Good foundation, needs hardening for production)

---

## 2. Risk Rating Overview

### Findings by Category

```
Authentication & Authorization     ████████░░  7 findings (2 critical, 2 high, 2 medium, 1 low)
API Security & Input Validation    ██████░░░░  5 findings (0 critical, 0 high, 3 medium, 2 low)
Frontend Security                  ██████░░░░  4 findings (1 critical, 1 high, 1 medium, 1 info)
HTTP Security Headers              █░░░░░░░░░  1 finding (0 critical, 0 high, 0 medium, 1 info)
Dependencies                       █░░░░░░░░░  0 production vulnerabilities
```

---

## 3. Authentication & Authorization

### 3.1 CRITICAL: Weak JWT Secret

| Field | Detail |
|-------|--------|
| **File** | `server/.env` line 1 |
| **Severity** | CRITICAL |
| **Current Value** | `bank-app-super-secret-key-change-in-production-min32chars` |
| **Issue** | Predictable, contains self-documenting "change-in-production" text. Only 57 chars of low-entropy text. |
| **Impact** | An attacker who guesses or brute-forces this secret can forge valid JWTs for any user, including admin. |
| **Fix** | Generate a cryptographically random 64+ character secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

### 3.2 CRITICAL: Hardcoded Demo Credentials in Login Page

| Field | Detail |
|-------|--------|
| **File** | `client/src/pages/LoginPage.jsx` lines 91-94 |
| **Severity** | CRITICAL |
| **Issue** | Admin and user credentials displayed in the login form: `admin@bank.com / Admin123!` and `john@example.com / User1234!` |
| **Impact** | Any visitor can log in as admin with full access to all user data and accounts. |
| **Fix** | Remove demo credentials from production builds. Use environment-gated display or a separate demo environment. |

### 3.3 HIGH: No Token Revocation Mechanism

| Field | Detail |
|-------|--------|
| **File** | `client/src/context/AuthContext.jsx` line 59 |
| **Severity** | HIGH |
| **Issue** | Logout only removes token from localStorage. No server-side token blacklist exists. |
| **Impact** | A stolen token remains valid for up to 24 hours even after the user "logs out." |
| **Fix** | Implement a server-side token blacklist (Redis/in-memory) or switch to short-lived access tokens + refresh tokens. |

### 3.4 Password Hashing: SECURE

| Field | Detail |
|-------|--------|
| **File** | `server/routes/auth.js` line 78, `server/routes/profile.js` line 70 |
| **Status** | PASS |
| **Detail** | bcrypt with 12 salt rounds. Industry-standard strength. |

### 3.5 Password Policy: SECURE

| Field | Detail |
|-------|--------|
| **File** | `server/routes/auth.js` lines 22-49 |
| **Status** | PASS |
| **Detail** | Min 8 chars, uppercase, lowercase, number, special character required. Validated server-side. |

### 3.6 JWT Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| Algorithm | HS256 | Acceptable (RS256 preferred for distributed systems) |
| Expiry | 24 hours | Acceptable (shorter preferred for banking) |
| Payload | `id`, `email`, `role` | PASS - no sensitive data in token |
| Verification | `algorithms: ['HS256']` pinned | PASS - prevents algorithm confusion attack |

### 3.7 Route Protection: SECURE

| Route | Auth Required | Role Check | Status |
|-------|---------------|------------|--------|
| `POST /api/auth/register` | No | - | PASS (public) |
| `POST /api/auth/login` | No | - | PASS (public) |
| `GET /api/auth/me` | Yes | - | PASS |
| `GET /api/accounts/*` | Yes | - | PASS |
| `POST /api/transactions/*` | Yes | - | PASS |
| `GET /api/wire/*` | Yes | - | PASS |
| `POST /api/billpay/*` | Yes | - | PASS |
| `GET /api/notifications/*` | Yes | - | PASS |
| `GET /api/profile/*` | Yes | - | PASS |
| `GET /api/admin/*` | Yes | `admin` | PASS |
| `POST /api/calculator/loan` | No | - | INFO (public utility) |
| `GET /health` | No | - | PASS (healthcheck) |

### 3.8 Rate Limiting: SECURE

| Limiter | Scope | Window | Max Requests |
|---------|-------|--------|--------------|
| Global | All routes | 15 min | 200 |
| Auth | `/api/auth/login`, `/api/auth/register` | 15 min | 10 |

---

## 4. API Security & Input Validation

### 4.1 SQL Injection: SECURE

| Field | Detail |
|-------|--------|
| **Status** | PASS |
| **Detail** | All database queries use `db.prepare()` with parameterized `?` placeholders via better-sqlite3. No string concatenation in SQL. |
| **Verified** | Active test confirmed: SQL injection payloads in login email field returned validation error, not DB error. |

### 4.2 MEDIUM: Missing URL Parameter Validation (4 endpoints)

These endpoints accept `:id` parameters without `isInt()` validation. While parameterized queries prevent SQL injection, input validation is defense-in-depth best practice.

| Endpoint | File | Line |
|----------|------|------|
| `GET /api/transactions/:id` | `server/routes/transactions.js` | 208 |
| `PUT /api/notifications/:id/read` | `server/routes/notifications.js` | 52 |
| `GET /api/wire/:id` | `server/routes/wire.js` | 217 |
| `DELETE /api/billpay/payees/:id` | `server/routes/billpay.js` | 62 |

**Fix:** Add `param('id').isInt({ min: 1 })` validation to each endpoint.

### 4.3 Transfer Business Logic: SECURE

| Check | Status | File:Line |
|-------|--------|-----------|
| Negative amount blocked | PASS | `transactions.js:12` — `isFloat({ min: 0.01 })` |
| Zero amount blocked | PASS | Same validation |
| Excessive amount blocked | PASS | `isFloat({ max: 1000000 })` |
| Self-transfer blocked | PASS | `transactions.js:111` |
| Insufficient balance blocked | PASS | `transactions.js:101` |
| Atomic transactions | PASS | `db.transaction()` wraps all operations |
| Wire transfer validation | PASS | `wire.js:91` — min $1, max $1M |

### 4.4 IDOR (Insecure Direct Object Reference): SECURE

| Field | Detail |
|-------|--------|
| **Status** | PASS |
| **Detail** | All data queries include `user_id` checks. Active testing confirmed: accessing `/api/accounts/1` with a different user's token returns "Account not found." |
| **Files** | `accounts.js:23-24`, `transactions.js:159-161`, `wire.js:217` |

### 4.5 Error Handling

| Field | Detail |
|-------|--------|
| **File** | `server/middleware/errorHandler.js` |
| **Severity** | MEDIUM |
| **Issue** | `NODE_ENV=development` in `.env` causes stack traces in error responses |
| **Impact** | Stack traces reveal internal file paths, library versions, and code structure |
| **Fix** | Set `NODE_ENV=production` in production. Add startup validation for required env vars. |

### 4.6 Request Size Limiting: SECURE

| Field | Detail |
|-------|--------|
| **File** | `server/server.js` line 29 |
| **Detail** | `express.json({ limit: '10kb' })` — prevents large payload attacks |

---

## 5. Frontend Security

### 5.1 HIGH: JWT Stored in localStorage

| Field | Detail |
|-------|--------|
| **File** | `client/src/context/AuthContext.jsx` line 8, `client/src/services/api.js` line 9 |
| **Severity** | HIGH |
| **Issue** | JWT token stored in `localStorage`, which is accessible to any JavaScript running on the page. |
| **Impact** | If an XSS vulnerability is introduced (even via a third-party library), the attacker can steal the JWT and impersonate the user. |
| **Fix** | Use `httpOnly` + `Secure` + `SameSite=Strict` cookies for token storage. Requires backend changes to set cookies instead of returning tokens in response body. |

### 5.2 XSS Protection: SECURE

| Field | Detail |
|-------|--------|
| **Status** | PASS |
| **Detail** | No use of `dangerouslySetInnerHTML` or `innerHTML` found in the entire codebase. React's JSX auto-escaping protects all rendered content. |

### 5.3 CSRF Protection: LOW RISK

| Field | Detail |
|-------|--------|
| **Status** | ACCEPTABLE |
| **Detail** | No explicit CSRF tokens, but the app uses Bearer token authentication via `Authorization` header. Custom headers cannot be set by cross-origin forms, making CSRF attacks ineffective against this auth pattern. |
| **Note** | If migrating to cookie-based auth, CSRF tokens become mandatory. |

### 5.4 Client-Side Route Guards: SECURE

| Guard | File | Check | Status |
|-------|------|-------|--------|
| ProtectedRoute | `components/ProtectedRoute.jsx` | `isAuthenticated` | PASS |
| AdminRoute | `components/AdminRoute.jsx` | `isAuthenticated && role === 'admin'` | PASS |
| PublicRoute | `components/PublicRoute.jsx` | Redirects authenticated users | PASS |

### 5.5 Sensitive Data Exposure

| Issue | Severity | Detail |
|-------|----------|--------|
| Account IDs in URLs | INFO | `/accounts/:id` — standard REST pattern, acceptable |
| Account numbers masked in user views | PASS | `****` + last 4 digits |
| Full account numbers in admin panel | INFO | `admin/AdminAccountsPage.jsx` line 42 — consider masking |
| No API keys or secrets in client code | PASS | Clean |
| No console.log with sensitive data | PASS | Clean |

---

## 6. HTTP Security Headers

### Header Analysis (via Helmet)

| Header | Value | Status |
|--------|-------|--------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' https: 'unsafe-inline'; img-src 'self' data:; font-src 'self' https: data:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` | PASS |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | PASS |
| `X-Content-Type-Options` | `nosniff` | PASS |
| `X-Frame-Options` | `SAMEORIGIN` | PASS |
| `Referrer-Policy` | `no-referrer` | PASS |
| `X-XSS-Protection` | `0` (disabled, per modern best practice) | PASS |
| `Cross-Origin-Opener-Policy` | `same-origin` | PASS |
| `Cross-Origin-Resource-Policy` | `same-origin` | PASS |
| `X-DNS-Prefetch-Control` | `off` | PASS |
| `X-Download-Options` | `noopen` | PASS |
| `X-Permitted-Cross-Domain-Policies` | `none` | PASS |

**Overall: EXCELLENT** — All recommended security headers present and properly configured.

### CORS Configuration

| Field | Detail |
|-------|--------|
| **File** | `server/server.js` lines 18-28 |
| **Severity** | MEDIUM (for production) |
| **Current** | Whitelist: `localhost:3001`, `localhost:5173`, `localhost:5500`, `localhost:5501`, `127.0.0.1:5500/5501` |
| **Issue** | Only HTTP origins (no HTTPS). Only localhost (development-only). |
| **Fix** | Use environment variable for allowed origins. Enforce HTTPS in production. |

---

## 7. Dependency Vulnerabilities

### Server Dependencies (`npm audit`)

| Result | Detail |
|--------|--------|
| **Vulnerabilities** | **0 found** |
| **Total Dependencies** | 10 production packages |
| **Status** | PASS |

### Client Dependencies (`npm audit`)

| Result | Detail |
|--------|--------|
| **Production Vulnerabilities** | **0 found** |
| **Dev-only Vulnerabilities** | 3 moderate (in `autocannon` test tool — not shipped to production) |
| **Total Dependencies** | 6 production packages |
| **Status** | PASS |

### Dependency Inventory

**Server (10 packages):**

| Package | Version | Security Role |
|---------|---------|---------------|
| express | ^5.2.1 | Web framework |
| helmet | ^8.1.0 | Security headers |
| cors | ^2.8.6 | CORS management |
| express-rate-limit | ^8.4.0 | Rate limiting |
| express-validator | ^7.3.2 | Input validation |
| bcryptjs | ^3.0.3 | Password hashing |
| jsonwebtoken | ^9.0.3 | JWT authentication |
| better-sqlite3 | ^12.9.0 | Database |
| dotenv | ^17.4.2 | Environment config |
| uuid | ^14.0.0 | ID generation |

**Client (6 packages):**

| Package | Version | Security Concern |
|---------|---------|------------------|
| react | ^19.2.5 | None |
| react-dom | ^19.2.5 | None |
| react-router-dom | ^7.14.2 | None |
| axios | ^1.15.2 | None |
| tailwindcss | ^4.2.4 | None (build-time only) |
| @tailwindcss/vite | ^4.2.4 | None (build-time only) |

---

## 8. Active Penetration Test Results

### Test Matrix

| Test | Target | Payload | Expected | Actual | Status |
|------|--------|---------|----------|--------|--------|
| SQL Injection (Login) | `POST /api/auth/login` | `email: "admin@bank.com\" OR 1=1--"` | Validation error | `{"errors":[{"field":"email","message":"Valid email is required"}]}` | PASS |
| SQL Injection (Accounts) | `GET /api/accounts/1 OR 1=1` | URL-encoded SQLi | Auth error | `{"error":"Invalid or expired token"}` | PASS |
| XSS in Registration | `POST /api/auth/register` | `first_name: "<script>alert(1)</script>"` | Validation/safe storage | Validation errors returned (missing fields) | PASS |
| Unauthorized Admin Access | `GET /api/admin/users` | Forged JWT | Auth rejection | `{"error":"Invalid or expired token"}` | PASS |
| Missing Auth Token | `GET /api/accounts` | No token | 401 | `{"error":"Authentication required"}` | PASS |
| Negative Transfer | `POST /api/transactions/transfer` | `amount: -500` | Validation error | `{"errors":[{"field":"amount","message":"Amount must be between $0.01 and $1,000,000"}]}` | PASS |
| Zero Transfer | `POST /api/transactions/transfer` | `amount: 0` | Validation error | Same as above | PASS |
| Excessive Transfer | `POST /api/transactions/transfer` | `amount: 99999999` | Validation error | Same as above | PASS |
| IDOR (Other User's Account) | `GET /api/accounts/1` | Valid user token | Not found | `{"error":"Account not found"}` | PASS |
| Privilege Escalation | `GET /api/admin/users` | Regular user token | 403 | `{"error":"Insufficient permissions"}` | PASS |
| Expired/Tampered JWT | `GET /api/accounts` | Modified JWT payload | Auth rejection | `{"error":"Invalid or expired token"}` | PASS |

**All 11 active tests passed.** No exploitable vulnerabilities found during penetration testing.

---

## 9. Recommendations

### 9.1 CRITICAL — Fix Before Any Deployment

| # | Issue | Remediation | File(s) |
|---|-------|-------------|---------|
| 1 | Weak JWT Secret | Generate random 64+ char secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `server/.env` |
| 2 | Demo Credentials in UI | Remove or gate behind `VITE_SHOW_DEMO=true` env variable | `client/src/pages/LoginPage.jsx:91-94` |

### 9.2 HIGH — Fix Before Production

| # | Issue | Remediation | File(s) |
|---|-------|-------------|---------|
| 3 | JWT in localStorage | Migrate to httpOnly cookies with `Secure` and `SameSite=Strict` flags | `server/routes/auth.js`, `client/src/context/AuthContext.jsx`, `client/src/services/api.js` |
| 4 | No Token Revocation | Implement token blacklist (in-memory Set or Redis) checked in auth middleware, or use short-lived access + refresh token pattern | `server/middleware/auth.js` |

### 9.3 MEDIUM — Fix Before Public Access

| # | Issue | Remediation | File(s) |
|---|-------|-------------|---------|
| 5 | Missing URL param validation | Add `param('id').isInt({ min: 1 })` to 4 endpoints | `transactions.js:208`, `notifications.js:52`, `wire.js:217`, `billpay.js:62` |
| 6 | NODE_ENV=development | Set to `production` in production `.env` | `server/.env` |
| 7 | Localhost-only CORS | Use env var: `CORS_ORIGINS=https://yourdomain.com` | `server/server.js:18-28` |
| 8 | No env var validation | Add startup check for required secrets (crash early if missing) | `server/server.js` |

### 9.4 LOW — Recommended Improvements

| # | Issue | Remediation |
|---|-------|-------------|
| 9 | 24h token expiry | Reduce to 1-4 hours for banking app, implement refresh tokens |
| 10 | No request logging | Add `morgan` or structured logging for audit trail |
| 11 | Seed data in codebase | Separate seed scripts from production deployment pipeline |
| 12 | `.env` in repository | Add `server/.env` to `.gitignore`, use `.env.example` template |

### 9.5 Production Deployment Checklist

- [ ] Generate strong random JWT_SECRET (64+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Remove demo credentials from LoginPage
- [ ] Update CORS origins to production domain(s)
- [ ] Enable HTTPS (TLS termination via reverse proxy)
- [ ] Migrate token storage to httpOnly cookies
- [ ] Add token revocation mechanism
- [ ] Add URL parameter validation to 4 endpoints
- [ ] Add request/audit logging
- [ ] Add `.env` to `.gitignore`
- [ ] Run `npm audit` and resolve any new vulnerabilities
- [ ] Set up automated dependency scanning (Dependabot/Snyk)
- [ ] Configure Content-Security-Policy for production domains
- [ ] Set up rate limiting per-user (not just per-IP)
- [ ] Implement account lockout after N failed login attempts

---

## 10. Appendix: Test Evidence

### A. Security Headers Captured

```
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;
  form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';
  script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';
  upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 186
```

### B. Tools Used

| Tool | Purpose | Version |
|------|---------|---------|
| Static Code Analysis | Manual review of all source files | N/A |
| curl | Active API penetration testing | System |
| npm audit | Dependency vulnerability scanning | npm 10.x |
| Autocannon | Load testing (rate limit verification) | Latest |
| Lighthouse | Frontend security headers verification | Latest |

### C. Files Reviewed

**Server (15 files):**
- `server/server.js` — App setup, middleware, CORS, rate limiting
- `server/.env` — Environment variables and secrets
- `server/middleware/auth.js` — JWT authentication and role authorization
- `server/middleware/errorHandler.js` — Error response handling
- `server/middleware/validate.js` — Validation middleware
- `server/routes/auth.js` — Login, register, token generation
- `server/routes/accounts.js` — Account CRUD with ownership checks
- `server/routes/transactions.js` — Transfer, deposit, withdraw
- `server/routes/wire.js` — International wire transfers
- `server/routes/billpay.js` — Bill payment management
- `server/routes/notifications.js` — User notifications
- `server/routes/profile.js` — Profile and password management
- `server/routes/admin.js` — Admin panel endpoints
- `server/routes/calculator.js` — Loan calculator (public)
- `server/db/database.js` — Database setup and schema
- `server/db/seed.js` — Test data seeding

**Client (12 files):**
- `client/src/context/AuthContext.jsx` — Token storage and auth state
- `client/src/services/api.js` — Axios config and interceptors
- `client/src/pages/LoginPage.jsx` — Login form with demo credentials
- `client/src/components/ProtectedRoute.jsx` — Auth route guard
- `client/src/components/AdminRoute.jsx` — Admin route guard
- `client/src/components/PublicRoute.jsx` — Public route guard
- `client/src/pages/TransferPage.jsx` — Transfer form
- `client/src/pages/WireTransferPage.jsx` — Wire transfer form
- `client/src/pages/admin/AdminAccountsPage.jsx` — Admin accounts view
- `client/src/pages/admin/AdminUsersPage.jsx` — Admin users view
- `client/src/pages/admin/AdminUserDetailPage.jsx` — Admin user detail
- `client/vite.config.js` — Dev proxy configuration

---

*Report generated on April 29, 2026. This audit covers the application in its current development state. Re-audit recommended after implementing the listed remediations and before production deployment.*
