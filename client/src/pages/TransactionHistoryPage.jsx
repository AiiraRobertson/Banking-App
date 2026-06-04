import { useState, useEffect } from 'react';
import { getTransactions } from '../services/transactionService';
import { getAccounts } from '../services/accountService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import ResponsiveTable from '../components/ui/ResponsiveTable';

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', account_id: '', from_date: '', to_date: '', page: 1 });

  useEffect(() => { getAccounts().then(res => setAccounts(res.data.accounts)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 15, page: filters.page };
    if (filters.type) params.type = filters.type;
    if (filters.account_id) params.account_id = filters.account_id;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;

    getTransactions(params)
      .then(res => { setTransactions(res.data.transactions); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [filters]);

  const accountIds = accounts.map(a => a.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-t-primary">Transaction History</h1>
        <p className="text-sm lg:text-base text-t-tertiary">View and filter all your transactions</p>
      </div>

      <div className="bg-surface rounded-lg lg:rounded-xl shadow-sm border border-b-secondary p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="px-3 py-2 border border-b-input rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="transfer">Transfer</option>
            <option value="bill_payment">Bill Payment</option>
            <option value="wire_transfer">Wire Transfer</option>
          </select>
          <select value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value, page: 1 })}
            className="px-3 py-2 border border-b-input rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>****{a.account_number.slice(-4)} ({a.account_type})</option>)}
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters({ ...filters, from_date: e.target.value, page: 1 })}
            className="px-3 py-2 border border-b-input rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="From date" />
          <input type="date" value={filters.to_date} onChange={e => setFilters({ ...filters, to_date: e.target.value, page: 1 })}
            className="px-3 py-2 border border-b-input rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="To date" />
          <button onClick={() => setFilters({ type: '', account_id: '', from_date: '', to_date: '', page: 1 })}
            className="px-3 py-2 text-xs sm:text-sm text-t-secondary bg-elevated rounded-lg hover:bg-hover transition-colors">
            Clear Filters
          </button>
        </div>
      </div>

      <ResponsiveTable
        loading={loading}
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'type', label: 'Type' },
          { key: 'description', label: 'Description' },
          { key: 'reference', label: 'Reference' },
          { key: 'amount', label: 'Amount', cellClassName: 'text-right' },
          { key: 'balance', label: 'Balance', cellClassName: 'text-right' },
        ]}
        data={transactions.map(tx => {
          const isDebit = tx.from_account_id && accountIds.includes(tx.from_account_id) && tx.transaction_type !== 'deposit';
          return {
            id: tx.id,
            date: formatDateTime(tx.created_at),
            type: tx.transaction_type.replace('_', ' '),
            description: tx.description,
            reference: tx.reference_id.slice(0, 8) + '...',
            amount: `${isDebit ? '-' : '+'}${formatCurrency(tx.amount)}`,
            balance: formatCurrency(tx.balance_after),
          };
        })}
        cardRenderer={(row) => {
          const tx = transactions.find(t => t.id === row.id);
          const isDebit = tx?.from_account_id && accountIds.includes(tx.from_account_id) && tx.transaction_type !== 'deposit';
          return (
            <div key={row.id} className="bg-surface rounded-lg shadow-sm border border-b-secondary p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-t-secondary">{row.date}</p>
                  <p className="text-sm font-medium text-t-primary mt-1">{row.description}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                  tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                  tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                  tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                  'bg-orange-50 text-orange-700'
                }`}>
                  {tx.transaction_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-b-secondary">
                <div>
                  <p className="text-xs text-t-muted">Amount</p>
                  <p className={`text-sm font-semibold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                    {row.amount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-t-muted">Balance</p>
                  <p className="text-sm font-semibold text-t-primary">{row.balance}</p>
                </div>
              </div>
              <p className="text-xs text-t-muted font-mono">Ref: {row.reference}</p>
            </div>
          );
        }}
      />

      {pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-t-tertiary">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page === 1}
              className="px-3 py-1.5 text-xs sm:text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page === pagination.pages}
              className="px-3 py-1.5 text-xs sm:text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
