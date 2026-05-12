// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class ProfilePage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /profile/i });
    this.emailAlertsCheckbox = page.locator('input[type="checkbox"]').first();
    this.smsAlertsCheckbox = page.locator('input[type="checkbox"]').nth(1);
    this.alertPhoneInput = page.locator('input[placeholder*="phone"], input[type="tel"]').first();
    this.alertMinAmount = page.locator('input[type="number"]').first();
    this.saveButton = page.getByRole('button', { name: /save|update/i }).first();
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}

module.exports = { ProfilePage };
