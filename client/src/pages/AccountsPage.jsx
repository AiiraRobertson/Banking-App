import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts, createAccount } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

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
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">Manage your bank accounts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          + New Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <Link key={account.id} to={`/accounts/${account.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${account.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
              </span>
              <span className="text-sm text-gray-400">****{account.account_number.slice(-4)}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(account.balance)}</p>
            <p className="text-xs text-gray-400">Opened {formatDate(account.created_at)}</p>
            <p className="text-xs text-gray-400 mt-1">Account: {account.account_number}</p>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Account</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
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
