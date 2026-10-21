import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccounts } from '../services/accountService';
import {
  createFundingQuote,
  getFundingPayments,
  getFundingMethods,
  getFundingPayment,
  startFunding,
  verifyFunding,
} from '../services/fundingService';
import { formatCurrency } from '../utils/formatCurrency';

export default function AddMoneyPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fundingMethods, setFundingMethods] = useState(null);
  const [fundingStatusError, setFundingStatusError] = useState('');
  const [fundingMethod, setFundingMethod] = useState('card');
  const [fundingCurrency, setFundingCurrency] = useState('NGN');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingError, setFundingError] = useState('');
  const [fundingBusy, setFundingBusy] = useState(false);
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState(null);
  const [fundingHistory, setFundingHistory] = useState([]);

  useEffect(() => {
    Promise.all([
      getAccounts(),
      getFundingMethods().catch(() => {
        setFundingStatusError('We could not confirm external payment availability. Funding methods remain disabled until their provider status can be checked.');
        return null;
      }),
      getFundingPayments().catch(() => {
        setFundingStatusError('We could not load recent funding requests. Try again before starting another payment.');
        return null;
      }),
    ])
      .then(([response, methodsResponse, paymentResponse]) => {
        const ownAccounts = response.data.accounts || [];
        setAccounts(ownAccounts);
        setSelectedAccountId(ownAccounts[0]?.id?.toString() || '');
        if (methodsResponse) {
          const fundingConfig = methodsResponse.data;
          setFundingMethods(fundingConfig);
          const initialMethod = fundingConfig.methods.card ? 'card' : 'bank_transfer';
          const currencies = initialMethod === 'card'
            ? fundingConfig.cardCurrencies
            : fundingConfig.bankTransferCurrencies;
          setFundingMethod(initialMethod);
          if (currencies?.length) setFundingCurrency(currencies[0]);
        }
        if (paymentResponse) {
          const payments = paymentResponse.data.payments || [];
          setFundingHistory(payments);
          setPayment(payments.find(item => item.status === 'pending') || payments[0] || null);
        }
      })
      .catch(() => setError('We could not load your account details. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref');
    const transactionId = params.get('transaction_id');
    if (!txRef || !transactionId) return;

    verifyFunding({ tx_ref: txRef, transaction_id: transactionId })
      .then(response => {
        setPayment(response.data.payment);
        getFundingPayments()
          .then(paymentsResponse => setFundingHistory(paymentsResponse.data.payments || []))
          .catch(() => setFundingStatusError('Payment status was verified, but recent funding history could not be refreshed.'));
        if (response.data.payment.status === 'completed') {
          return getAccounts()
            .then(accountsResponse => setAccounts(accountsResponse.data.accounts || []))
            .catch(() => setFundingError('Payment was verified, but the account balance could not be refreshed. Reload the page to see the updated balance.'));
        }
        return undefined;
      })
      .catch(error => {
        setFundingError(error.response?.data?.error || 'We could not verify this payment. Check the funding status again shortly.');
      })
      .finally(() => window.history.replaceState({}, '', window.location.pathname));
  }, []);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return undefined;
    const timer = window.setInterval(() => {
      getFundingPayment(payment.reference)
        .then(response => {
          const refreshed = response.data.payment;
          setPayment(refreshed);
          getFundingPayments()
            .then(paymentsResponse => setFundingHistory(paymentsResponse.data.payments || []))
            .catch(() => setFundingStatusError('Payment status was checked, but recent funding history could not be refreshed.'));
          if (refreshed.status === 'completed') {
            getAccounts()
              .then(accountsResponse => setAccounts(accountsResponse.data.accounts || []))
              .catch(() => setFundingError('Payment was verified, but the account balance could not be refreshed. Reload the page to see the updated balance.'));
          }
        })
        .catch(() => setFundingError('We could not refresh the transfer status. Try again shortly.'));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [payment]);

  const selectedAccount = accounts.find(account => account.id.toString() === selectedAccountId);
  const accountName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const methods = fundingMethods?.methods || {};
  const methodCurrencies = fundingMethod === 'card'
    ? fundingMethods?.cardCurrencies || []
    : fundingMethods?.bankTransferCurrencies || [];

  const chooseFundingMethod = (method) => {
    setFundingMethod(method);
    setQuote(null);
    const currencies = method === 'card'
      ? fundingMethods?.cardCurrencies || []
      : fundingMethods?.bankTransferCurrencies || [];
    if (!currencies.includes(fundingCurrency) && currencies.length) {
      setFundingCurrency(currencies[0]);
    }
  };

  const requestFundingQuote = async (event) => {
    event.preventDefault();
    setFundingError('');
    setFundingBusy(true);
    try {
      const quoteResponse = await createFundingQuote({
        account_id: Number(selectedAccountId),
        amount: Number(fundingAmount),
        currency: fundingCurrency,
        method: fundingMethod,
      });
      setQuote(quoteResponse.data);
    } catch (requestError) {
      setFundingError(requestError.response?.data?.error || 'We could not quote this amount. Please try again.');
    } finally {
      setFundingBusy(false);
    }
  };

  const startFundingPayment = async () => {
    if (!quote) return;
    setFundingError('');
    setPayment(null);
    setFundingBusy(true);
    try {
      const response = await startFunding({
        quote_id: quote.quoteId,
        method: fundingMethod,
      }, crypto.randomUUID());
      const nextPayment = response.data.payment;
      setPayment(nextPayment);
      getFundingPayments()
        .then(paymentsResponse => setFundingHistory(paymentsResponse.data.payments || []))
        .catch(() => setFundingStatusError('Payment was started, but recent funding history could not be refreshed.'));
      if (fundingMethod === 'card' && nextPayment.checkoutUrl) {
        window.location.assign(nextPayment.checkoutUrl);
      }
    } catch (requestError) {
      if (requestError.response?.data?.payment) setPayment(requestError.response.data.payment);
      setFundingError(requestError.response?.data?.error || 'We could not start this funding request. Please try again.');
    } finally {
      setFundingBusy(false);
    }
  };

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
        <p className="mt-1 text-sm text-t-tertiary">Use the provider sandbox to test card and local bank funding. Sandbox payments do not move real money.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {fundingStatusError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{fundingStatusError}</div>}

      <section aria-labelledby="funding-methods-heading" className="space-y-3">
        <div>
          <h2 id="funding-methods-heading" className="text-base font-bold text-t-primary">Funding methods</h2>
          <p className="mt-1 text-sm text-t-tertiary">Only verified, configured methods can be used to add funds.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FundingMethod
            name="Kapita internal transfer"
            status="Available"
            available
            description="Receive a transfer from another Kapita account using your account number."
          />
          <FundingMethod
            name="Debit or credit card"
            status={methods.card ? 'Sandbox available' : 'Unavailable'}
            available={methods.card}
            description={methods.card
              ? 'Continue to Flutterwave-hosted checkout. Card details are handled by the payment provider.'
              : 'Requires approved sandbox credentials, provider approval, a verified webhook, and explicit currency enablement.'}
          />
          <FundingMethod
            name="Gift cards"
            status="Unavailable"
            description="No authorized gift-card redemption provider is configured."
          />
          <FundingMethod
            name="Cryptocurrency"
            status="Unavailable"
            description="No crypto provider is configured. This integration is intentionally left as a provider-ready extension point; no wallet address or deposit is simulated."
          />
          <FundingMethod
            name="Bank transfer (Nigeria and Ghana)"
            status={methods.bankTransfer ? 'Sandbox available' : 'Unavailable'}
            available={methods.bankTransfer}
            description={methods.bankTransfer
              ? 'Flutterwave supplies a temporary receiving account for supported local NGN/GHS transfer flows.'
              : 'Requires approved sandbox credentials, provider approval, a verified webhook, and explicit currency enablement.'}
          />
        </div>
      </section>

      {accounts.length > 0 && (methods.card || methods.bankTransfer) && (
        <section className="space-y-4 rounded-xl border border-b-secondary bg-surface p-5 sm:p-6" aria-labelledby="external-funding-heading">
          <div>
            <h2 id="external-funding-heading" className="font-display text-lg font-bold text-t-primary">Add funds in the sandbox</h2>
            <p className="mt-1 text-sm text-t-tertiary">Choose NGN or GHS. The USD credit is calculated from a fresh live exchange-rate quote and fixed for this payment attempt.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Funding method">
            {methods.card && (
              <button type="button" aria-pressed={fundingMethod === 'card'} onClick={() => chooseFundingMethod('card')} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${fundingMethod === 'card' ? 'border-[#368052] bg-[#e7f1e8] text-[#17643d]' : 'border-b-input text-t-secondary hover:bg-hover'}`}>
                Card
              </button>
            )}
            {methods.bankTransfer && (
              <button type="button" aria-pressed={fundingMethod === 'bank_transfer'} onClick={() => chooseFundingMethod('bank_transfer')} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${fundingMethod === 'bank_transfer' ? 'border-[#368052] bg-[#e7f1e8] text-[#17643d]' : 'border-b-input text-t-secondary hover:bg-hover'}`}>
                Local bank transfer
              </button>
            )}
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={quote ? startFundingPayment : requestFundingQuote}>
            {accounts.length > 1 && (
              <div className="sm:col-span-2">
                <label htmlFor="funding-account" className="mb-2 block text-sm font-semibold text-t-secondary">Credit account</label>
                <select id="funding-account" value={selectedAccountId} onChange={event => { setSelectedAccountId(event.target.value); setQuote(null); }} required className="w-full rounded-lg border border-b-input bg-surface px-3 py-2.5 text-sm text-t-primary">
                  {accounts.map(account => <option key={account.id} value={account.id}>{account.account_type} · •••• {account.account_number.slice(-4)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="funding-amount" className="mb-2 block text-sm font-semibold text-t-secondary">Amount to pay</label>
              <input id="funding-amount" type="number" min="0.01" max="1000000" step="0.01" required value={fundingAmount} onChange={event => { setFundingAmount(event.target.value); setQuote(null); }} className="w-full rounded-lg border border-b-input bg-surface px-3 py-2.5 text-sm text-t-primary" />
            </div>
            <div>
              <label htmlFor="funding-currency" className="mb-2 block text-sm font-semibold text-t-secondary">Payment currency</label>
              <select id="funding-currency" value={fundingCurrency} onChange={event => { setFundingCurrency(event.target.value); setQuote(null); }} className="w-full rounded-lg border border-b-input bg-surface px-3 py-2.5 text-sm text-t-primary">
                {methodCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency === 'NGN' ? 'Nigeria — NGN' : 'Ghana — GHS'}</option>
                ))}
              </select>
            </div>
            {quote && (
              <div className="sm:col-span-2 rounded-lg border border-[#d9e8dc] bg-[#f4f8f4] p-4 text-sm text-t-secondary" aria-live="polite">
                <h3 className="font-semibold text-t-primary">Review your funding quote</h3>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><dt className="text-xs text-t-tertiary">You pay</dt><dd className="font-semibold">{quote.sourceAmount.toFixed(2)} {quote.sourceCurrency}</dd></div>
                  <div><dt className="text-xs text-t-tertiary">Estimated USD credit</dt><dd className="font-semibold">${quote.usdAmount.toFixed(2)} USD</dd></div>
                  <div><dt className="text-xs text-t-tertiary">Exchange rate</dt><dd className="font-semibold">1 USD = {(1 / quote.usdPerSourceUnit).toFixed(4)} {quote.sourceCurrency}</dd></div>
                  <div><dt className="text-xs text-t-tertiary">Quote expires</dt><dd className="font-semibold">{new Date(quote.expiresAt).toLocaleTimeString()}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-t-tertiary">Indicative rate source: {quote.rateSource}, updated {new Date(quote.rateFetchedAt).toLocaleString()}. This is a sandbox estimate, not a real-money conversion offer. Provider fees may apply and are not included in the estimate; review any fee shown by Flutterwave checkout. No balance is credited until the payment is verified.</p>
              </div>
            )}
            {!quote && <p className="sm:col-span-2 text-xs text-t-tertiary">Request a fresh exchange-rate quote first. No money is credited until the provider payment is independently verified.</p>}
            {fundingError && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{fundingError}</p>}
            <button type="submit" disabled={fundingBusy || !selectedAccountId} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#17643d] px-5 text-sm font-semibold text-white hover:bg-[#125332] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
              {fundingBusy ? 'Please wait…' : quote
                ? (fundingMethod === 'card' ? 'Confirm and continue to card checkout' : 'Confirm and get transfer details')
                : 'Get USD funding quote'}
            </button>
          </form>
          {payment && <FundingPaymentStatus payment={payment} />}
          {fundingHistory.some(item => item.reference !== payment?.reference) && (
            <section aria-labelledby="funding-history-heading" className="space-y-3">
              <h3 id="funding-history-heading" className="text-sm font-semibold text-t-primary">Other recent funding requests</h3>
              {fundingHistory
                .filter(item => item.reference !== payment?.reference)
                .map(item => <FundingPaymentStatus key={item.reference} payment={item} />)}
            </section>
          )}
        </section>
      )}

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
            <p className="mt-4 border-t border-[#e6d9b5] pt-4 text-sm font-medium text-[#584b2c]">These Kapita account details are simulated and are only for internal demo transfers. Do not use them to send real money. External bank funding, when configured, uses provider-issued payment instructions shown above.</p>
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

function FundingPaymentStatus({ payment }) {
  const statusMessage = payment.status === 'completed'
    ? `Verified sandbox payment. $${payment.creditedAmount.toFixed(2)} USD was credited.`
    : payment.status === 'failed' || payment.status === 'cancelled'
      ? 'This payment was not completed. No funds were credited.'
      : 'Payment is pending provider confirmation. Your balance will update only after verification.';
  return (
    <div className="rounded-lg border border-b-secondary bg-elevated p-4 text-sm text-t-secondary" aria-live="polite">
      <p className="font-semibold capitalize text-t-primary">Payment {payment.status}</p>
      <p className="mt-1">{statusMessage}</p>
      <p className="mt-2 text-xs text-t-tertiary">Reference: <span className="break-all font-mono">{payment.reference}</span></p>
      {payment.checkoutUrl && payment.status === 'pending' && (
        <a href={payment.checkoutUrl} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#17643d] px-4 text-sm font-semibold text-white hover:bg-[#125332]">
          Continue secure card checkout
        </a>
      )}
      {payment.transfer && payment.status === 'pending' && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-xs text-t-tertiary">Receiving bank</dt><dd className="font-semibold">{payment.transfer.bankName}</dd></div>
          <div><dt className="text-xs text-t-tertiary">Account number</dt><dd className="font-mono font-semibold">{payment.transfer.accountNumber}</dd></div>
          <div><dt className="text-xs text-t-tertiary">Transfer amount</dt><dd className="font-semibold">{payment.transfer.amount.toFixed(2)} {payment.transfer.currency}</dd></div>
          <div><dt className="text-xs text-t-tertiary">Reference</dt><dd className="font-mono font-semibold">{payment.transfer.reference}</dd></div>
          {payment.transfer.note && <div className="sm:col-span-2"><dt className="text-xs text-t-tertiary">Payment note</dt><dd className="font-semibold">{payment.transfer.note}</dd></div>}
          {payment.transfer.expiresAt && <div className="sm:col-span-2"><dt className="text-xs text-t-tertiary">Account expires</dt><dd className="font-semibold">{payment.transfer.expiresAt}</dd></div>}
        </dl>
      )}
    </div>
  );
}

function FundingMethod({ name, status, description, available = false }) {
  return (
    <article className="rounded-lg border border-b-secondary bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-t-primary">{name}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${available ? 'bg-[#e7f1e8] text-[#17643d]' : 'bg-elevated text-t-tertiary'}`}>
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-t-tertiary">{description}</p>
    </article>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 8V5.5A1.5 1.5 0 019.5 4h9A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H16M5.5 8h9A1.5 1.5 0 0116 9.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 18.5v-9A1.5 1.5 0 015.5 8z" />
    </svg>
  );
}
