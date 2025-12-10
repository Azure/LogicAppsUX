/**
 * Error Handling Tests
 *
 * Tests how the app handles various error scenarios.
 * Focus on UI-level error handling that can be observed without SSE completion.
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

test.describe('Error Handling', { tag: '@mock' }, () => {
  test('should show error when agent card fails to load', async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    // Mock agent card to return 404
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    // Navigate to app
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.getByText(/error|failed|not found/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error when agent card is invalid JSON', async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    // Mock agent card with invalid JSON
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'This is not valid JSON {{{',
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Should show error
    await expect(page.getByText(/error|invalid|failed/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error when session list fails to load', async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    // Mock agent card successfully
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    // Mock contexts/list to fail
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // App might still show UI but with error state
    // Check for error message or fallback UI
    const hasError = await page
      .getByText(/error|failed/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no chats yet/i)
      .isVisible()
      .catch(() => false);

    // Either error or empty state should be shown
    expect(hasError || hasEmptyState).toBe(true);
  });

  test('should handle network timeout gracefully', async ({ page }) => {
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

    // Mock contexts/list with delay to simulate timeout
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        // Just hang - don't respond
        // The app should handle this with its own timeout
        await new Promise(() => {}); // Never resolves
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Should show loading state or timeout error
    await page.waitForTimeout(2000);

    // Check that page is still responsive
    const pageText = await page.locator('body').textContent();
    expect(pageText).toBeTruthy();
  });

  test('should handle missing agent card parameter', async ({ page }) => {
    // Navigate without agentCard parameter
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');

    // App should not crash - check page has some content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    // Should NOT show the normal chat interface (no "Start a new chat" button)
    const hasStartButton = await page
      .getByRole('button', { name: /start a new chat/i })
      .isVisible()
      .catch(() => false);
    expect(hasStartButton).toBe(false);
  });
});

test.describe('Message Error Handling', { tag: '@mock' }, () => {
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
  });

  test('should prevent sending empty messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Leave input empty
    await messageInput.clear();

    // Send button should be disabled or clicking should not send
    const isDisabled = await sendButton.isDisabled().catch(() => false);

    if (!isDisabled) {
      // If not disabled, clicking should do nothing
      const initialText = await page.locator('body').textContent();
      await sendButton.click();
      await page.waitForTimeout(500);
      const afterText = await page.locator('body').textContent();

      // No new message should appear
      expect(initialText).toBe(afterText);
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('should prevent sending whitespace-only messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Enter only whitespace
    await messageInput.fill('   ');

    // Send button should be disabled
    await expect(sendButton).toBeDisabled();
  });

  test('should handle very long messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Create a very long message (10,000 characters)
    const longMessage = 'a'.repeat(10000);
    await messageInput.fill(longMessage);

    // Should either:
    // 1. Allow sending (if no max length)
    // 2. Show validation error (if max length enforced)
    // 3. Truncate the input

    const inputValue = await messageInput.inputValue();

    // Either the full message or a truncated version
    expect(inputValue.length).toBeGreaterThan(0);

    // If send button is enabled, sending should work or show error
    const canSend = await sendButton.isEnabled();

    if (canSend) {
      await sendButton.click();

      // Should either show the message or an error
      await page.waitForTimeout(1000);

      const hasMessage = await page
        .getByText(/^a+$/)
        .isVisible()
        .catch(() => false);
      const hasError = await page
        .getByText(/too long|maximum|limit/i)
        .isVisible()
        .catch(() => false);

      expect(hasMessage || hasError).toBe(true);
    }
  });

  test('should handle special characters in messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Test message with special characters
    const specialMessage = '<script>alert("XSS")</script> & "quotes" \' and \\ backslashes';
    await messageInput.fill(specialMessage);
    await sendButton.click();

    // Message should appear escaped/safe (not execute as HTML)
    await expect(page.getByText(specialMessage)).toBeVisible({ timeout: 5000 });

    // Should NOT have created a script element
    const scripts = await page.locator('script:has-text("alert")').count();
    expect(scripts).toBe(0);
  });

  test('should handle emoji in messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Test message with emoji
    const emojiMessage = 'Hello! 👋 How are you? 😊 🎉';
    await messageInput.fill(emojiMessage);
    await sendButton.click();

    // Emoji should be preserved
    await expect(page.getByText(emojiMessage)).toBeVisible({ timeout: 5000 });
  });
});
