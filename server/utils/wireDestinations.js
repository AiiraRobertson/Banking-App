const { countries } = require('./currencies');
const { getBanksForCountry, supportedWireCountryCodes } = require('./banks');
const { accountNumber: accountNumberRules } = require('../../shared/wire-destinations.json');

function getWireDestinations() {
  return countries
    .filter(country => supportedWireCountryCodes.includes(country.code))
    .map(country => ({ ...country, banks: getBanksForCountry(country.code) }));
}

function validateWireDestination({ countryCode, bankName, accountNumber, countryOnly = false }) {
  const normalizedCountryCode = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  if (!supportedWireCountryCodes.includes(normalizedCountryCode)) {
    return { error: 'Destination country must be Nigeria (NG) or Ghana (GH).', code: 'UNSUPPORTED_DESTINATION_COUNTRY' };
  }

  const country = countries.find(item => item.code === normalizedCountryCode);
  if (countryOnly) return { country };

  const bank = getBanksForCountry(normalizedCountryCode).find(item => item.name === bankName);
  if (!bankName || typeof bankName !== 'string' || !bankName.trim()) {
    return { error: 'Select a supported recipient bank.', code: 'RECIPIENT_BANK_REQUIRED' };
  }
  if (!bank) {
    return { error: `Bank is not supported for ${country.name}.`, code: 'UNSUPPORTED_DESTINATION_BANK' };
  }

  const account = typeof accountNumber === 'string' ? accountNumber.trim() : '';
  if (!account) {
    return { error: 'Recipient account number is required.', code: 'RECIPIENT_ACCOUNT_REQUIRED' };
  }
  if (account.length > accountNumberRules.maxLength || !new RegExp(accountNumberRules.allowedCharacters).test(account)) {
    return { error: 'Recipient account number contains invalid characters or is too long.', code: 'INVALID_RECIPIENT_ACCOUNT' };
  }
  const countryRule = accountNumberRules.countryRules[normalizedCountryCode];
  if (countryRule && !new RegExp(countryRule.pattern).test(account)) {
    return { error: countryRule.message, code: 'INVALID_RECIPIENT_ACCOUNT' };
  }

  return { country, bank };
}

module.exports = { getWireDestinations, validateWireDestination };
