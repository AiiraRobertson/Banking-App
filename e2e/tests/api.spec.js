// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('API smoke @smoke', () => {
  test('health endpoint reachable', async ({ api }) => {
    expect(await api.health()).toBe(true);
  });

  test('profile API returns the logged-in user', async ({ api }) => {
    const user = await api.getProfile();
    expect(user).toBeTruthy();
    expect(user.email).toBeTruthy();
  });

  test('accounts API returns at least one account', async ({ api }) => {
    const accounts = await api.getAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]).toHaveProperty('account_number');
  });
});
