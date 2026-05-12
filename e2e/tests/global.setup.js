// @ts-check
const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { users } = require('../utils/testData');

const authDir = path.join(__dirname, '..', '.auth');
const userFile = path.join(authDir, 'user.json');

setup('authenticate as primary user', async ({ page }) => {
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.expectLoaded();
  const resp = await loginPage.login(users.primary.email, users.primary.password);
  expect(resp.status(), 'login API returned non-200').toBe(200);
  await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 15000 });

  // Persist storage so all other projects start signed in
  await page.context().storageState({ path: userFile });
});
