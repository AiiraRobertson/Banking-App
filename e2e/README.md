# Kapita Playwright E2E

End-to-end Playwright suite using the Page Object Model.

## Layout

```
e2e/
├── playwright.config.js     # Projects (setup, chromium, firefox, mobile), reporters, baseURL
├── .env.example             # Copy to .env to override defaults
├── pages/                   # Page objects (one class per page/component)
│   ├── BasePage.js          # Shared helpers every page extends
│   ├── LoginPage.js
│   ├── RegisterPage.js
│   ├── DashboardPage.js
│   ├── SidebarComponent.js  # Component object (reused across pages)
│   ├── TransferPage.js      # Covers all 3 modes: own / other / bank
│   ├── WireTransferPage.js
│   ├── AccountsPage.js
│   └── ProfilePage.js
├── fixtures/
│   └── authFixture.js       # Extended `test` with page-object & API client fixtures
├── utils/
│   ├── api.js               # Lightweight API client for setup/assertions
│   └── testData.js          # Users, recipients, helpers
├── tests/
│   ├── global.setup.js      # Auth setup project — runs once, persists storageState
│   ├── auth.spec.js         # Sign-out / sign-in flows
│   ├── dashboard.spec.js
│   ├── transfer.spec.js     # Internal + peer + Other Bank flows
│   ├── wireTransfer.spec.js
│   ├── accounts.spec.js
│   └── api.spec.js
└── .auth/                   # Saved storage state (gitignored)
```

## Setup

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
cp .env.example .env       # optional — edit if your dev URLs differ
```

Make sure both the API and Vite dev server are running:
```bash
# In bank-app/server
npm run dev          # http://localhost:3001
# In bank-app/client
npm run dev          # http://localhost:5173
```

## Run

```bash
npm test                 # full suite (chromium + firefox + mobile)
npm run test:chromium    # chromium only
npm run test:headed      # see the browser
npm run test:ui          # Playwright UI mode
npm run test:smoke       # tests tagged @smoke
npm run test:regression  # tests tagged @regression
npm run report           # open last HTML report
npm run codegen          # record new tests
```

## How auth works

`tests/global.setup.js` runs once as a dependency project. It logs in via the UI
and writes the session to `e2e/.auth/user.json`. All other projects load that
state via `storageState`, so individual tests start already signed in.

Need an unauthenticated test? Add `test.use({ storageState: { cookies: [], origins: [] } })`
at the top of your file (see `auth.spec.js`).

## Adding a new page

1. Create `pages/MyPage.js` extending `BasePage`.
2. Export it from `pages/index.js`.
3. Wire it as a fixture in `fixtures/authFixture.js` if you want it injected.
4. Write `tests/myPage.spec.js` using `const { test, expect } = require('../fixtures/authFixture')`.

## Tag conventions

- `@smoke` — must pass on every commit (login, dashboard render, API health).
- `@regression` — broader coverage (transfer flows, wire quote, beneficiaries).

## CI

Set `CI=true` to enable retries and bail on `.only`. The HTML report is written to
`playwright-report/`; JSON results land in `test-results/results.json`.
