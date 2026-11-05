import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const mobileNavItems = [
  { to: '/', label: 'Home', end: true, icon: 'M3 10.5 12 3l9 7.5M5.25 9v11h13.5V9M9 20v-6h6v6' },
  { to: '/accounts', label: 'Accounts', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { to: '/bill-pay', label: 'Services', icon: 'M4 6h16M4 12h16M4 18h16M8 6v12' },
  { to: '/transactions', label: 'Activity', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-3d flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar sidebarOpen={sidebarOpen} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-content flex-1 min-w-0 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Primary mobile navigation" className="app-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-b-primary bg-surface/95 px-3 pt-2 backdrop-blur lg:hidden">
        {mobileNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-600 dark:text-violet-300' : 'text-t-tertiary hover:text-t-primary'
            }`}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
