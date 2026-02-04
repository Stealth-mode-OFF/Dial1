import { test, expect } from '@playwright/test';

test.describe('Lead Brief', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('book-demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should render lead picker and Prepare button', async ({ page }) => {
    const workspace = page.getByTestId('book-demo-workspace');
    await expect(workspace.locator('.queue-item').first()).toBeVisible({ timeout: 10000 });

    // In E2E mode we seed demo leads via SalesContext fallback.
    const second = workspace.locator('.queue-item').nth(1);
    if (await second.isVisible()) await second.click();

    const primary = page.getByTestId('lead-primary-action');
    await expect(primary).toBeVisible({ timeout: 10000 });
    await expect(primary).toBeEnabled({ timeout: 10000 });

    await primary.click();
    await expect(primary).toContainText(/end/i, { timeout: 10000 });

    await primary.click();
    await expect(page.getByTestId('lead-save-next')).toBeVisible({ timeout: 10000 });
  });
});
