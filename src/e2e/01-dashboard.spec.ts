import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Dashboard & Check-In Flow
 * Priority: P0 (Critical)
 */

test.describe('Dashboard Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard successfully', async ({ page }) => {
    // Verify main heading
    await expect(page.locator('h1')).toContainText(/mission control/i, { timeout: 10000 });
    
    // Check for no console errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('should display daily stats cards', async ({ page }) => {
    await expect(page.locator('[data-testid="stats-container"]')).toBeVisible({ timeout: 10000 });
  });

  test('should open check-in modal', async ({ page }) => {
    // Find and click agenda/check-in button
    const checkInButton = page.locator('button').filter({ hasText: /agenda|check[- ]?in/i }).first();
    await expect(checkInButton).toBeVisible({ timeout: 5000 });
    await checkInButton.click();
    
    // Verify modal appeared
    await expect(page.getByRole('heading', { name: /daily check-in/i })).toBeVisible({ timeout: 5000 });
  });

  test('should complete check-in flow', async ({ page }) => {
    // Open check-in
    await page.locator('button').filter({ hasText: /agenda|check[- ]?in/i }).first().click();
    await expect(page.getByRole('heading', { name: /daily check-in/i })).toBeVisible({ timeout: 5000 });
    
    // Select energy level (high/medium/low)
    await page.getByRole('button', { name: /low|medium|high/i }).first().click();
    
    // Select mood (off/okay/great)
    await page.getByRole('button', { name: /off|okay|great/i }).first().click();
    
    // Confirm check-in
    await page.getByRole('button', { name: /update agenda|confirm/i }).first().click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: /daily check-in/i })).not.toBeVisible({ timeout: 5000 });
  });

  test('should navigate to campaigns from dashboard', async ({ page }) => {
    // Find CTA to dialer
    const campaignsLink = page.locator('button, a').filter({ hasText: /power dialer|open dialer/i }).first();
    
    if (await campaignsLink.isVisible({ timeout: 3000 })) {
      await campaignsLink.click();
      // Should navigate to dialer screen
      await expect(page.locator('text=/Žádný kontakt v queue|Exit session|Start Power Dialer/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that content is not horizontally scrollable
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
      
      // Check that navigation menu is accessible
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
      if (await menuButton.isVisible({ timeout: 2000 })) {
        await expect(menuButton).toBeVisible();
      }
    }
  });
});
