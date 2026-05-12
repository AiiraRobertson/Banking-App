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
 * Extended fixture set. `authedPage` boots the browser already signed in
 * (storageState reused from the setup project). Page objects are provided
 * as lazy factories so a test only constructs what it needs.
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

  api: async ({}, use) => {
    const client = await ApiClient.create();
    await client.login(users.primary.email, users.primary.password);
    await use(client);
    await client.dispose();
  },
});

const { expect } = base;

module.exports = { test, expect };
