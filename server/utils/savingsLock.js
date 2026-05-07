const db = require('../db/database');

const MIN_DAYS = 15;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;

function isLocked(account) {
  if (!account || account.account_type !== 'savings') return false;
  if (!account.matures_at) return false;
  return new Date(account.matures_at).getTime() > Date.now();
}

function daysUntilMaturity(account) {
  if (!account?.matures_at) return 0;
  const ms = new Date(account.matures_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Call this after a credit hits a savings account.
// Sets matures_at to now + maturity_days if currently unlocked, otherwise extends to whichever is later.
function applyLockOnDeposit(accountId) {
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  if (!acc || acc.account_type !== 'savings') return;
  const days = acc.maturity_days || DEFAULT_DAYS;
  const newMaturity = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const current = acc.matures_at ? new Date(acc.matures_at).toISOString() : null;
  const finalMaturity = !current || newMaturity > current ? newMaturity : current;
  db.prepare('UPDATE accounts SET matures_at = ? WHERE id = ?').run(finalMaturity, accountId);
}

function ensureWithdrawAllowed(account) {
  if (isLocked(account)) {
    const days = daysUntilMaturity(account);
    const err = new Error(
      `Savings account is locked for ${days} more day${days === 1 ? '' : 's'} (matures ${new Date(account.matures_at).toLocaleDateString()}). ` +
      'Withdrawals are not permitted until the maturity date.'
    );
    err.status = 423;
    err.code = 'SAVINGS_LOCKED';
    return err;
  }
  return null;
}

module.exports = {
  MIN_DAYS,
  MAX_DAYS,
  DEFAULT_DAYS,
  isLocked,
  daysUntilMaturity,
  applyLockOnDeposit,
  ensureWithdrawAllowed,
};
