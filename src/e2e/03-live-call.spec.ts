import { test, expect } from '@playwright/test';

test.describe('Live Call Coach', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('nav-call').click();
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should show a connect error for invalid Meet link', async ({ page }) => {
    const workspace = page.getByTestId('demo-workspace');
    const input = workspace.locator('input[placeholder*="Meet"]').first();
    await input.fill('foo');
    await workspace.getByRole('button', { name: /connect/i }).click();
    await expect(workspace.locator('.status-line')).toContainText(/meet link/i, { timeout: 10000 });
  });
});
