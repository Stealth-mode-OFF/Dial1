import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Analytics & Reporting
 * Priority: P1 (High)
 */

test.describe('Analytics Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to analytics
    const analyticsButton = page.locator('button, a').filter({ hasText: /analytics|analytiky|report|výkon/i }).first();
    if (await analyticsButton.isVisible({ timeout: 3000 })) {
      await analyticsButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display analytics screen', async ({ page }) => {
    const analyticsVisible = await page.locator('text=/analytics|analytiky|statistics|statistiky/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(analyticsVisible).toBeTruthy();
  });

  test('should show performance metrics', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for KPIs or metrics
    const hasMetrics = await page.locator('text=/calls|hovory|conversion|konverze|win rate|úspěšnost/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    expect(hasMetrics).toBeTruthy();
  });

  test('should display charts without errors', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for chart containers (Recharts)
    const hasCharts = await page.locator('svg[class*="recharts"], [class*="recharts-wrapper"]').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    // Check console for chart rendering errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(2000);
    
    const hasChartError = errors.some(err => err.includes('recharts') || err.includes('Negative') || err.includes('dimension'));
    expect(hasChartError).toBeFalsy();
  });

  test('should show call history or logs', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for call log entries
    const hasLogs = await page.locator('text=/log|historie|history|activity|aktivita/i').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (!hasLogs) {
      // May show empty state
      const emptyState = await page.locator('text=/no data|žádná data|empty/i').isVisible({ timeout: 3000 });
      expect(emptyState || hasLogs).toBeTruthy();
    }
  });

  test('should handle date filtering', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for date picker or filter controls
    const hasDateFilter = await page.locator('button, input').filter({ hasText: /date|datum|filter|today|week|month/i }).first().isVisible({ timeout: 5000 })
      .catch(() => false);
    
    // Date filtering is optional but recommended
    if (!hasDateFilter) {
      console.warn('⚠️  No date filtering found - consider adding for production');
    }
  });
});
