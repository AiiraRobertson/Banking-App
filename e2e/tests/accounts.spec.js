// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Accounts @smoke', () => {
  test('lists at least one account card', async ({ accountsPage }) => {
    await accountsPage.goto();
    await accountsPage.expectLoaded();
    expect(await accountsPage.countCards()).toBeGreaterThan(0);
  });

  test('clicking a card navigates to detail page', async ({ page, accountsPage }) => {
    await accountsPage.goto();
    await accountsPage.expectLoaded();
    await accountsPage.openFirst();
    await expect(page).toHaveURL(/\/accounts\/\d+/);
  });
});
