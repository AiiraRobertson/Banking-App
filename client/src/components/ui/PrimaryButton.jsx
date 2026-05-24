export default function PrimaryButton({
  loading = false,
  loadingLabel,
  children,
  className = '',
  disabled,
  ...rest
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`group relative w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${className}`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        <span>{loading ? (loadingLabel || 'Working…') : children}</span>
      </span>
    </button>
  );
}
