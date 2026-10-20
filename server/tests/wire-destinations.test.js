const test = require('node:test');
const assert = require('node:assert/strict');
const { getWireDestinations, validateWireDestination } = require('../utils/wireDestinations');

const destinations = getWireDestinations();
const nigeria = destinations.find(country => country.code === 'NG');
const ghana = destinations.find(country => country.code === 'GH');

test('outbound destination catalog contains only NG and GH with their currencies and banks', () => {
  assert.deepEqual(destinations.map(country => country.code), ['NG', 'GH']);
  assert.equal(nigeria.currency, 'NGN');
  assert.equal(ghana.currency, 'GHS');
  assert.ok(nigeria.banks.length > 0);
  assert.ok(ghana.banks.length > 0);
});

test('supported bank and account details validate for Nigeria and Ghana', () => {
  assert.equal(validateWireDestination({ countryCode: 'NG', bankName: nigeria.banks[0].name, accountNumber: '0123456789' }).error, undefined);
  assert.equal(validateWireDestination({ countryCode: 'GH', bankName: ghana.banks[0].name, accountNumber: 'ACCT-12345' }).error, undefined);
});

test('unsupported countries and country-mismatched banks are rejected', () => {
  assert.equal(validateWireDestination({ countryCode: 'GB', bankName: 'Barclays', accountNumber: '1234567890' }).code, 'UNSUPPORTED_DESTINATION_COUNTRY');
  assert.equal(validateWireDestination({ countryCode: 'NG', bankName: ghana.banks[0].name, accountNumber: '0123456789' }).code, 'UNSUPPORTED_DESTINATION_BANK');
  assert.equal(validateWireDestination({ countryCode: 'GH', bankName: nigeria.banks[0].name, accountNumber: '1234567890' }).code, 'UNSUPPORTED_DESTINATION_BANK');
});

test('missing and malformed account details are rejected by country rules', () => {
  assert.equal(validateWireDestination({ countryCode: 'NG', bankName: nigeria.banks[0].name, accountNumber: '' }).code, 'RECIPIENT_ACCOUNT_REQUIRED');
  assert.equal(validateWireDestination({ countryCode: 'NG', bankName: nigeria.banks[0].name, accountNumber: '123456789' }).code, 'INVALID_RECIPIENT_ACCOUNT');
  assert.equal(validateWireDestination({ countryCode: 'GH', bankName: ghana.banks[0].name, accountNumber: 'ACCT/123' }).code, 'INVALID_RECIPIENT_ACCOUNT');
});

 test('quote country validation accepts only configured destinations', () => {
  assert.equal(validateWireDestination({ countryCode: 'NG', countryOnly: true }).country.currency, 'NGN');
  assert.equal(validateWireDestination({ countryCode: 'GH', countryOnly: true }).country.currency, 'GHS');
  assert.equal(validateWireDestination({ countryCode: 'US', countryOnly: true }).code, 'UNSUPPORTED_DESTINATION_COUNTRY');
});
