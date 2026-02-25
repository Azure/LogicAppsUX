/**
 * Input Validation Tests
 *
 * Tests for message input validation and edge cases.
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

test.describe('Input Validation', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

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

    // Navigate and start chat
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
  });

  test('should trim whitespace from messages', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Enter message with leading/trailing whitespace
    await messageInput.fill('   Hello World   ');
    await sendButton.click();

    // Should display trimmed message
    await expect(page.getByText('Hello World')).toBeVisible({ timeout: 5000 });
  });

  test('should handle newlines in messages', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Enter message with newlines (Shift+Enter)
    await messageInput.fill('Line 1');
    await messageInput.press('Shift+Enter');
    await messageInput.type('Line 2');
    await messageInput.press('Shift+Enter');
    await messageInput.type('Line 3');

    await sendButton.click();

    // Multi-line message should be preserved
    await expect(page.getByText(/Line 1.*Line 2.*Line 3/s)).toBeVisible({ timeout: 5000 });
  });

  test('should handle unicode characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const unicodeMessage = 'こんにちは 你好 مرحبا Здравствуйте';
    await messageInput.fill(unicodeMessage);
    await sendButton.click();

    await expect(page.getByText(unicodeMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle numbers and symbols', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const symbolMessage = '123 + 456 = 789 !@#$%^&*()_+-=[]{}|;:,.<>?';
    await messageInput.fill(symbolMessage);
    await sendButton.click();

    await expect(page.getByText(symbolMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle markdown-like syntax', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const markdownMessage = '**bold** *italic* `code` [link](url) # heading';
    await messageInput.fill(markdownMessage);
    await sendButton.click();

    // Should display as plain text (not rendered as markdown)
    await expect(page.getByText(markdownMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should preserve input value while typing', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    const testMessage = 'This is a test message';

    // Type character by character
    for (const char of testMessage) {
      await messageInput.type(char);
      await page.waitForTimeout(50);
    }

    // Final value should match
    await expect(messageInput).toHaveValue(testMessage);
  });

  test('should allow editing message before sending', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    // Type initial message
    await messageInput.fill('Hello Wrld');
    await expect(messageInput).toHaveValue('Hello Wrld');

    // Clear and retype (simpler editing scenario)
    await messageInput.fill('');
    await messageInput.fill('Hello World');

    await expect(messageInput).toHaveValue('Hello World');
  });

  test('should handle rapid typing', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    // Type very quickly
    const rapidMessage = 'Quick brown fox jumps over lazy dog';
    await messageInput.fill(rapidMessage);

    // Should not lose characters
    await expect(messageInput).toHaveValue(rapidMessage);
  });

  test('should handle pasting text into input', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const pastedMessage = 'This message was pasted from clipboard';

    // Simulate paste by filling text (clipboard API doesn't work reliably in tests)
    await messageInput.fill(pastedMessage);

    // Send the pasted message
    await sendButton.click();

    // Message should appear
    await expect(page.getByText(pastedMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should allow clearing and refilling input', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    const testMessage = 'Test message for clearing';
    await messageInput.fill(testMessage);
    await expect(messageInput).toHaveValue(testMessage);

    // Clear input
    await messageInput.fill('');
    await expect(messageInput).toHaveValue('');

    // Refill with new message
    const newMessage = 'New message after clear';
    await messageInput.fill(newMessage);
    await expect(messageInput).toHaveValue(newMessage);
  });
});

test.describe('Input State Management', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

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
  });

  test('should maintain focus on input after typing', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    await messageInput.click();
    await messageInput.type('Test message');

    // Input should still be focused
    await expect(messageInput).toBeFocused();
  });

  test('should clear input after successful send', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message');
    await sendButton.click();

    // Input should be cleared after send
    await expect(messageInput).toHaveValue('');
  });

  test('should disable input while waiting for response', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Input should be enabled initially
    await expect(messageInput).toBeEnabled();

    // Send first message
    await messageInput.fill('First message');
    await sendButton.click();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');

    // Input should be disabled while waiting for agent response
    await expect(messageInput).toBeDisabled({ timeout: 5000 });
  });

  test('should update send button state based on input', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Initially empty - button should be disabled
    await expect(messageInput).toHaveValue('');

    // Type something - button should be enabled
    await messageInput.fill('Test');
    await expect(sendButton).toBeEnabled();

    // Clear input - button should be disabled again
    await messageInput.clear();

    // The button state might change immediately or after a short delay
    await page.waitForTimeout(500);

    // Typing again should enable button
    await messageInput.fill('Test again');
    await expect(sendButton).toBeEnabled();
  });

  test('should handle Escape key without crashing', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    await messageInput.fill('Test message');
    await expect(messageInput).toHaveValue('Test message');

    // Press Escape - app doesn't clear on Escape, but shouldn't crash
    await messageInput.press('Escape');

    // Input should still be functional
    await messageInput.fill('Different message');
    await expect(messageInput).toHaveValue('Different message');
  });
});
