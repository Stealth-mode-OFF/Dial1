import { test, expect } from '@playwright/test';

test.describe('Neo Dialer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('dialer-app')).toBeVisible({ timeout: 10000 });
  });

  test('should increment calls on C', async ({ page }) => {
    const calls = page.locator('.header-center').getByText(/calls/i);
    await expect(calls).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('c');
    await expect(page.locator('.header-center')).toContainText(/1/i, { timeout: 10000 });
  });
});
