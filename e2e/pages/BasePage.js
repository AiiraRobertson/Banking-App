// @ts-check
const { expect } = require('@playwright/test');

/**
 * Common building block every page object extends.
 * Holds the Playwright `page` handle and shared helpers.
 */
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async expectUrl(pattern) {
    await expect(this.page).toHaveURL(pattern);
  }

  async expectHeading(text) {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  /** Visible toast/banner error message */
  async expectErrorContains(text) {
    await expect(this.page.locator('.bg-red-50, [role="alert"]').first()).toContainText(text);
  }

  async clickByText(text) {
    await this.page.getByText(text, { exact: false }).first().click();
  }

  async fill(selector, value) {
    const el = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await el.fill(value);
  }

  async waitForApi(urlSubstring, action) {
    const [resp] = await Promise.all([
      this.page.waitForResponse(r => r.url().includes(urlSubstring) && r.request().method() !== 'OPTIONS'),
      action(),
    ]);
    return resp;
  }
}

module.exports = { BasePage };
