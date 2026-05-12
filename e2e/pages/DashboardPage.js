// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { SidebarComponent } = require('./SidebarComponent');

class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.sidebar = new SidebarComponent(page);
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.welcome = page.getByText(/welcome back/i);
    this.totalBalanceCard = page.locator('text=Total Balance').locator('..');
    this.accountsList = page.getByText('Your Accounts').locator('..');
    this.quickActions = page.getByText('Quick Actions').locator('..');
    this.recentTxTable = page.getByText('Recent Transactions').locator('..');
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.welcome).toBeVisible();
  }

  async quickAction(label) {
    await this.quickActions.getByRole('link', { name: new RegExp(label, 'i') }).click();
  }
}

module.exports = { DashboardPage };
