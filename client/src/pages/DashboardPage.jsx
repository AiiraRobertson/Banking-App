import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { getMaturityInfo } from '../utils/savingsLock';

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balancesHidden, setBalancesHidden] = useState(false);

  useEffect(() => {
    getAccounts().then(accRes => {
      setAccounts(accRes.data.accounts);
    }).finally(() => setLoading(false));
  }, []);

  const balancesByCurrency = accounts.reduce((totals, account) => {
    totals[account.currency] = (totals[account.currency] || 0) + account.balance;
    return totals;
  }, { NGN: 0, GHS: 0, USD: 0 });

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600 dark:text-violet-300">Your Kapita overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-t-primary">Welcome back, {user?.first_name}.</h1>
        <p className="mt-1 text-t-tertiary">Here’s what’s happening with your accounts.</p>
      </div>

      {user && !user.profile_photo && (
        <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Verify your identity</p>
              <p className="text-xs text-amber-700">Upload a profile photo to complete account verification.</p>
            </div>
          </div>
          <Link to="/profile" className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 shrink-0">
            Add photo
          </Link>
        </div>
      )}

      <section aria-labelledby="balances-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="balances-heading" className="text-lg font-semibold tracking-tight text-t-primary">Your balances</h2>
        <button
          type="button"
          onClick={() => setBalancesHidden(value => !value)}
          aria-pressed={balancesHidden}
          aria-label={balancesHidden ? 'Show account balances' : 'Hide account balances'}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-t-secondary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {balancesHidden
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.3 4.5 9 7-.2.9-.9 2.1-2 3.2M6.2 6.2C4 7.6 2.6 10.1 2 12c.4 1.4 1.7 3.6 4.2 5.2A10.7 10.7 0 0012 19c.9 0 1.8-.1 2.6-.4" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6z" />}
          </svg>
          {balancesHidden ? 'Show balances' : 'Hide balances'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { currency: 'NGN', label: 'Naira balance', accent: 'var(--brand-teal)' },
          { currency: 'GHS', label: 'Cedis balance', accent: 'var(--brand-coral)' },
          { currency: 'USD', label: 'Dollar balance', accent: 'var(--brand-purple)' }
        ].map(item => (
          <div key={item.currency} style={{ '--card-accent': item.accent }} className="brand-card min-w-0 rounded-2xl border border-b-secondary bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <div className="mb-5 flex items-center gap-3">
              <span className="brand-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
                {item.currency}
              </span>
              <p className="text-sm font-medium text-t-secondary">{item.label}</p>
            </div>
            <p className="break-words text-xl font-semibold tracking-tight text-t-primary">
              {balancesHidden ? '••••••' : formatCurrency(balancesByCurrency[item.currency], item.currency)}
            </p>
          </div>
        ))}
        <div style={{ '--card-accent': 'var(--brand-sky)' }} className="brand-card min-w-0 rounded-2xl border border-b-secondary bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="brand-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm11 9h3" />
              </svg>
            </span>
            <p className="text-sm font-medium text-t-secondary">Accounts</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-t-primary">{accounts.length}</p>
        </div>
        <div className="brand-quick-transfer min-w-0 rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="brand-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h13m0 0-4-4m4 4-4 4M17 17H4m0 0 4 4m-4-4 4-4" />
              </svg>
            </span>
            <p className="text-sm font-semibold">Quick transfer</p>
          </div>
          <Link to="/transfer" className="inline-flex items-center gap-2 text-base font-bold focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Send money
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-t-primary">Your accounts</h2>
            <Link to="/accounts" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => {
              const lock = getMaturityInfo(account);
              return (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                    style={{ '--card-accent': account.currency === 'NGN' ? 'var(--brand-teal)' : account.currency === 'GHS' ? 'var(--brand-coral)' : 'var(--brand-purple)' }}
                    className="brand-panel block rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      account.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                    </span>
                    <span className="text-xs text-t-muted">****{account.account_number.slice(-4)}</span>
                  </div>
                  <p className="text-2xl font-bold text-t-primary">{balancesHidden ? '••••••' : formatCurrency(account.balance, account.currency)}</p>
                  <p className="text-xs text-t-muted mt-1">{account.currency} balance</p>
                  <p className="text-xs text-t-muted mt-1">Available balance</p>
                  {lock.isSavings && lock.locked && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      🔒 Locked · {lock.daysRemaining}d
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-t-primary">Quick actions</h2>
            <Link to="/bill-pay" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-violet-300">All services</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/add-money', label: 'Add money', icon: 'M12 4v16m8-8H4', accent: 'var(--brand-teal)' },
              { to: '/transfer', label: 'Transfer', icon: 'M8 7h12m0 0l-4-4m4 4-4 4m0 6H4m0 0l4 4m-4-4l4-4', accent: 'var(--brand-indigo)' },
              { to: '/bill-pay', label: 'Bill pay', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', accent: 'var(--brand-pink)' },
              { to: '/wire-transfer', label: 'Receive USD', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', accent: 'var(--brand-sky)' },
              { to: '/convert', label: 'Convert currency', icon: 'M4 7h13m0 0-3-3m3 3-3 3M20 17H7m0 0 3 3m-3-3 3-3', accent: 'var(--brand-yellow)', ink: '#604600', darkInk: '#ffe6a3' },
              { to: '/beneficiaries', label: 'Beneficiaries', icon: 'M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M14 7a4 4 0 11-8 0 4 4 0 018 0z', accent: 'var(--brand-coral)' },
              { to: '/airtime', label: 'Buy airtime', icon: 'M12 8v8m-4-4h8m7 0a11 11 0 11-22 0 11 11 0 0122 0z', accent: 'var(--brand-purple)' },
              { to: '/data', label: 'Buy data', icon: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm3 4h8m-8 4h8', accent: 'var(--brand-lime)', ink: '#365416', darkInk: '#d8ffad' },
            ].map(action => (
              <Link key={action.label} to={action.to} style={{ '--card-accent': action.accent, '--card-ink': action.ink, '--card-dark-ink': action.darkInk }} className="brand-panel min-w-0 rounded-xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group">
                <div className="brand-icon mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                  </svg>
                </div>
                <span className="block text-xs font-semibold text-t-secondary">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
