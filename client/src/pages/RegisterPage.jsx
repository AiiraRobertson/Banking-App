import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordRequirements from '../components/ui/PasswordRequirements';

const nationalities = [
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'ES', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'IT', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'BE', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'IE', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'CH', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'NO', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'PL', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'NG', name: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}' },
  { code: 'KE', name: 'Kenya', flag: '\u{1F1F0}\u{1F1EA}' },
  { code: 'ZA', name: 'South Africa', flag: '\u{1F1FF}\u{1F1E6}' },
  { code: 'GH', name: 'Ghana', flag: '\u{1F1EC}\u{1F1ED}' },
  { code: 'EG', name: 'Egypt', flag: '\u{1F1EA}\u{1F1EC}' },
  { code: 'TZ', name: 'Tanzania', flag: '\u{1F1F9}\u{1F1FF}' },
  { code: 'ET', name: 'Ethiopia', flag: '\u{1F1EA}\u{1F1F9}' },
  { code: 'RW', name: 'Rwanda', flag: '\u{1F1F7}\u{1F1FC}' },
  { code: 'UG', name: 'Uganda', flag: '\u{1F1FA}\u{1F1EC}' },
  { code: 'CM', name: 'Cameroon', flag: '\u{1F1E8}\u{1F1F2}' },
  { code: 'SN', name: 'Senegal', flag: '\u{1F1F8}\u{1F1F3}' },
  { code: 'MA', name: 'Morocco', flag: '\u{1F1F2}\u{1F1E6}' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    nationality: '', date_of_birth: '', address: '', city: '', zip_code: '', terms_accepted: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  const maxDobStr = maxDob.toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match');
    }
    if (!form.terms_accepted) {
      return setError('You must accept the terms and conditions');
    }

    setLoading(true);
    try {
      await register({
        first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password,
        nationality: form.nationality, date_of_birth: form.date_of_birth,
        address: form.address, city: form.city, zip_code: form.zip_code,
        terms_accepted: 'true'
      });
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.errors?.[0]?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm";

  return (
    <div className="min-h-screen bg-auth flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-t-primary">Create Account</h1>
          <p className="text-t-tertiary mt-1">Join Kapita — Move money. Make moves.</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-[var(--color-shadow)] border border-b-secondary p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">First Name</label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Last Name</label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className={inputClass} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="you@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Nationality</label>
              <select name="nationality" value={form.nationality} onChange={handleChange} className={inputClass} required>
                <option value="">Select your country</option>
                {nationalities.map(n => (
                  <option key={n.code} value={n.code}>{n.flag} {n.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Date of Birth</label>
              <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} max={maxDobStr} className={inputClass} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Home Address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} className={inputClass} placeholder="123 Main Street" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">City</label>
                <input type="text" name="city" value={form.city} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Postal Code</label>
                <input type="text" name="zip_code" value={form.zip_code} onChange={handleChange} className={inputClass} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Password</label>
              <PasswordInput name="password" value={form.password} onChange={handleChange} className={inputClass} placeholder="Min 8 chars, uppercase, lowercase, number, special" required />
              <PasswordRequirements password={form.password} mode="checklist" />
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Confirm Password</label>
              <PasswordInput name="confirm_password" value={form.confirm_password} onChange={handleChange} className={inputClass} required />
              {form.confirm_password && (
                <p className={`text-xs mt-1.5 ${form.password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                  {form.password === form.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input type="checkbox" name="terms_accepted" checked={form.terms_accepted} onChange={handleChange}
                className="mt-0.5 h-4 w-4 text-indigo-600 border-b-input rounded focus:ring-indigo-500" />
              <label className="text-sm text-t-secondary">
                I agree to the <span className="text-indigo-600 font-medium cursor-pointer hover:text-indigo-700">Terms and Conditions</span> and <span className="text-indigo-600 font-medium cursor-pointer hover:text-indigo-700">Privacy Policy</span>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-sm">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-t-tertiary">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
