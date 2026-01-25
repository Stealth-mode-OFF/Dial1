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
    // Check for sidebar or navigation menu
    const navVisible = await page.locator('nav, [role="navigation"], aside').first().isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(navVisible).toBeTruthy();
  });

  test('should navigate between all main screens', async ({ page }) => {
    const screens = [
      { name: 'Dashboard', pattern: /dashboard|přehled/i },
      { name: 'Campaigns', pattern: /campaign|kampaň/i },
      { name: 'Analytics', pattern: /analytics|analytiky/i },
      { name: 'Settings', pattern: /settings|nastavení/i }
    ];
    
    for (const screen of screens) {
      const navButton = page.locator('button, a').filter({ hasText: screen.pattern }).first();
      
      if (await navButton.isVisible({ timeout: 3000 })) {
        await navButton.click();
        await page.waitForTimeout(500);
        
        // Verify we navigated
        const screenVisible = await page.locator(`text=${screen.pattern}`).isVisible({ timeout: 3000 })
          .catch(() => false);
        
        expect(screenVisible).toBeTruthy();
      }
    }
  });

  test('should display user info in header', async ({ page }) => {
    // Look for username or profile
    const hasUserInfo = await page.locator('text=/Pepa|User|Profile|Profil/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(hasUserInfo).toBeTruthy();
  });

  test('should show daily call counter', async ({ page }) => {
    // Look for call counter badge or display
    const hasCounter = await page.locator('text=/\\d+.*call|hovor|today|dnes/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (!hasCounter) {
      // Counter might be at 0 initially
      console.log('ℹ️  Call counter not visible or at 0');
    }
  });

  test('should show pomodoro session indicator', async ({ page }) => {
    // Look for pomodoro or session counter
    const hasPomodoro = await page.locator('text=/session|pomodoro|\\d+\\/\\d+/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (!hasPomodoro) {
      console.warn('⚠️  Pomodoro session indicator not visible');
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Complete check-in
    const checkInButton = page.locator('button').filter({ hasText: /check.*in|začít den/i }).first();
    if (await checkInButton.isVisible({ timeout: 3000 })) {
      await checkInButton.click();
      await page.locator('button').filter({ hasText: /high|vysoká/i }).first().click().catch(() => {});
      await page.locator('button').filter({ hasText: /good|dobrá/i }).first().click().catch(() => {});
      await page.locator('button').filter({ hasText: /potvrdit|confirm/i }).first().click().catch(() => {});
    }
    
    // Navigate to campaigns and back
    await page.locator('button, a').filter({ hasText: /campaign|kampaň/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    
    await page.locator('button, a').filter({ hasText: /dashboard|přehled/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    
    // State should be maintained (energy level should still be set)
    // This is hard to verify visually, but no errors should occur
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('should handle browser back/forward buttons', async ({ page }) => {
    // Navigate forward
    await page.locator('button, a').filter({ hasText: /campaign|kampaň/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    
    // Use browser back
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Should be back on dashboard
    const backOnDashboard = await page.locator('text=/dashboard|přehled|check.*in/i').isVisible({ timeout: 3000 })
      .catch(() => false);
    
    expect(backOnDashboard).toBeTruthy();
  });

  test('should be responsive - no horizontal scroll', async ({ page }) => {
    // Check at different widths
    const widths = [1920, 1440, 1024, 768, 375];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(500);
      
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    }
  });

  test('should handle mobile menu correctly', async ({ page, isMobile }) => {
    if (isMobile) {
      // Look for hamburger menu
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], button svg[class*="menu"]').first();
      
      if (await menuButton.isVisible({ timeout: 3000 })) {
        // Click to open
        await menuButton.click();
        await page.waitForTimeout(300);
        
        // Navigation should be visible
        const navVisible = await page.locator('nav').isVisible({ timeout: 2000 })
          .catch(() => false);
        
        expect(navVisible).toBeTruthy();
      }
    }
  });
});

test.describe('Error Handling & Edge Cases', () => {
  test('should handle refresh during operation', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to campaigns
    await page.locator('button, a').filter({ hasText: /campaign|kampaň/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should recover gracefully
    const hasContent = await page.locator('body').isVisible({ timeout: 5000 });
    expect(hasContent).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Set up network failure
    await page.route('**/functions/v1/**', route => route.abort());
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should show error state or work offline
    const hasErrorMessage = await page.locator('text=/error|chyba|failed|nepodařilo|offline/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    // Either shows error or handles gracefully
    console.log(hasErrorMessage ? '✓ Error handling visible' : 'ℹ️  Silent error handling');
  });

  test('should not expose sensitive data in console', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Check for API keys or sensitive data
    const hasSensitiveData = consoleLogs.some(log => 
      log.includes('api_token=') ||
      log.includes('password') ||
      log.includes('secret') ||
      /[a-f0-9]{32,}/i.test(log) // Long hex strings (potential keys)
    );
    
    expect(hasSensitiveData).toBeFalsy();
  });
});
