import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display main navigation', async ({ page }) => {
    await expect(page.getByTestId('nav-rail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-book_demo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-demo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-ops')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between main tabs', async ({ page }) => {
    await page.getByTestId('nav-book_demo').click();
    await expect(page.getByTestId('view-title')).toHaveText(/domluvit demo/i, { timeout: 10000 });

    await page.getByTestId('nav-ops').click();
    await expect(page.getByTestId('view-title')).toHaveText(/statistiky/i, { timeout: 10000 });

    await page.getByTestId('nav-demo').click();
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });
});
