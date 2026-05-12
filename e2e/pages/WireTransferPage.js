// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class WireTransferPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /wire transfer/i });
  }

  async goto() {
    await this.page.goto('/wire-transfer');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}

module.exports = { WireTransferPage };
