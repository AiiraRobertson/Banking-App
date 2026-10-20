import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccounts } from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import { formatCurrency } from '../utils/formatCurrency';
import { getMaturityInfo } from '../utils/savingsLock';

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAccounts(), getTransactions({ limit: 5 })])
      .then(([accountResponse, transactionResponse]) => {
        setAccounts(accountResponse.data.accounts);
        setTransactions(transactionResponse.data.transactions);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d9e8dc] border-t-[#17643d]" /></div>;
  }

  return (
    <div className="dashboard-page space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#368052]">Your finances</p>
          <h1 className="font-display text-2xl font-bold text-t-primary sm:text-3xl">Good to see you, {user?.first_name}.</h1>
        </div>
        <p className="text-sm text-t-tertiary">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {user && !user.profile_photo && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-950">Complete your profile</p>
            <p className="mt-0.5 text-xs text-amber-800">Add a profile photo to finish setting up your account.</p>
          </div>
          <Link to="/profile" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800">Update profile</Link>
        </div>
      )}

      <section className="dashboard-hero relative overflow-hidden rounded-2xl p-5 text-white sm:p-8">
        <div className="relative z-10 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Total available balance</p>
            <p className="mt-2 font-display text-4xl font-bold tabular sm:text-5xl">{formatCurrency(totalBalance)}</p>
            <p className="mt-3 text-sm text-white/65">Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
          </div>
          <Link to="/transfer" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#17452d] transition-transform hover:-translate-y-0.5">
            <span>Send money</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="dashboard-orbit" aria-hidden="true" />
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 font-display text-lg font-bold text-t-primary">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/add-money', label: 'Add money', icon: 'M12 4v16m8-8H4', tone: 'bg-[#e7f1e8] text-[#17643d]' },
            { to: '/transfer', label: 'Transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', tone: 'bg-[#eaf0ed] text-[#43544c]' },
            { to: '/bill-pay', label: 'Pay a bill', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6zm7-5a2 2 0 11-4 0 2 2 0 014 0z', tone: 'bg-[#f4efe3] text-[#8a6421]' },
            { to: '/wire-transfer', label: 'Send a wire', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', tone: 'bg-[#e8edf4] text-[#405e7d]' },
          ].map(action => (
            <Link key={action.label} to={action.to} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-b-secondary bg-surface p-3 transition-colors hover:border-[#a9c8b0] hover:bg-[#fbfdfb] sm:p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.tone}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={action.icon} /></svg>
              </span>
              <span className="text-sm font-semibold text-t-secondary">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section aria-labelledby="accounts-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="accounts-title" className="font-display text-lg font-bold text-t-primary">Your accounts</h2>
            <Link to="/accounts" className="text-sm font-semibold text-[#17643d] hover:underline">All accounts <span aria-hidden="true">&rarr;</span></Link>
          </div>
          <div className="divide-y divide-b-secondary overflow-hidden rounded-xl border border-b-secondary bg-surface">
            {accounts.map(account => {
              const lock = getMaturityInfo(account);
              return (
                <Link key={account.id} to={`/accounts/${account.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-[#f8faf8] sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e7f1e8] text-[#17643d]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 10h18M5 10V6l7-3 7 3v4M5 10v9m14-9v9M3 19h18M9 14v2m6-2v2" /></svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold capitalize text-t-primary">{account.account_type} account</span>
                      <span className="mt-0.5 block text-xs text-t-tertiary">•••• {account.account_number.slice(-4)}{lock.isSavings && lock.locked ? ` · Locked ${lock.daysRemaining}d` : ''}</span>
                    </span>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular text-t-primary">{formatCurrency(account.balance)}</span>
                    <span className="mt-0.5 block text-xs text-t-tertiary">Available</span>
                  </span>
                </Link>
              );
            })}
            {accounts.length === 0 && <p className="p-5 text-sm text-t-tertiary">No accounts to show yet.</p>}
          </div>
        </section>

        <section aria-labelledby="activity-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="activity-title" className="font-display text-lg font-bold text-t-primary">Recent activity</h2>
            <Link to="/transactions" className="text-sm font-semibold text-[#17643d] hover:underline">See all <span aria-hidden="true">&rarr;</span></Link>
          </div>
          <div className="divide-y divide-b-secondary overflow-hidden rounded-xl border border-b-secondary bg-surface">
            {transactions.map(transaction => {
              const isDebit = transaction.from_account_id && accounts.some(account => account.id === transaction.from_account_id) && transaction.transaction_type !== 'deposit';
              return (
                <div key={transaction.id} className="flex items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDebit ? 'bg-[#f5eee8] text-[#9a5a35]' : 'bg-[#e7f1e8] text-[#17643d]'}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={isDebit ? 'M12 19V5m-7 7l7-7 7 7' : 'M12 5v14m7-7l-7 7-7-7'} /></svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-t-primary">{transaction.description || transaction.transaction_type.replaceAll('_', ' ')}</span>
                      <span className="mt-0.5 block text-xs capitalize text-t-tertiary">{new Date(transaction.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {transaction.transaction_type.replaceAll('_', ' ')}</span>
                    </span>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular ${isDebit ? 'text-t-primary' : 'text-[#17643d]'}`}>{isDebit ? '-' : '+'}{formatCurrency(transaction.amount)}</span>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="p-5 text-sm text-t-tertiary">Your latest transactions will appear here.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
