// @ts-check
const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { ApiClient } = require('../utils/api');
const { BASE_URL } = require('../playwright.config');
const { users } = require('../utils/testData');

const authDir = path.join(__dirname, '..', '.auth');
const userFile = path.join(authDir, 'user.json');

setup('authenticate as primary user', async ({ page }) => {
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  // Authenticate via the API (carries the E2E bypass header so the auth
  // rate-limiter does not affect setup), then inject the token into the
  // browser's localStorage so the SPA boots already signed in.
  const api = await ApiClient.create();
  const { token } = await api.login(users.primary.email, users.primary.password);
  await api.dispose();

  await page.goto(BASE_URL);
  await page.evaluate((t) => window.localStorage.setItem('token', t), token);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });

  await page.context().storageState({ path: userFile });
});
