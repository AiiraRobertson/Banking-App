const db = require('../db/database');

const insertLog = db.prepare(`
  INSERT INTO alert_log (user_id, channel, destination, subject, body, delivery_status, reference_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function fmtAmount(n) {
  return `$${Number(n).toFixed(2)}`;
}

function buildMessage({ direction, amount, accountNumber, balanceAfter, counterparty, channel }) {
  const last4 = accountNumber ? `****${String(accountNumber).slice(-4)}` : 'your account';
  const verb = direction === 'credit' ? 'credited to' : 'debited from';
  const arrow = direction === 'credit' ? '+' : '-';
  const subject = `${direction === 'credit' ? 'Credit' : 'Debit'} alert: ${arrow}${fmtAmount(amount)}`;
  const lines = [
    `${arrow}${fmtAmount(amount)} has been ${verb} ${last4}.`,
    counterparty ? `Counterparty: ${counterparty}` : null,
    balanceAfter !== undefined && balanceAfter !== null ? `Available balance: ${fmtAmount(balanceAfter)}` : null,
    `Time: ${new Date().toLocaleString()}`,
    channel === 'sms' ? null : 'If you did not authorize this, contact SecureBank immediately.'
  ].filter(Boolean);
  return { subject, body: lines.join(channel === 'sms' ? ' ' : '\n') };
}

function logSimulatedDelivery(channel, destination, subject, body) {
  const banner = channel === 'email' ? '[EMAIL ALERT]' : channel === 'sms' ? '[SMS ALERT]' : '[ALERT]';
  console.log(`${banner} -> ${destination || '(no destination)'} | ${subject}`);
  if (channel === 'email') {
    console.log(body.split('\n').map(l => `   ${l}`).join('\n'));
  } else {
    console.log(`   ${body}`);
  }
}

function sendTransactionAlert({
  userId,
  direction,
  amount,
  accountNumber,
  balanceAfter,
  counterparty,
  referenceId
}) {
  if (!userId || !amount || amount <= 0) return;

  const user = db.prepare(
    'SELECT email, phone, alert_phone, email_alerts, sms_alerts, alert_min_amount FROM users WHERE id = ?'
  ).get(userId);
  if (!user) return;

  const minAmount = Number(user.alert_min_amount || 0);
  if (amount < minAmount) {
    insertLog.run(userId, 'inapp', null, `Suppressed (below ${fmtAmount(minAmount)} threshold)`, '', 'skipped', referenceId || null);
    return;
  }

  const wantsEmail = !!user.email_alerts && !!user.email;
  const phone = user.alert_phone || user.phone;
  const wantsSms = !!user.sms_alerts && !!phone;

  if (wantsEmail) {
    const { subject, body } = buildMessage({ direction, amount, accountNumber, balanceAfter, counterparty, channel: 'email' });
    try {
      logSimulatedDelivery('email', user.email, subject, body);
      insertLog.run(userId, 'email', user.email, subject, body, 'simulated', referenceId || null);
    } catch (err) {
      insertLog.run(userId, 'email', user.email, subject, body, 'failed', referenceId || null);
    }
  }

  if (wantsSms) {
    const { subject, body } = buildMessage({ direction, amount, accountNumber, balanceAfter, counterparty, channel: 'sms' });
    try {
      logSimulatedDelivery('sms', phone, subject, body);
      insertLog.run(userId, 'sms', phone, subject, body, 'simulated', referenceId || null);
    } catch (err) {
      insertLog.run(userId, 'sms', phone, subject, body, 'failed', referenceId || null);
    }
  }

  if (!wantsEmail && !wantsSms) {
    const { subject, body } = buildMessage({ direction, amount, accountNumber, balanceAfter, counterparty, channel: 'inapp' });
    insertLog.run(userId, 'inapp', null, subject, body, 'skipped', referenceId || null);
  }
}

module.exports = { sendTransactionAlert };
