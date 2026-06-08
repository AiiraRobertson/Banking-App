import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import { topUp } from '../services/fundingService';
import { formatCurrency } from '../utils/formatCurrency';

const METHOD_TABS = [
  { id: 'card', label: 'Card' },
  { id: 'bank', label: 'Bank' },
  { id: 'crypto', label: 'Crypto' }
];

const NETWORKS = ['BTC', 'ETH', 'SOL', 'TRON', 'BSC', 'POLYGON'];

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

export default function AddMoneyPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');

  const [card, setCard] = useState({ card_number: '', exp_month: '', exp_year: '', cvv: '', holder: '' });
  const [bank, setBank] = useState({ bank_name: '', routing_number: '', account_number: '', holder: '' });
  const [crypto, setCrypto] = useState({ network: 'BTC', asset: 'BTC', tx_hash: '', from_address: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    getAccounts().then(res => {
      setAccounts(res.data.accounts);
      if (res.data.accounts.length > 0) setAccountId(res.data.accounts[0].id.toString());
    });
  }, []);

  const selectedAccount = accounts.find(a => a.id.toString() === accountId);

  const buildDetails = () => {
    if (method === 'card') {
      return {
        card_number: card.card_number.replace(/\s+/g, ''),
        exp_month: parseInt(card.exp_month, 10),
        exp_year: parseInt(card.exp_year, 10),
        cvv: card.cvv,
        holder: card.holder
      };
    }
    if (method === 'bank') {
      return { ...bank };
    }
    return { ...crypto };
  };

  const reset = () => {
    setAmount('');
    setError('');
    setReceipt(null);
    setCard({ card_number: '', exp_month: '', exp_year: '', cvv: '', holder: '' });
    setBank({ bank_name: '', routing_number: '', account_number: '', holder: '' });
    setCrypto({ network: 'BTC', asset: 'BTC', tx_hash: '', from_address: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!accountId) { setError('Pick a destination account'); return; }

    setLoading(true);
    try {
      const res = await topUp({
        account_id: parseInt(accountId, 10),
        amount: amt,
        method,
        details: buildDetails()
      });
      setReceipt(res.data);
      getAccounts().then(r => setAccounts(r.data.accounts));
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error
        || (Array.isArray(data?.errors) && data.errors.map(e => e.message).filter(Boolean).join('; '))
        || 'Top-up failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = useMemo(() => {
    const yr = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => yr + i);
  }, []);

  if (receipt) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-t-primary">{receipt.message}</h2>
          <div className="bg-elevated rounded-lg p-4 text-sm space-y-2 text-left">
            <div className="flex justify-between"><span className="text-t-tertiary">Source</span><span className="text-t-primary font-medium">{receipt.summary}</span></div>
            <div className="flex justify-between"><span className="text-t-tertiary">Method</span><span className="text-t-primary capitalize">{receipt.method}</span></div>
            <div className="flex justify-between"><span className="text-t-tertiary">External ref</span><span className="text-t-primary font-mono text-xs truncate max-w-[60%]">{receipt.externalRef}</span></div>
            <div className="flex justify-between"><span className="text-t-tertiary">Reference</span><span className="text-t-primary font-mono text-xs truncate max-w-[60%]">{receipt.referenceId}</span></div>
            <div className="flex justify-between"><span className="text-t-tertiary">New balance</span><span className="text-t-primary font-semibold">{formatCurrency(receipt.newBalance)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-2.5 bg-elevated text-t-secondary rounded-lg hover:bg-hover font-medium">Add more</button>
            <button onClick={() => navigate(`/accounts/${accountId}`)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-t-primary">Add Money</h1>
          <p className="text-sm text-t-tertiary">Fund your Kapita account from a card, bank, or crypto wallet</p>
        </div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-t-secondary bg-surface border border-b-input rounded-lg hover:bg-hover">
          &larr; Back
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg px-3 py-2">
        Test mode — no real money is moved. Card and bank details are validated for format only; only the brand and last-4 are stored.
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary">
        <div className="flex border-b border-b-primary">
          {METHOD_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setMethod(t.id); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${method === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-t-tertiary hover:text-t-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Destination Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) — {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-t-secondary mb-1">Amount ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="0.01" step="0.01" required
              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {method === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Card Number</label>
                <input type="text" inputMode="numeric" value={card.card_number}
                  onChange={e => setCard({ ...card, card_number: formatCardNumber(e.target.value) })}
                  placeholder="4242 4242 4242 4242" required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Exp Month</label>
                  <select value={card.exp_month} onChange={e => setCard({ ...card, exp_month: e.target.value })} required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Exp Year</label>
                  <select value={card.exp_year} onChange={e => setCard({ ...card, exp_year: e.target.value })} required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">YYYY</option>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">CVV</label>
                  <input type="text" inputMode="numeric" value={card.cvv} maxLength={4}
                    onChange={e => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })}
                    required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Cardholder Name</label>
                <input type="text" value={card.holder} onChange={e => setCard({ ...card, holder: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          )}

          {method === 'bank' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Bank Name</label>
                <input type="text" value={bank.bank_name} onChange={e => setBank({ ...bank, bank_name: e.target.value })}
                  placeholder="Chase, Bank of America…" required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Routing Number</label>
                  <input type="text" inputMode="numeric" maxLength={9} value={bank.routing_number}
                    onChange={e => setBank({ ...bank, routing_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="9 digits" required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Account Number</label>
                  <input type="text" inputMode="numeric" maxLength={17} value={bank.account_number}
                    onChange={e => setBank({ ...bank, account_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="4-17 digits" required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Account Holder</label>
                <input type="text" value={bank.holder} onChange={e => setBank({ ...bank, holder: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          )}

          {method === 'crypto' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Network</label>
                  <select value={crypto.network} onChange={e => setCrypto({ ...crypto, network: e.target.value })}
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Asset</label>
                  <input type="text" maxLength={10} value={crypto.asset}
                    onChange={e => setCrypto({ ...crypto, asset: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase() })}
                    placeholder="BTC, ETH, USDT…" required
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Transaction Hash</label>
                <input type="text" value={crypto.tx_hash}
                  onChange={e => setCrypto({ ...crypto, tx_hash: e.target.value.trim() })}
                  placeholder="0x… or hex hash" required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">From Address</label>
                <input type="text" value={crypto.from_address}
                  onChange={e => setCrypto({ ...crypto, from_address: e.target.value.trim() })}
                  placeholder="Sending wallet address" required
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Processing…' : `Add ${amount ? formatCurrency(parseFloat(amount) || 0) : 'money'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
