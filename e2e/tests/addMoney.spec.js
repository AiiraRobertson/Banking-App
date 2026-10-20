// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Add Money receiving details @regression', () => {
  test('shows the authenticated user account details and internal-transfer notice', async ({ page, api }) => {
    const accounts = await api.getAccounts();
    const account = accounts[0];
    await page.goto('/add-money');

    await expect(page.getByRole('heading', { name: 'Add Money' })).toBeVisible();
    await expect(page.getByText('Kapita (simulated)')).toBeVisible();
    await expect(page.getByText(account.account_number, { exact: true })).toBeVisible();
    await expect(page.getByText(/external bank transfers are not available/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /card|crypto|add \$/i })).toHaveCount(0);
  });

  test('copies the selected account number and confirms success', async ({ page, context, api }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const account = (await api.getAccounts())[0];
    await page.goto('/add-money');

    await page.getByRole('button', { name: 'Copy account number', exact: true }).last().click();
    await expect(page.getByRole('status')).toHaveText('Account number copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(account.account_number);
  });
});
