import { test, expect } from '@playwright/test';

test.describe('Ops: Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open Settings inside Ops', async ({ page }) => {
    await page.getByTestId('nav-ops').click();
    await expect(page.getByTestId('ops-workspace')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('ops-workspace').getByRole('button', { name: /^nastavení$/i }).click();
    await expect(page.getByRole('heading', { name: /data & keys/i })).toBeVisible({ timeout: 10000 });
  });
});
