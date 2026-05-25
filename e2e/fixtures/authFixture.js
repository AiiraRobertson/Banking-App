// @ts-check
const base = require('@playwright/test');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { TransferPage } = require('../pages/TransferPage');
const { WireTransferPage } = require('../pages/WireTransferPage');
const { AccountsPage } = require('../pages/AccountsPage');
const { ProfilePage } = require('../pages/ProfilePage');
const { RegisterPage } = require('../pages/RegisterPage');
const { ApiClient } = require('../utils/api');
const { users } = require('../utils/testData');

const userStorage = path.join(__dirname, '..', '.auth', 'user.json');

/**
 * @typedef {object} KapitaFixtures
 * @property {LoginPage} loginPage
 * @property {RegisterPage} registerPage
 * @property {DashboardPage} dashboardPage
 * @property {TransferPage} transferPage
 * @property {WireTransferPage} wirePage
 * @property {AccountsPage} accountsPage
 * @property {ProfilePage} profilePage
 * @property {boolean} isNarrowViewport
 * @property {ApiClient} api
 */

/**
 * Extended fixture set. The `storageState` option boots the browser already
 * signed in (reusing state from the setup project). Page objects are provided
 * as lazy factories so a test only constructs what it needs.
 *
 * @type {ReturnType<typeof base.test.extend<KapitaFixtures>>}
 */
const test = base.test.extend({
  // Storage state for authenticated user
  storageState: userStorage,

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  wirePage: async ({ page }, use) => use(new WireTransferPage(page)),
  accountsPage: async ({ page }, use) => use(new AccountsPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),

  // Narrow-viewport detection (Pixel 7 etc.) — distinct from Playwright's
  // built-in `isMobile` which only reflects device emulation, not viewport width.
  isNarrowViewport: async ({ page }, use) => {
    const viewportSize = page.viewportSize();
    const narrow = !!(viewportSize && viewportSize.width < 600);
    await use(narrow);
  },

  api: async ({}, use) => {
    const client = await ApiClient.create();
    await client.login(users.primary.email, users.primary.password);
    await use(client);
    await client.dispose();
  },
});

const { expect } = base;

module.exports = { test, expect };
