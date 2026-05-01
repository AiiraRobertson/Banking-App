import { useState } from 'react';
import ResourcePageLayout from './ResourcePageLayout';
import { submitComplaint } from '../../services/resourcesService';

const categories = [
  { value: 'account', label: 'Account access or activation' },
  { value: 'transaction', label: 'Transaction error or dispute' },
  { value: 'fees', label: 'Fees or charges' },
  { value: 'service', label: 'Customer service experience' },
  { value: 'security', label: 'Security or fraud' },
  { value: 'other', label: 'Other' },
];

export default function ComplaintPage() {
  const [form, setForm] = useState({ name: '', email: '', category: 'account', description: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: null });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: null });
    try {
      const res = await submitComplaint(form);
      setStatus({ loading: false, error: '', success: res.data });
      setForm({ name: '', email: '', category: 'account', description: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.error || 'Failed to submit', success: null });
    }
  };

  return (
    <ResourcePageLayout
      title="File a Complaint"
      subtitle="Every complaint is logged, assigned a case ID, and acknowledged within 24 hours."
      icon="⚠️"
    >
      {status.success ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-t-primary mb-2">Complaint received</h2>
          <p className="text-t-secondary mb-3">{status.success.message}</p>
          <div className="inline-block bg-elevated px-4 py-2 rounded-lg">
            <p className="text-xs text-t-tertiary">Case ID</p>
            <p className="font-mono font-semibold text-t-primary">{status.success.case_id}</p>
          </div>
          <p className="text-xs text-t-tertiary mt-4">Save this case ID for your records.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 max-w-2xl">
          {status.error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{status.error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Your name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-surface">
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Describe the issue</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={7}
              minLength={10}
              placeholder="Include relevant dates, transaction IDs, and any steps you've already taken..."
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            <p className="text-xs text-t-muted mt-1">Minimum 10 characters. The more detail, the faster we resolve it.</p>
          </div>
          <button type="submit" disabled={status.loading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {status.loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      )}
    </ResourcePageLayout>
  );
}
