import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

/**
 * Shared shell for unauthenticated auth screens.
 * Provides background, theme toggle, animated header (icon + title + subtitle)
 * and a card container with consistent entrance animation.
 */
export default function AuthShell({
  icon,
  title,
  tagline,
  subtitle,
  width = 'md',
  backLink = { to: '/welcome', label: 'Back to home' },
  children,
}) {
  const widthClass = width === 'lg' ? 'max-w-lg' : 'max-w-md';

  return (
    <div className="min-h-screen bg-auth flex items-center justify-center p-4 relative">
      <ThemeToggle floating />
      <div className={`w-full ${widthClass} animate-fade-in-up`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-indigo-200 animate-pulse-glow">
            {icon}
          </div>
          <h1 className="text-3xl font-bold text-t-primary">{title}</h1>
          {tagline && <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mt-0.5">{tagline}</p>}
          {subtitle && <p className="text-t-tertiary mt-2">{subtitle}</p>}
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-[var(--color-shadow)] border border-b-secondary p-8 transition-shadow hover:shadow-2xl">
          {children}
        </div>

        {backLink && (
          <p className="mt-6 text-center text-sm text-t-muted">
            <Link to={backLink.to} className="hover:text-indigo-600 transition-colors">{backLink.label}</Link>
          </p>
        )}
      </div>
    </div>
  );
}

// Reusable icons for the auth shell header
export const Icons = {
  Lock: (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Key: (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  UserPlus: (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Envelope: (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};
