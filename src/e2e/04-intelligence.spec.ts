import { test, expect } from '@playwright/test';

test.describe('Book Demo: Intel + Questions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open Book Demo workspace', async ({ page }) => {
    await page.getByTestId('nav-book_demo').click();
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('view-title')).toHaveText(/domluvit demo/i, { timeout: 10000 });
  });
});
