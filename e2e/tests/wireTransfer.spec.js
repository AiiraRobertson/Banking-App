// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Wire Transfer page @regression', () => {
  test('loads with heading', async ({ wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Skipping on mobile - heading layout differs');
    
    await wirePage.goto();
    await wirePage.expectLoaded();
  });

  test('countries endpoint feeds the page', async ({ page, wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Skipping on mobile - timeout handling differs');
    
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/wire/countries'), { timeout: 30000 }),
      wirePage.goto(),
    ]);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.countries).toBeTruthy();
    expect(Object.keys(body.countries).length).toBeGreaterThan(0);
  });

  test('outbound destinations contain only Nigeria and Ghana', async ({ page, wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Destination layout assertions run on desktop viewports');

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/wire/destinations'), { timeout: 30000 }),
      wirePage.goto(),
    ]);
    expect(response.status()).toBe(200);
    const { destinations } = await response.json();
    expect(destinations.map(country => country.code)).toEqual(['NG', 'GH']);
    await expect(page.getByRole('button', { name: /Nigeria/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ghana/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /United States|Canada|United Kingdom|Kenya/ })).toHaveCount(0);
  });

  test('recipient bank options track the selected country and reset on switch', async ({ page, wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Destination layout assertions run on desktop viewports');

    await wirePage.goto();
    await page.getByRole('button', { name: /Nigeria/ }).click();
    await page.getByRole('button', { name: 'Next' }).first().click();
    const bankSelect = page.getByRole('combobox', { name: 'Recipient bank' });
    await expect(bankSelect.locator('option')).toHaveCount(9);
    await bankSelect.selectOption({ label: 'Guaranty Trust Bank' });
    const accountNumber = page.getByLabel('Account Number');
    await accountNumber.fill('0123456789');
    await page.getByRole('button', { name: 'Back' }).click();

    await page.getByRole('button', { name: /Ghana/ }).click();
    await page.getByRole('button', { name: 'Next' }).first().click();
    await expect(bankSelect.locator('option')).toHaveCount(7);
    await expect(bankSelect).toHaveValue('');
    await expect(accountNumber).toHaveValue('');
    await expect(bankSelect.locator('option', { hasText: 'Guaranty Trust Bank' })).toHaveCount(0);
    await expect(bankSelect.locator('option', { hasText: 'GCB Bank' })).toHaveCount(1);
  });
});
