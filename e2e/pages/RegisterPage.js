// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    this.firstName = page.locator('input[name="first_name"], input[placeholder*="First"]').first();
    this.lastName = page.locator('input[name="last_name"], input[placeholder*="Last"]').first();
    this.email = page.locator('input[type="email"]');
    this.password = page.locator('input[type="password"]').first();
    this.submit = page.getByRole('button', { name: /create|register|sign up/i });
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register({ firstName, lastName, email, password }) {
    await this.firstName.fill(firstName);
    await this.lastName.fill(lastName);
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectLoaded() {
    await expect(this.email).toBeVisible();
    await expect(this.password).toBeVisible();
  }
}

module.exports = { RegisterPage };
