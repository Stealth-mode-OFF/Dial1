import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Configuration (Settings)
 * Priority: P0
 */

test.describe('Configuration Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Configuration and render system settings', async ({ page }) => {
    await page.locator('button').filter({ hasText: /configuration/i }).first().click();
    await expect(page.locator('text=/System Configuration/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Pipedrive CRM/i').first()).toBeVisible({ timeout: 10000 });
  });
});
