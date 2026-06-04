import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell, { Icons } from '../components/ui/AuthShell';
import Alert from '../components/ui/Alert';
import PrimaryButton from '../components/ui/PrimaryButton';

const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm hover:border-indigo-300";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || 'Login failed. Please try again.';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon={Icons.Lock}
      title="Kapita"
      tagline="Move money. Make moves."
      subtitle="Sign in to your account"
    >
      {error && (
        <Alert tone={error.status === 429 ? 'warning' : 'error'} className="mb-4">
          {error.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs sm:text-sm font-medium text-t-secondary mb-1.5 sm:mb-2">Email</label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5 sm:mb-2">
            <label htmlFor="login-password" className="block text-xs sm:text-sm font-medium text-t-secondary">Password</label>
            <Link to="/forgot-password" className="text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Enter your password"
            required
          />
        </div>

        <PrimaryButton type="submit" loading={loading} loadingLabel="Signing in…">
          Sign In
        </PrimaryButton>
      </form>

      <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-t-tertiary">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
          Create one
        </Link>
      </p>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-elevated rounded-lg text-[10px] sm:text-xs text-t-tertiary">
          <p className="font-medium mb-1">Demo accounts (Dev Only):</p>
          <p>Admin: admin@bank.com / Admin123!</p>
          <p>User: john@example.com / User1234!</p>
        </div>
      )}
    </AuthShell>
  );
}
