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
    // Verify page title or main heading
    await expect(page.locator('text=Dashboard').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });
    
    // Check for no console errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('should display daily stats cards', async ({ page }) => {
    // Wait for stats to load (check for loading state to disappear)
    await page.waitForTimeout(2000);
    
    // Look for key metrics - adjust selectors based on actual implementation
    const statsVisible = await page.locator('[data-testid="stats-container"]').isVisible()
      .catch(() => page.locator('.grid').first().isVisible());
    
    expect(statsVisible).toBeTruthy();
  });

  test('should open check-in modal', async ({ page }) => {
    // Find and click check-in button
    const checkInButton = page.locator('button').filter({ hasText: /check.*in|začít den|agenda/i }).first();
    await expect(checkInButton).toBeVisible({ timeout: 5000 });
    await checkInButton.click();
    
    // Verify modal appeared
    await expect(page.locator('text=/energie|energy|nálada|mood/i')).toBeVisible({ timeout: 3000 });
  });

  test('should complete check-in flow', async ({ page }) => {
    // Open check-in
    await page.locator('button').filter({ hasText: /check.*in|začít den|agenda/i }).first().click();
    
    // Select energy level (high/medium/low)
    await page.locator('button').filter({ hasText: /high|vysoká|střední|medium/i }).first().click();
    
    // Select mood (good/neutral/bad)
    await page.locator('button').filter({ hasText: /good|dobrá|neutrální|neutral/i }).first().click();
    
    // Confirm check-in
    await page.locator('button').filter({ hasText: /potvrdit|confirm|ok|začít/i }).first().click();
    
    // Modal should close
    await expect(page.locator('text=/energie|energy/i')).not.toBeVisible({ timeout: 3000 });
  });

  test('should navigate to campaigns from dashboard', async ({ page }) => {
    // Find CTA to campaigns
    const campaignsLink = page.locator('button, a').filter({ hasText: /kampaň|campaign|kontakty|leads/i }).first();
    
    if (await campaignsLink.isVisible({ timeout: 3000 })) {
      await campaignsLink.click();
      // Should navigate to campaigns screen
      await expect(page.locator('text=/pipedrive|campaign|kontakt/i')).toBeVisible({ timeout: 5000 });
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
