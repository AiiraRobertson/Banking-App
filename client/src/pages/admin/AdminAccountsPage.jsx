import { useState, useEffect } from 'react';
import { getAdminAccounts } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminAccounts({ page, limit: 20 })
      .then(res => { setAccounts(res.data.accounts); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-t-primary">All Accounts</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Account Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-t-primary">{a.account_number}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-t-primary">{a.owner_name}</span>
                      <span className="block text-xs text-t-muted">{a.owner_email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                        {a.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right text-t-primary font-mono">{formatCurrency(a.balance)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {a.is_active ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-t-tertiary">{formatDate(a.created_at)}</td>
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
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
