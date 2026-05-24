import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, sent: false, error: '', simulated: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, sent: false, error: '', simulated: false });
    try {
      const { data } = await forgotPassword(email);
      setStatus({ loading: false, sent: true, error: '', simulated: !!data.simulated });
    } catch (err) {
      const tooMany = err.response?.status === 429;
      setStatus({
        loading: false,
        sent: false,
        simulated: false,
        error: err.response?.data?.error || (tooMany ? 'Too many requests. Try again later.' : 'Could not send reset link. Please try again.'),
      });
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm";

  return (
    <div className="min-h-screen bg-auth flex items-center justify-center p-4 relative">
      <ThemeToggle floating />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-t-primary">Forgot password?</h1>
          <p className="text-t-tertiary mt-2">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-[var(--color-shadow)] border border-b-secondary p-8">
          {status.sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✉️</div>
              <p className="text-t-primary font-medium">
                If an account exists for <span className="font-mono">{email}</span>, a reset link is on its way.
              </p>
              <p className="text-t-tertiary text-sm">
                {status.simulated
                  ? 'Dev mode: the link was logged to the server console.'
                  : 'The link expires in 30 minutes. Check your spam folder if it doesn\'t arrive.'}
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 px-5 py-2 border border-b-input rounded-lg text-t-secondary hover:bg-hover transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {status.error && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {status.error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-t-secondary mb-1">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={status.loading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-sm"
                >
                  {status.loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-t-tertiary">
                Remembered it?{' '}
                <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
