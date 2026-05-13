// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class TransferPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Transfer' });
    this.fromAccount = page.locator('select').first();
    this.modeOwn = page.getByRole('button', { name: /^my account$/i });
    this.modeOther = page.getByRole('button', { name: /^other account$/i });
    this.modeBank = page.getByRole('button', { name: /^other bank$/i });
    this.toAccountSelect = page.locator('select').nth(1);
    this.amount = page.locator('input[type="number"]');
    this.description = page.locator('input[placeholder*="What\'s this for"]');
    this.reviewButton = page.getByRole('button', { name: /review transfer/i });
    this.confirmButton = page.getByRole('button', { name: /^confirm transfer$/i });
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i });
    this.successHeading = page.getByRole('heading', { name: /transfer (successful|completed|initiated)/i });
    this.newTransactionButton = page.getByRole('button', { name: /new transaction/i });

    // Other Account
    this.beneficiaryInput = page.locator('input[placeholder*="account number"]');
    this.recipientNameInput = page.locator('input[placeholder*="Recipient name"]');

    // Other Bank
    this.countrySelect = page.locator('select').nth(1);
    this.bankSelect = page.getByRole('combobox').nth(2);
    this.bankNameInput = page.locator('input[placeholder="Bank name"]');
    this.swiftInput = page.locator('input[placeholder*="BARCGB22"]');
    this.ibanInput = page.locator('input[placeholder*="GB29NWBK"]');
    this.routingInput = page.locator('input[placeholder*="9-digit routing"]');
    this.recipientAccountInput = page.locator('input[placeholder="Account number"]');
    this.recipientFullNameInput = page.locator('input[placeholder*="Full name"]');
  }

  async goto() {
    await this.page.goto('/transfer');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.fromAccount).toBeVisible();
  }

  async selectMode(mode) {
    if (mode === 'own') await this.modeOwn.click();
    else if (mode === 'other') await this.modeOther.click();
    else if (mode === 'bank') await this.modeBank.click();
  }

  async transferOwn({ amount, description = 'E2E own transfer' }) {
    await this.selectMode('own');
    const opts = await this.toAccountSelect.locator('option').allTextContents();
    if (opts.length > 1) await this.toAccountSelect.selectOption({ index: 1 });
    await this.amount.fill(String(amount));
    if (description) await this.description.fill(description);
    await this.reviewButton.click();
    await this.confirmButton.click();
  }

  async transferToAccount({ accountNumber, amount, name = 'E2E Recipient', description = 'E2E peer transfer' }) {
    await this.selectMode('other');
    await this.beneficiaryInput.fill(accountNumber);
    await this.page.waitForTimeout(500);
    if (await this.recipientNameInput.isVisible()) await this.recipientNameInput.fill(name);
    await this.amount.fill(String(amount));
    if (description) await this.description.fill(description);
    await this.reviewButton.click();
    await this.confirmButton.click();
  }

  async transferToBank({ countryCode, recipientName, bank, account, swift, iban, routing, amount, description = 'E2E external bank' }) {
    await this.selectMode('bank');
    await this.countrySelect.selectOption(countryCode);
    await this.page.waitForTimeout(400);

    await this.recipientFullNameInput.fill(recipientName);

    // Bank dropdown if known, else custom
    const bankDropdown = this.page.locator('select').nth(2);
    if (await bankDropdown.isVisible().catch(() => false)) {
      const optionValues = await bankDropdown.locator('option').allTextContents();
      const match = optionValues.find(t => t.toLowerCase().includes(bank.toLowerCase()));
      if (match) {
        await bankDropdown.selectOption({ label: match });
      } else {
        await bankDropdown.selectOption('__custom__');
        await this.bankNameInput.fill(bank);
        await this.bankNameInput.blur();
      }
    }

    await this.recipientAccountInput.fill(account);

    if (swift && await this.swiftInput.isVisible().catch(() => false)) await this.swiftInput.fill(swift);
    if (iban && await this.ibanInput.isVisible().catch(() => false)) await this.ibanInput.fill(iban);
    if (routing && await this.routingInput.isVisible().catch(() => false)) await this.routingInput.fill(routing);

    await this.amount.fill(String(amount));
    if (description) await this.description.fill(description);

    // wait for quote
    await this.page.waitForResponse(r => r.url().includes('/api/wire/quote')).catch(() => {});

    await this.reviewButton.click();
    await this.confirmButton.click();
  }

  async expectSuccess() {
    await expect(this.newTransactionButton).toBeVisible({ timeout: 15000 });
  }
}

module.exports = { TransferPage };
