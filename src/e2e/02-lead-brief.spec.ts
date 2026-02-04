import { test, expect } from '@playwright/test';

test.describe('Neo Dialer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('neo-dialer')).toBeVisible({ timeout: 10000 });
  });

  test('should increment calls on C', async ({ page }) => {
    const callsPill = page.locator('.neo-stats-right').getByText(/calls:/i);
    await expect(callsPill).toContainText(/calls:\s*0/i, { timeout: 10000 });
    await page.keyboard.press('c');
    await expect(callsPill).toContainText(/calls:\s*1/i, { timeout: 10000 });
  });
});
