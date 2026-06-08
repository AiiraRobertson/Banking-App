/**
 * PageHeader — consistent, responsive page title block.
 * Encapsulates the responsive title scale used across the app so pages
 * stop hand-rolling `<h1 className="text-2xl ...">`.
 *
 * Usage:
 *   <PageHeader title="Profile" subtitle="Manage your personal information" />
 *   <PageHeader title="Accounts" actions={<button>New</button>} />
 */
export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl lg:text-2xl font-bold text-t-primary truncate">{title}</h1>
        {subtitle && <p className="text-sm text-t-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
