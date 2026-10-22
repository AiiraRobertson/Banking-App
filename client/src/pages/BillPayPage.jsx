import { useState, useEffect } from 'react';
import { getPayees, addPayee, deletePayee, getScheduledPayments, cancelScheduledPayment } from '../services/billPayService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const categories = ['utilities', 'telecom', 'insurance', 'credit_card', 'rent', 'other'];

export default function BillPayPage() {
  const [payees, setPayees] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayeeModal, setShowPayeeModal] = useState(false);
  const [payeeForm, setPayeeForm] = useState({ payee_name: '', payee_account: '', category: 'utilities', nickname: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = () => {
    Promise.all([getPayees(), getScheduledPayments()])
      .then(([p, s]) => {
        setPayees(p.data.payees);
        setScheduled(s.data.payments);
      }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddPayee = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await addPayee(payeeForm);
      setShowPayeeModal(false);
      setPayeeForm({ payee_name: '', payee_account: '', category: 'utilities', nickname: '' });
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDeletePayee = async (id) => {
    if (!confirm('Delete this payee?')) return;
    await deletePayee(id);
    fetchAll();
  };

  const handleCancelScheduled = async (id) => {
    if (!confirm('Cancel this scheduled payment?')) return;
    await cancelScheduledPayment(id);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Bill Payments</h1>
        <p className="text-t-tertiary">Manage your saved bill-payee details.</p>
      </div>

      <div role="status" className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
        Bill payments and automatic scheduling are unavailable because no verified bill-payment provider is configured. Saved payees and schedule records are not payment instructions and will not be processed.
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-t-primary">Saved Payees</h2>
          <button onClick={() => { setShowPayeeModal(true); setError(''); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Add Payee
          </button>
        </div>
        {payees.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-8 text-center text-t-muted">No payees added yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {payees.map(p => (
              <div key={p.id} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-t-primary">{p.payee_name}</h3>
                    {p.nickname && <p className="text-xs text-t-muted">{p.nickname}</p>}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-elevated text-t-secondary capitalize">{p.category.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-t-tertiary mb-4">Saved account or customer reference: {p.payee_account}</p>
                <div className="flex gap-2">
                  <button type="button" disabled title="No verified bill-payment provider is configured"
                    className="flex-1 px-3 py-1.5 bg-elevated text-t-muted text-xs rounded-lg cursor-not-allowed">Payments unavailable</button>
                  <button onClick={() => handleDeletePayee(p.id)}
                    className="px-3 py-1.5 text-red-600 text-xs rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-t-primary">Saved Schedule Records</h2>
          <p className="text-sm text-t-tertiary mt-1">These records are not automatically processed while a payment provider is unavailable.</p>
        </div>
        {scheduled.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-8 text-center text-t-muted">No scheduled payments</div>
        ) : (
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Payee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Next Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b-secondary">
                {scheduled.map(sp => (
                  <tr key={sp.id} className="hover:bg-hover">
                    <td className="px-6 py-4 text-sm font-medium text-t-primary">{sp.payee_name}</td>
                    <td className="px-6 py-4 text-sm text-t-secondary">{formatCurrency(sp.amount)}</td>
                    <td className="px-6 py-4 text-sm text-t-tertiary capitalize">{sp.frequency}</td>
                    <td className="px-6 py-4 text-sm text-t-tertiary">{formatDate(sp.next_payment_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {sp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleCancelScheduled(sp.id)} className="text-xs text-red-600 hover:text-red-800">Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPayeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-t-primary mb-4">Add New Payee</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleAddPayee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Payee Name</label>
                <input type="text" value={payeeForm.payee_name} onChange={e => setPayeeForm({ ...payeeForm, payee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Payee Account Number</label>
                <input type="text" value={payeeForm.payee_account} onChange={e => setPayeeForm({ ...payeeForm, payee_account: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Category</label>
                <select value={payeeForm.category} onChange={e => setPayeeForm({ ...payeeForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Nickname (optional)</label>
                <input type="text" value={payeeForm.nickname} onChange={e => setPayeeForm({ ...payeeForm, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPayeeModal(false)} className="px-4 py-2 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
