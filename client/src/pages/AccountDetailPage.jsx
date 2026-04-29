import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAccount } from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime, formatDate } from '../utils/formatDate';

export default function AccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccount(id).then(res => setAccount(res.data.account)).catch(() => {});
  }, [id]);

  useEffect(() => {
    getTransactions({ account_id: id, page, limit: 10 })
      .then(res => { setTransactions(res.data.transactions); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [id, page]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!account) return <div className="text-center py-20 text-t-tertiary">Account not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/accounts" className="text-t-muted hover:text-t-secondary">&larr;</Link>
        <div>
          <h1 className="text-2xl font-bold text-t-primary">Account Details</h1>
          <p className="text-t-tertiary">{account.account_number}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-t-tertiary">Type</p>
            <p className="text-lg font-semibold text-t-primary capitalize">{account.account_type}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Balance</p>
            <p className="text-lg font-semibold text-t-primary">{formatCurrency(account.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Account Number</p>
            <p className="text-lg font-semibold text-t-primary">{account.account_number}</p>
          </div>
          <div>
            <p className="text-sm text-t-tertiary">Opened</p>
            <p className="text-lg font-semibold text-t-primary">{formatDate(account.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Link to="/transfer" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Transfer</Link>
          <Link to="/transfer" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Deposit</Link>
          <Link to="/transfer" className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Withdraw</Link>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-t-primary mb-4">Transaction History</h2>
        <div className="bg-surface rounded-xl shadow-sm border border-b-secondary overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-t-muted">No transactions for this account</div>
          ) : (
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-t-tertiary uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b-secondary">
                {transactions.map(tx => {
                  const isDebit = tx.from_account_id === account.id;
                  return (
                    <tr key={tx.id} className="hover:bg-hover">
                      <td className="px-6 py-4 text-sm text-t-tertiary">{formatDateTime(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          tx.transaction_type === 'deposit' ? 'bg-green-50 text-green-700' :
                          tx.transaction_type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                          tx.transaction_type === 'transfer' ? 'bg-blue-50 text-blue-700' :
                          tx.transaction_type === 'wire_transfer' ? 'bg-purple-50 text-purple-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>{tx.transaction_type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-t-secondary">{tx.description}</td>
                      <td className={`px-6 py-4 text-sm font-medium text-right ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                        {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-t-secondary text-right font-mono">{formatCurrency(tx.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
            <span className="text-sm text-t-tertiary">Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
