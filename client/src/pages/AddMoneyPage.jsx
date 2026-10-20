import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';

export default function AddMoneyPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    getAccounts()
      .then(response => {
        const ownAccounts = response.data.accounts || [];
        setAccounts(ownAccounts);
        setSelectedAccountId(ownAccounts[0]?.id?.toString() || '');
      })
      .catch(() => setError('We could not load your account details. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedAccount = accounts.find(account => account.id.toString() === selectedAccountId);
  const accountName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  const copyValue = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
    } catch {
      setCopyStatus('Copy failed. Select and copy the value manually.');
    }
    window.setTimeout(() => setCopyStatus(''), 2500);
  };

  if (loading) {
    return <div className="flex justify-center py-20" role="status" aria-label="Loading account details"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d9e8dc] border-t-[#17643d]" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#368052]">Receive funds</p>
        <h1 className="font-display text-2xl font-bold text-t-primary sm:text-3xl">Add Money</h1>
        <p className="mt-1 text-sm text-t-tertiary">Share your Kapita account details to receive an internal transfer.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {accounts.length === 0 ? (
        <section className="rounded-xl border border-b-secondary bg-surface p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-t-primary">No receiving account yet</h2>
          <p className="mt-2 text-sm text-t-tertiary">Create a Kapita account first. Account numbers are assigned by the account provisioning flow.</p>
          <Link to="/accounts" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[#17643d] px-4 text-sm font-semibold text-white hover:bg-[#125332]">Go to accounts</Link>
        </section>
      ) : (
        <>
          {accounts.length > 1 && (
            <div>
              <label htmlFor="receiving-account" className="mb-2 block text-sm font-semibold text-t-secondary">Receive into</label>
              <select id="receiving-account" value={selectedAccountId} onChange={event => setSelectedAccountId(event.target.value)} className="w-full rounded-lg border border-b-input bg-surface px-3 py-2.5 text-sm text-t-primary focus:border-[#368052] focus:outline-none focus:ring-2 focus:ring-[#368052]/20">
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.account_type} · •••• {account.account_number.slice(-4)}</option>
                ))}
              </select>
            </div>
          )}

          {selectedAccount && (
            <section className="overflow-hidden rounded-xl border border-b-secondary bg-surface">
              <div className="border-b border-b-secondary bg-elevated px-5 py-4 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-t-tertiary">Kapita internal account</p>
                <h2 className="mt-1 font-display text-lg font-bold capitalize text-t-primary">{selectedAccount.account_type} account</h2>
              </div>
              <dl className="divide-y divide-b-secondary px-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <dt className="text-sm text-t-tertiary">Account name</dt>
                  <dd className="flex items-center gap-2 text-sm font-semibold text-t-primary">
                    {accountName || 'Name unavailable'}
                    {accountName && <button type="button" onClick={() => copyValue(accountName, 'Account name')} aria-label="Copy account name" title="Copy account name" className="rounded-md p-2 text-t-tertiary hover:bg-hover hover:text-t-primary"><CopyIcon /></button>}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <dt className="text-sm text-t-tertiary">Bank</dt>
                  <dd className="text-sm font-semibold text-t-primary">Kapita (simulated)</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <dt className="text-sm text-t-tertiary">Account number</dt>
                  <dd className="flex items-center gap-2 font-mono text-base font-bold tabular text-t-primary">
                    {selectedAccount.account_number}
                    <button type="button" onClick={() => copyValue(selectedAccount.account_number, 'Account number')} aria-label="Copy account number" title="Copy account number" className="rounded-md p-2 text-[#17643d] hover:bg-[#e7f1e8]"><CopyIcon /></button>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <dt className="text-sm text-t-tertiary">Currency</dt>
                  <dd className="text-sm font-semibold text-t-primary">USD</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <dt className="text-sm text-t-tertiary">Current balance</dt>
                  <dd className="text-sm font-semibold tabular text-t-primary">{formatCurrency(selectedAccount.balance)}</dd>
                </div>
              </dl>
              <div className="border-t border-b-secondary px-5 py-4 sm:px-6">
                <button type="button" onClick={() => copyValue(selectedAccount.account_number, 'Account number')} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#17643d] px-5 text-sm font-semibold text-white hover:bg-[#125332] sm:w-auto">
                  <CopyIcon /> Copy account number
                </button>
                {copyStatus && <p role="status" className={`mt-2 text-sm ${copyStatus.includes('failed') ? 'text-red-700' : 'text-[#17643d]'}`}>{copyStatus}</p>}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[#e6d9b5] bg-[#fbf7ec] p-5 sm:p-6">
            <h2 className="text-sm font-bold text-[#584b2c]">Receiving transfers</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#655a42]">
              <li>Copy your account number.</li>
              <li>For another Kapita user, ask them to choose “Other Account” in Transfer and enter this number.</li>
              <li>Review the incoming transfer in your transaction history after it is processed.</li>
            </ol>
            <p className="mt-4 border-t border-[#e6d9b5] pt-4 text-sm font-medium text-[#584b2c]">External bank transfers are not available. This app has no configured interbank payout, virtual account, or verified incoming-payment provider. These details are for internal Kapita transfers only; do not use them to send real money.</p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link to="/transactions" className="inline-flex min-h-10 items-center rounded-lg border border-b-input bg-surface px-4 text-sm font-semibold text-t-secondary hover:bg-hover">View transactions</Link>
            <Link to="/accounts" className="inline-flex min-h-10 items-center rounded-lg border border-b-input bg-surface px-4 text-sm font-semibold text-t-secondary hover:bg-hover">Manage accounts</Link>
          </div>
        </>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 8V5.5A1.5 1.5 0 019.5 4h9A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H16M5.5 8h9A1.5 1.5 0 0116 9.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 18.5v-9A1.5 1.5 0 015.5 8z" />
    </svg>
  );
}
