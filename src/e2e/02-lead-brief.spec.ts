import { test, expect } from '@playwright/test';

test.describe('Lead Brief', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should render lead picker and Prepare button', async ({ page }) => {
    const workspace = page.getByTestId('book-demo-workspace');
    const picker = workspace.locator('select').first();
    await expect(picker).toBeVisible({ timeout: 10000 });

    // In E2E mode we seed demo leads via SalesContext fallback.
    await picker.selectOption('demo-2');
    const prepare = workspace.getByRole('button', { name: /prepare/i }).first();
    await expect(prepare).toBeEnabled({ timeout: 10000 });
  });
});

