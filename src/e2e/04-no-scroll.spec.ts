import { test, expect } from '@playwright/test';

test.describe('No scroll budget', () => {
  test('should fit into 900px height (no body scroll)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assertNoScroll = async () => {
      const { innerHeight, scrollHeight } = await page.evaluate(() => ({
        innerHeight: window.innerHeight,
        scrollHeight: document.body.scrollHeight,
      }));
      expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 24);
    };

    await assertNoScroll();
  });
});
