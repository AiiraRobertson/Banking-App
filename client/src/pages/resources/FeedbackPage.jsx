import { useState } from 'react';
import ResourcePageLayout from './ResourcePageLayout';
import { submitFeedback } from '../../services/resourcesService';

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <svg className={`w-9 h-9 ${n <= value ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: '', email: '', rating: 0, message: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) {
      setStatus({ loading: false, error: 'Please pick a star rating', success: '' });
      return;
    }
    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await submitFeedback(form);
      setStatus({ loading: false, error: '', success: res.data.message });
      setForm({ name: '', email: '', rating: 0, message: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.error || 'Failed to submit', success: '' });
    }
  };

  return (
    <ResourcePageLayout
      title="Send Feedback"
      subtitle="Tell us what's working and what's not. Your input shapes our roadmap."
      icon="💬"
    >
      <form onSubmit={submit} className="space-y-5 max-w-2xl">
        {status.success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{status.success}</div>}
        {status.error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{status.error}</div>}

        <div>
          <label className="block text-sm font-medium text-t-secondary mb-2">Overall, how do you rate Kapita?</label>
          <StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Name (optional)</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Email (optional)</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p className="text-xs text-t-muted mt-1">We'll only contact you if you ask us to.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-t-secondary mb-1">What would you like to share?</label>
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={6}
            placeholder="Bug, feature idea, praise, complaint, or anything else..."
            className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
        </div>

        <button type="submit" disabled={status.loading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
          {status.loading ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>
    </ResourcePageLayout>
  );
}
