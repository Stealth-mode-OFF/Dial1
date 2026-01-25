import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Intelligence (Analytics)
 * Priority: P0
 */

test.describe('Intelligence Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Intelligence and render KPIs', async ({ page }) => {
    await page.locator('button').filter({ hasText: /intelligence/i }).first().click();
    await expect(page.locator('text=/Intelligence Hub/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Total Interactions/i').first()).toBeVisible({ timeout: 10000 });
  });
});
