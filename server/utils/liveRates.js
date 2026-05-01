const { exchangeRates: fallbackRates } = require('./currencies');

const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const TARGET_CURRENCIES = Object.keys(fallbackRates).filter(c => c !== 'USD');

let cache = {
  rates: { ...fallbackRates },
  fetchedAt: 0,
  source: 'fallback',
};

async function fetchLiveRates() {
  const url = `https://open.er-api.com/v6/latest/USD`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) throw new Error('Invalid response');

    const rates = { USD: 1.00 };
    for (const cur of TARGET_CURRENCIES) {
      if (typeof data.rates[cur] === 'number') {
        rates[cur] = Math.round(data.rates[cur] * 10000) / 10000;
      } else {
        rates[cur] = fallbackRates[cur];
      }
    }
    return { rates, source: 'live' };
  } finally {
    clearTimeout(timer);
  }
}

async function getRates() {
  const now = Date.now();
  if (now - cache.fetchedAt < CACHE_TTL_MS && cache.fetchedAt > 0) {
    return cache;
  }
  try {
    const { rates, source } = await fetchLiveRates();
    cache = { rates, fetchedAt: now, source };
  } catch (err) {
    if (cache.fetchedAt === 0) {
      cache = { rates: { ...fallbackRates }, fetchedAt: now, source: 'fallback' };
    }
  }
  return cache;
}

async function getRate(currency) {
  const { rates, fetchedAt, source } = await getRates();
  return {
    rate: rates[currency] ?? fallbackRates[currency],
    fetchedAt,
    source,
  };
}

async function convertLive(amountUsd, targetCurrency) {
  const { rate, fetchedAt, source } = await getRate(targetCurrency);
  if (!rate) throw new Error('Unsupported currency');
  return {
    rate,
    converted: Math.round(amountUsd * rate * 100) / 100,
    fetchedAt,
    source,
  };
}

module.exports = { getRates, getRate, convertLive };
