import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordRequirements from '../components/ui/PasswordRequirements';
import AuthShell, { Icons } from '../components/ui/AuthShell';
import Alert from '../components/ui/Alert';
import PrimaryButton from '../components/ui/PrimaryButton';

const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm hover:border-indigo-300";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ loading: false, done: false, error: '', expired: false });

  if (!token) {
    return (
      <AuthShell
        icon={<span className="text-3xl">⚠️</span>}
        title="Missing reset token"
        subtitle="This link is incomplete. Request a new reset email."
        backLink={{ to: '/login', label: 'Back to sign in' }}
      >
        <div className="text-center">
          <Link to="/forgot-password" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Request new link
          </Link>
        </div>
      </AuthShell>
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
    <AuthShell
      icon={Icons.Lock}
      title="Choose a new password"
      subtitle="Pick something you haven't used before."
      backLink={{ to: '/login', label: 'Back to sign in' }}
    >
      {status.done ? (
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 text-3xl">✓</div>
          <p className="text-t-primary font-medium">Password reset successfully.</p>
          <p className="text-t-tertiary text-sm">Redirecting you to sign in…</p>
          <Link to="/login" className="inline-block mt-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Sign in now
          </Link>
        </div>
      ) : (
        <>
          {status.error && (
            <Alert tone="error" className="mb-4">
              {status.error}
              {status.expired && (
                <div className="mt-2">
                  <Link to="/forgot-password" className="font-medium underline hover:no-underline">
                    Request a new link
                  </Link>
                </div>
              )}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden username field helps password managers associate the new password with the user */}
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
                <p className={`text-xs mt-1.5 transition-colors ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                  {password === confirm ? '✓ Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
            <PrimaryButton type="submit" loading={status.loading} loadingLabel="Resetting…">
              Reset password
            </PrimaryButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
