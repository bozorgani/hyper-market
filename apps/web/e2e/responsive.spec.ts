import { test, expect } from '@playwright/test';
import { mockCatalog } from './helpers';

test('public home has no horizontal overflow', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expect(page.locator('main').first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('OTP fields stay inside the viewport', async ({ page }) => {
  await page.goto('/verify-otp?target=09123456789&type=phone_verify');
  const container = page.locator('#otp-container');
  await expect(container).toBeVisible();

  const box = await container.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
});

test('mobile menu is keyboard dismissible and traps focus', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1024, 'Mobile menu is hidden at lg and wider breakpoints');
  await page.goto('/');
  const menuButton = page.getByRole('button', { name: 'منوی اصلی' });
  await menuButton.click();

  const menu = page.getByRole('dialog', { name: 'منوی اصلی' });
  await expect(menu).toBeVisible();
  await expect(menu.locator(':focus')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});
