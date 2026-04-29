import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, toggleUserStatus } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (search) params.search = search;
    getUsers(params).then(res => { setUsers(res.data.users); setPagination(res.data.pagination); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleToggleStatus = async (id) => {
    await toggleUserStatus(id);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-t-primary">User Management</h1>

      <div className="flex gap-3">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="flex-1 max-w-md px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Accounts</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b-secondary">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-hover">
                    <td className="px-6 py-4 text-sm font-medium text-t-primary">
                      <Link to={`/admin/users/${u.id}`} className="hover:text-indigo-600">{u.first_name} {u.last_name}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-t-tertiary">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-elevated text-t-secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-t-secondary">{u.account_count}</td>
                    <td className="px-6 py-4 text-sm text-t-secondary text-right font-mono">{formatCurrency(u.total_balance)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-t-tertiary">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleToggleStatus(u.id)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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
          <p className="text-sm text-t-tertiary">Showing {((page - 1) * pagination.limit) + 1}-{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
