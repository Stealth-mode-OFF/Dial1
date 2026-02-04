import { test, expect } from '@playwright/test';

test.describe('Neo Dialer keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('dialer-app')).toBeVisible({ timeout: 10000 });
  });

  test('should change contact on ArrowDown', async ({ page }) => {
    const name = page.locator('.focus-name');
    const before = (await name.innerText()).trim();
    await page.keyboard.press('ArrowDown');
    await expect(name).not.toHaveText(before, { timeout: 10000 });
  });
});
