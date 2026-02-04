import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display main navigation', async ({ page }) => {
    await expect(page.getByTestId('nav-tabs')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-lead')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-call')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between main tabs', async ({ page }) => {
    await page.getByTestId('nav-call').click();
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-lead').click();
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
  });
});
