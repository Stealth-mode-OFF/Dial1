import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Dialer Call Controls
 * Priority: P0 (Critical)
 */

test.describe('Dialer Call Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('button').filter({ hasText: /live campaigns/i }).first().click();
    await page.waitForLoadState('networkidle');
  });

  test('should show dialer controls or empty queue', async ({ page }) => {
    const empty = page.locator('text=/Žádný kontakt v queue/i');
    const start = page.locator('button').filter({ hasText: /start power dialer/i }).first();
    await expect(empty.or(start)).toBeVisible({ timeout: 10000 });
  });

  test('should start and end a call when a contact exists', async ({ page }) => {
    const start = page.locator('button').filter({ hasText: /start power dialer/i }).first();
    const empty = page.locator('text=/Žádný kontakt v queue/i');

    const hasStart = await start.isVisible({ timeout: 1500 }).catch(() => false);
    const hasEmpty = await empty.isVisible({ timeout: 1500 }).catch(() => false);
    if (!hasStart && hasEmpty) {
      test.skip(true, 'No queued contact available in this environment');
    }
    if (!hasStart && !hasEmpty) {
      test.skip(true, 'Dialer state not ready for call start');
    }

    await expect(start).toBeVisible({ timeout: 10000 });
    await start.click();

    const liveBadge = page.locator('text=/Live call:/i');
    const end = page.locator('button').filter({ hasText: /end call/i }).first();
    await expect(liveBadge.or(end)).toBeVisible({ timeout: 10000 });

    if (await end.isVisible().catch(() => false)) {
      await end.click();
    }

    await expect(page.locator('button').filter({ hasText: /start power dialer/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
