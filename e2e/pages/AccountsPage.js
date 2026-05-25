// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/** @param {unknown} e */
const msg = (e) => (e instanceof Error ? e.message : String(e));

class AccountsPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /accounts/i }).first();
    this.cards = page.locator('a[href^="/accounts/"]');
  }

  async goto() {
    await this.page.goto('/accounts', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded() {
    try {
      await expect(this.heading).toBeVisible({ timeout: 30000 });
      await expect(this.cards.first()).toBeVisible({ timeout: 30000 });
    } catch (error) {
      console.error('AccountsPage failed to load:', msg(error));
      throw error;
    }
  }

  async openFirst() {
    await this.cards.first().click();
    // Wait for navigation to complete
    await this.page.waitForURL(/\/accounts\/.+/, { timeout: 30000 });
  }

  async countCards() {
    return this.cards.count();
  }
}

module.exports = { AccountsPage };
