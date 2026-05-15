import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts, lookupAccountByNumber } from '../services/accountService';
import { transfer } from '../services/transactionService';
import { getCountries, getQuote, sendWire, getBanksForCountry } from '../services/wireService';
import { saveBeneficiary } from '../services/beneficiaryService';
import { formatCurrency } from '../utils/formatCurrency';
import BeneficiaryAutocomplete from '../components/BeneficiaryAutocomplete';
import { getMaturityInfo, formatMaturityDate } from '../utils/savingsLock';
import { generateBic } from '../utils/generateBic';

const regionLabels = { north_america: 'North America', europe: 'Europe', africa: 'Africa' };

export default function TransferPage() {
  const [accounts, setAccounts] = useState([]);
  const [countriesData, setCountriesData] = useState(null);
  const [feesData, setFeesData] = useState(null);
  const [countryBanks, setCountryBanks] = useState([]);
  const [bankMode, setBankMode] = useState('select');
  const [bicAutoFilled, setBicAutoFilled] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  const [form, setForm] = useState({
    account_id: '',
    to_account_id: '',
    to_account_number: '',
    to_account_name: '',
    amount: '',
    description: '',
    transferMode: 'own',
    save_beneficiary: true,
    beneficiary_nickname: '',
    // Other Bank fields
    country_code: '',
    region: '',
    recipient_bank: '',
    recipient_account: '',
    swift_code: '',
    iban: '',
    routing_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState({ status: 'idle', data: null });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    Promise.all([getAccounts(), getCountries()]).then(([accRes, cRes]) => {
      setAccounts(accRes.data.accounts);
      setCountriesData(cRes.data.countries);
      setFeesData(cRes.data.fees);
      const firstUnlocked = accRes.data.accounts.find(a => !getMaturityInfo(a).locked);
      if (firstUnlocked) setForm(f => ({ ...f, account_id: firstUnlocked.id.toString() }));
    });
  }, []);

  const sourceAccounts = accounts.filter(a => !getMaturityInfo(a).locked);

  useEffect(() => {
    if (form.transferMode !== 'other') {
      setLookup({ status: 'idle', data: null });
      return;
    }
    const acct = (form.to_account_number || '').trim();
    if (!/^\d{10}$/.test(acct)) {
      setLookup({ status: 'idle', data: null });
      return;
    }
    setLookup({ status: 'loading', data: null });
    const timer = setTimeout(() => {
      lookupAccountByNumber(acct)
        .then(res => {
          if (res.data.found) {
            setLookup({ status: 'found', data: res.data });
            setForm(f => f.to_account_name ? f : { ...f, to_account_name: res.data.account_name });
          } else {
            setLookup({ status: 'not_found', data: null });
          }
        })
        .catch(() => setLookup({ status: 'error', data: null }));
    }, 350);
    return () => clearTimeout(timer);
  }, [form.to_account_number, form.transferMode]);

  // Load banks list when country changes (Other Bank mode)
  useEffect(() => {
    if (form.transferMode !== 'bank' || !form.country_code) {
      setCountryBanks([]);
      return;
    }
    getBanksForCountry(form.country_code)
      .then(res => setCountryBanks(res.data.banks || []))
      .catch(() => setCountryBanks([]));
    setBankMode('select');
    setBicAutoFilled(false);
    setForm(f => ({ ...f, recipient_bank: '', swift_code: '' }));
  }, [form.country_code, form.transferMode]);

  // Debounced quote refresh for Other Bank
  useEffect(() => {
    if (form.transferMode !== 'bank') { setQuote(null); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !form.country_code) { setQuote(null); return; }
    setQuoting(true);
    const timer = setTimeout(() => {
      getQuote({ amount: amt, country_code: form.country_code })
        .then(res => setQuote(res.data))
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.amount, form.country_code, form.transferMode]);

  const reset = () => {
    setForm(f => ({
      ...f,
      amount: '',
      description: '',
      to_account_id: '',
      to_account_number: '',
      to_account_name: '',
      beneficiary_nickname: '',
      country_code: '',
      region: '',
      recipient_bank: '',
      recipient_account: '',
      swift_code: '',
      iban: '',
      routing_number: '',
    }));
    setQuote(null);
    setSuccess(null);
    setError('');
    setLookup({ status: 'idle', data: null });
    setShowConfirm(false);
  };

  const selectedCountry = form.country_code && countriesData
    ? Object.values(countriesData).flat().find(c => c.code === form.country_code)
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }

    if (form.transferMode === 'own') {
      const toId = parseInt(form.to_account_id);
      if (!toId || isNaN(toId)) { setError('Please select a destination account'); return; }
    } else if (form.transferMode === 'other') {
      const acct = (form.to_account_number || '').trim();
      if (!/^\d{10}$/.test(acct)) { setError('Account number must be exactly 10 digits'); return; }
      if (lookup.status === 'not_found') { setError('Destination account does not exist'); return; }
      if (lookup.status === 'loading') { setError('Verifying account, please wait...'); return; }
    } else if (form.transferMode === 'bank') {
      if (!form.country_code) { setError('Select a destination country'); return; }
      if (!form.recipient_name?.trim() && !form.to_account_name?.trim()) { setError('Enter recipient name'); return; }
      if (!form.recipient_bank?.trim()) { setError('Select or enter the recipient bank'); return; }
      if (!form.recipient_account?.trim()) { setError('Enter the recipient account number'); return; }
      if (selectedCountry?.requiresSwift && !form.swift_code?.trim()) { setError('SWIFT/BIC is required for this country'); return; }
      if (selectedCountry?.requiresIban && !form.iban?.trim()) { setError('IBAN is required for this country'); return; }
      if (selectedCountry?.requiresRouting && !form.routing_number?.trim()) { setError('Routing number is required for this country'); return; }
      if (!quote) { setError('Waiting for fee quote, please wait...'); return; }
    }
    setShowConfirm(true);
  };

  const executeTransaction = async () => {
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const amt = parseFloat(form.amount);

      if (form.transferMode === 'bank') {
        const payload = {
          from_account_id: parseInt(form.account_id),
          amount: amt,
          country_code: form.country_code,
          recipient_name: (form.to_account_name || '').trim(),
          recipient_bank: form.recipient_bank.trim(),
          recipient_account: form.recipient_account.trim(),
          description: form.description || `Transfer to ${form.recipient_bank} (${selectedCountry?.name})`,
        };
        if (form.swift_code) payload.swift_code = form.swift_code.trim();
        if (form.iban) payload.iban = form.iban.trim();
        if (form.routing_number) payload.routing_number = form.routing_number.trim();

        const res = await sendWire(payload);
        setShowConfirm(false);
        setSuccess({
          message: res.data.message,
          referenceId: res.data.referenceId,
          newBalance: res.data.newBalance,
          extra: {
            converted: res.data.converted,
            currency: res.data.currency,
            feeAmount: res.data.feeAmount,
            totalDeducted: res.data.totalDeducted,
            deliveryDays: res.data.deliveryDays,
            country: res.data.country,
          }
        });
        getAccounts().then(r => setAccounts(r.data.accounts));

        if (form.save_beneficiary) {
          try {
            await saveBeneficiary({
              nickname: form.beneficiary_nickname || undefined,
              account_name: (form.to_account_name || '').trim() || form.beneficiary_nickname || form.recipient_account,
              account_number: form.recipient_account.trim(),
              bank_name: form.recipient_bank.trim(),
              swift_code: form.swift_code || undefined,
              iban: form.iban || undefined,
              routing_number: form.routing_number || undefined,
              country_code: form.country_code,
              type: 'wire'
            });
          } catch {}
        }
        return;
      }

      // own / other modes use /api/transactions/transfer
      const payload = { from_account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Transfer' };
      if (form.transferMode === 'own') {
        payload.to_account_id = parseInt(form.to_account_id);
      } else {
        payload.to_account_number = form.to_account_number.trim();
      }
      const res = await transfer(payload);
      setShowConfirm(false);
      setSuccess({ message: res.data.message, referenceId: res.data.referenceId, newBalance: res.data.newBalance });
      getAccounts().then(r => setAccounts(r.data.accounts));

      if (form.transferMode === 'other' && form.save_beneficiary && form.to_account_number) {
        try {
          await saveBeneficiary({
            nickname: form.beneficiary_nickname || undefined,
            account_name: form.to_account_name || lookup.data?.account_name || form.beneficiary_nickname || `Account ${form.to_account_number}`,
            account_number: form.to_account_number,
            bank_name: 'Kapita',
            type: 'external'
          });
        } catch {}
      }
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error
        || (Array.isArray(data?.errors) && data.errors.map(e => e.message).filter(Boolean).join('; '))
        || 'Transaction failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id.toString() === form.account_id);
  const sourceLock = getMaturityInfo(selectedAccount);
  const lockedForDebit = sourceLock.locked;

  const handleBankSelectChange = (val) => {
    if (val === '__custom__') {
      setBankMode('custom');
      setForm(f => ({ ...f, recipient_bank: '', swift_code: '' }));
      setBicAutoFilled(false);
      return;
    }
    const bank = countryBanks.find(b => b.name === val);
    if (bank) {
      setForm(f => ({ ...f, recipient_bank: bank.name, swift_code: bank.swift || '' }));
      setBicAutoFilled(!!bank.swift);
    }
  };

  const handleCustomBankBlur = () => {
    if (form.recipient_bank && form.country_code && !form.swift_code) {
      const bic = generateBic(form.recipient_bank, form.country_code);
      if (bic) {
        setForm(f => ({ ...f, swift_code: bic }));
        setBicAutoFilled(true);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Transfer</h1>
        <p className="text-t-tertiary">Move money between your accounts, another Kapita user, or to any bank in 27 countries</p>
      </div>

      <Link to="/add-money" className="block bg-green-50 border border-green-200 rounded-lg px-4 py-3 hover:bg-green-100 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-900">Need to add funds?</p>
            <p className="text-xs text-green-800">Top up your account from a card, bank, or crypto wallet.</p>
          </div>
          <span className="text-green-700 font-medium text-sm">Add Money &rarr;</span>
        </div>
      </Link>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary">
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-t-primary">{success.message}</h3>
              <p className="text-sm text-t-tertiary">Reference: {success.referenceId}</p>
              <p className="text-sm text-t-tertiary">New balance: {formatCurrency(success.newBalance)}</p>
              {success.extra && (
                <div className="text-xs text-t-tertiary space-y-1 bg-elevated rounded-lg p-3 max-w-sm mx-auto">
                  <div>Recipient gets: <span className="font-semibold text-t-primary">{success.extra.currency} {success.extra.converted?.toFixed(2)}</span></div>
                  <div>Fee: <span className="font-semibold text-t-primary">{formatCurrency(success.extra.feeAmount)}</span></div>
                  <div>Total debited: <span className="font-semibold text-t-primary">{formatCurrency(success.extra.totalDeducted)}</span></div>
                  <div>Country: {success.extra.country}</div>
                  <div>Estimated delivery: {success.extra.deliveryDays}</div>
                </div>
              )}
              <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                New Transaction
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">From Account</label>
                <select
                  value={form.account_id}
                  onChange={e => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
                  {sourceAccounts.length === 0 && <option value="">No available source accounts</option>}
                  {sourceAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
                {selectedAccount && <p className="text-xs text-t-muted mt-1">Available: {formatCurrency(selectedAccount.balance)}</p>}
                {lockedForDebit && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    🔒 This savings account is locked for {sourceLock.daysRemaining} more day{sourceLock.daysRemaining === 1 ? '' : 's'} (matures {formatMaturityDate(sourceLock.maturesAt)}). Withdrawals and transfers from it are paused until then. Deposits are still allowed.
                  </div>
                )}
              </div>

              <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Transfer To</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'own' })}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${form.transferMode === 'own' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-elevated text-t-secondary hover:bg-hover'}`}>
                      My Account
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'other' })}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${form.transferMode === 'other' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-elevated text-t-secondary hover:bg-hover'}`}>
                      Other Account
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'bank' })}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${form.transferMode === 'bank' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-elevated text-t-secondary hover:bg-hover'}`}>
                      Other Bank
                    </button>
                  </div>

                  {form.transferMode === 'own' && (
                    <select
                      value={form.to_account_id}
                      onChange={e => setForm({ ...form, to_account_id: e.target.value })}
                      className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      required
                    >
                      <option value="">Select destination account</option>
                      {accounts.filter(a => a.id.toString() !== form.account_id).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                        </option>
                      ))}
                    </select>
                  )}

                  {form.transferMode === 'other' && (
                    <div className="space-y-2">
                      <BeneficiaryAutocomplete
                        value={form.to_account_number}
                        onChange={(v) => setForm(f => ({ ...f, to_account_number: v }))}
                        onSelect={(b) => setForm(f => ({
                          ...f,
                          to_account_number: b.account_number,
                          to_account_name: b.account_name,
                          beneficiary_nickname: b.nickname || ''
                        }))}
                        type="external"
                        placeholder="Type 10-digit account number, name, or nickname..."
                        required
                      />
                      {lookup.status === 'loading' && (
                        <p className="text-xs text-t-muted flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 border-2 border-b-input border-t-indigo-500 rounded-full animate-spin" />
                          Verifying account...
                        </p>
                      )}
                      {lookup.status === 'found' && lookup.data && (
                        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <div className="min-w-0">
                            <p className="font-semibold text-green-800 truncate">{lookup.data.account_name}</p>
                            <p className="text-xs text-green-700">{lookup.data.bank_name} · {lookup.data.account_type} (****{lookup.data.account_number.slice(-4)})</p>
                          </div>
                        </div>
                      )}
                      {lookup.status === 'not_found' && (
                        <p className="text-xs text-red-600 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          No active account found with this number
                        </p>
                      )}
                      <input
                        type="text"
                        value={form.to_account_name}
                        onChange={e => setForm({ ...form, to_account_name: e.target.value })}
                        placeholder="Recipient name (for saving)"
                        className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="save-beneficiary"
                          checked={form.save_beneficiary}
                          onChange={e => setForm({ ...form, save_beneficiary: e.target.checked })}
                          className="rounded border-b-input text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="save-beneficiary" className="text-xs text-t-secondary">
                          Save as beneficiary for quick re-use
                        </label>
                      </div>
                      {form.save_beneficiary && (
                        <input
                          type="text"
                          value={form.beneficiary_nickname}
                          onChange={e => setForm({ ...form, beneficiary_nickname: e.target.value })}
                          placeholder="Nickname (optional, e.g. 'Mom', 'Landlord')"
                          className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        />
                      )}
                    </div>
                  )}

                  {form.transferMode === 'bank' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-t-secondary mb-1">Destination Country</label>
                        <select
                          value={form.country_code}
                          onChange={e => {
                            const code = e.target.value;
                            const country = code && countriesData ? Object.values(countriesData).flat().find(c => c.code === code) : null;
                            setForm(f => ({ ...f, country_code: code, region: country?.region || '' }));
                          }}
                          className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          required
                        >
                          <option value="">Select country...</option>
                          {countriesData && Object.entries(countriesData).map(([region, list]) => (
                            <optgroup key={region} label={regionLabels[region]}>
                              {list.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {selectedCountry && feesData && (
                          <p className="text-xs text-t-muted mt-1">
                            Fee: ${feesData[selectedCountry.region].flat.toFixed(2)} + {feesData[selectedCountry.region].percent}% · Delivery: {feesData[selectedCountry.region].deliveryDays}
                          </p>
                        )}
                      </div>

                      {form.country_code && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-t-secondary mb-1">Recipient Name</label>
                            <input
                              type="text"
                              value={form.to_account_name}
                              onChange={e => setForm({ ...form, to_account_name: e.target.value })}
                              placeholder="Full name on the destination account"
                              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-t-secondary mb-1">Recipient Bank</label>
                            {bankMode === 'select' && countryBanks.length > 0 ? (
                              <select
                                value={form.recipient_bank}
                                onChange={e => handleBankSelectChange(e.target.value)}
                                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                              >
                                <option value="">Select bank...</option>
                                {countryBanks.map(b => (
                                  <option key={b.name} value={b.name}>{b.name}{b.swift ? ` (${b.swift})` : ''}</option>
                                ))}
                                <option value="__custom__">+ Other bank (enter manually)</option>
                              </select>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={form.recipient_bank}
                                  onChange={e => { setForm({ ...form, recipient_bank: e.target.value }); setBicAutoFilled(false); }}
                                  onBlur={handleCustomBankBlur}
                                  placeholder="Bank name"
                                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                  required
                                />
                                {countryBanks.length > 0 && (
                                  <button type="button" onClick={() => { setBankMode('select'); setBicAutoFilled(false); setForm(f => ({ ...f, recipient_bank: '', swift_code: '' })); }}
                                    className="text-xs text-indigo-600 hover:underline">
                                    ← Pick from {countryBanks.length} known banks
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-t-secondary mb-1">Recipient Account / IBAN Number</label>
                            <input
                              type="text"
                              value={form.recipient_account}
                              onChange={e => setForm({ ...form, recipient_account: e.target.value })}
                              placeholder="Account number"
                              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                              required
                            />
                          </div>

                          {selectedCountry?.requiresSwift && (
                            <div>
                              <label className="block text-xs font-medium text-t-secondary mb-1">
                                SWIFT / BIC Code
                                {bicAutoFilled && <span className="ml-1 text-[10px] text-emerald-600 font-normal">· auto-filled</span>}
                              </label>
                              <input
                                type="text"
                                value={form.swift_code}
                                onChange={e => { setForm({ ...form, swift_code: e.target.value.toUpperCase() }); setBicAutoFilled(false); }}
                                placeholder="e.g. BARCGB22"
                                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono uppercase"
                                required
                              />
                            </div>
                          )}

                          {selectedCountry?.requiresIban && (
                            <div>
                              <label className="block text-xs font-medium text-t-secondary mb-1">IBAN</label>
                              <input
                                type="text"
                                value={form.iban}
                                onChange={e => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                                placeholder="e.g. GB29NWBK60161331926819"
                                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono uppercase"
                                required
                              />
                            </div>
                          )}

                          {selectedCountry?.requiresRouting && (
                            <div>
                              <label className="block text-xs font-medium text-t-secondary mb-1">Routing Number</label>
                              <input
                                type="text"
                                value={form.routing_number}
                                onChange={e => setForm({ ...form, routing_number: e.target.value })}
                                placeholder="9-digit routing number"
                                className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                                required
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="save-beneficiary-bank"
                              checked={form.save_beneficiary}
                              onChange={e => setForm({ ...form, save_beneficiary: e.target.checked })}
                              className="rounded border-b-input text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="save-beneficiary-bank" className="text-xs text-t-secondary">
                              Save as beneficiary for quick re-use
                            </label>
                          </div>
                          {form.save_beneficiary && (
                            <input
                              type="text"
                              value={form.beneficiary_nickname}
                              onChange={e => setForm({ ...form, beneficiary_nickname: e.target.value })}
                              placeholder="Nickname (optional)"
                              className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
                {form.transferMode === 'bank' && form.country_code && (
                  <div className="mt-2 p-3 bg-elevated border border-b-secondary rounded-lg text-xs space-y-1">
                    {quoting && <p className="text-t-muted">Fetching live rate...</p>}
                    {!quoting && quote && (
                      <>
                        <div className="flex justify-between"><span className="text-t-tertiary">Recipient gets</span><span className="font-semibold text-t-primary">{quote.currency} {quote.convertedAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-t-tertiary">Exchange rate</span><span className="text-t-secondary">1 USD = {quote.exchangeRate.toFixed(4)} {quote.currency}</span></div>
                        <div className="flex justify-between"><span className="text-t-tertiary">Fee</span><span className="text-t-secondary">{formatCurrency(quote.feeAmount)}</span></div>
                        <div className="flex justify-between border-t border-b-secondary pt-1 mt-1"><span className="text-t-tertiary">Total to debit</span><span className="font-semibold text-t-primary">{formatCurrency(quote.totalDeducted)}</span></div>
                        <div className="text-t-muted">Delivery: {quote.deliveryEstimate}</div>
                      </>
                    )}
                    {!quoting && !quote && form.amount && <p className="text-t-muted">Enter a valid amount to see the rate.</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="What's this for?"
                />
              </div>

              <button
                type="submit"
                disabled={loading || lockedForDebit}
                className="w-full py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Processing...' : lockedForDebit ? 'Account locked until maturity' : 'Review Transfer'}
              </button>
            </form>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          form={form}
          accounts={accounts}
          selectedAccount={selectedAccount}
          lookup={lookup}
          quote={quote}
          selectedCountry={selectedCountry}
          loading={loading}
          error={error}
          onCancel={() => setShowConfirm(false)}
          onConfirm={executeTransaction}
        />
      )}
    </div>
  );
}

function ConfirmModal({ form, accounts, selectedAccount, lookup, quote, selectedCountry, loading, error, onCancel, onConfirm }) {
  const amt = parseFloat(form.amount) || 0;

  let destName, destNumber, methodLabel, debit;
  if (form.transferMode === 'own') {
    const destAccount = accounts.find(a => a.id.toString() === form.to_account_id);
    destName = destAccount ? `${destAccount.account_type.charAt(0).toUpperCase() + destAccount.account_type.slice(1)} (****${destAccount.account_number.slice(-4)})` : '—';
    destNumber = destAccount?.account_number || '';
    methodLabel = 'Internal (own account)';
    debit = amt;
  } else if (form.transferMode === 'other') {
    destName = lookup.data?.account_name || form.to_account_name || 'Unknown';
    destNumber = form.to_account_number;
    methodLabel = 'Kapita account';
    debit = amt;
  } else {
    destName = form.to_account_name || 'Unknown';
    destNumber = form.recipient_account;
    methodLabel = `${selectedCountry?.flag || ''} ${form.recipient_bank} (${selectedCountry?.name})`.trim();
    debit = quote?.totalDeducted ?? amt;
  }

  const accentBg = 'bg-indigo-100';
  const accentText = 'text-indigo-600';
  const btnColor = 'bg-indigo-600 hover:bg-indigo-700';
  const projectedBalance = (selectedAccount?.balance || 0) - debit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-2xl shadow-2xl border border-b-primary w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-4 border-b border-b-secondary flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full ${accentBg} flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-t-primary">Confirm Transfer</h3>
            <p className="text-xs text-t-tertiary">Please review the details below before continuing</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="bg-elevated rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-t-tertiary">Amount</span>
              <span className={`text-2xl font-bold ${accentText}`}>{formatCurrency(amt)}</span>
            </div>
            <hr className="border-b-primary" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-t-tertiary">From</span>
                <span className="font-medium text-t-primary text-right">
                  {selectedAccount ? `${selectedAccount.account_type.charAt(0).toUpperCase() + selectedAccount.account_type.slice(1)} (****${selectedAccount.account_number.slice(-4)})` : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-t-tertiary">Recipient</span>
                <span className="font-semibold text-t-primary text-right">{destName}</span>
              </div>
              {destNumber && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">Account</span>
                  <span className="font-mono text-xs text-t-primary truncate max-w-[60%]">{destNumber}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-t-tertiary">Method</span>
                <span className="text-t-secondary text-right">{methodLabel}</span>
              </div>
              {form.transferMode === 'bank' && form.swift_code && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">SWIFT</span>
                  <span className="font-mono text-xs text-t-primary">{form.swift_code}</span>
                </div>
              )}
              {form.transferMode === 'bank' && form.iban && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">IBAN</span>
                  <span className="font-mono text-xs text-t-primary truncate max-w-[60%]">{form.iban}</span>
                </div>
              )}
              {form.transferMode === 'bank' && form.routing_number && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">Routing</span>
                  <span className="font-mono text-xs text-t-primary">{form.routing_number}</span>
                </div>
              )}
              {form.description && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">Note</span>
                  <span className="text-t-secondary text-right truncate max-w-[60%]">{form.description}</span>
                </div>
              )}
            </div>

            {form.transferMode === 'bank' && quote && (
              <>
                <hr className="border-b-primary" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-t-tertiary">Recipient gets</span><span className="font-semibold text-t-primary">{quote.currency} {quote.convertedAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Rate</span><span className="text-t-secondary">1 USD = {quote.exchangeRate.toFixed(4)} {quote.currency}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Fee</span><span className="text-t-secondary">{formatCurrency(quote.feeAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Total debit</span><span className="font-semibold text-t-primary">{formatCurrency(quote.totalDeducted)}</span></div>
                  <div className="flex justify-between"><span className="text-t-tertiary">Delivery</span><span className="text-t-secondary">{quote.deliveryEstimate}</span></div>
                </div>
              </>
            )}

            <hr className="border-b-primary" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-t-tertiary">Current balance</span>
                <span className="text-t-secondary">{formatCurrency(selectedAccount?.balance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-t-tertiary">Balance after</span>
                <span className={`font-semibold ${projectedBalance < 0 ? 'text-red-600' : 'text-t-primary'}`}>
                  {formatCurrency(projectedBalance)}
                </span>
              </div>
              {projectedBalance < 0 && (
                <p className="text-xs text-red-600 mt-1">Insufficient funds for this transaction.</p>
              )}
            </div>
          </div>

          {form.transferMode === 'other' && lookup.status === 'found' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              Verified recipient with Kapita. Once you confirm, the transfer is final and cannot be reversed.
            </div>
          )}
          {form.transferMode === 'bank' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Cross-bank transfers are final once confirmed. Double-check the SWIFT/IBAN/routing details — banks cannot reverse a wire after settlement.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-b-secondary flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 text-t-secondary bg-elevated rounded-lg hover:bg-hover font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading || projectedBalance < 0}
            className={`flex-1 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${btnColor}`}>
            {loading ? 'Processing...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
