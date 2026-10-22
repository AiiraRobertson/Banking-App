import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { getMaturityInfo } from '../utils/savingsLock';

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-2xl font-bold text-t-primary">Dashboard</h1>
        <p className="text-t-tertiary">Welcome back, {user?.first_name}!</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { currency: 'NGN', label: 'Naira balance', iconClass: 'bg-emerald-50 text-emerald-700' },
          { currency: 'GHS', label: 'Cedis balance', iconClass: 'bg-blue-50 text-blue-700' },
          { currency: 'USD', label: 'Dollar balance', iconClass: 'bg-indigo-50 text-indigo-700' }
        ].map(item => (
          <div key={item.currency} className="min-w-0 rounded-2xl border border-b-secondary bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <div className="mb-5 flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${item.iconClass}`}>
                {item.currency}
              </span>
              <p className="text-sm font-medium text-t-secondary">{item.label}</p>
            </div>
            <p className="break-words text-xl font-semibold tracking-tight text-t-primary">
              {formatCurrency(balancesByCurrency[item.currency], item.currency)}
            </p>
          </div>
        ))}
        <div className="min-w-0 rounded-2xl border border-b-secondary bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm11 9h3" />
              </svg>
            </span>
            <p className="text-sm font-medium text-t-secondary">Accounts</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-t-primary">{accounts.length}</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h13m0 0-4-4m4 4-4 4M17 17H4m0 0 4 4m-4-4 4-4" />
              </svg>
            </span>
            <p className="text-sm font-medium text-indigo-900">Quick transfer</p>
          </div>
          <Link to="/transfer" className="inline-flex items-center gap-2 text-base font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Send money
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-t-primary">Your Accounts</h2>
            <Link to="/accounts" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => {
              const lock = getMaturityInfo(account);
              return (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className="bg-surface rounded-xl shadow-sm border border-b-secondary p-5 hover:shadow-lg hover:shadow-indigo-100/30 hover:border-indigo-100 hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      account.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                    </span>
                    <span className="text-xs text-t-muted">****{account.account_number.slice(-4)}</span>
                  </div>
                  <p className="text-2xl font-bold text-t-primary">{formatCurrency(account.balance, account.currency)}</p>
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
          <h2 className="text-lg font-semibold text-t-primary">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/add-money', label: 'Add Money', icon: 'M12 4v16m8-8H4', color: 'text-green-600 bg-green-50' },
              { to: '/transfer', label: 'Transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'text-indigo-600 bg-indigo-50' },
              { to: '/bill-pay', label: 'Pay Bill', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-orange-600 bg-orange-50' },
              { to: '/wire-transfer', label: 'Receive USD', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'text-purple-600 bg-purple-50' },
              { to: '/convert', label: 'Convert Currency', icon: 'M4 7h13m0 0-3-3m3 3-3 3M20 17H7m0 0 3 3m-3-3 3-3', color: 'text-amber-600 bg-amber-50' },
            ].map(action => (
              <Link key={action.label} to={action.to} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-4 text-center hover:shadow-lg hover:shadow-indigo-100/30 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-t-secondary">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
