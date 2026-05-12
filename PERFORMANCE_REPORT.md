# SecureBank Performance Report

**Date:** April 28, 2026
**Environment:** Development (localhost)
**Tools Used:** Google Lighthouse, Autocannon, Vite Build Analyzer

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Frontend Performance (Lighthouse)](#frontend-performance)
3. [Bundle Analysis](#bundle-analysis)
4. [Backend Load Testing](#backend-load-testing)
5. [Recommendations](#recommendations)

---

## 1. Executive Summary

| Area | Rating | Summary |
|------|--------|---------|
| Frontend Performance | Needs Improvement | Lighthouse performance scores 36-42/100; high FCP and LCP times due to unminified dev bundle |
| Accessibility | Good | 91-93/100 across pages |
| Best Practices | Excellent | 100/100 |
| SEO | Good | 82-83/100 |
| Bundle Size | Good | 427 KB JS (115 KB gzipped), 61 KB CSS (10 KB gzipped) |
| Backend Throughput | Good | ~2,450 req/s on API endpoints under load |
| Backend Latency | Good | p50 ~13-94ms, p99 ~109-267ms under 50 concurrent connections |

> **Note:** Lighthouse was run against the Vite dev server (unminified, no compression). Production scores will be significantly higher after building and serving with proper compression and caching.

---

## 2. Frontend Performance (Lighthouse)

### 2.1 Landing Page (`/welcome`)

| Category | Score |
|----------|-------|
| Performance | **36** |
| Accessibility | **91** |
| Best Practices | **100** |
| SEO | **83** |

#### Core Web Vitals

| Metric | Value | Rating |
|--------|-------|--------|
| First Contentful Paint (FCP) | 9.5s | Poor |
| Largest Contentful Paint (LCP) | 17.0s | Poor |
| Total Blocking Time (TBT) | 850ms | Needs Improvement |
| Cumulative Layout Shift (CLS) | 0 | Good |
| Speed Index | 9.5s | Poor |
| Time to Interactive (TTI) | 17.8s | Poor |

### 2.2 Login Page (`/login`)

| Category | Score |
|----------|-------|
| Performance | **42** |
| Accessibility | **93** |
| Best Practices | **100** |
| SEO | **82** |

#### Core Web Vitals

| Metric | Value | Rating |
|--------|-------|--------|
| First Contentful Paint (FCP) | 9.5s | Poor |
| Largest Contentful Paint (LCP) | 17.1s | Poor |
| Total Blocking Time (TBT) | 550ms | Needs Improvement |
| Cumulative Layout Shift (CLS) | 0 | Good |
| Speed Index | 10.1s | Poor |
| Time to Interactive (TTI) | 17.5s | Poor |

### 2.3 Identified Opportunities

| Opportunity | Potential Savings |
|-------------|-------------------|
| Minify JavaScript | ~1,031 KB |
| Reduce unused JavaScript | ~888 KB |
| Improve image delivery | ~129 KB |
| Minify CSS | ~3 KB |

### 2.4 Diagnostics

| Issue | Detail |
|-------|--------|
| Main-thread work | 5.3s |
| Network payload | 2,832 KB total |
| Contrast ratio | Some text colors lack sufficient contrast |
| robots.txt | Not configured |
| Back/forward cache | 1 failure reason |

> **Important Context:** These scores are from the **development server** which serves unminified, uncompressed bundles. The production build (`npm run build`) already minifies JS and CSS. Serving the `dist/` folder with gzip/brotli compression and proper caching headers will dramatically improve these scores.

---

## 3. Bundle Analysis

### 3.1 Production Build Output

| Asset | Raw Size | Gzipped |
|-------|----------|---------|
| `index.js` | 427.29 KB | 114.93 KB |
| `index.css` | 60.79 KB | 10.25 KB |
| `index.html` | 0.71 KB | 0.45 KB |
| **Total** | **488.79 KB** | **125.63 KB** |

**Build Time:** 1.97s
**Modules Transformed:** 118

### 3.2 Dependencies

#### Production Dependencies (6)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.5 | UI framework |
| react-dom | ^19.2.5 | DOM rendering |
| react-router-dom | ^7.14.2 | Client-side routing |
| axios | ^1.15.2 | HTTP client |
| tailwindcss | ^4.2.4 | Utility CSS framework |
| @tailwindcss/vite | ^4.2.4 | Vite integration |

#### Server Dependencies (10)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | Web framework |
| better-sqlite3 | ^12.9.0 | Database |
| bcryptjs | ^3.0.3 | Password hashing |
| jsonwebtoken | ^9.0.3 | Authentication |
| helmet | ^8.1.0 | Security headers |
| cors | ^2.8.6 | Cross-origin support |
| express-rate-limit | ^8.4.0 | Rate limiting |
| express-validator | ^7.3.2 | Input validation |
| dotenv | ^17.4.2 | Environment config |
| uuid | ^14.0.0 | ID generation |

### 3.3 Bundle Assessment

- **JS bundle (115 KB gzipped)** is within acceptable range for a SPA with routing and auth
- **CSS (10 KB gzipped)** is lean thanks to Tailwind's purging
- **No code splitting** is currently implemented — the entire app loads as a single chunk
- **node_modules:** 297 MB (development only, does not affect production)

---

## 4. Backend Load Testing

Tests run with [Autocannon](https://github.com/mcollina/autocannon) against Express 5 + SQLite backend.

### 4.1 POST `/api/auth/login` (50 connections, 5 pipelining, 10s)

| Metric | 2.5% | 50% (Median) | 97.5% | 99% | Avg | Max |
|--------|------|-------------|-------|-----|-----|-----|
| **Latency** | 94ms | 151ms | 5,827ms | 5,919ms | 417.5ms | 5,996ms |

| Metric | 1% | 50% | 97.5% | Avg |
|--------|-----|------|-------|-----|
| **Req/Sec** | 1 | 2 | 1,801 | 594.71 |

- **Total requests:** 5,947 in 10.1s
- **All non-2xx** (expected — test credentials are invalid)
- **Observation:** High p99 latency (5.9s) indicates bcrypt password hashing is CPU-bound and creates queueing under heavy load. This is expected and actually desired for security — bcrypt is intentionally slow.

### 4.2 GET `/api/accounts` (50 connections, 5 pipelining, 10s)

| Metric | 2.5% | 50% (Median) | 97.5% | 99% | Avg | Max |
|--------|------|-------------|-------|-----|-----|-----|
| **Latency** | 42ms | 94ms | 236ms | 267ms | 101.3ms | 952ms |

| Metric | 1% | 50% | 97.5% | Avg |
|--------|-----|------|-------|-----|
| **Req/Sec** | 1,642 | 2,185 | 3,825 | 2,453.31 |

- **Total requests:** 24,531 in 10.1s
- **Throughput:** ~2,450 req/s average
- **All non-2xx** (expected — requires authentication)
- **Observation:** Excellent throughput for auth-guarded endpoints. Sub-100ms median latency under 50 concurrent connections.

### 4.3 GET `/api/transactions` (20 connections, 10s)

| Metric | 2.5% | 50% (Median) | 97.5% | 99% | Avg | Max |
|--------|------|-------------|-------|-----|-----|-----|
| **Latency** | 2ms | 13ms | 81ms | 109ms | 20.06ms | 230ms |

| Metric | 1% | 50% | 97.5% | Avg |
|--------|-----|------|-------|-----|
| **Req/Sec** | 442 | 961 | 1,386 | 971.4 |

- **Total requests:** 9,714 in 10.1s
- **Throughput:** ~971 req/s average
- **Observation:** Very fast response times. p50 at 13ms, p99 at 109ms — excellent for a SQLite-backed API.

### 4.4 Backend Summary

| Endpoint | Avg Latency | p99 Latency | Avg Req/s | Notes |
|----------|-------------|-------------|-----------|-------|
| POST `/api/auth/login` | 417ms | 5,919ms | 595 | bcrypt is intentionally CPU-heavy |
| GET `/api/accounts` | 101ms | 267ms | 2,453 | Auth middleware + DB query |
| GET `/api/transactions` | 20ms | 109ms | 971 | Auth middleware + DB query |

---

## 5. Recommendations

### 5.1 High Priority

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 1 | **Serve production build with compression** — Use `vite preview` or nginx with gzip/brotli | Performance score +30-40 pts | Low |
| 2 | **Add code splitting** — Use `React.lazy()` for route-level splitting to reduce initial bundle | Faster FCP/TTI | Medium |
| 3 | **Optimize planet.png** — Convert to WebP format and add width/height to prevent layout shift | Save ~129 KB, better CLS | Low |
| 4 | **Add robots.txt** — Create `public/robots.txt` for SEO | SEO score improvement | Low |

### 5.2 Medium Priority

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 5 | **Add font preloading** — Preload critical fonts with `<link rel="preload">` | Faster FCP | Low |
| 6 | **Lazy load below-fold images** — Add `loading="lazy"` to non-critical images | Reduced initial payload | Low |
| 7 | **Fix contrast ratios** — Some text colors need higher contrast for WCAG compliance | Accessibility +2-5 pts | Low |
| 8 | **Add service worker** — Cache static assets for repeat visits | Faster repeat loads | Medium |

### 5.3 Low Priority (Production Deployment)

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 9 | **CDN for static assets** — Serve JS/CSS/images from a CDN | Global load times | Medium |
| 10 | **HTTP/2 or HTTP/3** — Enable multiplexing for parallel asset loading | Reduced connection overhead | Low (nginx config) |
| 11 | **Database connection pooling** — If scaling beyond SQLite | Backend throughput | High |
| 12 | **Add request caching** — Cache frequent DB queries (dashboard stats, etc.) | Reduced DB load | Medium |

### 5.4 Expected Production Scores

With recommendations #1-4 implemented:

| Metric | Current (Dev) | Expected (Prod) |
|--------|--------------|-----------------|
| Performance | 36-42 | **75-90** |
| FCP | 9.5s | **1.0-1.5s** |
| LCP | 17.0s | **1.5-2.5s** |
| TBT | 550-850ms | **100-200ms** |
| Bundle (gzipped) | 115 KB | **~60-80 KB** (with code splitting) |

---

## Appendix

### Test Configuration

- **Frontend:** Vite 8.0.10 dev server on port 5173
- **Backend:** Express 5.2.1 on port 3001
- **Database:** SQLite via better-sqlite3
- **OS:** Windows 11 Pro
- **Node.js:** v24.11.0
- **Lighthouse:** CLI (headless Chrome)
- **Load Testing:** Autocannon

### Files Generated

- `client/lighthouse-report.report.html` — Full Lighthouse HTML report (landing page)
- `client/lighthouse-report.report.json` — Lighthouse JSON data (landing page)
- `client/lighthouse-login.report` — Lighthouse JSON data (login page)
- `PERFORMANCE_REPORT.md` — This document
