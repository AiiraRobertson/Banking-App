import { test, expect } from '@playwright/test';

test('admin can sign in and sign out', async ({ page, browserName, page: { viewportSize } }) => {
  // Skip on mobile viewports (Pixel 7 is 412x915)
  const isMobileViewport = viewportSize && viewportSize.width < 600;
  test.skip(isMobileViewport, 'Skipping on mobile viewport - responsive nav differs');
  
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@bank.com');
  await page.getByLabel('Password', { exact: true }).fill('Admin123!');
  await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/(dashboard|accounts|home)?$|\/dashboard/);
  const userMenu = page.getByRole('button', { name: /Admin\s+User/i });
  await expect(userMenu).toBeVisible({ timeout: 30000 });
  await userMenu.click();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});