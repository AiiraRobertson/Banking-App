import { useState, useEffect } from 'react';
import { getTransactions } from '../services/transactionService';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', account_id: '', from_date: '', to_date: '', page: 1 });

  useEffect(() => { getAccounts().then(res => setAccounts(res.data.accounts)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 15, page: filters.page };
    if (filters.type) params.type = filters.type;
    if (filters.account_id) params.account_id = filters.account_id;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;

    getTransactions(params)
      .then(res => { setTransactions(res.data.transactions); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [filters]);

  const accountIds = accounts.map(a => a.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-500">View and filter all your transactions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="transfer">Transfer</option>
            <option value="bill_payment">Bill Payment</option>
            <option value="wire_transfer">Wire Transfer</option>
          </select>
          <select value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>****{a.account_number.slice(-4)} ({a.account_type})</option>)}
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters({ ...filters, from_date: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="From date" />
          <input type="date" value={filters.to_date} onChange={e => setFilters({ ...filters, to_date: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="To date" />
          <button onClick={() => setFilters({ type: '', account_id: '', from_date: '', to_date: '', page: 1 })}
            className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => {
                  const isDebit = tx.from_account_id && accountIds.includes(tx.from_account_id) && tx.transaction_type !== 'deposit';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                          tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                          tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                          tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>{tx.transaction_type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tx.description}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{tx.reference_id.slice(0, 8)}...</td>
                      <td className={`px-6 py-4 text-sm font-medium text-right ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                        {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right font-mono">{formatCurrency(tx.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Prev</button>
            <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page === pagination.pages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
