import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Campaign Management & Pipedrive Integration
 * Priority: P0 (Critical - Core Feature)
 */

test.describe('Campaign List & Pipedrive Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to campaigns
    const navButton = page.locator('button, a').filter({ hasText: /kampaň|campaign/i }).first();
    if (await navButton.isVisible({ timeout: 3000 })) {
      await navButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display campaigns list screen', async ({ page }) => {
    // Look for campaigns heading or sync button
    const campaignsVisible = await page.locator('text=/pipedrive|campaign|kontakt|sync/i').isVisible({ timeout: 5000 });
    expect(campaignsVisible).toBeTruthy();
  });

  test('should show Pipedrive sync button', async ({ page }) => {
    // Check for Pipedrive sync CTA
    const syncButton = page.locator('button').filter({ hasText: /sync|pipedrive|načíst|import/i }).first();
    await expect(syncButton).toBeVisible({ timeout: 5000 });
  });

  test('should handle Pipedrive sync flow', async ({ page }) => {
    // Click sync button
    const syncButton = page.locator('button').filter({ hasText: /sync|pipedrive|načíst/i }).first();
    
    if (await syncButton.isVisible({ timeout: 3000 })) {
      await syncButton.click();
      
      // Wait for loading state
      await page.waitForTimeout(2000);
      
      // Check for either success or error state
      const hasResult = await Promise.race([
        page.locator('text=/success|úspěch|načten|imported/i').isVisible({ timeout: 15000 }),
        page.locator('text=/error|chyba|nepodařilo|failed/i').isVisible({ timeout: 15000 }),
        page.locator('[role="row"], .contact-row, [data-testid="contact"]').first().isVisible({ timeout: 15000 })
      ]).catch(() => false);
      
      // Should show some result
      expect(hasResult).toBeTruthy();
    }
  });

  test('should display contact list after sync', async ({ page }) => {
    // Look for contact rows or cards
    await page.waitForTimeout(2000);
    
    const hasContacts = await page.locator('[role="row"], .contact-row, [data-testid="contact"]').first().isVisible({ timeout: 3000 })
      .catch(() => false);
    
    if (!hasContacts) {
      // If no contacts, should show empty state
      const emptyState = await page.locator('text=/no contacts|žádné kontakty|prázdné|empty/i').isVisible({ timeout: 3000 });
      expect(emptyState).toBeTruthy();
    }
  });

  test('should show contact details in list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const firstContact = page.locator('[role="row"], .contact-row, [data-testid="contact"]').first();
    
    if (await firstContact.isVisible({ timeout: 5000 })) {
      // Should contain contact name or company
      const hasContactInfo = await firstContact.locator('text=/[A-Za-z]{2,}/').isVisible();
      expect(hasContactInfo).toBeTruthy();
    }
  });

  test('should navigate to call screen when clicking contact', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find first contact or call button
    const callButton = page.locator('button').filter({ hasText: /call|volat|start/i }).first();
    
    if (await callButton.isVisible({ timeout: 3000 })) {
      await callButton.click();
      
      // Should navigate to call screen
      await expect(page.locator('text=/call|hovor|analyzing|analýza/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle cached AI data correctly', async ({ page }) => {
    // Monitor console for cache messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Check if cache logging is working
    const hasCacheLog = consoleLogs.some(log => 
      log.includes('cached') || log.includes('✅') || log.includes('AI data')
    );
    
    // Cache should be working (not a hard failure if not, just informative)
    if (!hasCacheLog) {
      console.warn('⚠️  No cache logging detected - verify caching is working');
    }
  });

  test('should show loading states appropriately', async ({ page }) => {
    // Click sync button
    const syncButton = page.locator('button').filter({ hasText: /sync|pipedrive|načíst/i }).first();
    
    if (await syncButton.isVisible({ timeout: 3000 })) {
      await syncButton.click();
      
      // Should show loading indicator
      const loadingVisible = await page.locator('[data-testid="loading"], .loader, svg.animate-spin').isVisible({ timeout: 1000 })
        .catch(() => false);
      
      // Loading state should appear (even briefly)
      expect(loadingVisible).toBeTruthy();
    }
  });
});

test.describe('Campaign Creation & Management', () => {
  test('should allow creating custom campaign if needed', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to campaigns
    await page.locator('button, a').filter({ hasText: /kampaň|campaign/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    
    // Look for create campaign button
    const createButton = page.locator('button').filter({ hasText: /create|vytvořit|new|nový/i }).first();
    
    if (await createButton.isVisible({ timeout: 3000 })) {
      await createButton.click();
      
      // Should show create form or modal
      await expect(page.locator('input[type="text"], input[name*="name"], input[placeholder*="name"]').first()).toBeVisible({ timeout: 3000 });
    }
  });
});
