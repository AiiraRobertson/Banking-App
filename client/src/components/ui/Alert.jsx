const TONES = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};

export default function Alert({ tone = 'error', children, className = '' }) {
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={`p-3 border rounded-lg text-sm animate-fade-in ${TONES[tone] || TONES.error} ${className}`}
    >
      {children}
    </div>
  );
}
