import { useState, useEffect } from 'react';
import { getAccounts } from '../services/accountService';
import { deposit, withdraw, transfer } from '../services/transactionService';
import { formatCurrency } from '../utils/formatCurrency';

const tabs = ['Deposit', 'Withdraw', 'Transfer'];

export default function TransferPage() {
  const [activeTab, setActiveTab] = useState('Deposit');
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_id: '', to_account_id: '', to_account_number: '', amount: '', description: '', transferMode: 'own' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccounts().then(res => {
      setAccounts(res.data.accounts);
      if (res.data.accounts.length > 0) setForm(f => ({ ...f, account_id: res.data.accounts[0].id.toString() }));
    });
  }, []);

  const reset = () => { setForm(f => ({ ...f, amount: '', description: '', to_account_id: '', to_account_number: '' })); setSuccess(null); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      let res;
      const amt = parseFloat(form.amount);
      if (activeTab === 'Deposit') {
        res = await deposit({ account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Deposit' });
      } else if (activeTab === 'Withdraw') {
        res = await withdraw({ account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Withdrawal' });
      } else {
        const payload = { from_account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Transfer' };
        if (form.transferMode === 'own') {
          payload.to_account_id = parseInt(form.to_account_id);
        } else {
          payload.to_account_number = form.to_account_number;
        }
        res = await transfer(payload);
      }
      setSuccess({ message: res.data.message, referenceId: res.data.referenceId, newBalance: res.data.newBalance });
      getAccounts().then(r => setAccounts(r.data.accounts));
    } catch (err) {
      setError(err.response?.data?.error || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id.toString() === form.account_id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500">Deposit, withdraw, or transfer funds</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); reset(); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{success.message}</h3>
              <p className="text-sm text-gray-500">Reference: {success.referenceId}</p>
              <p className="text-sm text-gray-500">New balance: {formatCurrency(success.newBalance)}</p>
              <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                New Transaction
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'Transfer' ? 'From Account' : 'Account'}
                </label>
                <select
                  value={form.account_id}
                  onChange={e => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
                {selectedAccount && <p className="text-xs text-gray-400 mt-1">Available: {formatCurrency(selectedAccount.balance)}</p>}
              </div>

              {activeTab === 'Transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To</label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'own' })}
                      className={`px-3 py-1 text-xs rounded-full ${form.transferMode === 'own' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      My Account
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'other' })}
                      className={`px-3 py-1 text-xs rounded-full ${form.transferMode === 'other' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      Other Account
                    </button>
                  </div>
                  {form.transferMode === 'own' ? (
                    <select
                      value={form.to_account_id}
                      onChange={e => setForm({ ...form, to_account_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      required
                    >
                      <option value="">Select destination account</option>
                      {accounts.filter(a => a.id.toString() !== form.account_id).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.to_account_number}
                      onChange={e => setForm({ ...form, to_account_number: e.target.value })}
                      placeholder="Enter 10-digit account number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      maxLength={10}
                      required
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="What's this for?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  activeTab === 'Deposit' ? 'bg-green-600 hover:bg-green-700' :
                  activeTab === 'Withdraw' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Processing...' : `${activeTab} Funds`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
