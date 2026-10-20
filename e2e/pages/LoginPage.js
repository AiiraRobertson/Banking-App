// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    this.registerLink = page.getByRole('link', { name: /sign up|register|create/i });
    this.errorBanner = page.locator('.bg-red-50, [role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  /** @param {string} email @param {string} password */
  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    const [resp] = await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/auth/login')),
      this.submitButton.click(),
    ]);
    return resp;
  }

  async expectLoaded() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /** @param {string} message */
  async expectError(message) {
    await expect(this.errorBanner).toContainText(message);
  }
}

module.exports = { LoginPage };
