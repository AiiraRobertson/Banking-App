import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/authService';

const DISMISS_KEY = 'verifyBannerDismissedAt';
const DISMISS_HOURS = 24;
const COOLDOWN_SECONDS = 30;

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState({ loading: false, sent: false, error: '' });
  const [dismissed, setDismissed] = useState(() => {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at && Date.now() - at < DISMISS_HOURS * 3600 * 1000;
  });
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!user || user.email_verified || dismissed) return null;

  const handleResend = async () => {
    if (cooldown > 0) return;
    setStatus({ loading: true, sent: false, error: '' });
    try {
      const { data } = await resendVerification();
      setStatus({ loading: false, sent: true, error: '', simulated: !!data.simulated });
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setStatus({
        loading: false,
        sent: false,
        error: err.response?.data?.error || 'Could not resend. Please try again.',
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 px-4 py-2.5 text-sm animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-amber-800">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200/70 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <span>
            <span className="font-semibold">Verify your email.</span>{' '}
            We sent a link to <span className="font-mono text-amber-900">{user.email}</span>.
          </span>
        </span>

        {status.sent && cooldown > 0 ? (
          <span className="text-green-700 font-medium animate-fade-in inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {status.simulated ? 'Link logged to server console (dev mode).' : 'Verification email sent — check your inbox.'}
            <span className="text-green-600 font-normal">Resend in {cooldown}s.</span>
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={status.loading || cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {status.loading && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {status.loading ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
          </button>
        )}

        {status.error && <span className="text-red-700 animate-fade-in">{status.error}</span>}

        <button
          onClick={handleDismiss}
          className="ml-auto w-7 h-7 inline-flex items-center justify-center rounded-md text-amber-700 hover:bg-amber-200/60 hover:text-amber-900 transition-colors"
          title="Hide for 24 hours"
          aria-label="Dismiss banner for 24 hours"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
