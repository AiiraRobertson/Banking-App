import { test, expect } from '@playwright/test';

test('admin can sign in and sign out', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'you@example.com' }).fill('admin@bank.com');
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('Admin123!');
  await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/(dashboard|accounts|home)?$|\/dashboard/);
  const userMenu = page.getByRole('button', { name: /Admin\s+User/i });
  await expect(userMenu).toBeVisible();
  await userMenu.click();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});