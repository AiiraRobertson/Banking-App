// @ts-check
const { test, expect } = require('../fixtures/authFixture');
const { wireRecipient } = require('../utils/testData');

test.describe('Transfer flows @regression', () => {
  test('renders all three transfer modes', async ({ transferPage }) => {
    await transferPage.goto();
    await transferPage.expectLoaded();
    await expect(transferPage.modeOwn).toBeVisible();
    await expect(transferPage.modeOther).toBeVisible();
    await expect(transferPage.modeBank).toBeVisible();
  });

  test('transfer between own accounts succeeds', async ({ transferPage, api }) => {
    const accounts = await api.getAccounts();
    test.skip(accounts.length < 2, 'Needs at least 2 own accounts');

    await transferPage.goto();
    await transferPage.expectLoaded();
    await transferPage.transferOwn({ amount: 5, description: 'E2E own->own' });
    await transferPage.expectSuccess();
  });

  test('Other Bank: Nigeria selection reveals supported bank and SWIFT fields', async ({ transferPage }) => {
    await transferPage.goto();
    await transferPage.expectLoaded();
    await transferPage.selectMode('bank');
    await transferPage.countrySelect.selectOption(wireRecipient.countryCode);
    await expect(transferPage.swiftInput).toBeVisible({ timeout: 5000 });
    await expect(transferPage.bankSelect).toBeVisible();
    await expect(transferPage.bankSelect.locator('option', { hasText: wireRecipient.bank })).toHaveCount(1);
    await expect(transferPage.ibanInput).toHaveCount(0);
  });

  test('Other Bank: destination quote appears after entering amount', async ({ page, transferPage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Skipping on mobile - quote layout differs');
    
    await transferPage.goto();
    await transferPage.selectMode('bank');
    await transferPage.countrySelect.selectOption(wireRecipient.countryCode);
    await transferPage.amount.fill('50');
    await page.waitForResponse(r => r.url().includes('/api/wire/quote'), { timeout: 30000 });
    await expect(page.getByText(/recipient gets/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/exchange rate/i)).toBeVisible({ timeout: 30000 });
  });
});
