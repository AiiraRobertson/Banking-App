export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: ['USD', 'NGN', 'GHS'].includes(currency) ? currency : 'USD'
  }).format(amount);
}
