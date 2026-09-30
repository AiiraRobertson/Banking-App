const express = require('express');
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendTransactionAlert } = require('../utils/alerts');
const { ensureWithdrawAllowed } = require('../utils/savingsLock');
const { electricityProviders, waterProviders, mobileProviders, dataBundles } = require('../utils/nigerianServices');

const router = express.Router();
router.use(authenticate);
const ids = providers => providers.map(provider => provider.id);
const serviceProviders = { electricity: electricityProviders, water: waterProviders, airtime: mobileProviders, data: mobileProviders };
const validPhone = value => /^0[789][01]\d{8}$/.test(value);

function accountForUser(accountId, userId) {
  return db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND is_active = 1').get(accountId, userId);
}

function debitAccount(account, amount, description, referenceId) {
  if (account.balance < amount) throw Object.assign(new Error('Insufficient funds'), { status: 400 });
  const lockErr = ensureWithdrawAllowed(account);
  if (lockErr) throw Object.assign(new Error(lockErr.message), { status: lockErr.status, code: lockErr.code });
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, account.id);
  const newBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account.id).balance;
  db.prepare(`INSERT INTO transactions (from_account_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (?, 'bill_payment', ?, ?, ?, ?)`).run(account.id, amount, newBalance, description, referenceId);
  return newBalance;
}

router.get('/catalog', (req, res) => res.json({ electricityProviders, waterProviders, mobileProviders, dataBundles, currency: 'NGN' }));

