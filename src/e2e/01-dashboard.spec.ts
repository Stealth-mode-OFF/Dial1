import { test, expect } from '@playwright/test';

test.describe('App Boot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load neo dialer', async ({ page }) => {
    await expect(page.getByTestId('neo-dialer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/dial1 dialer/i)).toBeVisible({ timeout: 10000 });
  });
});
