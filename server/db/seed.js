const db = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const adminHash = bcrypt.hashSync('Admin123!', 12);
  const userHash = bcrypt.hashSync('User1234!', 12);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, phone, address, city, state, zip_code, nationality, date_of_birth, terms_accepted, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (user_id, account_number, account_type, balance)
    VALUES (?, ?, ?, ?)
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (from_account_id, to_account_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    const admin = insertUser.run(
      'admin@bank.com', adminHash, 'Admin', 'User', '555-0100',
      '100 Bank Street', 'New York', 'NY', '10001', 'US', '1985-03-15', 1, 'admin'
    );

    const demoUser = insertUser.run(
      'john@example.com', userHash, 'John', 'Doe', '555-0123',
      '456 Oak Avenue', 'San Francisco', 'CA', '94102', 'US', '1990-01-15', 1, 'user'
    );

    insertAccount.run(admin.lastInsertRowid, '1000000001', 'checking', 50000.00);
    insertAccount.run(admin.lastInsertRowid, '2000000001', 'savings', 100000.00);

    const checking = insertAccount.run(demoUser.lastInsertRowid, '1000000002', 'checking', 5420.50);
    const savings = insertAccount.run(demoUser.lastInsertRowid, '2000000002', 'savings', 12750.00);

    const checkingId = checking.lastInsertRowid;
    const savingsId = savings.lastInsertRowid;

    insertTransaction.run(null, checkingId, 'deposit', 5000.00, 5000.00, 'Initial deposit', uuidv4());
    insertTransaction.run(checkingId, null, 'withdrawal', 200.00, 4800.00, 'ATM withdrawal', uuidv4());
    insertTransaction.run(null, checkingId, 'deposit', 1500.00, 6300.00, 'Payroll deposit', uuidv4());
    insertTransaction.run(checkingId, null, 'bill_payment', 150.00, 6150.00, 'Electric bill payment', uuidv4());
    insertTransaction.run(checkingId, savingsId, 'transfer', 729.50, 5420.50, 'Transfer to savings', uuidv4());
    insertTransaction.run(null, savingsId, 'deposit', 10000.00, 10000.00, 'Initial savings deposit', uuidv4());
    insertTransaction.run(null, savingsId, 'deposit', 2020.50, 12020.50, 'Monthly savings', uuidv4());
    insertTransaction.run(null, savingsId, 'deposit', 729.50, 12750.00, 'Transfer from checking', uuidv4());

    insertNotification.run(demoUser.lastInsertRowid, 'Welcome!', 'Welcome to SecureBank. Your checking account has been created.', 'info');
    insertNotification.run(demoUser.lastInsertRowid, 'Deposit Received', 'A deposit of $1,500.00 has been credited to your checking account.', 'transaction');
    insertNotification.run(demoUser.lastInsertRowid, 'Bill Payment', 'Your electric bill payment of $150.00 has been processed.', 'transaction');
  });

  seed();
  console.log('Database seeded with demo data');
}

module.exports = { seedDatabase };
