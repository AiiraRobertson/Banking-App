// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Dashboard @smoke', () => {
  test('renders heading, balance, and quick actions', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
    await expect(dashboardPage.totalBalanceCard).toBeVisible();
    await expect(dashboardPage.quickActions).toBeVisible();
    await expect(dashboardPage.recentTxTable).toBeVisible();
  });

  test('sidebar lists all main nav entries', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.expectVisible();
    for (const label of ['Dashboard', 'Accounts', 'Transfer', 'Wire Transfer', 'Transactions', 'Profile']) {
      await dashboardPage.sidebar.link(label).first().waitFor();
    }
  });

  test('quick action navigates to Transfer page', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
    await dashboardPage.quickAction('Transfer');
    await expect(page).toHaveURL(/\/transfer/);
  });
});
