export function getMaturityInfo(account) {
  if (!account || account.account_type !== 'savings') {
    return { isSavings: false, locked: false, daysRemaining: 0, maturesAt: null };
  }
  const maturesAt = account.matures_at ? new Date(account.matures_at) : null;
  if (!maturesAt) {
    return { isSavings: true, locked: false, daysRemaining: 0, maturesAt: null };
  }
  const ms = maturesAt.getTime() - Date.now();
  const locked = ms > 0;
  const daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return { isSavings: true, locked, daysRemaining, maturesAt };
}

export function formatMaturityDate(maturesAt) {
  if (!maturesAt) return null;
  const d = maturesAt instanceof Date ? maturesAt : new Date(maturesAt);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
