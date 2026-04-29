import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(res => setStats(res.data.stats)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const cards = [
    { label: 'Total Users', value: stats.total_users, color: 'text-indigo-600' },
    { label: 'Active Users', value: stats.active_users, color: 'text-green-600' },
    { label: 'New Users (30d)', value: stats.new_users_30d, color: 'text-blue-600' },
    { label: 'Total Accounts', value: stats.total_accounts, color: 'text-purple-600' },
    { label: 'Total Deposits', value: formatCurrency(stats.total_deposits), color: 'text-emerald-600' },
    { label: 'Transactions (24h)', value: stats.transactions_24h, color: 'text-orange-600' },
    { label: 'Volume (24h)', value: formatCurrency(stats.volume_24h), color: 'text-red-600' },
    { label: 'Total Transactions', value: stats.total_transactions, color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-t-primary">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-5">
            <p className="text-sm text-t-tertiary">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/users" className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 text-center hover:shadow-md transition-shadow">
          <p className="text-lg font-semibold text-t-primary">Manage Users</p>
          <p className="text-sm text-t-tertiary mt-1">View and manage all user accounts</p>
        </Link>
        <Link to="/admin/transactions" className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 text-center hover:shadow-md transition-shadow">
          <p className="text-lg font-semibold text-t-primary">All Transactions</p>
          <p className="text-sm text-t-tertiary mt-1">Monitor system-wide transactions</p>
        </Link>
        <Link to="/admin/accounts" className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 text-center hover:shadow-md transition-shadow">
          <p className="text-lg font-semibold text-t-primary">All Accounts</p>
          <p className="text-sm text-t-tertiary mt-1">View all bank accounts</p>
        </Link>
      </div>
    </div>
  );
}
