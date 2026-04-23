import { useState, useEffect } from 'react';
import { getPayees, addPayee, deletePayee, getScheduledPayments, schedulePayment, cancelScheduledPayment, payNow } from '../services/billPayService';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const categories = ['utilities', 'telecom', 'insurance', 'credit_card', 'rent', 'other'];

export default function BillPayPage() {
  const [payees, setPayees] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayeeModal, setShowPayeeModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [payeeForm, setPayeeForm] = useState({ payee_name: '', payee_account: '', category: 'utilities', nickname: '' });
  const [payForm, setPayForm] = useState({ from_account_id: '', amount: '' });
  const [scheduleForm, setScheduleForm] = useState({ from_account_id: '', amount: '', frequency: 'monthly', next_payment_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = () => {
    Promise.all([getPayees(), getScheduledPayments(), getAccounts()])
      .then(([p, s, a]) => {
        setPayees(p.data.payees);
        setScheduled(s.data.payments);
        setAccounts(a.data.accounts);
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

  const handlePayNow = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await payNow({ payee_id: showPayModal.id, from_account_id: parseInt(payForm.from_account_id), amount: parseFloat(payForm.amount) });
      setSuccess(res.data.message);
      setShowPayModal(null);
      setPayForm({ from_account_id: '', amount: '' });
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Payment failed'); }
    finally { setSubmitting(false); }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await schedulePayment({
        payee_id: showScheduleModal.id,
        from_account_id: parseInt(scheduleForm.from_account_id),
        amount: parseFloat(scheduleForm.amount),
        frequency: scheduleForm.frequency,
        next_payment_date: scheduleForm.next_payment_date
      });
      setShowScheduleModal(null);
      setScheduleForm({ from_account_id: '', amount: '', frequency: 'monthly', next_payment_date: '' });
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
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
        <h1 className="text-2xl font-bold text-gray-900">Bill Pay</h1>
        <p className="text-gray-500">Manage payees and pay bills</p>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Saved Payees</h2>
          <button onClick={() => { setShowPayeeModal(true); setError(''); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Add Payee
          </button>
        </div>
        {payees.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">No payees added yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {payees.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.payee_name}</h3>
                    {p.nickname && <p className="text-xs text-gray-400">{p.nickname}</p>}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{p.category.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">Account: {p.payee_account}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setShowPayModal(p); setPayForm({ from_account_id: accounts[0]?.id?.toString() || '', amount: '' }); setError(''); }}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Pay Now</button>
                  <button onClick={() => { setShowScheduleModal(p); setScheduleForm({ from_account_id: accounts[0]?.id?.toString() || '', amount: '', frequency: 'monthly', next_payment_date: '' }); setError(''); }}
                    className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">Schedule</button>
                  <button onClick={() => handleDeletePayee(p.id)}
                    className="px-3 py-1.5 text-red-600 text-xs rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Payments</h2>
        {scheduled.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">No scheduled payments</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scheduled.map(sp => (
                  <tr key={sp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sp.payee_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(sp.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{sp.frequency}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(sp.next_payment_date)}</td>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Payee</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleAddPayee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payee Name</label>
                <input type="text" value={payeeForm.payee_name} onChange={e => setPayeeForm({ ...payeeForm, payee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payee Account Number</label>
                <input type="text" value={payeeForm.payee_account} onChange={e => setPayeeForm({ ...payeeForm, payee_account: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={payeeForm.category} onChange={e => setPayeeForm({ ...payeeForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (optional)</label>
                <input type="text" value={payeeForm.nickname} onChange={e => setPayeeForm({ ...payeeForm, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPayeeModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Pay {showPayModal.payee_name}</h3>
            <p className="text-sm text-gray-500 mb-4">Account: {showPayModal.payee_account}</p>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handlePayNow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                <select value={payForm.from_account_id} onChange={e => setPayForm({ ...payForm, from_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="0.01" step="0.01" required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPayModal(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Paying...' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Payment - {showScheduleModal.payee_name}</h3>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                <select value={scheduleForm.from_account_id} onChange={e => setScheduleForm({ ...scheduleForm, from_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input type="number" value={scheduleForm.amount} onChange={e => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="0.01" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select value={scheduleForm.frequency} onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="once">Once</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={scheduleForm.next_payment_date} onChange={e => setScheduleForm({ ...scheduleForm, next_payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowScheduleModal(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
