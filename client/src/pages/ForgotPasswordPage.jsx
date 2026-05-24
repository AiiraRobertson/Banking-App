import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import AuthShell, { Icons } from '../components/ui/AuthShell';
import Alert from '../components/ui/Alert';
import PrimaryButton from '../components/ui/PrimaryButton';

const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm hover:border-indigo-300";

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

  return (
    <AuthShell
      icon={Icons.Key}
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      backLink={{ to: '/login', label: 'Back to sign in' }}
    >
      {status.sent ? (
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 text-3xl">✓</div>
          <p className="text-t-primary font-medium">
            If an account exists for <span className="font-mono break-all">{email}</span>, a reset link is on its way.
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
          {status.error && <Alert tone="error" className="mb-4">{status.error}</Alert>}
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
            <PrimaryButton type="submit" loading={status.loading} loadingLabel="Sending…">
              Send reset link
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-sm text-t-tertiary">
            Remembered it?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
