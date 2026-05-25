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

  test('Other Bank: country selection reveals SWIFT/IBAN fields', async ({ transferPage }) => {
    await transferPage.goto();
    await transferPage.expectLoaded();
    await transferPage.selectMode('bank');
    await transferPage.countrySelect.selectOption(wireRecipient.countryCode);
    await expect(transferPage.swiftInput).toBeVisible({ timeout: 5000 });
    await expect(transferPage.ibanInput).toBeVisible();
  });

  test('Other Bank: live quote appears after entering amount', async ({ page, transferPage, isMobile }) => {
    test.skip(isMobile, 'Skipping on mobile - quote layout differs');
    
    await transferPage.goto();
    await transferPage.selectMode('bank');
    await transferPage.countrySelect.selectOption(wireRecipient.countryCode);
    await transferPage.amount.fill('50');
    await page.waitForResponse(r => r.url().includes('/api/wire/quote'), { timeout: 30000 });
    await expect(page.getByText(/recipient gets/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/exchange rate/i)).toBeVisible({ timeout: 30000 });
  });
});
