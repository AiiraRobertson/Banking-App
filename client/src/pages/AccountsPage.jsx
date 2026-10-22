import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts, createAccount } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { getMaturityInfo } from '../utils/savingsLock';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newType, setNewType] = useState('checking');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = () => {
    getAccounts().then(res => setAccounts(res.data.accounts)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      await createAccount(newType);
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-t-primary">Accounts</h1>
          <p className="text-t-tertiary">Manage your bank accounts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          + New Account
        </button>
      </div>

      <section aria-label="Money management">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v8m-4-4h8m7 0a11 11 0 11-22 0 11 11 0 0122 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">Add Money</h2>
            <p className="text-sm text-t-tertiary mt-1 mb-5 flex-1">
              Fund your account using the available deposit methods.
            </p>
            <Link
              to="/add-money"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              Add Money
            </Link>
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h13m0 0-4-4m4 4-4 4M17 17H4m0 0 4 4m-4-4 4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">Transfer Money</h2>
            <p className="text-sm text-t-tertiary mt-1 mb-5 flex-1">
              Send money to your own accounts or other supported bank accounts.
            </p>
            <Link
              to="/transfer"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              Make a Transfer
            </Link>
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M14 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">Beneficiaries</h2>
            <p className="text-sm text-t-tertiary mt-1 mb-5 flex-1">
              Manage your saved transfer recipients.
            </p>
            <Link
              to="/beneficiaries"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              Manage Beneficiaries
            </Link>
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h13m0 0-3-3m3 3-3 3M20 17H7m0 0 3 3m-3-3 3-3" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">Convert Currency</h2>
            <p className="text-sm text-t-tertiary mt-1 mb-5 flex-1">
              Exchange between your USD, NGN, and GHS accounts using clearly labelled development test rates.
            </p>
            <Link
              to="/convert"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              Convert Money
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => {
          const lock = getMaturityInfo(account);
          return (
            <Link key={account.id} to={`/accounts/${account.id}`} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${account.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                  {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                </span>
                <span className="text-sm text-t-muted">****{account.account_number.slice(-4)}</span>
              </div>
              <p className="text-3xl font-bold text-t-primary mb-1">{formatCurrency(account.balance, account.currency)}</p>
              <p className="text-xs text-t-muted">{account.currency} {account.account_type}</p>
              <p className="text-xs text-t-muted">Opened {formatDate(account.created_at)}</p>
              <p className="text-xs text-t-muted mt-1">Account: {account.account_number}</p>
              {lock.isSavings && (
                <div className={`mt-3 text-xs font-medium px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 ${lock.locked ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                  {lock.locked ? (
                    <>🔒 Locked · {lock.daysRemaining}d to maturity</>
                  ) : (
                    <>✅ Available · funds unlocked</>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-t-primary mb-4">Create New Account</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Account Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  <option value="checking">USD Checking</option>
                  <option value="savings">USD Savings</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-t-secondary bg-elevated rounded-lg hover:bg-hover transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
