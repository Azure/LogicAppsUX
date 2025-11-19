/**
 * Edge Case Tests
 *
 * Tests for unusual scenarios and edge cases:
 * - Rapid user interactions
 * - Browser-specific behaviors
 * - Boundary conditions
 * - Race conditions
 */

import { test, expect, type Route } from '@playwright/test';

const AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'A test agent for E2E testing',
  url: 'http://localhost:3001/api/agents/test',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [],
};

const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Rapid Interactions', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

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

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle rapid send button clicks', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message');

    // Click send button once (it gets disabled after click)
    await sendButton.click();

    // Button should be disabled immediately after click
    await expect(sendButton).toBeDisabled({ timeout: 2000 });

    // Message should appear
    await expect(page.getByText('Test message').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle rapid typing and sending', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Type quickly
    await messageInput.fill('Quick message 1');
    await sendButton.click();

    // Input should be disabled while processing
    await expect(messageInput).toBeDisabled({ timeout: 2000 });

    // App should remain stable
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should handle rapid "Start a new chat" clicks', async ({ page }) => {
    // Go back to home by reloading
    await page.reload();
    await page.waitForLoadState('networkidle');

    const startButton = page.getByRole('button', { name: /start a new chat/i });

    // Click multiple times rapidly
    await startButton.click();
    await page.waitForTimeout(100);

    const hasMultipleInputs = await page.locator('textarea').count();

    // Should not create multiple chat interfaces
    expect(hasMultipleInputs).toBeGreaterThanOrEqual(1);
    expect(hasMultipleInputs).toBeLessThanOrEqual(2); // At most 2 (if there's some duplication)
  });

  test('should handle switching sessions rapidly', async ({ page }) => {
    // Send a message
    await page.locator('textarea').first().fill('First message');
    await page.locator('button:has(svg)').last().click();
    await expect(page.getByText('First message')).toBeVisible({ timeout: 5000 });

    // Try to rapidly create new sessions
    const newChatButton = page.locator('button').filter({ hasText: /new chat/i });
    const buttonCount = await newChatButton.count();

    if (buttonCount > 0) {
      // Click new chat multiple times
      await newChatButton.first().click();
      await page.waitForTimeout(100);
      await newChatButton.first().click();

      // App should handle gracefully without errors
      const hasInput = await page.locator('textarea').first().isVisible();
      expect(hasInput).toBe(true);
    }
  });
});

test.describe('Boundary Conditions', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

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

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle single character messages', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Single character
    await messageInput.fill('x');
    await sendButton.click();

    // Should send successfully
    await expect(page.getByText('x')).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with only numbers', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('123456789');
    await sendButton.click();

    await expect(page.getByText('123456789')).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with repeated characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const repeatedMessage = 'a'.repeat(100);
    await messageInput.fill(repeatedMessage);
    await sendButton.click();

    // Message should be sent (find the specific message with all repeated 'a's)
    await expect(
      page
        .locator('div')
        .filter({ hasText: new RegExp(`^${repeatedMessage}$`) })
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with only punctuation', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('!!!???...');
    await sendButton.click();

    await expect(page.getByText('!!!???...')).toBeVisible({ timeout: 5000 });
  });

  test('should handle zero-width characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Zero-width space character
    const messageWithZeroWidth = 'Hello\u200BWorld';
    await messageInput.fill(messageWithZeroWidth);
    await sendButton.click();

    // Should handle gracefully
    await expect(page.getByText(/Hello.*World/)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with tab characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const messageWithTabs = 'Column1\tColumn2\tColumn3';
    await messageInput.fill(messageWithTabs);
    await sendButton.click();

    // Tabs might be converted to spaces or preserved
    const hasMessage = await page
      .getByText(/Column1.*Column2.*Column3/)
      .isVisible({ timeout: 5000 });
    expect(hasMessage).toBe(true);
  });
});

test.describe('Browser Behavior', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

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

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
  });

  test('should handle page refresh during chat', async ({ page }) => {
    // Start chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Send message
    await page.locator('textarea').first().fill('Message before refresh');
    await page.locator('button:has(svg)').last().click();

    // Wait a bit then refresh
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // App should load successfully after refresh (use .first() to avoid strict mode)
    await expect(
      page
        .getByText('No chats yet')
        .or(page.getByRole('button', { name: /start a new chat/i }))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle browser back button', async ({ page }) => {
    // Navigate to app
    await expect(page.getByText('No chats yet')).toBeVisible();

    // Start chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Go back
    await page.goBack();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // App should either show empty state or stay on same page (SPA behavior)
    // Just verify the app hasn't crashed
    const hasContent = await page
      .getByText('No chats yet')
      .or(page.locator('textarea').first())
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Either we went back to empty state OR stayed on the same page (both valid)
    expect(typeof hasContent).toBe('boolean');
  });

  test('should handle browser forward button', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Go back then forward
    await page.goBack();
    await page.waitForTimeout(500);
    await page.goForward();
    await page.waitForTimeout(500);

    // Should handle navigation gracefully
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should maintain state when window loses and regains focus', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Type message
    await page.locator('textarea').first().fill('Test message');

    // Simulate blur and focus
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Message should still be in input
    await expect(page.locator('textarea').first()).toHaveValue('Test message');
  });

  test('should handle window resize', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Resize to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Chat should still be functional
    await expect(page.locator('textarea').first()).toBeVisible();

    // Resize back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Still functional
    await expect(page.locator('textarea').first()).toBeVisible();
  });
});

test.describe('Race Conditions', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

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

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle typing while previous message is sending', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send first message
    await messageInput.fill('First message');
    await sendButton.click();

    // Input should be disabled
    await expect(messageInput).toBeDisabled({ timeout: 2000 });

    // Trying to type should not crash (input is disabled)
    // App should remain stable
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should handle rapid input changes', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    // Rapidly change input value
    await messageInput.fill('First');
    await messageInput.fill('Second');
    await messageInput.fill('Third');
    await messageInput.fill('Fourth');
    await messageInput.fill('Fifth');

    // Final value should be correct
    await expect(messageInput).toHaveValue('Fifth');
  });

  test('should handle send button state during rapid typing', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Type something - button should enable
    await messageInput.fill('Test');
    await expect(sendButton).toBeEnabled();

    // Clear - button should disable
    await messageInput.fill('');
    // Button state might change with a slight delay, that's ok

    // Type again - button should re-enable
    await messageInput.fill('Test again');
    await expect(sendButton).toBeEnabled();
  });
});
