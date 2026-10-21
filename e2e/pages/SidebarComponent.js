// @ts-check
const { expect } = require('@playwright/test');

class SidebarComponent {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('aside');
    this.brand = this.root.getByText('Kapita', { exact: true });
  }

  /** @param {string} label */
  link(label) {
    return this.root.getByRole('link', { name: new RegExp(`^${label}$`, 'i') });
  }

  /** @param {string} label */
  async goTo(label) {
    await this.link(label).click();
  }

  /** @param {string} label */
  async expectActive(label) {
    await expect(this.link(label)).toHaveClass(/nav-active|border-l-3/);
  }

  async expectVisible() {
    await expect(this.brand).toBeVisible();
  }
}

module.exports = { SidebarComponent };
