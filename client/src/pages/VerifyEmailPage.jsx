import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const [resend, setResend] = useState({ loading: false, sent: false, error: '', simulated: false });
  const { isAuthenticated, updateUser, user } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus(res.data.alreadyVerified ? 'already' : 'success');
        setMessage(res.data.message || 'Email verified');
        if (user && !user.email_verified) {
          updateUser({ ...user, email_verified: 1 });
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed');
      });
  }, [token]);

  const handleResend = async () => {
    setResend({ loading: true, sent: false, error: '', simulated: false });
    try {
      const { data } = await resendVerification();
      setResend({ loading: false, sent: true, error: '', simulated: !!data.simulated });
    } catch (err) {
      setResend({
        loading: false,
        sent: false,
        error: err.response?.data?.error || 'Could not resend. Please try again.',
        simulated: false,
      });
    }
  };

  const icon = status === 'success' || status === 'already' ? '✅' : status === 'pending' ? '⏳' : '⚠️';
  const heading = {
    pending: 'Verifying your email…',
    success: 'Email verified',
    already: 'Already verified',
    error: 'Verification failed',
  }[status];

  return (
    <div className="min-h-screen bg-auth flex items-center justify-center p-4 relative">
      <ThemeToggle floating />
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-xl border border-b-secondary p-8 text-center">
          <div className="text-5xl mb-4">{icon}</div>
          <h1 className="text-2xl font-bold text-t-primary mb-2">{heading}</h1>
          {message && <p className="text-t-secondary mb-6">{message}</p>}

          {status === 'success' || status === 'already' ? (
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
            </Link>
          ) : status === 'error' ? (
            <div className="space-y-4">
              {isAuthenticated && (
                <div>
                  {resend.sent ? (
                    <p className="text-green-700 text-sm font-medium">
                      {resend.simulated
                        ? 'Link logged to server console (dev mode).'
                        : 'New verification email sent — check your inbox.'}
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resend.loading}
                      className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {resend.loading ? 'Sending…' : 'Send a new verification link'}
                    </button>
                  )}
                  {resend.error && (
                    <p className="text-red-700 text-sm mt-2">{resend.error}</p>
                  )}
                </div>
              )}
              <div className="flex justify-center">
                <Link
                  to={isAuthenticated ? '/' : '/login'}
                  className="px-5 py-2 border border-b-input rounded-lg text-t-secondary hover:bg-hover transition-colors"
                >
                  {isAuthenticated ? 'Back to dashboard' : 'Back to sign in'}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
