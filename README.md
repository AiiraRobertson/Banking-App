# Kapita Banking

Kapita is a full-stack banking web application built as a realistic, interactive product demo. It lets customers explore everyday banking workflows in a browser, while administrators can inspect and manage the demo users, accounts, and transactions.

The application stores demo data in SQLite and performs its banking operations within that local application. It is not connected to a real bank, payment processor, or financial network, so use it for development, testing, and demonstration only. Currency and international wire quotes use exchange-rate data fetched from an external rates service.

## What You Can Do

- Create an account, sign in, verify an email address, and reset a password
- View checking and savings accounts, balances, and transaction activity
- Add funds and make internal transfers between accounts
- Manage beneficiaries and pay bills
- Request international wire quotes and send demo transfers to supported destinations
- Convert currencies and view exchange rates
- Review transaction notifications and manage profile details
- Use an admin dashboard to review users, accounts, and transactions
- Browse public information pages, including FAQs, policies, contact, and feedback

International wire destinations cover 28 countries in North America, Europe, and Africa. The country list, currencies, fees, and required recipient banking details are maintained by the server.

## How It Works

The frontend is a React single-page application. It calls a Node.js and Express API for authentication, account data, transfers, bill pay, notifications, profile management, and administration. SQLite persists application data locally; the server initializes its schema and seeds demo records when the database is empty.

The repository also includes browser-based end-to-end tests in `e2e/`, API/security test materials, load-test utilities, and deployment configuration for Netlify and Render. See [AZURE_DEPLOYMENT_README.md](AZURE_DEPLOYMENT_README.md) for the Azure deployment notes.

## Technology

- **Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4
- **Backend:** Node.js 20+, Express 5
- **Database:** SQLite via `better-sqlite3`
- **Authentication:** JWT sessions and bcrypt password hashing
- **Request/security controls:** input validation, Helmet security headers, rate limiting, and parameterized SQL queries
- **Testing:** Playwright end-to-end tests and server-side API/load test utilities

## Run Locally

### Requirements

- Node.js 20.19 or later
- npm

### Install dependencies

From the repository root:

```bash
npm run install:all
```

### Start the application

From the repository root:

```bash
npm run dev
```

The frontend is available at `http://localhost:5173`. The API runs at `http://localhost:3001`; Vite proxies `/api` requests to it during development. On first start, the server creates the local SQLite database and inserts demo records if the database has no users.

To run either process separately:

```bash
npm run dev:server
npm run dev:client
```

Build the frontend for production with:

```bash
npm run build
```

## Demo Accounts

The server seeds these accounts only when the database is empty:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@bank.com` | `Admin123!` |
| Customer | `john@example.com` | `User1234!` |

These credentials are for local demonstration only. Do not use them, or the seeded balances, as production credentials or financial data.

## Repository Layout

```text
bank-app/
├── client/       React application, pages, components, contexts, and API services
├── server/       Express API, middleware, SQLite schema/seeding, and route handlers
├── e2e/          Playwright browser tests and fixtures
├── API_SECURITY_TEST_SCENARIOS.md
├── Kapita_Security_Tests.postman_collection.json
├── AZURE_DEPLOYMENT_README.md
├── netlify.toml
└── render.yaml
```

## API Areas

The API is mounted under `/api` and organized by capability:

| Route prefix | Purpose |
| --- | --- |
| `/api/auth` | Registration, login, email verification, and password recovery |
| `/api/accounts` | Account listing, details, and account operations |
| `/api/transactions` | Deposits, withdrawals, transfers, and transaction history |
| `/api/funding` | Funding workflows |
| `/api/wire` | Supported destinations, banks, wire quotes, and transfers |
| `/api/currency` | Exchange rates and currency conversion |
| `/api/billpay` | Payees, bill payments, and related payment workflows |
| `/api/beneficiaries` | Beneficiary management |
| `/api/notifications` | Customer notifications |
| `/api/profile` | Profile and account preferences |
| `/api/admin` | Administrative dashboards and management |
| `/api/resources` | Public contact and feedback resources |

The server also provides `GET /health` as a health-check endpoint.

## Configuration And Deployment

The server reads environment variables through `dotenv`. Start from [`server/.env.example`](server/.env.example) when creating a local environment file. At minimum, configure a unique, sufficiently long `JWT_SECRET` for any non-demo deployment. Optional settings include `PORT`, `DB_PATH` for the SQLite file location, and `CLIENT_ORIGIN` for allowed production frontend origins. Email delivery can be configured with `RESEND_API_KEY` and `EMAIL_FROM`; without a mail provider, verification and reset links are logged by the server for development use.

SQLite persistence on a hosted service requires a persistent disk. Configure `DB_PATH` to a location on that disk. Keep secrets out of source control and use the hosting provider's environment-variable settings. Review the deployment notes before deploying; this project is a demonstration application and has not been presented as a regulated production banking system.