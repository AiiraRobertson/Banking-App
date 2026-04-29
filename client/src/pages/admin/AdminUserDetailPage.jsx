import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUser } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser(id).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!data) return <div className="text-center py-20 text-t-tertiary">User not found</div>;

  const { user, accounts, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="text-t-muted hover:text-t-secondary">&larr;</Link>
        <h1 className="text-2xl font-bold text-t-primary">{user.first_name} {user.last_name}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <h2 className="text-lg font-semibold text-t-primary mb-4">User Information</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Email', user.email], ['Phone', user.phone || '-'], ['Role', user.role],
            ['Joined', formatDate(user.created_at)], ['Address', user.address || '-'],
            ['City', user.city || '-'], ['State', user.state || '-'], ['ZIP', user.zip_code || '-']
          ].map(([l, v]) => (
            <div key={l}><p className="text-sm text-t-tertiary">{l}</p><p className="font-medium text-t-primary capitalize">{v}</p></div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-t-primary mb-4">Accounts ({accounts.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <div key={a.id} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.account_type === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                  {a.account_type}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${a.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {a.is_active ? 'Active' : 'Closed'}
                </span>
              </div>
              <p className="text-sm text-t-tertiary">{a.account_number}</p>
              <p className="text-2xl font-bold text-t-primary mt-1">{formatCurrency(a.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-t-primary mb-4">Recent Transactions</h2>
        <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-t-muted">No transactions</div>
          ) : (
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b-secondary">
                {recentTransactions.map(tx => (
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
                    <td className="px-6 py-4 text-sm font-medium text-right text-t-primary">{formatCurrency(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
