import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Live Campaigns (Dialer)
 * Priority: P0 (Critical)
 */

test.describe('Live Campaigns (Dialer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Live Campaigns from sidebar', async ({ page }) => {
    await page.locator('button').filter({ hasText: /live campaigns/i }).first().click();
    await expect(page.locator('text=/Žádný kontakt v queue|Start Power Dialer|Exit session/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show empty state when no queued contact', async ({ page }) => {
    await page.locator('button').filter({ hasText: /live campaigns/i }).first().click();
    const empty = page.locator('text=/Žádný kontakt v queue/i');
    const dialer = page.locator('text=/Start Power Dialer/i');
    await expect(empty.or(dialer)).toBeVisible({ timeout: 10000 });
  });
});

