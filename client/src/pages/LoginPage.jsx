import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordRequirements from '../components/ui/PasswordRequirements';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-t-primary">Kapita</h1>
          <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mt-0.5">Move money. Make moves.</p>
          <p className="text-t-tertiary mt-2">Sign in to your account</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-[var(--color-shadow)] border border-b-secondary p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Password</label>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                placeholder="Enter your password"
                required
              />
              <PasswordRequirements password={password} mode="hint" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-t-tertiary">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:text-indigo-700">
              Create one
            </Link>
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-elevated rounded-lg text-xs text-t-tertiary">
              <p className="font-medium mb-1">Demo accounts (Dev Only):</p>
              <p>Admin: admin@bank.com / Admin123!</p>
              <p>User: john@example.com / User1234!</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-t-muted">
          <Link to="/welcome" className="hover:text-indigo-600 transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
