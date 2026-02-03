import { test, expect } from '@playwright/test';

test.describe('Demo Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render the Demo workspace', async ({ page }) => {
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });
});