router.post('/payments', [
  body('service_type').isIn(['electricity', 'water', 'airtime', 'data']),
  body('provider').trim().notEmpty(), body('from_account_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 50, max: 1000000 }), body('customer_reference').trim().notEmpty().isLength({ max: 80 }),
  body('package_code').optional().trim(), handleValidation
], (req, res) => {
  const { service_type, provider, from_account_id, amount, customer_reference, package_code } = req.body;
  const providers = serviceProviders[service_type];
  if (!providers || !ids(providers).includes(provider)) return res.status(400).json({ error: 'Provider is not valid for this service' });
  if (['airtime', 'data'].includes(service_type) && !validPhone(customer_reference)) return res.status(400).json({ error: 'Enter a valid Nigerian mobile number' });
  if (['electricity', 'water'].includes(service_type) && !/^\d{6,30}$/.test(customer_reference)) return res.status(400).json({ error: 'Enter a valid meter or customer number' });
  if (service_type === 'data') {
    const bundle = (dataBundles[provider] || []).find(item => item.code === package_code);
    if (!bundle || Number(amount) !== bundle.amount) return res.status(400).json({ error: 'Select a valid data bundle' });
  }
  const account = accountForUser(from_account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const paymentAmount = Math.round(Number(amount) * 100) / 100;
  const referenceId = uuidv4();
  try {
    const newBalance = db.transaction(() => {
      const balance = debitAccount(account, paymentAmount, `${service_type} payment to ${provider} (${customer_reference})`, referenceId);
      db.prepare(`INSERT INTO service_payments (user_id, from_account_id, service_type, provider, customer_reference, amount, package_code, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, account.id, service_type, provider, customer_reference, paymentAmount, package_code || null, referenceId);
      db.prepare('INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'Payment successful', `${service_type} payment of NGN ${paymentAmount.toFixed(2)} to ${provider} was completed.`, 'transaction', referenceId);
      return balance;
    })();
    sendTransactionAlert({ userId: req.user.id, direction: 'debit', amount: paymentAmount, accountNumber: account.account_number, balanceAfter: newBalance, counterparty: `${service_type} payment to ${provider}`, referenceId });
    res.status(201).json({ message: 'Payment successful', referenceId, newBalance });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Payment failed', code: error.code });
  }
});

router.get('/payments', (req, res) => {
  res.json({ payments: db.prepare('SELECT * FROM service_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id) });
});

router.get('/payroll/groups', (req, res) => {
  const groups = db.prepare(`
    SELECT pg.*, COUNT(pe.id) AS employee_count
    FROM payroll_groups pg
    LEFT JOIN payroll_employees pe ON pe.group_id = pg.id AND pe.is_active = 1
    WHERE pg.user_id = ?
    GROUP BY pg.id
    ORDER BY pg.created_at DESC
  `).all(req.user.id);
  res.json({ groups });
});

router.post('/payroll/groups', [
  body('title').trim().notEmpty().isLength({ max: 100 }),
  body('company_name').trim().notEmpty().isLength({ max: 150 }),
  handleValidation
], (req, res) => {
  const { title, company_name } = req.body;
  const result = db.prepare('INSERT INTO payroll_groups (user_id, title, company_name) VALUES (?, ?, ?)').run(req.user.id, title, company_name);
  res.status(201).json({ group: db.prepare('SELECT * FROM payroll_groups WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/payroll/groups/:id', [
  param('id').isInt({ min: 1 }), body('title').optional().trim().notEmpty().isLength({ max: 100 }),
  body('company_name').optional().trim().notEmpty().isLength({ max: 150 }), handleValidation
], (req, res) => {
  const group = db.prepare('SELECT id FROM payroll_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: 'Payroll group not found' });
  const fields = ['title', 'company_name'].filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (fields.length) db.prepare(`UPDATE payroll_groups SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`).run(...fields.map(field => req.body[field]), req.params.id);
  res.json({ group: db.prepare('SELECT * FROM payroll_groups WHERE id = ?').get(req.params.id) });
});

router.delete('/payroll/groups/:id', [param('id').isInt({ min: 1 }), handleValidation], (req, res) => {
  const group = db.prepare('SELECT id FROM payroll_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: 'Payroll group not found' });
  const employeeCount = db.prepare('SELECT COUNT(*) AS count FROM payroll_employees WHERE group_id = ? AND is_active = 1').get(req.params.id).count;
  if (employeeCount > 0) return res.status(409).json({ error: 'Remove or reassign employees before deleting this group' });
  db.prepare('DELETE FROM payroll_groups WHERE id = ?').run(req.params.id);
  res.json({ message: 'Payroll group deleted' });
});

router.get('/payroll/employees', (req, res) => {
  res.json({ employees: db.prepare(`SELECT pe.*, pg.title AS group_title, pg.company_name
    FROM payroll_employees pe LEFT JOIN payroll_groups pg ON pg.id = pe.group_id
    WHERE pe.user_id = ? AND pe.is_active = 1 ORDER BY pg.title, pe.full_name`).all(req.user.id) });
});

router.post('/payroll/employees', [
  body('group_id').isInt({ min: 1 }), body('full_name').trim().notEmpty(), body('email').optional().isEmail(), body('bank_name').trim().notEmpty(),
  body('account_name').trim().notEmpty(), body('account_number').matches(/^\d{10}$/), body('department').trim().notEmpty(), body('role').trim().notEmpty(), handleValidation
], (req, res) => {
  const { group_id, full_name, email, bank_name, account_name, account_number, department, role } = req.body;
  const group = db.prepare('SELECT id FROM payroll_groups WHERE id = ? AND user_id = ?').get(group_id, req.user.id);
  if (!group) return res.status(404).json({ error: 'Payroll group not found' });
  const result = db.prepare('INSERT INTO payroll_employees (user_id, group_id, full_name, email, bank_name, account_name, account_number, department, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, group_id, full_name, email || null, bank_name, account_name, account_number, department, role);
  res.status(201).json({ employee: db.prepare('SELECT * FROM payroll_employees WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/payroll/employees/:id', [
  param('id').isInt({ min: 1 }), body('full_name').optional().trim().notEmpty(), body('email').optional().isEmail(), body('bank_name').optional().trim().notEmpty(),
  body('group_id').optional().isInt({ min: 1 }), body('account_name').optional().trim().notEmpty(), body('account_number').optional().matches(/^\d{10}$/),
  body('department').optional().trim().notEmpty(), body('role').optional().trim().notEmpty(), handleValidation
], (req, res) => {
  const employee = db.prepare('SELECT id FROM payroll_employees WHERE id = ? AND user_id = ? AND is_active = 1').get(req.params.id, req.user.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  if (req.body.group_id && !db.prepare('SELECT id FROM payroll_groups WHERE id = ? AND user_id = ?').get(req.body.group_id, req.user.id)) return res.status(404).json({ error: 'Payroll group not found' });
  const fields = ['group_id', 'full_name', 'email', 'bank_name', 'account_name', 'account_number', 'department', 'role'];
  const updates = fields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (updates.length) db.prepare(`UPDATE payroll_employees SET ${updates.map(field => `${field} = ?`).join(', ')} WHERE id = ?`).run(...updates.map(field => req.body[field] || null), req.params.id);
  res.json({ employee: db.prepare('SELECT * FROM payroll_employees WHERE id = ?').get(req.params.id) });
});

router.delete('/payroll/employees/:id', [param('id').isInt({ min: 1 }), handleValidation], (req, res) => {
  const result = db.prepare('UPDATE payroll_employees SET is_active = 0 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Employee not found' });
  res.json({ message: 'Employee removed from payroll' });
});

router.get('/payroll/runs', (req, res) => {
  const runs = db.prepare(`SELECT pr.*, a.account_number,
    (SELECT COUNT(*) FROM payroll_items pi WHERE pi.payroll_run_id = pr.id) AS employee_count
    FROM payroll_runs pr JOIN accounts a ON a.id = pr.from_account_id
    WHERE pr.user_id = ? ORDER BY pr.scheduled_for DESC LIMIT 50`).all(req.user.id);
  res.json({ runs });
});

router.get('/payroll/runs/:id/payments', [param('id').isInt({ min: 1 }), handleValidation], (req, res) => {
  const run = db.prepare('SELECT id FROM payroll_runs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });
  const payments = db.prepare(`SELECT id, employee_name, bank_name, account_name, account_number, amount,
    scheduled_for, status, reference_id, executed_at
    FROM salary_payments WHERE payroll_run_id = ? ORDER BY employee_name`).all(run.id);
  res.json({ payments });
});

router.post('/payroll/runs', [
  body('from_account_id').isInt({ min: 1 }), body('scheduled_for').isISO8601(), body('items').isArray({ min: 1 }),
  body('items.*.employee_id').isInt({ min: 1 }), body('items.*.amount').isFloat({ min: 0.01, max: 100000000 }), handleValidation
], (req, res) => {
  const { from_account_id, scheduled_for, items } = req.body;
  const dueAt = new Date(scheduled_for);
  if (Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return res.status(400).json({ error: 'Payroll due date must be in the future' });
  if (!accountForUser(from_account_id, req.user.id)) return res.status(404).json({ error: 'Account not found' });
  const employeeIds = [...new Set(items.map(item => Number(item.employee_id)))];
  const employees = db.prepare(`SELECT id FROM payroll_employees WHERE user_id = ? AND is_active = 1 AND id IN (${employeeIds.map(() => '?').join(',')})`).all(req.user.id, ...employeeIds);
  if (employees.length !== employeeIds.length) return res.status(400).json({ error: 'Every payroll employee must be active and belong to you' });
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const runId = db.transaction(() => {
    const run = db.prepare('INSERT INTO payroll_runs (user_id, from_account_id, scheduled_for, total_amount) VALUES (?, ?, ?, ?)').run(req.user.id, from_account_id, dueAt.toISOString(), total);
    const insert = db.prepare('INSERT INTO payroll_items (payroll_run_id, employee_id, amount) VALUES (?, ?, ?)');
    const insertSalary = db.prepare(`INSERT INTO salary_payments
      (payroll_run_id, payroll_item_id, employer_user_id, from_account_id, employee_id, employee_name, bank_name, account_name, account_number, amount, scheduled_for, reference_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    items.forEach(item => {
      const payrollItem = insert.run(run.lastInsertRowid, item.employee_id, item.amount);
      const employee = db.prepare('SELECT full_name, bank_name, account_name, account_number FROM payroll_employees WHERE id = ?').get(item.employee_id);
      insertSalary.run(run.lastInsertRowid, payrollItem.lastInsertRowid, req.user.id, from_account_id, item.employee_id, employee.full_name, employee.bank_name, employee.account_name, employee.account_number, item.amount, dueAt.toISOString(), uuidv4());
    });
    return run.lastInsertRowid;
  })();
  res.status(201).json({ run: db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(runId), message: 'Payroll created. Authorize it before the due date to allow execution.' });
});

router.post('/payroll/runs/:id/authorize', [param('id').isInt({ min: 1 }), handleValidation], (req, res) => {
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });
  if (run.status !== 'pending_authorization') return res.status(400).json({ error: 'Only pending payroll can be authorized' });
  if (new Date(run.scheduled_for) <= new Date()) {
    db.prepare("UPDATE payroll_runs SET status = 'expired' WHERE id = ? AND status = 'pending_authorization'").run(run.id);
    return res.status(400).json({ error: 'Authorization must happen before the due date and time' });
  }
  db.prepare("UPDATE payroll_runs SET status = 'authorized', authorized_at = datetime('now') WHERE id = ?").run(run.id);
  res.json({ message: 'Payroll authorized', run: db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(run.id) });
});

router.post('/payroll/runs/:id/cancel', [param('id').isInt({ min: 1 }), handleValidation], (req, res) => {
  const result = db.prepare("UPDATE payroll_runs SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status IN ('pending_authorization', 'authorized')").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(400).json({ error: 'Payroll cannot be cancelled in its current state' });
  res.json({ message: 'Payroll cancelled' });
});

async function executeDuePayrolls() {
  db.prepare("UPDATE payroll_runs SET status = 'expired' WHERE status = 'pending_authorization' AND julianday(scheduled_for) <= julianday('now')").run();
  const dueRuns = db.prepare("SELECT * FROM payroll_runs WHERE status = 'authorized' AND julianday(scheduled_for) <= julianday('now')").all();
  for (const run of dueRuns) {
    try {
      db.transaction(() => {
        const claimed = db.prepare("UPDATE payroll_runs SET status = 'processing' WHERE id = ? AND status = 'authorized'").run(run.id);
        if (!claimed.changes) return;
        const account = accountForUser(run.from_account_id, run.user_id);
        if (!account || account.balance < run.total_amount) throw new Error('Insufficient funds for payroll');
        const lockErr = ensureWithdrawAllowed(account);
        if (lockErr) throw new Error(lockErr.message);
        const payments = db.prepare("SELECT * FROM salary_payments WHERE payroll_run_id = ? AND status = 'scheduled'").all(run.id);
        for (const payment of payments) {
          const claimedPayment = db.prepare("UPDATE salary_payments SET status = 'processing' WHERE id = ? AND status = 'scheduled'").run(payment.id);
          if (!claimedPayment.changes) continue;
          db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(payment.amount, account.id);
          const balance = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(account.id).balance;
          db.prepare("INSERT INTO transactions (from_account_id, transaction_type, amount, balance_after, description, reference_id) VALUES (?, 'bill_payment', ?, ?, ?, ?)").run(account.id, payment.amount, balance, `Salary payment to ${payment.employee_name} (${payment.bank_name} ${payment.account_number})`, payment.reference_id);
          db.prepare("UPDATE payroll_items SET status = 'paid', reference_id = ? WHERE id = ?").run(payment.reference_id, payment.payroll_item_id);
          db.prepare("UPDATE salary_payments SET status = 'completed', executed_at = datetime('now') WHERE id = ?").run(payment.id);
        }
        db.prepare("UPDATE payroll_runs SET status = 'completed', executed_at = datetime('now') WHERE id = ?").run(run.id);
      })();
    } catch (error) {
      db.prepare("UPDATE payroll_runs SET status = 'failed' WHERE id = ?").run(run.id);
      db.prepare("UPDATE salary_payments SET status = 'failed' WHERE payroll_run_id = ? AND status IN ('scheduled', 'processing')").run(run.id);
    }
  }
}

module.exports = router;
module.exports.executeDuePayrolls = executeDuePayrolls;
