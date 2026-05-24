import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordRequirements from '../components/ui/PasswordRequirements';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ loading: false, done: false, error: '', expired: false });

  const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm";

  if (!token) {
    return (
      <div className="min-h-screen bg-auth flex items-center justify-center p-4 relative">
        <ThemeToggle floating />
        <div className="w-full max-w-md">
          <div className="bg-surface rounded-2xl shadow-xl border border-b-secondary p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-t-primary mb-2">Missing reset token</h1>
            <p className="text-t-tertiary mb-6">This link is incomplete. Request a new reset email.</p>
            <Link to="/forgot-password" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      return setStatus({ loading: false, done: false, error: 'Passwords do not match', expired: false });
    }
    setStatus({ loading: true, done: false, error: '', expired: false });
    try {
      await resetPassword(token, password);
      setStatus({ loading: false, done: true, error: '', expired: false });
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const data = err.response?.data;
      const validation = Array.isArray(data?.errors) && data.errors.length
        ? data.errors.map((e) => e.message || e.msg).filter(Boolean).join(' • ')
        : '';
      setStatus({
        loading: false,
        done: false,
        expired: !!data?.expired,
        error: data?.error || validation || 'Could not reset password. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-auth flex items-center justify-center p-4 relative">
      <ThemeToggle floating />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-t-primary">Choose a new password</h1>
          <p className="text-t-tertiary mt-2">Pick something you haven't used before.</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-[var(--color-shadow)] border border-b-secondary p-8">
          {status.done ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <p className="text-t-primary font-medium">Password reset.</p>
              <p className="text-t-tertiary text-sm">Redirecting you to sign in…</p>
              <Link to="/login" className="inline-block mt-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              {status.error && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {status.error}
                  {status.expired && (
                    <div className="mt-2">
                      <Link to="/forgot-password" className="font-medium underline hover:no-underline">
                        Request a new link
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Hidden email field for password managers — without an associated username, they'll skip saving */}
                <input type="email" name="email" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-t-secondary mb-1">New password</label>
                  <PasswordInput
                    id="new-password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Min 8 chars, uppercase, lowercase, number, special"
                    required
                  />
                  <PasswordRequirements password={password} mode="checklist" />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-t-secondary mb-1">Confirm new password</label>
                  <PasswordInput
                    id="confirm-password"
                    name="confirm_password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                    required
                  />
                  {confirm && (
                    <p className={`text-xs mt-1.5 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                      {password === confirm ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status.loading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-sm"
                >
                  {status.loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
