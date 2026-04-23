const db = require('../db/database');

function generateAccountNumber(type) {
  const prefix = type === 'checking' ? '10' : '20';
  let number;
  do {
    const random = Math.floor(10000000 + Math.random() * 90000000);
    number = prefix + random.toString();
  } while (db.prepare('SELECT 1 FROM accounts WHERE account_number = ?').get(number));
  return number;
}

module.exports = { generateAccountNumber };
