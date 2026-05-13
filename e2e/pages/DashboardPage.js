// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { SidebarComponent } = require('./SidebarComponent');

class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.sidebar = new SidebarComponent(page);
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { name: 'Dashboard' });
    this.welcome = this.main.getByText(/welcome back/i).first();
    this.totalBalanceCard = this.main.getByText('Total Balance').locator('..');
    this.accountsList = this.main.getByRole('heading', { name: 'Your Accounts' }).locator('..');
    this.quickActions = this.main.getByRole('heading', { name: 'Quick Actions' }).locator('..');
    this.recentTxTable = this.main.getByRole('heading', { name: 'Recent Transactions' }).locator('..');
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
