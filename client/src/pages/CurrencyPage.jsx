import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRates } from '../services/currencyService';

const POPULAR_BASES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS', 'CAD', 'JPY', 'CNY', 'INR', 'AUD'];

function formatRate(n) {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export default function CurrencyPage() {
  const navigate = useNavigate();
  const [base, setBase] = useState('USD');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [amount, setAmount] = useState(100);

  const load = async (b) => {
    setLoading(true); setError('');
    try {
      const res = await getRates(b);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load rates');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(base); }, [base]);

  const allCodes = useMemo(() => (data ? Object.keys(data.rates).sort() : []), [data]);

  const filteredCodes = useMemo(() => {
    if (!search.trim()) return allCodes;
    const q = search.trim().toUpperCase();
    return allCodes.filter(c => c.includes(q));
  }, [allCodes, search]);

  const conversion = useMemo(() => {
    if (!data) return null;
    const amt = parseFloat(amount);
    if (Number.isNaN(amt)) return null;

    const fromRate = from === data.base ? 1 : data.rates[from];
    const toRate = to === data.base ? 1 : data.rates[to];
    if (typeof fromRate !== 'number' || typeof toRate !== 'number') return null;

    const rate = toRate / fromRate;
    return { rate, result: amt * rate };
  }, [data, from, to, amount]);

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <div className="min-h-screen bg-3d">
      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-t-primary">Currency Rates & Converter</h1>
            <p className="text-t-tertiary">Live exchange rates and instant conversion</p>
          </div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-t-secondary bg-surface border border-b-input rounded-lg hover:bg-hover">
            &larr; Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-t-primary">Live Rates</h2>
              <button onClick={() => load(base)} disabled={loading}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50">
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Base Currency</label>
                <select value={base} onChange={e => setBase(e.target.value)}
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {POPULAR_BASES.map(c => <option key={c} value={c}>{c}</option>)}
                  {allCodes.filter(c => !POPULAR_BASES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Search</label>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="EUR, JPY…"
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {data && (
              <>
                <div className="flex items-center justify-between text-xs text-t-muted mb-2">
                  <span>1 {data.base} = X target</span>
                  <span>
                    Updated {new Date(data.updatedAt).toLocaleString()}
                    {data.stale && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">cached</span>}
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto border border-b-secondary rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-elevated sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-t-tertiary">Code</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-t-tertiary">Rate (per 1 {data.base})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-b-secondary">
                      {filteredCodes.map(code => (
                        <tr key={code} className="hover:bg-hover">
                          <td className="px-3 py-2 text-t-secondary font-medium">{code}</td>
                          <td className="px-3 py-2 text-right text-t-secondary font-mono">{formatRate(data.rates[code])}</td>
                        </tr>
                      ))}
                      {filteredCodes.length === 0 && (
                        <tr><td colSpan={2} className="px-3 py-6 text-center text-t-muted">No matches</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 self-start">
            <h2 className="text-lg font-semibold text-t-primary mb-4">Currency Converter</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-t-secondary mb-1">Amount</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  min="0" step="any"
                  className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">From</label>
                  <select value={from} onChange={e => setFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    {data ? [data.base, ...allCodes.filter(c => c !== data.base)].map(c => (
                      <option key={c} value={c}>{c}</option>
                    )) : <option value={from}>{from}</option>}
                  </select>
                </div>
                <button type="button" onClick={swap}
                  title="Swap"
                  className="px-3 py-2 text-t-secondary bg-elevated border border-b-input rounded-lg hover:bg-hover">
                  ⇄
                </button>
                <div>
                  <label className="block text-sm font-medium text-t-secondary mb-1">To</label>
                  <select value={to} onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    {data ? [data.base, ...allCodes.filter(c => c !== data.base)].map(c => (
                      <option key={c} value={c}>{c}</option>
                    )) : <option value={to}>{to}</option>}
                  </select>
                </div>
              </div>

              <div className="bg-elevated rounded-lg p-4 text-center">
                {conversion ? (
                  <>
                    <p className="text-sm text-t-tertiary mb-1">{amount || 0} {from} =</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {conversion.result.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
                    </p>
                    <p className="text-xs text-t-muted mt-2">
                      1 {from} = {formatRate(conversion.rate)} {to}
                    </p>
                  </>
                ) : (
                  <p className="text-t-muted text-sm">
                    {data ? 'Pick currencies to convert' : 'Loading rates…'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
