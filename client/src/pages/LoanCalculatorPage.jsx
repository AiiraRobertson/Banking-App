import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateLoan } from '../services/calculatorService';
import { formatCurrency } from '../utils/formatCurrency';

const termOptions = [12, 24, 36, 48, 60, 120, 180, 240, 360];

export default function LoanCalculatorPage() {
  const [form, setForm] = useState({ principal: 250000, annual_rate: 6.5, term_months: 360 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await calculateLoan({
        principal: parseFloat(form.principal),
        annual_rate: parseFloat(form.annual_rate),
        term_months: parseInt(form.term_months)
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || 'Calculation failed');
    } finally { setLoading(false); }
  };

  const interestPercent = result ? Math.round((result.totalInterest / result.totalPayment) * 100) : 0;

  return (
    <div className="min-h-screen bg-3d">
      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-t-primary">Loan Calculator</h1>
            <p className="text-t-tertiary">Calculate your monthly payments and amortization</p>
          </div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-t-secondary bg-surface border border-b-input rounded-lg hover:bg-hover">
            &larr; Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
            <h2 className="text-lg font-semibold text-t-primary mb-4">Loan Details</h2>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Loan Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-t-muted">$</span>
                  <input type="number" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    min="1000" max="10000000" required />
                </div>
                <input type="range" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })}
                  min="1000" max="1000000" step="1000" className="w-full mt-2 accent-indigo-600" />
                <div className="flex justify-between text-xs text-t-muted"><span>$1K</span><span>$1M</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Interest Rate (%)</label>
                <input type="number" value={form.annual_rate} onChange={e => setForm({ ...form, annual_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  min="0.1" max="30" step="0.1" required />
                <input type="range" value={form.annual_rate} onChange={e => setForm({ ...form, annual_rate: e.target.value })}
                  min="0.1" max="30" step="0.1" className="w-full mt-2 accent-indigo-600" />
                <div className="flex justify-between text-xs text-t-muted"><span>0.1%</span><span>30%</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Loan Term</label>
                <select value={form.term_months} onChange={e => setForm({ ...form, term_months: e.target.value })}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {termOptions.map(t => <option key={t} value={t}>{t} months ({(t / 12).toFixed(t % 12 ? 1 : 0)} years)</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Calculating...' : 'Calculate'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {result ? (
              <>
                <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
                  <h2 className="text-lg font-semibold text-t-primary mb-4">Payment Summary</h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-t-tertiary">Monthly Payment</p>
                      <p className="text-xl font-bold text-indigo-600">{formatCurrency(result.monthlyPayment)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-t-tertiary">Total Payment</p>
                      <p className="text-xl font-bold text-t-primary">{formatCurrency(result.totalPayment)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-t-tertiary">Total Interest</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(result.totalInterest)}</p>
                    </div>
                  </div>
                  <div className="relative h-8 bg-elevated rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full" style={{ width: `${100 - interestPercent}%` }}></div>
                    <div className="absolute inset-y-0 right-0 bg-red-400 rounded-r-full" style={{ width: `${interestPercent}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-indigo-600 font-medium">Principal ({100 - interestPercent}%)</span>
                    <span className="text-red-500 font-medium">Interest ({interestPercent}%)</span>
                  </div>
                </div>

                <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-t-primary">Amortization Schedule</h2>
                    <button onClick={() => setShowSchedule(!showSchedule)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      {showSchedule ? 'Hide' : 'Show'} Schedule
                    </button>
                  </div>
                  {showSchedule && (
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-elevated sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-t-tertiary">Month</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-t-tertiary">Payment</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-t-tertiary">Principal</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-t-tertiary">Interest</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-t-tertiary">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-b-secondary">
                          {result.schedule.map(row => (
                            <tr key={row.month} className="hover:bg-hover">
                              <td className="px-3 py-2 text-t-secondary">{row.month}</td>
                              <td className="px-3 py-2 text-right text-t-secondary">{formatCurrency(row.payment)}</td>
                              <td className="px-3 py-2 text-right text-indigo-600">{formatCurrency(row.principal)}</td>
                              <td className="px-3 py-2 text-right text-red-500">{formatCurrency(row.interest)}</td>
                              <td className="px-3 py-2 text-right text-t-secondary font-mono">{formatCurrency(row.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-12 text-center text-t-muted">
                <svg className="w-16 h-16 mx-auto mb-4 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p>Enter loan details and click Calculate to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
