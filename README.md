# SecureBank — International Banking Made Simple

A banking web application built with React and Node.js, with USD, NGN, and GHS accounts and restricted Nigeria–Ghana transfer flows.

## Tech Stack

**Frontend:** React 18 (Vite) + Tailwind CSS + React Router v6  
**Backend:** Node.js + Express.js  
**Database:** SQLite (better-sqlite3)  
**Auth:** JWT (HS256, 24h expiry) + bcryptjs (12 rounds)  
**Security:** Helmet, express-rate-limit, express-validator, parameterized queries

## Features

- **User Authentication** — Register, login, JWT-based sessions
- **Account Management** — Existing USD checking/savings balances plus NGN and GHS wallets
- **Transfers** — Atomic same-currency transfers with a 0.1% sender-paid fee
- **Currency Conversion** — Explicitly quoted conversions between USD, NGN, and GHS, with a 0.4% sender-paid fee
- **Nigeria–Ghana Flows** — Kapita transfers only; GHS can move from Ghana to Nigeria and is credited in GHS
- **USD Wire Handling** — Incoming USD is credited only to USD accounts; development simulation is not external settlement, and external outbound wires are unavailable
- **Bill Payee Management** — Manage saved payee details; payment execution is unavailable until a verified provider is integrated
- **Mobile Services** — Airtime and data entry points for Nigeria and Ghana; purchases are unavailable until a verified provider is integrated
- **Transaction History** — Full history with filters (type, account, date range)
- **Notifications** — Real-time alerts for transactions, low balances, and security events
- **Loan Calculator** — Monthly payment and amortization calculator
- **Profile Management** — Update personal information and change password
- **Admin Dashboard** — User management, transaction monitoring, account overview
- **Landing Page** — Public marketing page with feature showcase

## Multi-Currency Development Rates

Conversion quotes use server-configured development test rates only and are disabled when `NODE_ENV=production`. Defaults are `1 USD = 1,550 NGN` and `1 USD = 14.80 GHS`. Override them on the server with `DEV_FX_NGN_PER_USD` and `DEV_FX_GHS_PER_USD`. These rates are not live market prices and must not be used to settle real transactions.

Transfers require matching source and destination currencies. Currency conversion is a separate quoted action. Cross-border Kapita transfers are limited to users identified as Nigerian or Ghanaian by their registration nationality; GHS cross-border transfers are allowed from Ghana to Nigeria. External bank settlement is not integrated. The incoming USD wire form is a development-only simulator and is disabled in production.

## Airtime, Data, and Bill Payments

No licensed airtime, data, or bill-payment provider is currently integrated. No mobile network operators or data plans are enabled for Nigeria or Ghana, and no external billers are supported. The Services page reports these products as unavailable rather than simulating a completed purchase.

The existing bill-pay API supports saved-payee management only. Bill-payment and scheduled-payment submissions return `503 BILL_PAYMENT_PROVIDER_UNAVAILABLE`; they do not debit accounts or create a payment schedule. Existing schedule records are historical/user-managed records and are not automatically processed.

To enable these services, select and onboard an approved aggregator that supports the required country and product, implement its server-side adapter and verified status/callback flow, and add provider-backed validation, idempotency, ledger/reversal handling, and tests before enabling payment actions. Provider credentials must remain in server environment variables; adding credentials alone does not enable purchases.

No provider has been selected for these services, so provider-specific credential names and settings are intentionally not invented.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
cd bank-app

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the App

```bash
# Terminal 1 — Start the server
cd server
npm run dev
# Server runs on http://localhost:5000

# Terminal 2 — Start the client
cd client
npm run dev
# Client runs on http://localhost:5173
```

### Demo Credentials

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | admin@bank.com    | Admin123!  |
| User  | john@example.com  | User1234!  |

## Project Structure

```
bank-app/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Navbar, DashboardLayout, AdminLayout
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── AdminRoute.jsx
│   │   │   └── PublicRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── pages/
│   │   │   ├── admin/          # Admin dashboard, users, transactions, accounts
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── AccountsPage.jsx
│   │   │   ├── AccountDetailPage.jsx
│   │   │   ├── TransferPage.jsx
│   │   │   ├── WireTransferPage.jsx
│   │   │   ├── TransactionHistoryPage.jsx
│   │   │   ├── BillPayPage.jsx
│   │   │   ├── LoanCalculatorPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── NotificationsPage.jsx
│   │   ├── services/           # API service layer (axios)
│   │   └── utils/              # Formatting helpers
│   └── index.html
├── server/                     # Express backend
│   ├── db/
│   │   ├── database.js         # SQLite connection (WAL mode)
│   │   ├── schema.js           # Table definitions
│   │   └── seed.js             # Demo data
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication
│   │   ├── validate.js         # Express-validator handler
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js             # Register, login, profile
│   │   ├── accounts.js
│   │   ├── transactions.js
│   │   ├── billpay.js
│   │   ├── wire.js             # International transfers
│   │   ├── notifications.js
│   │   ├── profile.js
│   │   ├── admin.js
│   │   └── calculator.js
│   ├── utils/
│   │   ├── accountNumber.js
│   │   └── currencies.js       # 28 countries, exchange rates, fees
│   └── server.js
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/accounts` | List user accounts |
| POST | `/api/accounts` | Create new account |
| GET | `/api/accounts/:id` | Account details |
| POST | `/api/transactions/deposit` | Deposit funds |
| POST | `/api/transactions/withdraw` | Withdraw funds |
| POST | `/api/transactions/transfer` | Internal transfer |
| GET | `/api/transactions` | Transaction history |
| GET | `/api/wire/countries` | Supported countries |
| GET | `/api/wire/rates` | Exchange rates |
| POST | `/api/wire/quote` | Get transfer quote |
| POST | `/api/wire/send` | Send wire transfer |
| GET | `/api/wire/history` | Wire transfer history |
| GET | `/api/billpay/payees` | List payees |
| POST | `/api/billpay/payees` | Add payee |
| POST | `/api/billpay/pay` | Make payment |
| GET | `/api/notifications` | User notifications |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/password` | Change password |
| GET | `/api/admin/dashboard` | Admin stats |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | User details |

## Security

- JWT tokens with 24-hour expiry
- Password hashing with bcrypt (12 salt rounds)
- Rate limiting (200 req/15min global, 10 req/15min for auth)
- Helmet security headers
- Parameterized SQL queries (no SQL injection)
- IDOR prevention — all queries scoped to authenticated user
- Atomic database transactions for all monetary operations
- Input validation with express-validator
