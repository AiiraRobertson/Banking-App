import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword } from '../services/profileService';
import AddressFields from '../components/AddressFields';
import PhotoCapture from '../components/PhotoCapture';

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
  const [alertPrefs, setAlertPrefs] = useState({ email_alerts: true, sms_alerts: false, alert_phone: '', alert_min_amount: 0 });
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState('');
  const [alertError, setAlertError] = useState('');

  useEffect(() => {
    getProfile().then(res => {
      setProfile(res.data.user);
      setForm(res.data.user);
      setAlertPrefs({
        email_alerts: !!res.data.user.email_alerts,
        sms_alerts: !!res.data.user.sms_alerts,
        alert_phone: res.data.user.alert_phone || '',
        alert_min_amount: Number(res.data.user.alert_min_amount || 0)
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        first_name: form.first_name, last_name: form.last_name, phone: form.phone,
        address: form.address, city: form.city, state: form.state, zip_code: form.zip_code
      };
      if (form.profile_photo !== profile.profile_photo) {
        payload.profile_photo = form.profile_photo === null ? '' : form.profile_photo;
      }
      const res = await updateProfile(payload);
      setProfile(res.data.user);
      updateUser(res.data.user);
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) { setError(err.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleAlertSave = async (e) => {
    e.preventDefault();
    setAlertSaving(true); setAlertError(''); setAlertSuccess('');
    try {
      const res = await updateProfile({
        email_alerts: alertPrefs.email_alerts,
        sms_alerts: alertPrefs.sms_alerts,
        alert_phone: alertPrefs.alert_phone || '',
        alert_min_amount: Number(alertPrefs.alert_min_amount) || 0
      });
      setProfile(res.data.user);
      updateUser(res.data.user);
      setAlertSuccess('Alert preferences saved');
    } catch (err) {
      setAlertError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Save failed');
    } finally { setAlertSaving(false); }
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
            <PhotoCapture
              label="Profile Photo"
              value={form.profile_photo || null}
              onChange={(photo) => setForm((f) => ({ ...f, profile_photo: photo }))}
            />
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
            <AddressFields
              countryLabel="Country"
              required={false}
              inputClass="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={{
                country: form.nationality,
                address: form.address,
                city: form.city,
                state: form.state,
                zip_code: form.zip_code,
              }}
              onChange={(next) => setForm((f) => ({
                ...f,
                nationality: next.country ?? f.nationality,
                address: next.address ?? f.address,
                city: next.city ?? f.city,
                state: next.state ?? f.state,
                zip_code: next.zip_code ?? f.zip_code,
              }))}
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setEditing(false); setForm(profile); }} className="px-4 py-2 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-b-input bg-elevated flex items-center justify-center shrink-0">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-indigo-600">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-t-primary">{profile.first_name} {profile.last_name}</p>
                <p className="text-sm text-t-tertiary">{profile.email}</p>
                {!profile.profile_photo && (
                  <p className="text-xs text-amber-600 mt-1">Add a verification photo to complete your profile.</p>
                )}
              </div>
            </div>
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
          </>
        )}
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <h2 className="text-lg font-semibold text-t-primary mb-1">Transaction Alerts</h2>
        <p className="text-sm text-t-tertiary mb-4">Choose how you want to be notified for credit and debit activity.</p>
        {alertError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{alertError}</div>}
        {alertSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{alertSuccess}</div>}
        <form onSubmit={handleAlertSave} className="space-y-4">
          <label className="flex items-start gap-3 p-3 border border-b-secondary rounded-lg cursor-pointer hover:bg-elevated">
            <input type="checkbox" checked={alertPrefs.email_alerts}
              onChange={e => setAlertPrefs({ ...alertPrefs, email_alerts: e.target.checked })}
              className="mt-1 h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <p className="font-medium text-t-primary">Email alerts</p>
              <p className="text-xs text-t-tertiary">Sent to {profile.email}</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border border-b-secondary rounded-lg cursor-pointer hover:bg-elevated">
            <input type="checkbox" checked={alertPrefs.sms_alerts}
              onChange={e => setAlertPrefs({ ...alertPrefs, sms_alerts: e.target.checked })}
              className="mt-1 h-4 w-4 text-indigo-600" />
            <div className="flex-1">
              <p className="font-medium text-t-primary">SMS alerts</p>
              <p className="text-xs text-t-tertiary">Sent to alert phone (or your profile phone if not set)</p>
            </div>
          </label>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Alert Phone (optional)</label>
            <input type="text" value={alertPrefs.alert_phone}
              onChange={e => setAlertPrefs({ ...alertPrefs, alert_phone: e.target.value })}
              placeholder={profile.phone || '+1 555 0100'}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-t-tertiary mt-1">Leave blank to use your profile phone for SMS alerts.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Minimum amount to alert ($)</label>
            <input type="number" min="0" step="0.01" value={alertPrefs.alert_min_amount}
              onChange={e => setAlertPrefs({ ...alertPrefs, alert_min_amount: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-t-tertiary mt-1">Transactions below this amount will not trigger an alert. Set to 0 for all transactions.</p>
          </div>
          <button type="submit" disabled={alertSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {alertSaving ? 'Saving...' : 'Save Alert Preferences'}
          </button>
        </form>
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
