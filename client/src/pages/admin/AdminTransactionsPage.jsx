import { useState, useEffect } from 'react';
import { getAdminTransactions } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (typeFilter) params.type = typeFilter;
    getAdminTransactions(params)
      .then(res => { setTransactions(res.data.transactions); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, typeFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-t-primary">All Transactions</h1>

      <div className="flex gap-3">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-b-input rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="transfer">Transfer</option>
          <option value="bill_payment">Bill Payment</option>
          <option value="wire_transfer">Wire Transfer</option>
        </select>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b-secondary">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-hover">
                    <td className="px-4 py-3 text-sm text-t-tertiary whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                        tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                        tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                        tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>{tx.transaction_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-t-tertiary">
                      {tx.from_user_name && <span className="block text-t-secondary">{tx.from_user_name}</span>}
                      {tx.from_account_number && <span className="text-xs">****{tx.from_account_number.slice(-4)}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-t-tertiary">
                      {tx.to_user_name && <span className="block text-t-secondary">{tx.to_user_name}</span>}
                      {tx.to_account_number && <span className="text-xs">****{tx.to_account_number.slice(-4)}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-t-secondary">{tx.description}</td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-t-primary">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        tx.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>{tx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-t-tertiary">Page {page} of {pagination.pages} ({pagination.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
