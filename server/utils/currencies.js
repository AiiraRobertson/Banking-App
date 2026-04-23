const countries = [
  // North America
  { code: 'US', name: 'United States', region: 'north_america', currency: 'USD', currencyName: 'US Dollar', flag: '\u{1F1FA}\u{1F1F8}', requiresRouting: true, requiresSwift: false, requiresIban: false },
  { code: 'CA', name: 'Canada', region: 'north_america', currency: 'CAD', currencyName: 'Canadian Dollar', flag: '\u{1F1E8}\u{1F1E6}', requiresRouting: true, requiresSwift: true, requiresIban: false },

  // Europe
  { code: 'GB', name: 'United Kingdom', region: 'europe', currency: 'GBP', currencyName: 'British Pound', flag: '\u{1F1EC}\u{1F1E7}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'DE', name: 'Germany', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1E9}\u{1F1EA}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'FR', name: 'France', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1EB}\u{1F1F7}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'NL', name: 'Netherlands', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1F3}\u{1F1F1}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'ES', name: 'Spain', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1EA}\u{1F1F8}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'IT', name: 'Italy', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1EE}\u{1F1F9}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'PT', name: 'Portugal', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1F5}\u{1F1F9}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'BE', name: 'Belgium', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1E7}\u{1F1EA}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'IE', name: 'Ireland', region: 'europe', currency: 'EUR', currencyName: 'Euro', flag: '\u{1F1EE}\u{1F1EA}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'CH', name: 'Switzerland', region: 'europe', currency: 'CHF', currencyName: 'Swiss Franc', flag: '\u{1F1E8}\u{1F1ED}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'SE', name: 'Sweden', region: 'europe', currency: 'SEK', currencyName: 'Swedish Krona', flag: '\u{1F1F8}\u{1F1EA}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'NO', name: 'Norway', region: 'europe', currency: 'NOK', currencyName: 'Norwegian Krone', flag: '\u{1F1F3}\u{1F1F4}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'DK', name: 'Denmark', region: 'europe', currency: 'DKK', currencyName: 'Danish Krone', flag: '\u{1F1E9}\u{1F1F0}', requiresRouting: false, requiresSwift: true, requiresIban: true },
  { code: 'PL', name: 'Poland', region: 'europe', currency: 'PLN', currencyName: 'Polish Zloty', flag: '\u{1F1F5}\u{1F1F1}', requiresRouting: false, requiresSwift: true, requiresIban: true },

  // Africa
  { code: 'NG', name: 'Nigeria', region: 'africa', currency: 'NGN', currencyName: 'Nigerian Naira', flag: '\u{1F1F3}\u{1F1EC}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'KE', name: 'Kenya', region: 'africa', currency: 'KES', currencyName: 'Kenyan Shilling', flag: '\u{1F1F0}\u{1F1EA}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'ZA', name: 'South Africa', region: 'africa', currency: 'ZAR', currencyName: 'South African Rand', flag: '\u{1F1FF}\u{1F1E6}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'GH', name: 'Ghana', region: 'africa', currency: 'GHS', currencyName: 'Ghanaian Cedi', flag: '\u{1F1EC}\u{1F1ED}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'EG', name: 'Egypt', region: 'africa', currency: 'EGP', currencyName: 'Egyptian Pound', flag: '\u{1F1EA}\u{1F1EC}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'TZ', name: 'Tanzania', region: 'africa', currency: 'TZS', currencyName: 'Tanzanian Shilling', flag: '\u{1F1F9}\u{1F1FF}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'ET', name: 'Ethiopia', region: 'africa', currency: 'ETB', currencyName: 'Ethiopian Birr', flag: '\u{1F1EA}\u{1F1F9}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'RW', name: 'Rwanda', region: 'africa', currency: 'RWF', currencyName: 'Rwandan Franc', flag: '\u{1F1F7}\u{1F1FC}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'UG', name: 'Uganda', region: 'africa', currency: 'UGX', currencyName: 'Ugandan Shilling', flag: '\u{1F1FA}\u{1F1EC}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'CM', name: 'Cameroon', region: 'africa', currency: 'XAF', currencyName: 'CFA Franc', flag: '\u{1F1E8}\u{1F1F2}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'SN', name: 'Senegal', region: 'africa', currency: 'XOF', currencyName: 'CFA Franc (West)', flag: '\u{1F1F8}\u{1F1F3}', requiresRouting: false, requiresSwift: true, requiresIban: false },
  { code: 'MA', name: 'Morocco', region: 'africa', currency: 'MAD', currencyName: 'Moroccan Dirham', flag: '\u{1F1F2}\u{1F1E6}', requiresRouting: false, requiresSwift: true, requiresIban: false },
];

// Simulated exchange rates (1 USD = X foreign currency)
const exchangeRates = {
  USD: 1.00,
  CAD: 1.36,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  SEK: 10.45,
  NOK: 10.72,
  DKK: 6.87,
  PLN: 3.97,
  NGN: 1550.00,
  KES: 129.50,
  ZAR: 18.15,
  GHS: 14.80,
  EGP: 48.50,
  TZS: 2650.00,
  ETB: 56.80,
  RWF: 1290.00,
  UGX: 3720.00,
  XAF: 603.50,
  XOF: 603.50,
  MAD: 9.95,
};

// Fee structure per region
const fees = {
  north_america: { flat: 5.00, percent: 0.5, deliveryDays: '1-2 business days' },
  europe: { flat: 25.00, percent: 1.0, deliveryDays: '2-4 business days' },
  africa: { flat: 20.00, percent: 1.5, deliveryDays: '3-5 business days' },
};

function calculateFee(amount, region) {
  const fee = fees[region];
  if (!fee) throw new Error('Unsupported region');
  return Math.round((fee.flat + (amount * fee.percent / 100)) * 100) / 100;
}

function convertCurrency(amountUsd, targetCurrency) {
  const rate = exchangeRates[targetCurrency];
  if (!rate) throw new Error('Unsupported currency');
  return {
    rate,
    converted: Math.round(amountUsd * rate * 100) / 100
  };
}

function getCountry(code) {
  return countries.find(c => c.code === code);
}

function getCountriesByRegion(region) {
  return countries.filter(c => c.region === region);
}

function getDeliveryEstimate(region) {
  const fee = fees[region];
  if (!fee) return 'Unknown';
  const days = region === 'north_america' ? 2 : region === 'europe' ? 4 : 5;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

module.exports = { countries, exchangeRates, fees, calculateFee, convertCurrency, getCountry, getCountriesByRegion, getDeliveryEstimate };
