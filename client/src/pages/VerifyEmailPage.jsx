import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
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
            <div className="flex justify-center gap-3">
              <Link
                to={isAuthenticated ? '/' : '/login'}
                className="px-5 py-2 border border-b-input rounded-lg text-t-secondary hover:bg-hover transition-colors"
              >
                {isAuthenticated ? 'Dashboard' : 'Sign in'}
              </Link>
              {isAuthenticated && (
                <p className="text-xs text-t-tertiary self-center">
                  Use the banner at the top of the dashboard to request a new link.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
