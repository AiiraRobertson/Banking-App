import { useState, useEffect } from 'react';
import { getAccounts } from '../services/accountService';
import { getCountries, getQuote, sendWire, getWireHistory, lookupAccount } from '../services/wireService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { generateBic } from '../utils/generateBic';

const regionLabels = { north_america: 'North America', europe: 'Europe', africa: 'Africa' };

export default function WireTransferPage() {
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [countriesData, setCountriesData] = useState(null);
  const [feesData, setFeesData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({});
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [bankLookup, setBankLookup] = useState(null);
  const [bankLookupLoading, setBankLookupLoading] = useState(false);
  const [bicAutoFilled, setBicAutoFilled] = useState(false);

  const [form, setForm] = useState({
    region: '',
    country_code: '',
    from_account_id: '',
    recipient_name: '',
    recipient_bank: '',
    recipient_account: '',
    swift_code: '',
    iban: '',
    routing_number: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    Promise.all([getAccounts(), getCountries()])
      .then(([accRes, cRes]) => {
        setAccounts(accRes.data.accounts);
        setCountriesData(cRes.data.countries);
        setFeesData(cRes.data.fees);
        if (accRes.data.accounts.length > 0) {
          setForm(f => ({ ...f, from_account_id: accRes.data.accounts[0].id.toString() }));
        }
      }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getWireHistory({ page: historyPage, limit: 5 })
      .then(res => { setHistory(res.data.transfers); setHistoryPagination(res.data.pagination); })
      .catch(() => {});
  }, [historyPage, success]);

  useEffect(() => {
    if (form.recipient_account.length < 6) { setBankLookup(null); return; }
    setBankLookupLoading(true);
    const timer = setTimeout(() => {
      lookupAccount(form.recipient_account)
        .then(res => {
          setBankLookup(res.data);
          if (res.data.bank_name && !form.recipient_bank) {
            setForm(f => ({ ...f, recipient_bank: res.data.bank_name }));
          }
        })
        .catch(() => setBankLookup(null))
        .finally(() => setBankLookupLoading(false));
    }, 500);
    return () => { clearTimeout(timer); setBankLookupLoading(false); };
  }, [form.recipient_account]);

  const selectedCountry = countriesData
    ? Object.values(countriesData).flat().find(c => c.code === form.country_code)
    : null;

  const selectedAccount = accounts.find(a => a.id.toString() === form.from_account_id);

  const handleGetQuote = async () => {
    if (!form.amount || !form.country_code) return;
    setError('');
    try {
      const res = await getQuote({ amount: parseFloat(form.amount), country_code: form.country_code });
      setQuote(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get quote');
    }
  };

  const handleSend = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        from_account_id: parseInt(form.from_account_id),
        amount: parseFloat(form.amount),
        country_code: form.country_code,
        recipient_name: form.recipient_name,
        recipient_bank: form.recipient_bank,
        recipient_account: form.recipient_account,
        description: form.description
      };
      if (selectedCountry?.requiresSwift) payload.swift_code = form.swift_code;
      if (selectedCountry?.requiresIban) payload.iban = form.iban;
      if (selectedCountry?.requiresRouting) payload.routing_number = form.routing_number;

      const res = await sendWire(payload);
      setSuccess(res.data);
      setStep(5);
      getAccounts().then(r => setAccounts(r.data.accounts));
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setForm({ region: '', country_code: '', from_account_id: accounts[0]?.id?.toString() || '', recipient_name: '', recipient_bank: '', recipient_account: '', swift_code: '', iban: '', routing_number: '', amount: '', description: '' });
    setQuote(null);
    setSuccess(null);
    setError('');
    setBankLookup(null);
    setBicAutoFilled(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">International Wire Transfer</h1>
        <p className="text-t-tertiary">Send money to the US, Canada, Europe, and Africa</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {['Region & Country', 'Recipient', 'Amount', 'Review', 'Done'].map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              step > i + 1 ? 'bg-green-500 text-white' :
              step === i + 1 ? 'bg-indigo-600 text-white' :
              'bg-elevated text-t-tertiary'
            }`}>{step > i + 1 ? '\u2713' : i + 1}</div>
            <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-indigo-600 font-semibold' : 'text-t-muted'}`}>{label}</span>
            {i < 4 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-elevated'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">

        {/* Step 1: Region & Country */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-t-primary">Select Destination</h2>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-3">Region</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(regionLabels).map(([key, label]) => (
                  <button key={key} type="button"
                    onClick={() => setForm({ ...form, region: key, country_code: '' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.region === key ? 'border-indigo-600 bg-indigo-50' : 'border-b-primary hover:border-b-input'
                    }`}>
                    <p className="font-semibold text-t-primary">{label}</p>
                    <p className="text-xs text-t-tertiary mt-1">
                      {feesData?.[key] ? `${feesData[key].deliveryDays} | $${feesData[key].flat} + ${feesData[key].percent}% fee` : ''}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {form.region && countriesData?.[form.region] && (
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-3">Country</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {countriesData[form.region].map(c => (
                    <button key={c.code} type="button"
                      onClick={() => setForm({ ...form, country_code: c.code })}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        form.country_code === c.code ? 'border-indigo-600 bg-indigo-50' : 'border-b-primary hover:border-b-input'
                      }`}>
                      <span className="text-lg">{c.flag}</span>
                      <p className="font-medium text-t-primary mt-1">{c.name}</p>
                      <p className="text-xs text-t-tertiary">{c.currencyName} ({c.currency})</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => { if (form.country_code) { setError(''); setStep(2); } }}
                disabled={!form.country_code}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recipient Details */}
        {step === 2 && selectedCountry && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div>
                <h2 className="text-lg font-semibold text-t-primary">Recipient in {selectedCountry.name}</h2>
                <p className="text-sm text-t-tertiary">Currency: {selectedCountry.currencyName} ({selectedCountry.currency})</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Recipient Full Name</label>
              <input type="text" value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="John Smith" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Account Number</label>
              <input type="text" value={form.recipient_account} onChange={e => setForm({ ...form, recipient_account: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Recipient's bank account number" required />
              {bankLookupLoading && (
                <p className="text-xs text-t-muted mt-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-b-input border-t-indigo-500 rounded-full animate-spin" />
                  Looking up account...
                </p>
              )}
              {bankLookup && !bankLookupLoading && (
                <div className={`mt-1.5 text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${
                  bankLookup.found
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-elevated text-gray-600 border border-b-primary'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
                  </svg>
                  <span className="font-medium">{bankLookup.bank_name}</span>
                  {bankLookup.found && <span>- {bankLookup.account_type} ({bankLookup.holder_hint})</span>}
                  {!bankLookup.found && bankLookup.note && <span>({bankLookup.note})</span>}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Bank Name</label>
              <input type="text" value={form.recipient_bank}
                onChange={e => {
                  const bankName = e.target.value;
                  const updates = { recipient_bank: bankName };
                  if (selectedCountry?.requiresSwift && bankName.length >= 2) {
                    updates.swift_code = generateBic(bankName, form.country_code);
                    setBicAutoFilled(true);
                  } else if (!bankName) {
                    updates.swift_code = '';
                    setBicAutoFilled(false);
                  }
                  setForm(f => ({ ...f, ...updates }));
                }}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Deutsche Bank, Barclays, GTBank..." required />
            </div>

            {selectedCountry.requiresSwift && (
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">SWIFT / BIC Code <span className="text-red-500">*</span></label>
                <input type="text" value={form.swift_code}
                  onChange={e => { setForm({ ...form, swift_code: e.target.value.toUpperCase() }); setBicAutoFilled(false); }}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="e.g. DEUTDEFF" maxLength={11} required />
                {bicAutoFilled ? (
                  <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Auto-generated from bank name. You can edit if needed.
                  </p>
                ) : (
                  <p className="text-xs text-t-muted mt-1">8 or 11 character bank identifier code</p>
                )}
              </div>
            )}

            {selectedCountry.requiresIban && (
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">IBAN <span className="text-red-500">*</span></label>
                <input type="text" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="e.g. DE89370400440532013000" required />
                <p className="text-xs text-t-muted mt-1">International Bank Account Number</p>
              </div>
            )}

            {selectedCountry.requiresRouting && (
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Routing Number <span className="text-red-500">*</span></label>
                <input type="text" value={form.routing_number} onChange={e => setForm({ ...form, routing_number: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="e.g. 021000021" maxLength={9} required />
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Back</button>
              <button onClick={() => {
                if (!form.recipient_name || !form.recipient_bank || !form.recipient_account) {
                  setError('Please fill in all required fields'); return;
                }
                if (selectedCountry.requiresSwift && !form.swift_code) { setError('SWIFT code is required'); return; }
                if (selectedCountry.requiresIban && !form.iban) { setError('IBAN is required'); return; }
                if (selectedCountry.requiresRouting && !form.routing_number) { setError('Routing number is required'); return; }
                setError(''); setStep(3);
              }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Amount */}
        {step === 3 && selectedCountry && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-t-primary">Transfer Amount</h2>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">From Account</label>
              <select value={form.from_account_id} onChange={e => setForm({ ...form, from_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Amount to Send (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-t-muted">$</span>
                <input type="number" value={form.amount}
                  onChange={e => { setForm({ ...form, amount: e.target.value }); setQuote(null); }}
                  className="w-full pl-7 pr-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.00" min="1" max="1000000" step="0.01" />
              </div>
              {selectedAccount && <p className="text-xs text-t-muted mt-1">Available: {formatCurrency(selectedAccount.balance)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Description (optional)</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Family support, Invoice #123" />
            </div>

            <button onClick={handleGetQuote} disabled={!form.amount || parseFloat(form.amount) < 1}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              Get Quote
            </button>

            {quote && (
              <div className="bg-elevated rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-t-primary">Transfer Quote</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-t-tertiary">You Send</p><p className="font-semibold text-t-primary">{formatCurrency(quote.originalAmount)}</p></div>
                  <div><p className="text-t-tertiary">Recipient Gets</p><p className="font-semibold text-green-600">{quote.currency} {quote.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-t-tertiary">Exchange Rate</p><p className="font-medium text-t-secondary">1 USD = {quote.exchangeRate} {quote.currency}</p></div>
                  <div><p className="text-t-tertiary">Transfer Fee</p><p className="font-medium text-orange-600">{formatCurrency(quote.feeAmount)}</p></div>
                  <div><p className="text-t-tertiary">Total Deducted</p><p className="font-bold text-t-primary">{formatCurrency(quote.totalDeducted)}</p></div>
                  <div><p className="text-t-tertiary">Est. Delivery</p><p className="font-medium text-t-secondary">{quote.deliveryDays}</p></div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-2.5 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Back</button>
              <button onClick={() => { if (quote) { setError(''); setStep(4); } }}
                disabled={!quote}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                Review Transfer
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && selectedCountry && quote && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-t-primary">Review Wire Transfer</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-t-tertiary uppercase">Recipient Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-t-tertiary">Name</span><span className="font-medium text-t-primary">{form.recipient_name}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Country</span><span className="font-medium">{selectedCountry.flag} {selectedCountry.name}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Bank</span><span className="font-medium text-t-primary">{form.recipient_bank}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Account</span><span className="font-medium font-mono text-t-primary">{form.recipient_account}</span></div>
                  {form.swift_code && <div className="flex justify-between"><span className="text-t-tertiary">SWIFT</span><span className="font-medium font-mono">{form.swift_code}</span></div>}
                  {form.iban && <div className="flex justify-between"><span className="text-t-tertiary">IBAN</span><span className="font-medium font-mono text-xs">{form.iban}</span></div>}
                  {form.routing_number && <div className="flex justify-between"><span className="text-t-tertiary">Routing</span><span className="font-medium font-mono">{form.routing_number}</span></div>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-t-tertiary uppercase">Transfer Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-t-tertiary">From Account</span><span className="font-medium">****{selectedAccount?.account_number.slice(-4)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Send Amount</span><span className="font-semibold text-t-primary">{formatCurrency(quote.originalAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Exchange Rate</span><span className="font-medium">1 USD = {quote.exchangeRate} {quote.currency}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Recipient Gets</span><span className="font-semibold text-green-600">{quote.currency} {quote.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Fee</span><span className="font-medium text-orange-600">{formatCurrency(quote.feeAmount)}</span></div>
                  <hr className="border-b-primary" />
                  <div className="flex justify-between"><span className="text-t-secondary font-semibold">Total Deducted</span><span className="font-bold text-lg text-t-primary">{formatCurrency(quote.totalDeducted)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Est. Delivery</span><span className="font-medium text-indigo-600">{quote.deliveryDays}</span></div>
                </div>
              </div>
            </div>

            {form.description && (
              <div className="text-sm"><span className="text-t-tertiary">Note: </span><span className="text-t-secondary">{form.description}</span></div>
            )}

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Please review all details carefully. Wire transfers cannot be reversed once initiated.
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-6 py-2.5 text-t-secondary bg-elevated rounded-lg hover:bg-hover">Back</button>
              <button onClick={handleSend} disabled={submitting}
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {submitting ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && success && (
          <div className="text-center space-y-5 py-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-t-primary">Wire Transfer Initiated!</h2>
            <p className="text-t-tertiary">Your transfer is being processed</p>

            <div className="bg-elevated rounded-xl p-5 text-left max-w-md mx-auto space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-t-tertiary">Reference</span><span className="font-mono text-xs text-t-secondary">{success.referenceId}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">Sent</span><span className="font-semibold">{formatCurrency(success.totalDeducted - success.feeAmount)}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">Recipient Gets</span><span className="font-semibold text-green-600">{success.currency} {success.converted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">Fee</span><span className="text-orange-600">{formatCurrency(success.feeAmount)}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">Total Deducted</span><span className="font-bold">{formatCurrency(success.totalDeducted)}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">New Balance</span><span className="font-medium">{formatCurrency(success.newBalance)}</span></div>
              <div className="flex justify-between"><span className="text-t-tertiary">Est. Delivery</span><span className="text-indigo-600 font-medium">{success.deliveryDays}</span></div>
            </div>

            <button onClick={resetForm} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              New Transfer
            </button>
          </div>
        )}
      </div>

      {/* Wire Transfer History */}
      <div>
        <h2 className="text-lg font-semibold text-t-primary mb-4">Wire Transfer History</h2>
        {history.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-8 text-center text-t-muted">No wire transfers yet</div>
        ) : (
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Country</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Sent (USD)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-b-secondary">
                  {history.map(w => (
                    <tr key={w.id} className="hover:bg-hover">
                      <td className="px-4 py-3 text-sm text-t-tertiary">{formatDate(w.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-t-primary">{w.recipient_name}</td>
                      <td className="px-4 py-3 text-sm text-t-secondary">{w.recipient_country}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(w.original_amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{w.currency} {w.converted_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(w.fee_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          w.status === 'completed' ? 'bg-green-50 text-green-700' :
                          w.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>{w.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {historyPagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
              className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <span className="text-sm text-t-tertiary">Page {historyPage} of {historyPagination.pages}</span>
            <button onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))} disabled={historyPage === historyPagination.pages}
              className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
