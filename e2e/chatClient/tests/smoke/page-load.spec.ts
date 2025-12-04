/**
 * Smoke Test - Verify basic page load
 *
 * This is the simplest possible test to verify Playwright can connect to the app
 */

import { test, expect, type Route } from '@playwright/test';
import { setupAgentCardMock, gotoWithAgentCard } from '../../fixtures/agent-card';

test.describe('Smoke Test', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await setupAgentCardMock(page);

    // Mock contexts/list to prevent 404 errors
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      await route.continue();
    });
  });

  test('should load the page without errors', async ({ page }) => {
    // Navigate to the app with required agent card parameter
    await gotoWithAgentCard(page);

    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify the chat root element exists
    const chatRoot = page.locator('#chat-root');
    await expect(chatRoot).toBeVisible({ timeout: 10000 });

    // Log page title for debugging
    const title = await page.title();
    console.log('Page title:', title);
  });

  test('should have correct page title', async ({ page }) => {
    await gotoWithAgentCard(page);
    await expect(page).toHaveTitle(/A2A Chat/i);
  });

  test('should render without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await gotoWithAgentCard(page);
    await page.waitForLoadState('networkidle');

    // Allow for expected errors (if any)
    expect(errors.filter((e) => !e.includes('expected-error'))).toHaveLength(0);
  });
});
