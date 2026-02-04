import { test, expect } from '@playwright/test';

test.describe('App Boot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load Lead Brief by default', async ({ page }) => {
    await expect(page.getByTestId('app-topbar')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-tabs')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-lead')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-call')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('view-title')).toHaveText(/lead brief/i, { timeout: 10000 });
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should open Live Call Coach tab', async ({ page }) => {
    await page.getByTestId('nav-call').click();
    await expect(page.getByTestId('view-title')).toHaveText(/live call coach/i, { timeout: 10000 });
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });
});
