const knownBics = {
  'deutsche bank': { bank: 'DEUT', location: 'FF' },
  'barclays': { bank: 'BARC', location: '2L' },
  'hsbc': { bank: 'HSBC', location: '2L' },
  'standard chartered': { bank: 'SCBL', location: '2L' },
  'bnp paribas': { bank: 'BNPA', location: 'FR' },
  'credit agricole': { bank: 'AGRI', location: 'FR' },
  'societe generale': { bank: 'SOGE', location: 'FR' },
  'ing bank': { bank: 'INGB', location: 'NL' },
  'rabobank': { bank: 'RABO', location: 'NL' },
  'ubs': { bank: 'UBSW', location: 'CH' },
  'credit suisse': { bank: 'CRES', location: 'ZZ' },
  'nordea': { bank: 'NDEA', location: 'SS' },
  'danske bank': { bank: 'DABA', location: 'DK' },
  'gtbank': { bank: 'GTBI', location: 'NG' },
  'guaranty trust bank': { bank: 'GTBI', location: 'NG' },
  'zenith bank': { bank: 'ZENI', location: 'LA' },
  'access bank': { bank: 'ABNG', location: 'LA' },
  'first bank': { bank: 'FBNI', location: 'LA' },
  'uba': { bank: 'UNAF', location: 'NG' },
  'united bank for africa': { bank: 'UNAF', location: 'NG' },
  'ecobank': { bank: 'ECOC', location: 'GH' },
  'stanbic': { bank: 'SBIC', location: 'ZA' },
  'standard bank': { bank: 'SBZA', location: 'JJ' },
  'absa': { bank: 'ABSA', location: 'JJ' },
  'nedbank': { bank: 'NEDZ', location: 'AJ' },
  'fnb': { bank: 'FIDN', location: 'JJ' },
  'first national bank': { bank: 'FIDN', location: 'JJ' },
  'equity bank': { bank: 'EQBL', location: 'KE' },
  'kcb': { bank: 'KCBL', location: 'KE' },
  'bank of kigali': { bank: 'BKIG', location: 'RW' },
  'cib': { bank: 'CIBD', location: 'EG' },
  'attijariwafa': { bank: 'BCMA', location: 'MA' },
  'td bank': { bank: 'TDOM', location: 'CA' },
  'rbc': { bank: 'ROYL', location: 'CA' },
  'royal bank of canada': { bank: 'ROYL', location: 'CA' },
  'chase': { bank: 'CHAS', location: 'US' },
  'jpmorgan': { bank: 'CHAS', location: 'US' },
  'bank of america': { bank: 'BOFA', location: 'US' },
  'wells fargo': { bank: 'WFBI', location: 'US' },
  'citibank': { bank: 'CITI', location: 'US' },
};

function deriveLocation(bankName) {
  let sum = 0;
  for (let i = 0; i < bankName.length; i++) {
    sum += bankName.charCodeAt(i);
  }
  const c1 = String.fromCharCode(65 + (sum % 26));
  const c2 = String.fromCharCode(65 + ((sum * 7) % 26));
  return c1 + c2;
}

export function generateBic(bankName, countryCode) {
  if (!bankName || !countryCode) return '';

  const normalizedName = bankName.trim().toLowerCase();
  const cc = countryCode.toUpperCase();

  for (const [key, value] of Object.entries(knownBics)) {
    if (normalizedName === key || normalizedName.startsWith(key)) {
      return value.bank + cc + value.location;
    }
  }

  const letters = bankName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const bankCode = (letters.slice(0, 4) + 'XXXX').slice(0, 4);
  const location = deriveLocation(normalizedName);

  return bankCode + cc + location;
}
