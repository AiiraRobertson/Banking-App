import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts, lookupAccountByNumber } from '../services/accountService';
import { getTransactions, transfer } from '../services/transactionService';
import { saveBeneficiary } from '../services/beneficiaryService';
import BeneficiaryAutocomplete from '../components/BeneficiaryAutocomplete';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import { getMaturityInfo, formatMaturityDate } from '../utils/savingsLock';

const TRANSFER_FEE_RATE = 0.001;

export default function TransferPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [transferMode, setTransferMode] = useState('own');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [destinationAccountNumber, setDestinationAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [beneficiaryNickname, setBeneficiaryNickname] = useState('');
  const [saveRecipient, setSaveRecipient] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [lookup, setLookup] = useState({ status: 'idle', data: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [showRecentTransfers, setShowRecentTransfers] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [recentTransfersLoading, setRecentTransfersLoading] = useState(false);
  const [recentTransfersLoaded, setRecentTransfersLoaded] = useState(false);
  const [recentTransfersError, setRecentTransfersError] = useState('');

  useEffect(() => {
    getAccounts()
      .then(response => {
        const userAccounts = response.data.accounts;
        setAccounts(userAccounts);
        const preferred = userAccounts.find(account =>
          account.currency === 'USD' && account.balance > 0 && !getMaturityInfo(account).locked
        ) || userAccounts.find(account => !getMaturityInfo(account).locked);
        if (preferred) setAccountId(String(preferred.id));
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load your accounts.'))
      .finally(() => setLoading(false));
  }, []);

  const sourceAccount = accounts.find(account => String(account.id) === accountId);
  const sourceLock = getMaturityInfo(sourceAccount);
  const destinationAccount = accounts.find(account => String(account.id) === destinationAccountId);
  const compatibleOwnAccounts = accounts.filter(account =>
    account.id !== sourceAccount?.id && account.currency === sourceAccount?.currency
  );
  const feeAmount = Math.round((Number(amount) || 0) * TRANSFER_FEE_RATE * 100) / 100;
  const totalDeducted = Math.round(((Number(amount) || 0) + feeAmount) * 100) / 100;
  const projectedBalance = (sourceAccount?.balance || 0) - totalDeducted;
  const recipientCurrency = transferMode === 'own'
    ? destinationAccount?.currency
    : lookup.data?.currency;
  const currencyMismatch = transferMode === 'other'
    && lookup.status === 'found'
    && sourceAccount?.currency !== recipientCurrency;

  useEffect(() => {
    if (transferMode !== 'other' || !/^\d{10}$/.test(destinationAccountNumber.trim())) return undefined;
    const timer = setTimeout(() => {
      lookupAccountByNumber(destinationAccountNumber.trim())
        .then(response => {
          if (response.data.found) {
            setLookup({ status: 'found', data: response.data });
            setRecipientName(current => current || response.data.account_name);
          } else {
            setLookup({ status: 'not_found', data: null });
          }
        })
        .catch(() => setLookup({ status: 'error', data: null }));
    }, 350);
    return () => clearTimeout(timer);
  }, [destinationAccountNumber, transferMode]);

  const loadRecentTransfers = () => {
    if (recentTransfersLoaded || recentTransfersLoading) return;
    setRecentTransfersLoading(true);
    setRecentTransfersError('');
    getTransactions({ type: 'transfer', limit: 5, page: 1 })
      .then(response => {
        setRecentTransfers((response.data.transactions || [])
          .filter(transaction => transaction.transaction_type === 'transfer'
            && !transaction.description?.startsWith('Currency conversion:')));
        setRecentTransfersLoaded(true);
      })
      .catch(() => setRecentTransfersError('Could not load recent transfers. Please try again.'))
      .finally(() => setRecentTransfersLoading(false));
  };

  const handleRecentTransfersToggle = () => {
    const opening = !showRecentTransfers;
    setShowRecentTransfers(opening);
    if (opening) loadRecentTransfers();
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDestinationAccountId('');
    setDestinationAccountNumber('');
    setRecipientName('');
    setBeneficiaryNickname('');
    setLookup({ status: 'idle', data: null });
    setShowConfirm(false);
    setSuccess(null);
    setError('');
    setWarning('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!sourceAccount) {
      setError('Select a source account.');
      return;
    }
    if (sourceLock.locked) {
      setError(`This savings account is locked until ${formatMaturityDate(sourceLock.maturesAt)}.`);
      return;
    }
    if (transferMode === 'own') {
      if (!destinationAccount || destinationAccount.currency !== sourceAccount.currency) {
        setError('Choose a destination account with the same currency.');
        return;
      }
    } else {
      if (!/^\d{10}$/.test(destinationAccountNumber.trim())) {
        setError('Account number must be exactly 10 digits.');
        return;
      }
      if (lookup.status === 'loading') {
        setError('Verifying the recipient account. Please wait.');
        return;
      }
      if (lookup.status !== 'found') {
        setError('Enter a valid Kapita account number.');
        return;
      }
      if (currencyMismatch) {
        setError(`The recipient account uses ${recipientCurrency}; convert your funds or choose a ${sourceAccount.currency} account.`);
        return;
      }
    }
    if (totalDeducted > sourceAccount.balance) {
      setError(`Insufficient funds. This transfer needs ${formatCurrency(totalDeducted, sourceAccount.currency)} including the fee.`);
      return;
    }
    setShowConfirm(true);
  };

  const handleTransfer = async () => {
    setSubmitting(true);
    setError('');
    setWarning('');
    try {
      const payload = {
        from_account_id: Number(accountId),
        amount: Number(amount),
        description: description.trim() || 'Kapita transfer'
      };
      if (transferMode === 'own') payload.to_account_id = Number(destinationAccountId);
      else payload.to_account_number = destinationAccountNumber.trim();

      const response = await transfer(payload);
      const result = response.data;
      let saveWarning = '';
      if (transferMode === 'other' && saveRecipient && destinationAccountNumber) {
        try {
          await saveBeneficiary({
            nickname: beneficiaryNickname.trim() || undefined,
            account_name: recipientName || lookup.data?.account_name || `Account ${destinationAccountNumber}`,
            account_number: destinationAccountNumber,
            bank_name: 'Kapita',
            type: 'external'
          });
        } catch (saveError) {
          saveWarning = saveError.response?.data?.error || 'Transfer completed, but the recipient could not be saved.';
        }
      }
      setSuccess({
        message: result.message,
        referenceId: result.referenceId,
        newBalance: result.newBalance,
        feeAmount: result.feeAmount,
        totalDeducted: result.totalDeducted,
        currency: result.currency,
        recipientAmount: result.recipientAmount
      });
      setWarning(saveWarning);
      setShowConfirm(false);
      try {
        const refreshedAccounts = await getAccounts();
        setAccounts(refreshedAccounts.data.accounts);
      } catch {
        setWarning(current => current || 'Transfer completed, but refreshed balances could not be loaded.');
      }
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error
        || (Array.isArray(data?.errors) && data.errors.map(item => item.message).filter(Boolean).join('; '))
        || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecipientNumberChange = (value) => {
    setDestinationAccountNumber(value);
    setLookup(/^\d{10}$/.test(value.trim())
      ? { status: 'loading', data: null }
      : { status: 'idle', data: null });
    if (!/^\d{10}$/.test(value.trim())) setRecipientName('');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Transfer</h1>
        <p className="text-t-tertiary">Send money between matching-currency accounts or to an eligible Kapita user in Nigeria or Ghana.</p>
      </div>

      <Link to="/add-money" className="block rounded-lg border border-green-200 bg-green-50 px-4 py-3 transition-colors hover:bg-green-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-green-900">Need to add funds?</p>
            <p className="text-xs text-green-800">View the available USD funding methods.</p>
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-green-700">Add Money &rarr;</span>
        </div>
      </Link>

      <section className="overflow-hidden rounded-xl border border-b-secondary bg-surface">
        <button
          type="button"
          onClick={handleRecentTransfersToggle}
          aria-expanded={showRecentTransfers}
          aria-controls="recent-transfer-history"
          className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        >
          <span>
            <span className="block text-sm font-semibold text-t-primary">Recent Transfers</span>
            <span className="mt-0.5 block text-xs text-t-tertiary">View your latest transfer transactions</span>
          </span>
          <svg className={`h-5 w-5 text-t-tertiary transition-transform ${showRecentTransfers ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showRecentTransfers && (
          <div id="recent-transfer-history" className="border-t border-b-secondary">
            {recentTransfersLoading ? (
              <p role="status" className="p-4 text-sm text-t-tertiary">Loading recent transfers…</p>
            ) : recentTransfersError ? (
              <p role="alert" className="p-4 text-sm text-red-700">{recentTransfersError}</p>
            ) : recentTransfers.length === 0 ? (
              <p className="p-4 text-sm text-t-tertiary">No transfer transactions found.</p>
            ) : (
              <ul className="divide-y divide-b-secondary">
                {recentTransfers.map(transaction => {
                  const outgoing = accounts.some(account => account.id === transaction.from_account_id);
                  const currency = outgoing
                    ? (transaction.from_currency || transaction.currency)
                    : (transaction.to_currency || transaction.currency);
                  const value = outgoing
                    ? transaction.amount + (transaction.fee_amount || 0)
                    : (transaction.destination_amount ?? transaction.amount);
                  return (
                    <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-t-primary">{transaction.description || 'Transfer'}</p>
                        <p className="mt-1 text-xs text-t-tertiary">
                          {formatDateTime(transaction.created_at)}
                          {transaction.from_account_number && transaction.to_account_number
                            ? ` · ${transaction.from_account_number} → ${transaction.to_account_number}` : ''}
                        </p>
                      </div>
                      <span className={`whitespace-nowrap text-sm font-semibold ${outgoing ? 'text-red-600' : 'text-green-600'}`}>
                        {outgoing ? '-' : '+'}{formatCurrency(value, currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {error && !showConfirm && !success && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-b-secondary bg-surface p-6">
        {success ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">{success.message}</h2>
            <p className="text-sm text-t-tertiary">Reference: {success.referenceId}</p>
            <div className="space-y-1 text-sm text-t-tertiary">
              <p>Transfer amount: {formatCurrency(success.recipientAmount, success.currency)}</p>
              <p>Fee: {formatCurrency(success.feeAmount, success.currency)} · Total debited: {formatCurrency(success.totalDeducted, success.currency)}</p>
              <p>New balance: {formatCurrency(success.newBalance, success.currency)}</p>
            </div>
            {warning && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>}
            <button type="button" onClick={resetForm} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">New Transfer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div>
              <label htmlFor="source-account" className="mb-1 block text-sm font-medium text-t-secondary">From Account</label>
              <select
                id="source-account"
                value={accountId}
                onChange={event => {
                  const nextAccount = accounts.find(account => String(account.id) === event.target.value);
                  setAccountId(event.target.value);
                  if (destinationAccount && destinationAccount.currency !== nextAccount?.currency) setDestinationAccountId('');
                }}
                required
                className="w-full rounded-lg border border-b-input px-3 py-2"
              >
                {accounts.map(account => {
                  const lock = getMaturityInfo(account);
                  return (
                    <option key={account.id} value={account.id} disabled={lock.locked}>
                      {account.currency} {account.account_type} (****{account.account_number.slice(-4)}) · {formatCurrency(account.balance, account.currency)}{lock.locked ? ' · Locked' : ''}
                    </option>
                  );
                })}
              </select>
              {sourceAccount && <p className="mt-1 text-xs text-t-muted">Available: {formatCurrency(sourceAccount.balance, sourceAccount.currency)}</p>}
              {sourceLock.isSavings && sourceLock.locked && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  This savings account is locked for {sourceLock.daysRemaining} more day{sourceLock.daysRemaining === 1 ? '' : 's'} (matures {formatMaturityDate(sourceLock.maturesAt)}).
                </div>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-t-secondary">Transfer To</legend>
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setTransferMode('own')} aria-pressed={transferMode === 'own'}
                  className={`rounded-full px-3 py-1 text-xs ${transferMode === 'own' ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary'}`}>
                  My Account
                </button>
                <button type="button" onClick={() => setTransferMode('other')} aria-pressed={transferMode === 'other'}
                  className={`rounded-full px-3 py-1 text-xs ${transferMode === 'other' ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary'}`}>
                  Kapita User
                </button>
              </div>

              {transferMode === 'own' ? (
                <select value={destinationAccountId} onChange={event => setDestinationAccountId(event.target.value)} required
                  className="w-full rounded-lg border border-b-input px-3 py-2">
                  <option value="">Select same-currency destination account</option>
                  {compatibleOwnAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.currency} {account.account_type} (****{account.account_number.slice(-4)}) · {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <BeneficiaryAutocomplete
                    value={destinationAccountNumber}
                    onChange={handleRecipientNumberChange}
                    onSelect={beneficiary => {
                      handleRecipientNumberChange(beneficiary.account_number);
                      setRecipientName(beneficiary.account_name);
                      setBeneficiaryNickname(beneficiary.nickname || '');
                    }}
                    type="external"
                    placeholder="Kapita account number, name, or nickname"
                    required
                  />
                  {lookup.status === 'loading' && <p role="status" className="text-xs text-t-muted">Verifying Kapita account…</p>}
                  {lookup.status === 'found' && lookup.data && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-green-800">{lookup.data.account_name}</p>
                      <p className="text-xs text-green-700">{lookup.data.bank_name} · {lookup.data.currency} {lookup.data.account_type} · ****{lookup.data.account_number.slice(-4)}</p>
                    </div>
                  )}
                  {lookup.status === 'not_found' && <p role="alert" className="text-xs text-red-600">No active Kapita account found with this number.</p>}
                  {lookup.status === 'error' && <p role="alert" className="text-xs text-red-600">Could not verify that account. Please try again.</p>}
                  {currencyMismatch && <p role="alert" className="text-xs text-amber-800">Recipient uses {recipientCurrency}; transfers must match currencies. Convert funds first.</p>}
                  <label className="flex items-center gap-2 pt-1 text-xs text-t-secondary">
                    <input type="checkbox" checked={saveRecipient} onChange={event => setSaveRecipient(event.target.checked)} className="rounded border-b-input text-indigo-600 focus:ring-indigo-500" />
                    Save recipient as a beneficiary
                  </label>
                  {saveRecipient && (
                    <input type="text" value={beneficiaryNickname} onChange={event => setBeneficiaryNickname(event.target.value)}
                      placeholder="Beneficiary nickname (optional)" className="w-full rounded-lg border border-b-input px-3 py-2 text-sm" />
                  )}
                </div>
              )}
            </fieldset>

            <div>
              <label htmlFor="transfer-amount" className="mb-1 block text-sm font-medium text-t-secondary">Amount ({sourceAccount?.currency || 'account currency'})</label>
              <input id="transfer-amount" type="number" min="0.01" max="1000000" step="0.01" value={amount}
                onChange={event => setAmount(event.target.value)} required className="w-full rounded-lg border border-b-input px-3 py-2" placeholder="0.00" />
            </div>

            <div>
              <label htmlFor="transfer-description" className="mb-1 block text-sm font-medium text-t-secondary">Description (optional)</label>
              <input id="transfer-description" type="text" maxLength="120" value={description}
                onChange={event => setDescription(event.target.value)} className="w-full rounded-lg border border-b-input px-3 py-2" placeholder="What's this for?" />
            </div>

            {amount && (
              <div className="rounded-lg bg-elevated p-3 text-sm">
                <div className="flex justify-between"><span className="text-t-tertiary">Transfer fee (0.1%)</span><span>{formatCurrency(feeAmount, sourceAccount?.currency)}</span></div>
                <div className="mt-1 flex justify-between border-t border-b-secondary pt-2 font-semibold"><span>Total debited</span><span>{formatCurrency(totalDeducted, sourceAccount?.currency)}</span></div>
              </div>
            )}

            <button type="submit" disabled={submitting || !sourceAccount || sourceLock.locked}
              className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              Review Transfer
            </button>
          </form>
        )}
      </section>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="confirm-transfer-title" className="w-full max-w-md space-y-4 rounded-2xl border border-b-primary bg-surface p-6 shadow-2xl">
            <div>
              <h2 id="confirm-transfer-title" className="text-lg font-semibold text-t-primary">Confirm Transfer</h2>
              <p className="mt-1 text-sm text-t-tertiary">Review the amount and fee before submitting.</p>
            </div>
            <dl className="space-y-2 rounded-xl bg-elevated p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-t-tertiary">From</dt><dd className="text-right">{sourceAccount?.currency} {sourceAccount?.account_type} · ****{sourceAccount?.account_number.slice(-4)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-t-tertiary">To</dt><dd className="text-right">{transferMode === 'own'
                ? `${destinationAccount?.currency} ${destinationAccount?.account_type} · ****${destinationAccount?.account_number.slice(-4)}`
                : (lookup.data?.account_name || recipientName || destinationAccountNumber)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-t-tertiary">Amount</dt><dd>{formatCurrency(Number(amount), sourceAccount?.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-t-tertiary">Fee (0.1%)</dt><dd>{formatCurrency(feeAmount, sourceAccount?.currency)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-b-secondary pt-2 font-semibold"><dt>Total debit</dt><dd>{formatCurrency(totalDeducted, sourceAccount?.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-t-tertiary">Balance after</dt><dd>{formatCurrency(projectedBalance, sourceAccount?.currency)}</dd></div>
            </dl>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} disabled={submitting} className="flex-1 rounded-lg bg-elevated px-4 py-2.5 font-medium text-t-secondary hover:bg-hover">Back</button>
              <button type="button" onClick={handleTransfer} disabled={submitting || projectedBalance < 0} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Sending…' : 'Confirm Transfer'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
