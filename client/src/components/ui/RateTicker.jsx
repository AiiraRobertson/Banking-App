import { useEffect, useRef, useState } from 'react';
import { getRates } from '../../services/currencyService';

// Pairs we care about on the landing page. base currency for each.
const PAIRS = [
  { from: 'USD', to: 'EUR', flag: '🇪🇺' },
  { from: 'USD', to: 'GBP', flag: '🇬🇧' },
  { from: 'USD', to: 'NGN', flag: '🇳🇬' },
  { from: 'USD', to: 'KES', flag: '🇰🇪' },
  { from: 'USD', to: 'ZAR', flag: '🇿🇦' },
  { from: 'USD', to: 'GHS', flag: '🇬🇭' },
  { from: 'USD', to: 'CAD', flag: '🇨🇦' },
  { from: 'USD', to: 'CHF', flag: '🇨🇭' },
  { from: 'USD', to: 'JPY', flag: '🇯🇵' },
  { from: 'USD', to: 'INR', flag: '🇮🇳' },
];

// Plausible static fallbacks if the API is unreachable on the public landing page.
const FALLBACK = {
  EUR: 0.92, GBP: 0.79, NGN: 1580, KES: 129, ZAR: 18.3,
  GHS: 14.7, CAD: 1.36, CHF: 0.88, JPY: 154, INR: 83.2,
};

export default function RateTicker() {
  const [rates, setRates] = useState(FALLBACK);
  // Track previous values to show up/down arrows
  const prevRef = useRef(FALLBACK);
  const [delta, setDelta] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getRates('USD');
        const fresh = res.data?.rates || {};
        if (cancelled) return;

        const next = {};
        const nextDelta = {};
        for (const p of PAIRS) {
          if (typeof fresh[p.to] === 'number') {
            next[p.to] = fresh[p.to];
            const prev = prevRef.current[p.to];
            if (typeof prev === 'number') {
              nextDelta[p.to] = next[p.to] >= prev ? 'up' : 'down';
            }
          }
        }
        if (Object.keys(next).length) {
          prevRef.current = { ...prevRef.current, ...next };
          setRates(prev => ({ ...prev, ...next }));
          setDelta(nextDelta);
        }
      } catch {
        // keep fallback values — landing page must never look broken
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const items = PAIRS.map(p => {
    const v = rates[p.to];
    const formatted = v >= 100 ? v.toFixed(2) : v.toFixed(4);
    const dir = delta[p.to];
    return { ...p, value: formatted, dir };
  });

  // Double the array so the marquee loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-y border-b-secondary bg-[var(--color-bg-surface)]/70 backdrop-blur-md marquee-pause marquee-mask">
      <div className="marquee marquee-fast py-2">
        {doubled.map((it, i) => (
          <div
            key={`${it.to}-${i}`}
            className="flex items-center gap-2 px-5 text-xs sm:text-sm shrink-0"
          >
            <span className="text-base leading-none">{it.flag}</span>
            <span className="font-semibold text-t-secondary">{it.from}/{it.to}</span>
            <span className="tabular text-t-primary font-medium">{it.value}</span>
            {it.dir === 'up' && (
              <span className="text-green-500 inline-flex items-center" aria-label="up">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l8 12H4z" />
                </svg>
              </span>
            )}
            {it.dir === 'down' && (
              <span className="text-rose-500 inline-flex items-center" aria-label="down">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 20L4 8h16z" />
                </svg>
              </span>
            )}
            {!it.dir && (
              <span className="text-t-muted text-[10px]">·</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
