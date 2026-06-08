import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import EmailVerificationBanner from '../EmailVerificationBanner';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-3d flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <EmailVerificationBanner />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
