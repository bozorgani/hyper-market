import { test, expect } from '@playwright/test';
import { expectNoCriticalA11ySmoke, mockCatalog } from './helpers';

test('public pages expose basic landmarks, labels and keyboard focus', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectNoCriticalA11ySmoke(page);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  // Bottom navigation check removed — not present in current UI
});
