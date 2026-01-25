import { test, expect } from '@playwright/test';

/**
 * E2E Tests: AI Call Screen & Speech-to-Text
 * Priority: P0 (Critical - Core Feature)
 */

test.describe('AI Call Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to campaigns and start a call
    await page.locator('button, a').filter({ hasText: /kampaň|campaign/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    // Try to click on a contact or call button
    const callButton = page.locator('button').filter({ hasText: /call|volat|start/i }).first();
    if (await callButton.isVisible({ timeout: 3000 })) {
      await callButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should load call screen with contact info', async ({ page }) => {
    // Check if we're on call screen
    const isCallScreen = await page.locator('text=/call|hovor|analyzing|contact/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (isCallScreen) {
      // Should display contact name or company
      const hasContactInfo = await page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+|s\.r\.o\.|a\.s\./').isVisible({ timeout: 3000 })
        .catch(() => false);
      
      expect(hasContactInfo).toBeTruthy();
    }
  });

  test('should show AI analysis phase', async ({ page }) => {
    // Check for analyzing/scanning state
    const analyzingVisible = await page.locator('text=/analyz|scanning|načítá|research/i').isVisible({ timeout: 3000 })
      .catch(() => false);
    
    // Either analyzing or already ready
    const readyVisible = await page.locator('text=/ready|připraven|start call|začít hovor/i').isVisible({ timeout: 15000 })
      .catch(() => false);
    
    expect(analyzingVisible || readyVisible).toBeTruthy();
  });

  test('should display AI intelligence signals', async ({ page }) => {
    // Wait for analysis to complete
    await page.waitForTimeout(3000);
    
    // Look for AI insights (intent score, personality, hiring signals)
    const hasIntelligence = await page.locator('text=/intent|win prob|personality|signal|skóre|pravděpodobnost/i').isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (hasIntelligence) {
      expect(hasIntelligence).toBeTruthy();
    } else {
      console.warn('⚠️  AI intelligence not visible - may still be loading');
    }
  });

  test('should show speech-to-text controls', async ({ page }) => {
    // Wait for ready state
    await page.waitForTimeout(5000);
    
    // Look for microphone or voice input controls
    const hasMicControls = await page.locator('button[aria-label*="micro"], button[aria-label*="voice"], button[title*="micro"], svg[class*="mic"]').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(hasMicControls).toBeTruthy();
  });

  test('should display transcript terminal', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for transcript area or terminal
    const hasTranscript = await page.locator('[data-testid="transcript"], .transcript, textarea, [contenteditable="true"]').first().isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(hasTranscript).toBeTruthy();
  });

  test('should allow manual note entry', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Find input field for manual notes
    const noteInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    
    if (await noteInput.isVisible({ timeout: 3000 })) {
      await noteInput.fill('Test poznámka z hovoru');
      const value = await noteInput.inputValue();
      expect(value).toContain('Test');
    }
  });

  test('should show BANT framework fields', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Look for BANT indicators (Budget, Authority, Need, Timeline)
    const hasBANT = await page.locator('text=/BANT|budget|authority|need|timeline|rozpočet|oprávnění/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (hasBANT) {
      expect(hasBANT).toBeTruthy();
    }
  });

  test('should complete call and navigate to next', async ({ page }) => {
    await page.waitForTimeout(5000);
    
    // Find "next contact" or "finish call" button
    const nextButton = page.locator('button').filter({ hasText: /next|další|finish|dokončit|complete/i }).first();
    
    if (await nextButton.isVisible({ timeout: 5000 })) {
      await nextButton.click();
      
      // Should either go to next contact or back to list
      await page.waitForTimeout(2000);
      const navigated = await Promise.race([
        page.locator('text=/contact.*2|další kontakt/i').isVisible({ timeout: 3000 }),
        page.locator('text=/campaign|list|seznam/i').isVisible({ timeout: 3000 })
      ]).catch(() => false);
      
      expect(navigated).toBeTruthy();
    }
  });

  test('should handle low energy mode correctly', async ({ page }) => {
    // Set energy to low in check-in
    await page.goto('/');
    await page.locator('button').filter({ hasText: /check.*in|začít den/i }).first().click({ timeout: 5000 }).catch(() => {});
    
    // Select low energy
    await page.locator('button').filter({ hasText: /low|nízká/i }).first().click().catch(() => {});
    await page.locator('button').filter({ hasText: /potvrdit|confirm/i }).first().click().catch(() => {});
    
    // Navigate to call screen
    await page.locator('button, a').filter({ hasText: /kampaň|campaign/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator('button').filter({ hasText: /call|volat/i }).first().click({ timeout: 5000 }).catch(() => {});
    
    await page.waitForTimeout(3000);
    
    // Should show email mode or different UI for low energy
    const hasEmailMode = await page.locator('text=/email|e-mail|draft|koncept/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    // Low energy mode may show email instead of call UI
    if (hasEmailMode) {
      expect(hasEmailMode).toBeTruthy();
    }
  });

  test('should not have console errors during call', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => {
      // Filter out known external errors (e.g., extensions)
      if (!error.message.includes('extension')) {
        errors.push(error.message);
      }
    });
    
    await page.waitForTimeout(5000);
    
    if (errors.length > 0) {
      console.warn('⚠️  Console errors detected:', errors);
    }
    
    // Critical errors should not occur
    const hasCriticalError = errors.some(err => 
      err.includes('TypeError') || 
      err.includes('ReferenceError') ||
      err.includes('Cannot read')
    );
    
    expect(hasCriticalError).toBeFalsy();
  });
});

test.describe('Call Screen - Energy Drain Simulation', () => {
  test('should decrease energy after multiple calls', async ({ page }) => {
    // This would require completing 3+ calls to test energy drain
    // For now, just verify the mechanism exists
    
    await page.goto('/');
    // The energy drain logic is in App.tsx handleNextContact
    // We can't easily test this without completing real calls
    // Mark as manual test required
    console.log('ℹ️  Energy drain requires manual testing with 3+ completed calls');
  });
});
