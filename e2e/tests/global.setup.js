// @ts-check
const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { ApiClient } = require('../utils/api');
const { BASE_URL } = require('../playwright.config');
const { users } = require('../utils/testData');

const authDir = path.join(__dirname, '..', '.auth');
const userFile = path.join(authDir, 'user.json');

/** @param {unknown} e */
const msg = (e) => (e instanceof Error ? e.message : String(e));

setup('authenticate as primary user', async ({ page, context }) => {
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  let token = null;
  let api = null;

  try {
    // Authenticate via the API (carries the E2E bypass header so the auth
    // rate-limiter does not affect setup), then inject the token into the
    // browser's localStorage so the SPA boots already signed in.
    api = await ApiClient.create();
    const result = await api.login(users.primary.email, users.primary.password);
    token = result.token;
  } catch (error) {
    console.error('API login failed:', msg(error));
    // Fallback: try UI-based login if API fails
    await page.goto(BASE_URL);
    const loginPage = page.url();
    console.log('Falling back to UI login at:', loginPage);
    throw new Error(`Setup: API login failed and cannot fallback. ${msg(error)}`);
  } finally {
    // Ensure API client is properly disposed
    if (api) {
      try {
        await api.dispose();
      } catch (e) {
        console.warn('Warning: API client disposal failed:', msg(e));
      }
    }
  }

  // Inject token and navigate
  await page.goto(BASE_URL);
  if (token) {
    await page.evaluate((t) => window.localStorage.setItem('token', t), token);
  }
  await page.goto('/');

  // Wait for dashboard to load (with extended timeout for slower connections)
  try {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
  } catch (error) {
    console.error('Dashboard did not load:', msg(error));
    throw error;
  }

  // Save storage state
  await context.storageState({ path: userFile });
});
