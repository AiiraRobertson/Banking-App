import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function ResourcePageLayout({ title, subtitle, icon, children }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-b-secondary bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold text-t-primary">Kapita</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <ThemeToggle />
            <Link to="/login" className="text-t-secondary hover:text-t-primary">Login</Link>
            <Link to="/register" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Open Account</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          {icon && <div className="text-5xl mb-3">{icon}</div>}
          <h1 className="text-4xl font-bold text-t-primary">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-t-tertiary max-w-3xl">{subtitle}</p>}
        </div>
        <div className="bg-surface rounded-2xl border border-b-secondary p-8 sm:p-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-b-secondary py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-t-tertiary">
          <Link to="/welcome" className="text-indigo-600 hover:text-indigo-700">Back to home</Link>
          <span className="mx-2">·</span>
          &copy; 2026 Kapita
        </div>
      </footer>
    </div>
  );
}
