// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { users } = require('../utils/testData');

test.describe('Authentication @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // start signed-out

  test('login page renders', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.expectLoaded();
  });

  test('invalid credentials show error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    const resp = await login.login('nobody@example.com', 'WrongPass1!');
    expect([400, 401]).toContain(resp.status());
  });

  test('valid login lands on dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    const resp = await login.login(users.primary.email, users.primary.password);
    expect(resp.status()).toBe(200);
    await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
  });
});
