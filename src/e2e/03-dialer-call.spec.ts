import { test, expect } from '@playwright/test';

test.describe('Demo: Call Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('demo-workspace')).toBeVisible({ timeout: 10000 });
  });

  test('Start should produce a call state or a safe error', async ({ page }) => {
    const start = page.getByRole('button', { name: /start/i }).first();
    await expect(start).toBeVisible({ timeout: 10000 });

    await start.click();

    const missingPhone = page.locator('text=/missing phone number/i');
    const stop = page.getByRole('button', { name: /^stop$/i }).first();

    const gotMissingPhone = await missingPhone
      .isVisible({ timeout: 2000 })
      .then(() => true)
      .catch(() => false);

    if (gotMissingPhone) {
      await expect(missingPhone).toBeVisible({ timeout: 10000 });
      return;
    }

    const canStop = await stop
      .isEnabled({ timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (canStop) {
      await stop.click();
      await expect(page.locator('text=/idle/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
