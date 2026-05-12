// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class AccountsPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /accounts/i }).first();
    this.cards = page.locator('a[href^="/accounts/"]');
  }

  async goto() {
    await this.page.goto('/accounts');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.cards.first()).toBeVisible();
  }

  async openFirst() {
    await this.cards.first().click();
  }

  async countCards() {
    return this.cards.count();
  }
}

module.exports = { AccountsPage };
