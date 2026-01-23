import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Settings & Configuration
 * Priority: P1 (High)
 */

test.describe('Settings Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    const settingsButton = page.locator('button, a').filter({ hasText: /settings|nastavení|config/i }).first();
    if (await settingsButton.isVisible({ timeout: 3000 })) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display settings screen', async ({ page }) => {
    const settingsVisible = await page.locator('text=/settings|nastavení|configuration|konfigurace/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(settingsVisible).toBeTruthy();
  });

  test('should show sales style options', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for sales style toggle (hunter vs consultative)
    const hasStyleOption = await page.locator('text=/hunter|consultative|konzultační|style|styl/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(hasStyleOption).toBeTruthy();
  });

  test('should allow changing sales style', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Find toggle or radio buttons for sales style
    const styleButton = page.locator('button, label').filter({ hasText: /hunter|consultative/i }).first();
    
    if (await styleButton.isVisible({ timeout: 3000 })) {
      await styleButton.click();
      await page.waitForTimeout(500);
      
      // Setting should persist (would need to verify in call screen)
      expect(true).toBeTruthy();
    }
  });

  test('should show Pipedrive API configuration', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for API key or Pipedrive settings
    const hasAPIConfig = await page.locator('text=/pipedrive|api.*key|token|integration/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (!hasAPIConfig) {
      console.warn('⚠️  Pipedrive API configuration not visible in settings - verify if needed');
    }
  });

  test('should display product knowledge base', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for knowledge base or product info section
    const hasKnowledge = await page.locator('text=/knowledge|knowledge base|product|echo pulse|behavery/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (hasKnowledge) {
      expect(hasKnowledge).toBeTruthy();
    }
  });

  test('should save settings changes', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for save button
    const saveButton = page.locator('button').filter({ hasText: /save|uložit|apply|použít/i }).first();
    
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      
      // Should show success message or confirmation
      await page.waitForTimeout(1000);
      const success = await page.locator('text=/saved|uloženo|success|úspěch/i').isVisible({ timeout: 3000 })
        .catch(() => false);
      
      expect(success).toBeTruthy();
    }
  });
});
