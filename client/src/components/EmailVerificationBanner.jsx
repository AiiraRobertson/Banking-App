import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/authService';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState({ loading: false, sent: false, error: '' });
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.email_verified || dismissed) return null;

  const handleResend = async () => {
    setStatus({ loading: true, sent: false, error: '' });
    try {
      const { data } = await resendVerification();
      setStatus({ loading: false, sent: true, error: '', simulated: !!data.simulated });
    } catch (err) {
      setStatus({
        loading: false,
        sent: false,
        error: err.response?.data?.error || 'Could not resend. Please try again.',
      });
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>
            <span className="font-semibold">Verify your email.</span>{' '}
            We sent a link to <span className="font-mono">{user.email}</span>.
          </span>
        </span>

        {status.sent ? (
          <span className="text-green-700 font-medium">
            {status.simulated ? 'Link logged to server console (dev mode).' : 'Verification email sent — check your inbox.'}
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={status.loading}
            className="px-3 py-1 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {status.loading ? 'Sending…' : 'Resend link'}
          </button>
        )}

        {status.error && <span className="text-red-700">{status.error}</span>}

        <button
          onClick={() => setDismissed(true)}
          className="ml-auto text-amber-700 hover:text-amber-900 transition-colors"
          title="Dismiss for this session"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
