import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAccount, lockSavings } from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime, formatDate } from '../utils/formatDate';
import { getMaturityInfo, formatMaturityDate } from '../utils/savingsLock';

export default function AccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lockDays, setLockDays] = useState(30);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState('');

  const refetchAccount = () => {
    getAccount(id).then(res => setAccount(res.data.account)).catch(() => {});
  };

  useEffect(() => {
    refetchAccount();
  }, [id]);

  const handleLockSavings = async () => {
    setLocking(true);
    setLockError('');
    try {
      const res = await lockSavings(id, lockDays);
      setAccount(res.data.account);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error
        || (Array.isArray(data?.errors) && data.errors.map(e => e.message).filter(Boolean).join('; '))
        || 'Failed to lock savings';
      setLockError(msg);
    } finally {
      setLocking(false);
    }
  };

  useEffect(() => {
    getTransactions({ account_id: id, page, limit: 10 })
      .then(res => { setTransactions(res.data.transactions); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [id, page]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!account) return <div className="text-center py-20 text-t-tertiary">Account not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/accounts" className="text-t-muted hover:text-t-secondary">&larr;</Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-t-primary">Account Details</h1>
          <p className="text-sm text-t-tertiary">{account.account_number}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-t-tertiary">Type</p>
            <p className="text-lg font-semibold text-t-primary capitalize">{account.account_type}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Balance</p>
            <p className="text-lg font-semibold text-t-primary">{formatCurrency(account.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Account Number</p>
            <p className="text-lg font-semibold text-t-primary">{account.account_number}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Opened</p>
            <p className="text-lg font-semibold text-t-primary">{formatDate(account.created_at)}</p>
          </div>
        </div>
        {(() => {
          const lock = getMaturityInfo(account);
          const disableDebit = lock.isSavings && lock.locked;
          return (
            <div className="flex flex-wrap gap-3 mt-6 items-center">
              {disableDebit ? (
                <button disabled className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed" title="Locked savings — outgoing transfers paused">Transfer</button>
              ) : (
                <Link to="/transfer" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Transfer</Link>
              )}
              <Link to="/add-money" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Add Money</Link>
              {disableDebit && (
                <span className="text-xs text-amber-700 inline-flex items-center gap-1">🔒 Outflows locked until maturity</span>
              )}
            </div>
          );
        })()}
      </div>

      {(() => {
        const lock = getMaturityInfo(account);
        if (lock.isSavings && !lock.locked) {
          return (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔐</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-indigo-900">Enable savings mode</h3>
                  <p className="text-sm text-indigo-800 mt-1">
                    Lock this savings account for a set period. Once locked, withdrawals and transfers from it are paused until the maturity date. Deposits and incoming transfers are still allowed.
                  </p>
                  {lockError && <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{lockError}</div>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-indigo-900">Duration</label>
                    <select
                      value={lockDays}
                      onChange={e => setLockDays(parseInt(e.target.value, 10))}
                      disabled={locking}
                      className="px-3 py-2 border border-indigo-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value={15}>15 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>365 days</option>
                    </select>
                    <button
                      onClick={handleLockSavings}
                      disabled={locking}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                      {locking ? 'Locking...' : 'Lock savings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        if (!lock.isSavings) return null;
        return (
          <div className={`rounded-xl border p-5 ${lock.locked ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">{lock.locked ? '🔒' : '✅'}</div>
              <div className="flex-1">
                <h3 className={`font-semibold ${lock.locked ? 'text-amber-900' : 'text-emerald-900'}`}>
                  {lock.locked ? `Savings locked for ${lock.daysRemaining} more day${lock.daysRemaining === 1 ? '' : 's'}` : 'Funds available for withdrawal'}
                </h3>
                <p className={`text-sm mt-1 ${lock.locked ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {lock.locked
                    ? `Withdrawals, transfers, and bill payments from this account are paused until ${formatMaturityDate(lock.maturesAt)}. New deposits extend the maturity date so funds keep earning.`
                    : `Your savings have reached maturity. The next deposit will start a new ${account.maturity_days || 30}-day lock cycle.`}
                </p>
                <p className="text-xs mt-2 text-t-tertiary">
                  Maturity policy: {account.maturity_days || 30} days · range 15–365 days. Read the savings lock policy on the Policy page.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      <div>
        <h2 className="text-lg font-semibold text-t-primary mb-4">Transaction History</h2>
        <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-t-muted">No transactions for this account</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-elevated">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-b-secondary">
                    {transactions.map(tx => {
                      const isDebit = tx.from_account_id === account.id;
                      return (
                        <tr key={tx.id} className="hover:bg-hover">
                          <td className="px-6 py-4 text-sm text-t-tertiary">{formatDateTime(tx.created_at)}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                              tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                              tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                              tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                              'bg-orange-50 text-orange-700'
                            }`}>{tx.transaction_type.replace('_', ' ')}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-t-secondary">{tx.description}</td>
                          <td className={`px-6 py-4 text-sm font-medium text-right ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                            {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-t-secondary text-right font-mono">{formatCurrency(tx.balance_after)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-b-secondary">
                {transactions.map(tx => {
                  const isDebit = tx.from_account_id === account.id;
                  return (
                    <div key={tx.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                          tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                          tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                          tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                          tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>{tx.transaction_type.replace('_', ' ')}</span>
                        <span className={`text-sm font-semibold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      {tx.description && <p className="text-sm text-t-secondary">{tx.description}</p>}
                      <div className="flex items-center justify-between text-xs text-t-muted">
                        <span>{formatDateTime(tx.created_at)}</span>
                        <span className="font-mono">Bal {formatCurrency(tx.balance_after)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <span className="text-sm text-t-tertiary">Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
