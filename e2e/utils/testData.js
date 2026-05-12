// @ts-check
require('dotenv').config();

const users = {
  primary: {
    email: process.env.TEST_USER_EMAIL || 'john@example.com',
    password: process.env.TEST_USER_PASSWORD || 'User1234!',
  },
  recipient: {
    email: process.env.TEST_RECIPIENT_EMAIL || 'admin@bank.com',
    password: process.env.TEST_RECIPIENT_PASSWORD || 'Admin1234!',
  },
};

const wireRecipient = {
  countryCode: 'GB',
  countryName: 'United Kingdom',
  bank: 'Barclays',
  swift: 'BARCGB22',
  iban: 'GB29NWBK60161331926819',
  name: 'Jane Doe',
  account: '12345678',
  amount: 50,
};

const randomEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;

module.exports = { users, wireRecipient, randomEmail };
