import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/ui/AuthShell';
import Alert from '../components/ui/Alert';
import PrimaryButton from '../components/ui/PrimaryButton';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const icons = {
    pending: (
      <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    success: <span className="text-3xl">✓</span>,
    already: <span className="text-3xl">✓</span>,
    error: <span className="text-3xl">⚠</span>,
  };

  const heading = {
    pending: 'Verifying your email…',
    success: 'Email verified',
    already: 'Already verified',
    error: 'Verification failed',
  }[status];

  return (
    <AuthShell
      icon={icons[status]}
      title={heading}
      subtitle={message || undefined}
      backLink={null}
    >
      <div className="text-center animate-fade-in">
        {(status === 'success' || status === 'already') && (
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
          </Link>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            {isAuthenticated && (
              <div>
                {resend.sent ? (
                  <Alert tone="success">
                    {resend.simulated
                      ? 'Link logged to server console (dev mode).'
                      : 'New verification email sent — check your inbox.'}
                  </Alert>
                ) : (
                  <PrimaryButton onClick={handleResend} loading={resend.loading} loadingLabel="Sending…">
                    Send a new verification link
                  </PrimaryButton>
                )}
                {resend.error && <Alert tone="error" className="mt-2">{resend.error}</Alert>}
              </div>
            )}
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="inline-block px-5 py-2 border border-b-input rounded-lg text-t-secondary hover:bg-hover transition-colors"
            >
              {isAuthenticated ? 'Back to dashboard' : 'Back to sign in'}
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
