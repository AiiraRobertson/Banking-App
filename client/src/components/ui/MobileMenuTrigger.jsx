/**
 * MobileMenuTrigger Component
 * Responsive hamburger menu trigger for mobile navigation
 * Works with Sidebar component
 * Usage:
 *   const [sidebarOpen, setSidebarOpen] = useState(false);
 *   <MobileMenuTrigger open={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />
 *   <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 */

export default function MobileMenuTrigger({
  open = false,
  onClick,
  className = ''
}) {
  return (
    <button
      onClick={onClick}
      className={`lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-elevated transition-colors ${className}`}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
    >
      <svg
        className="w-6 h-6 text-t-primary transform transition-transform duration-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        style={{
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
      >
        {open ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );
}
