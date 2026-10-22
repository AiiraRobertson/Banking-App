import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import { convertCurrency, getExchangeQuote } from '../services/exchangeService';
import { formatCurrency } from '../utils/formatCurrency';

export default function CurrencyConversionPage() {
  const [accounts, setAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = () => getAccounts().then(res => {
    const list = res.data.accounts.filter(account => ['USD', 'NGN', 'GHS'].includes(account.currency));
    setAccounts(list);
    if (list.length) {
      const from = list.find(account => account.currency === 'USD') || list[0];
      const to = list.find(account => account.currency !== from.currency);
      setFromAccountId(String(from.id));
      if (to) setToAccountId(String(to.id));
    }
  }).catch(err => {
    setError(err.response?.data?.error || 'Could not load your accounts.');
  }).finally(() => setLoading(false));

  useEffect(() => { loadAccounts(); }, []);

  const fromAccount = accounts.find(account => String(account.id) === fromAccountId);
  const toAccount = accounts.find(account => String(account.id) === toAccountId);
  const destinationAccounts = accounts.filter(account => account.currency !== fromAccount?.currency);

  const handleQuote = async (event) => {
    event.preventDefault();
    setError('');
    setReceipt(null);
    setQuote(null);
    setSubmitting(true);
    try {
      const response = await getExchangeQuote({
        from_account_id: Number(fromAccountId),
        to_account_id: Number(toAccountId),
        amount: Number(amount)
      });
      setQuote(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not calculate an exchange quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!quote) return;
    setError('');
    setSubmitting(true);
    try {
      const response = await convertCurrency(quote.quoteId);
      setReceipt(response.data);
      setQuote(null);
      setAmount('');
      await loadAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Currency conversion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Convert Currency</h1>
        <p className="text-t-tertiary">Convert between your own USD, NGN, and GHS accounts.</p>
      </div>

      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>{quote?.rateMode || 'DEVELOPMENT TEST RATE'}</strong>
        <p className="mt-1">These configurable test rates are not live market rates and must not be used for real transactions.</p>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {receipt && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <h2 className="font-semibold">{receipt.message}</h2>
          <p className="mt-1">Converted {formatCurrency(receipt.sourceAmount, receipt.fromCurrency)} to {formatCurrency(receipt.destinationAmount, receipt.toCurrency)}.</p>
          <p>Fee: {formatCurrency(receipt.feeAmount, receipt.fromCurrency)} · Reference: {receipt.referenceId}</p>
        </div>
      )}

      <form onSubmit={handleQuote} className="space-y-4 rounded-xl border border-b-secondary bg-surface p-6">
        <div>
          <label htmlFor="from-account" className="mb-1 block text-sm font-medium text-t-secondary">From account</label>
          <select id="from-account" value={fromAccountId} onChange={event => {
            setFromAccountId(event.target.value);
            setQuote(null);
          }} required className="w-full rounded-lg border border-b-input px-3 py-2">
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.currency} {account.account_type} · {formatCurrency(account.balance, account.currency)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="to-account" className="mb-1 block text-sm font-medium text-t-secondary">Convert to</label>
          <select id="to-account" value={toAccountId} onChange={event => {
            setToAccountId(event.target.value);
            setQuote(null);
          }} required className="w-full rounded-lg border border-b-input px-3 py-2">
            {destinationAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.currency} {account.account_type} · {formatCurrency(account.balance, account.currency)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-t-secondary">Amount ({fromAccount?.currency || 'source currency'})</label>
          <input id="amount" type="number" min="0.01" max="1000000" step="0.01" required value={amount} onChange={event => {
            setAmount(event.target.value);
            setQuote(null);
          }} className="w-full rounded-lg border border-b-input px-3 py-2" placeholder="0.00" />
        </div>

        <button type="submit" disabled={submitting || !fromAccount || !toAccount || destinationAccounts.length === 0} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? 'Calculating…' : 'Get Conversion Quote'}
        </button>

        {quote && (
          <div className="space-y-2 rounded-lg border border-b-secondary bg-elevated p-4 text-sm">
            <div className="flex justify-between gap-3"><span>Exchange rate</span><span>1 {quote.fromCurrency} = {quote.exchangeRate.toLocaleString('en-US', { maximumSignificantDigits: 8 })} {quote.toCurrency}</span></div>
            <div className="flex justify-between gap-3"><span>Converted amount</span><strong>{formatCurrency(quote.destinationAmount, quote.toCurrency)}</strong></div>
            <div className="flex justify-between gap-3"><span>Conversion fee (0.4%)</span><span>{formatCurrency(quote.feeAmount, quote.fromCurrency)}</span></div>
            <div className="flex justify-between gap-3 border-t border-b-secondary pt-2"><strong>Total debited</strong><strong>{formatCurrency(quote.totalDeducted, quote.fromCurrency)}</strong></div>
            <p className="text-xs text-t-muted">Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.</p>
            <button type="button" onClick={handleConvert} disabled={submitting} className="w-full rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {submitting ? 'Converting…' : 'Confirm Conversion'}
            </button>
          </div>
        )}
      </form>

      <Link to="/accounts" className="inline-block text-sm font-medium text-indigo-600 hover:underline">Back to accounts</Link>
    </div>
  );
}
