import destinationConfig from '../../../shared/wire-destinations.json';

export const supportedWireCountryCodes = destinationConfig.supportedCountryCodes;

export function getAccountNumberValidation(countryCode) {
  const rule = destinationConfig.accountNumber.countryRules[countryCode];
  return {
    maxLength: destinationConfig.accountNumber.maxLength,
    inputMode: 'text',
    pattern: rule?.pattern || destinationConfig.accountNumber.allowedCharacters,
    title: rule?.message || 'Use the account number format provided by the destination bank.',
    message: rule?.message || 'Check the account number against the format provided by the Ghanaian bank.',
  };
}
