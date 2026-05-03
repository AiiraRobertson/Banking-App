import { useState } from 'react';
import ResourcePageLayout from './ResourcePageLayout';
import { submitContact } from '../../services/resourcesService';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await submitContact(form);
      setStatus({ loading: false, error: '', success: res.data.message });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.error || 'Failed to send', success: '' });
    }
  };

  return (
    <ResourcePageLayout
      title="Contact Us"
      subtitle="We respond to every message within 1-2 business days."
      icon="✉️"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-5 text-sm">
          <div>
            <p className="font-semibold text-t-primary mb-1">Customer Support</p>
            <p className="text-t-secondary">support@kapita.example</p>
            <p className="text-t-tertiary mt-1">24/7 in-app chat</p>
          </div>
          <div>
            <p className="font-semibold text-t-primary mb-1">Press & Media</p>
            <p className="text-t-secondary">press@kapita.example</p>
          </div>
          <div>
            <p className="font-semibold text-t-primary mb-1">Headquarters</p>
            <p className="text-t-secondary">100 Finance Plaza<br />New York, NY 10004<br />United States</p>
          </div>
          <div>
            <p className="font-semibold text-t-primary mb-1">Phone</p>
            <p className="text-t-secondary">+1 (800) 555-BANK</p>
            <p className="text-t-tertiary mt-1">Mon-Fri 8am-8pm ET</p>
          </div>
        </div>

        <form onSubmit={submit} className="md:col-span-2 space-y-4">
          {status.success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{status.success}</div>}
          {status.error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{status.error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Name</label>
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
            <label className="block text-sm font-medium text-t-secondary mb-1">Subject</label>
            <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={6}
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          </div>
          <button type="submit" disabled={status.loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {status.loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </ResourcePageLayout>
  );
}
