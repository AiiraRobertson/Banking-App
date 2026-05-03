import { useState, useEffect } from 'react';
import { getAccounts, lookupAccountByNumber } from '../services/accountService';
import { deposit, withdraw, transfer } from '../services/transactionService';
import { saveBeneficiary } from '../services/beneficiaryService';
import { formatCurrency } from '../utils/formatCurrency';
import BeneficiaryAutocomplete from '../components/BeneficiaryAutocomplete';

const tabs = ['Deposit', 'Withdraw', 'Transfer'];

export default function TransferPage() {
  const [activeTab, setActiveTab] = useState('Deposit');
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_id: '', to_account_id: '', to_account_number: '', to_account_name: '', amount: '', description: '', transferMode: 'own', save_beneficiary: true, beneficiary_nickname: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState({ status: 'idle', data: null });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getAccounts().then(res => {
      setAccounts(res.data.accounts);
      if (res.data.accounts.length > 0) setForm(f => ({ ...f, account_id: res.data.accounts[0].id.toString() }));
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'Transfer' || form.transferMode !== 'other') {
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
  }, [form.to_account_number, form.transferMode, activeTab]);

  const reset = () => {
    setForm(f => ({ ...f, amount: '', description: '', to_account_id: '', to_account_number: '', to_account_name: '', beneficiary_nickname: '' }));
    setSuccess(null);
    setError('');
    setLookup({ status: 'idle', data: null });
    setShowConfirm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }

    if (activeTab === 'Transfer') {
      if (form.transferMode === 'own') {
        const toId = parseInt(form.to_account_id);
        if (!toId || isNaN(toId)) { setError('Please select a destination account'); return; }
      } else {
        const acct = (form.to_account_number || '').trim();
        if (!/^\d{10}$/.test(acct)) { setError('Account number must be exactly 10 digits'); return; }
        if (lookup.status === 'not_found') { setError('Destination account does not exist'); return; }
        if (lookup.status === 'loading') { setError('Verifying account, please wait...'); return; }
      }
    }
    setShowConfirm(true);
  };

  const executeTransaction = async () => {
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      let res;
      const amt = parseFloat(form.amount);
      if (activeTab === 'Deposit') {
        res = await deposit({ account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Deposit' });
      } else if (activeTab === 'Withdraw') {
        res = await withdraw({ account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Withdrawal' });
      } else {
        const payload = { from_account_id: parseInt(form.account_id), amount: amt, description: form.description || 'Transfer' };
        if (form.transferMode === 'own') {
          payload.to_account_id = parseInt(form.to_account_id);
        } else {
          payload.to_account_number = form.to_account_number.trim();
        }
        res = await transfer(payload);
      }
      setShowConfirm(false);
      setSuccess({ message: res.data.message, referenceId: res.data.referenceId, newBalance: res.data.newBalance });
      getAccounts().then(r => setAccounts(r.data.accounts));

      if (activeTab === 'Transfer' && form.transferMode === 'other' && form.save_beneficiary && form.to_account_number) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Transactions</h1>
        <p className="text-t-tertiary">Deposit, withdraw, or transfer funds</p>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary">
        <div className="flex border-b border-b-primary">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); reset(); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-t-tertiary hover:text-t-secondary'}`}
            >
              {tab}
            </button>
          ))}
        </div>

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
              <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                New Transaction
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">
                  {activeTab === 'Transfer' ? 'From Account' : 'Account'}
                </label>
                <select
                  value={form.account_id}
                  onChange={e => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_type.charAt(0).toUpperCase() + a.account_type.slice(1)} (****{a.account_number.slice(-4)}) - {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
                {selectedAccount && <p className="text-xs text-t-muted mt-1">Available: {formatCurrency(selectedAccount.balance)}</p>}
              </div>

              {activeTab === 'Transfer' && (
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">Transfer To</label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'own' })}
                      className={`px-3 py-1 text-xs rounded-full ${form.transferMode === 'own' ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary'}`}>
                      My Account
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, transferMode: 'other' })}
                      className={`px-3 py-1 text-xs rounded-full ${form.transferMode === 'other' ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary'}`}>
                      Other Account
                    </button>
                  </div>
                  {form.transferMode === 'own' ? (
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
                  ) : (
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
                </div>
              )}

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
                disabled={loading}
                className={`w-full py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  activeTab === 'Deposit' ? 'bg-green-600 hover:bg-green-700' :
                  activeTab === 'Withdraw' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Processing...' : `Review ${activeTab}`}
              </button>
            </form>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          activeTab={activeTab}
          form={form}
          accounts={accounts}
          selectedAccount={selectedAccount}
          lookup={lookup}
          loading={loading}
          error={error}
          onCancel={() => setShowConfirm(false)}
          onConfirm={executeTransaction}
        />
      )}
    </div>
  );
}

function ConfirmModal({ activeTab, form, accounts, selectedAccount, lookup, loading, error, onCancel, onConfirm }) {
  const amt = parseFloat(form.amount) || 0;
  const destAccount = form.transferMode === 'own'
    ? accounts.find(a => a.id.toString() === form.to_account_id)
    : null;
  const destName = form.transferMode === 'own'
    ? (destAccount ? `${destAccount.account_type.charAt(0).toUpperCase() + destAccount.account_type.slice(1)} (****${destAccount.account_number.slice(-4)})` : '—')
    : (lookup.data?.account_name || form.to_account_name || 'Unknown');
  const destNumber = form.transferMode === 'own'
    ? (destAccount?.account_number || '')
    : form.to_account_number;

  const accentBg = activeTab === 'Deposit' ? 'bg-green-100' : activeTab === 'Withdraw' ? 'bg-red-100' : 'bg-indigo-100';
  const accentText = activeTab === 'Deposit' ? 'text-green-600' : activeTab === 'Withdraw' ? 'text-red-600' : 'text-indigo-600';
  const btnColor = activeTab === 'Deposit' ? 'bg-green-600 hover:bg-green-700'
    : activeTab === 'Withdraw' ? 'bg-red-600 hover:bg-red-700'
    : 'bg-indigo-600 hover:bg-indigo-700';
  const projectedBalance = activeTab === 'Deposit'
    ? (selectedAccount?.balance || 0) + amt
    : (selectedAccount?.balance || 0) - amt;

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
            <h3 className="text-lg font-semibold text-t-primary">Confirm {activeTab}</h3>
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
                <span className="text-t-tertiary">{activeTab === 'Deposit' ? 'To' : 'From'}</span>
                <span className="font-medium text-t-primary text-right">
                  {selectedAccount ? `${selectedAccount.account_type.charAt(0).toUpperCase() + selectedAccount.account_type.slice(1)} (****${selectedAccount.account_number.slice(-4)})` : '—'}
                </span>
              </div>
              {activeTab === 'Transfer' && (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-t-tertiary">Recipient</span>
                    <span className="font-semibold text-t-primary text-right">{destName}</span>
                  </div>
                  {destNumber && (
                    <div className="flex justify-between gap-3">
                      <span className="text-t-tertiary">Account</span>
                      <span className="font-mono text-xs text-t-primary">{destNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-t-tertiary">Method</span>
                    <span className="text-t-secondary">{form.transferMode === 'own' ? 'Internal (own account)' : 'Kapita account'}</span>
                  </div>
                </>
              )}
              {form.description && (
                <div className="flex justify-between gap-3">
                  <span className="text-t-tertiary">Note</span>
                  <span className="text-t-secondary text-right truncate max-w-[60%]">{form.description}</span>
                </div>
              )}
            </div>
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
              {activeTab !== 'Deposit' && projectedBalance < 0 && (
                <p className="text-xs text-red-600 mt-1">Insufficient funds for this transaction.</p>
              )}
            </div>
          </div>

          {activeTab === 'Transfer' && form.transferMode === 'other' && lookup.status === 'found' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              Verified recipient with Kapita. Once you confirm, the transfer is final and cannot be reversed.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-b-secondary flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 text-t-secondary bg-elevated rounded-lg hover:bg-hover font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading || (activeTab !== 'Deposit' && projectedBalance < 0)}
            className={`flex-1 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${btnColor}`}>
            {loading ? 'Processing...' : `Confirm ${activeTab}`}
          </button>
        </div>
      </div>
    </div>
  );
}
