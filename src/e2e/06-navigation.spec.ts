import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Navigation & Layout
 * Priority: P0 (Critical)
 */

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display main navigation', async ({ page }) => {
    await expect(page.locator('[data-testid=\"sidebar\"]')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between main tabs', async ({ page }) => {
    const tabs = [/command center/i, /live campaigns/i, /intelligence/i, /meet coach/i, /configuration/i];

    for (const tab of tabs) {
      const btn = page.locator('button').filter({ hasText: tab }).first();
      await expect(btn).toBeVisible({ timeout: 10000 });
      await btn.click();
      await page.waitForTimeout(400);
    }

    await expect(page.locator('text=/System Configuration|Intelligence Hub|Live Meet Coach|Mission Control/i')).toBeVisible({
      timeout: 10000,
    });
  });
});

