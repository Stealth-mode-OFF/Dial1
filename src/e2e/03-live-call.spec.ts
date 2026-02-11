import { test, expect } from '@playwright/test';

test.describe('Neo Dialer keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/pipedrive/contacts**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'lead-1', name: 'Ada Lovelace', company: 'Analytica', phone: '+420777111222', email: 'ada@analytica.com', role: 'CTO', status: 'active' },
          { id: 'lead-2', name: 'Nikola Tesla', company: 'AC Current', phone: '+420777333444', email: 'nikola@accurrent.com', role: 'Founder', status: 'active' },
        ]),
      }),
    );
    await page.route('**/integrations/pipedrive**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true }) }),
    );
    await page.route('**/analytics**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ totalCalls: 0, connectRate: 0, revenue: 0, dispositionBreakdown: [], dailyVolume: [], recentActivity: [] }),
      }),
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('dialer-app')).toBeVisible({ timeout: 10000 });
  });

  test('should change contact on ArrowDown', async ({ page }) => {
    const name = page.locator('.seq-lead-name');
    const before = (await name.innerText()).trim();
    await page.keyboard.press('ArrowDown');
    await expect(name).not.toHaveText(before, { timeout: 10000 });
  });
});
