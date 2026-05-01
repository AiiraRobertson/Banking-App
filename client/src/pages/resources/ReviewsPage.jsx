import { useState, useEffect } from 'react';
import ResourcePageLayout from './ResourcePageLayout';
import { getReviews, submitReview } from '../../services/resourcesService';

function Stars({ value, size = 'sm', interactive = false, onChange }) {
  const sizeClass = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        interactive ? (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <svg className={`${sizeClass} ${n <= value ? 'text-amber-400' : 'text-gray-300'} hover:scale-110 transition-transform`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        ) : (
          <svg key={n} className={`${sizeClass} ${n <= value ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        )
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ count: 0, average: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', rating: 0, title: '', body: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const loadReviews = () => {
    getReviews().then(res => {
      setReviews(res.data.reviews);
      setStats(res.data.stats);
    }).catch(() => {});
  };

  useEffect(() => { loadReviews(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) {
      setStatus({ loading: false, error: 'Please pick a rating', success: '' });
      return;
    }
    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await submitReview(form);
      setStatus({ loading: false, error: '', success: res.data.message });
      setForm({ name: '', location: '', rating: 0, title: '', body: '' });
      setShowForm(false);
      loadReviews();
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.error || 'Failed to submit', success: '' });
    }
  };

  return (
    <ResourcePageLayout
      title="Customer Reviews"
      subtitle="What real SecureBank customers are saying. Unedited."
      icon="⭐"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-5 bg-elevated rounded-xl">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-t-primary">{stats.average || '—'}</p>
            <div>
              <Stars value={Math.round(stats.average)} size="md" />
              <p className="text-sm text-t-tertiary mt-1">{stats.count} reviews</p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
          {showForm ? 'Cancel' : 'Write a review'}
        </button>
      </div>

      {status.success && <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{status.success}</div>}

      {showForm && (
        <form onSubmit={submit} className="space-y-4 mb-10 p-6 border border-b-primary rounded-xl">
          {status.error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{status.error}</div>}

          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Your rating</label>
            <Stars value={form.rating} size="lg" interactive onChange={r => setForm({ ...form, rating: r })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Your name"
              className="px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location (optional)"
              className="px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Review title"
            className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required rows={5} minLength={10}
            placeholder="Share your experience..."
            className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          <button type="submit" disabled={status.loading}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {status.loading ? 'Posting...' : 'Post review'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {reviews.length === 0 && (
          <p className="text-center text-t-tertiary py-12">No reviews yet. Be the first!</p>
        )}
        {reviews.map(r => (
          <div key={r.id} className="border border-b-primary rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Stars value={r.rating} size="sm" />
                <h3 className="font-semibold text-t-primary mt-1.5">{r.title}</h3>
              </div>
              <span className="text-xs text-t-muted">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-t-secondary leading-relaxed">{r.body}</p>
            <p className="text-xs text-t-tertiary mt-3">— {r.name}{r.location ? `, ${r.location}` : ''}</p>
          </div>
        ))}
      </div>
    </ResourcePageLayout>
  );
}
