import { test, expect } from '@playwright/test';

test.describe('App Boot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load Demo by default', async ({ page }) => {
    await expect(page.getByTestId('nav-rail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should open Book Demo tab', async ({ page }) => {
    await page.getByTestId('nav-book_demo').click();
    await expect(page.getByTestId('view-title')).toHaveText(/domluvit demo/i, { timeout: 10000 });
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should open Ops (Stats & Settings)', async ({ page }) => {
    await page.getByTestId('nav-ops').click();
    await expect(page.getByTestId('view-title')).toHaveText(/statistiky/i, { timeout: 10000 });
    await expect(page.getByTestId('ops-workspace')).toBeVisible({ timeout: 10000 });
  });
});

