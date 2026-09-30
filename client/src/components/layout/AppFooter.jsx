import { Link } from 'react-router-dom';

const links = [
  { to: '/mission', label: 'Mission' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
  { to: '/policy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-b-secondary bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link to="/welcome" className="flex items-center gap-2 text-sm font-semibold text-t-primary transition-transform duration-200 hover:-translate-y-0.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow-sm">K</span>
          Kapita
        </Link>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-t-tertiary">
          {links.map(link => <Link key={link.to} to={link.to} className="transition-colors duration-200 hover:text-indigo-600">{link.label}</Link>)}
        </nav>
        <p className="text-xs text-t-muted">&copy; 2026 Kapita</p>
      </div>
    </footer>
  );
}
