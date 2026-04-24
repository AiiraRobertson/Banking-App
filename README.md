# SecureBank — International Banking Made Simple

A full-featured banking web application built with React and Node.js, supporting international wire transfers across 28+ countries in North America, Europe, and Africa.

## Tech Stack

**Frontend:** React 18 (Vite) + Tailwind CSS + React Router v6  
**Backend:** Node.js + Express.js  
**Database:** SQLite (better-sqlite3)  
**Auth:** JWT (HS256, 24h expiry) + bcryptjs (12 rounds)  
**Security:** Helmet, express-rate-limit, express-validator, parameterized queries

## Features

- **User Authentication** — Register, login, JWT-based sessions
- **Account Management** — Checking & savings accounts with real-time balances
- **Transfers** — Internal transfers between accounts with atomic transactions
- **International Wire Transfers** — Send money to 28+ countries with currency conversion and fee calculation
- **Bill Pay** — Manage payees and schedule recurring payments
- **Transaction History** — Full history with filters (type, account, date range)
- **Notifications** — Real-time alerts for transactions, low balances, and security events
- **Loan Calculator** — Monthly payment and amortization calculator
- **Profile Management** — Update personal information and change password
- **Admin Dashboard** — User management, transaction monitoring, account overview
- **Landing Page** — Public marketing page with feature showcase

## Supported Countries

**North America:** United States, Canada  
**Europe:** United Kingdom, Germany, France, Netherlands, Spain, Italy, Portugal, Belgium, Ireland, Switzerland, Sweden, Norway, Denmark, Poland  
**Africa:** Nigeria, Kenya, South Africa, Ghana, Egypt, Tanzania, Ethiopia, Rwanda, Uganda, Cameroon, Senegal, Morocco

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
