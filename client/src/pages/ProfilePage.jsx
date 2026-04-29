import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword } from '../services/profileService';

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    getProfile().then(res => {
      setProfile(res.data.user);
      setForm(res.data.user);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await updateProfile({
        first_name: form.first_name, last_name: form.last_name, phone: form.phone,
        address: form.address, city: form.city, state: form.state, zip_code: form.zip_code
      });
      setProfile(res.data.user);
      updateUser(res.data.user);
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) { setError(err.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      return setPwError('Passwords do not match');
    }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Failed');
    } finally { setPwSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Profile</h1>
        <p className="text-t-tertiary">Manage your personal information</p>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-t-primary">Personal Information</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">Edit</button>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">First Name</label>
                <input type="text" value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Last Name</label>
                <input type="text" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Email</label>
              <input type="email" value={profile.email} disabled className="w-full px-3 py-2 border border-b-primary rounded-lg bg-elevated text-t-tertiary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Phone</label>
              <input type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Address</label>
              <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">City</label>
                <input type="text" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">State</label>
                <input type="text" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">ZIP Code</label>
                <input type="text" value={form.zip_code || ''} onChange={e => setForm({ ...form, zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setEditing(false); setForm(profile); }} className="px-4 py-2 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              ['First Name', profile.first_name], ['Last Name', profile.last_name],
              ['Email', profile.email], ['Phone', profile.phone || '-'],
              ['Address', profile.address || '-'], ['City', profile.city || '-'],
              ['State', profile.state || '-'], ['ZIP Code', profile.zip_code || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-sm text-t-tertiary">{label}</p>
                <p className="font-medium text-t-primary">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <h2 className="text-lg font-semibold text-t-primary mb-4">Change Password</h2>
        {pwError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{pwError}</div>}
        {pwSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{pwSuccess}</div>}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Current Password</label>
            <input type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">New Password</label>
            <input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Min 8 chars, uppercase, lowercase, number, special" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Confirm New Password</label>
            <input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <button type="submit" disabled={pwSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
