import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/transactions', label: 'Transactions' },
  { to: '/admin/accounts', label: 'Accounts' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-3d">
      <header className="bg-slate-800 text-white px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-300 hover:text-white text-sm">
            &larr; Back to App
          </button>
          <span className="text-lg font-bold">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">{user?.first_name} {user?.last_name}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-red-300 hover:text-red-200">
            Sign Out
          </button>
        </div>
      </header>

      <nav className="bg-surface border-b border-b-primary px-6">
        <div className="flex gap-1">
          {adminNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-t-tertiary hover:text-t-secondary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
