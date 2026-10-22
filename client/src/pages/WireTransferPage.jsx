import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import { getCountries, getIncomingWires, receiveWire } from '../services/wireService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';

export default function WireTransferPage() {
  const [accounts, setAccounts] = useState([]);
  const [countries, setCountries] = useState([]);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [incomingWires, setIncomingWires] = useState([]);
  const [form, setForm] = useState({
    to_account_id: '',
    country_code: 'NG',
    sender_name: '',
    sender_bank: '',
    sender_account: '',
    amount: '',
    reference_note: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadHistory = () => getIncomingWires({ page: 1, limit: 10 })
    .then(response => setIncomingWires(response.data.transfers || []));

  useEffect(() => {
    Promise.all([getAccounts(), getCountries(), loadHistory()])
      .then(([accountResponse, countryResponse]) => {
        const usdAccounts = accountResponse.data.accounts.filter(account => account.currency === 'USD');
        setAccounts(usdAccounts);
        setCountries(countryResponse.data.countries.africa || []);
        setSimulationEnabled(!!countryResponse.data.restrictions?.simulationEnabled);
        if (usdAccounts.length) setForm(current => ({ ...current, to_account_id: String(usdAccounts[0].id) }));
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load wire information.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setReceipt(null);
    setSubmitting(true);
    try {
      const response = await receiveWire({
        ...form,
        to_account_id: Number(form.to_account_id),
        amount: Number(form.amount)
      });
      setReceipt(response.data);
      setForm(current => ({ ...current, sender_name: '', sender_bank: '', sender_account: '', amount: '', reference_note: '' }));
      await Promise.all([getAccounts().then(result => {
        setAccounts(result.data.accounts.filter(account => account.currency === 'USD'));
      }), loadHistory()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Wire simulation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Receive a USD Wire</h1>
        <p className="text-t-tertiary">Incoming wire support is limited to USD received into a USD account from Nigeria or Ghana.</p>
      </div>

      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">Development simulator only</h2>
        <p className="mt-1">{simulationEnabled
          ? 'No external bank settlement is connected. This form simulates an incoming USD wire for development. Never treat a simulated credit as real funds.'
          : 'No external bank settlement is connected. Incoming wire simulation is disabled in production; a verified banking integration is required.'}</p>
        <p className="mt-2">To send USD internationally, use a same-currency transfer to an eligible Kapita user in Nigeria or Ghana.</p>
        <Link to="/transfer" className="mt-2 inline-block font-semibold text-indigo-700 hover:underline">Go to Kapita transfers</Link>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {receipt && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <h2 className="font-semibold">{receipt.message}</h2>
          <p className="mt-1">Simulated credit: {formatCurrency(receipt.amount, 'USD')} · Reference: {receipt.referenceId}</p>
          <p>New balance: {formatCurrency(receipt.newBalance, 'USD')}</p>
        </div>
      )}

      {simulationEnabled && <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-b-secondary bg-surface p-6">
        <div>
          <label htmlFor="wire-account" className="mb-1 block text-sm font-medium text-t-secondary">Credit USD account</label>
          <select id="wire-account" required value={form.to_account_id} onChange={event => setForm({ ...form, to_account_id: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2">
            {accounts.map(account => (
              <option key={account.id} value={account.id}>USD {account.account_type} · ****{account.account_number.slice(-4)} · {formatCurrency(account.balance, 'USD')}</option>
            ))}
          </select>
          {accounts.length === 0 && <p className="mt-1 text-xs text-red-600">No USD account is available to receive the wire.</p>}
        </div>

        <div>
          <label htmlFor="wire-country" className="mb-1 block text-sm font-medium text-t-secondary">Wire origin country</label>
          <select id="wire-country" required value={form.country_code} onChange={event => setForm({ ...form, country_code: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2">
            {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sender-name" className="mb-1 block text-sm font-medium text-t-secondary">Sender name</label>
            <input id="sender-name" required value={form.sender_name} onChange={event => setForm({ ...form, sender_name: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2" />
          </div>
          <div>
            <label htmlFor="sender-bank" className="mb-1 block text-sm font-medium text-t-secondary">Sender bank</label>
            <input id="sender-bank" required value={form.sender_bank} onChange={event => setForm({ ...form, sender_bank: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2" />
          </div>
        </div>

        <div>
          <label htmlFor="sender-account" className="mb-1 block text-sm font-medium text-t-secondary">Sender account number (optional)</label>
          <input id="sender-account" value={form.sender_account} onChange={event => setForm({ ...form, sender_account: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2" />
        </div>

        <div>
          <label htmlFor="wire-amount" className="mb-1 block text-sm font-medium text-t-secondary">Amount (USD)</label>
          <input id="wire-amount" type="number" min="0.01" max="1000000" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2" />
        </div>

        <div>
          <label htmlFor="wire-reference" className="mb-1 block text-sm font-medium text-t-secondary">Reference (optional)</label>
          <input id="wire-reference" value={form.reference_note} onChange={event => setForm({ ...form, reference_note: event.target.value })} className="w-full rounded-lg border border-b-input px-3 py-2" />
        </div>

        <button type="submit" disabled={submitting || accounts.length === 0} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? 'Simulating…' : 'Simulate Incoming USD Wire'}
        </button>
      </form>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-t-primary">Incoming Wire History</h2>
        {incomingWires.length === 0 ? (
          <p className="rounded-xl border border-b-secondary bg-surface p-4 text-sm text-t-tertiary">No incoming wire records found.</p>
        ) : (
          <ul className="divide-y divide-b-secondary rounded-xl border border-b-secondary bg-surface">
            {incomingWires.map(wire => (
              <li key={wire.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-medium text-t-primary">{wire.sender_name} · {wire.country_name || wire.sender_country}</p>
                  <p className="text-xs text-t-tertiary">{wire.sender_bank} · {formatDateTime(wire.transaction_date)}{wire.status === 'completed' ? ' · Development simulation/record' : ''}</p>
                </div>
                <span className="text-sm font-semibold text-green-700">+{formatCurrency(wire.net_credited, 'USD')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
