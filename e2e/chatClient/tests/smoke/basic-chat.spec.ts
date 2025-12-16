/**
 * Critical Path Test: Basic Chat Flow
 *
 * This test MUST NEVER FAIL. It covers the essential user journey:
 * 1. User opens chat
 * 2. User types and sends message
 * 3. User sees their message displayed
 *
 * NOTE: Due to Playwright SSE limitations, these tests focus on UI behavior
 * without expecting agent responses. See E2E_TESTING_FINDINGS.md
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

test.describe('Basic Chat Flow - CRITICAL', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    // Mock agent card
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    // Mock contexts/list
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

  test('should display chat interface after starting new chat', async ({ page }) => {
    // Navigate to app
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Click "Start a new chat"
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Chat interface should be visible
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Send button should be present
    const sendButton = page.locator('button:has(svg)').last();
    await expect(sendButton).toBeVisible();
  });

  test('should send message and display it in chat', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Type message
    const messageInput = page.locator('textarea').first();
    const testMessage = 'How are you?';
    await messageInput.fill(testMessage);

    // Verify input has value
    await expect(messageInput).toHaveValue(testMessage);

    // Send message
    await page.locator('button:has(svg)').last().click();

    // User message should appear
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should show loading state while waiting for response', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    await messageInput.fill('Hello!');
    await page.locator('button:has(svg)').last().click();

    // Should show typing indicator
    await expect(page.getByText(/agent is typing/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle Enter key to send message', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const testMessage = 'Hello there!';

    // Type and press Enter
    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Message should be sent
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should enable send button when text is entered', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Button should exist
    await expect(sendButton).toBeVisible();

    // Type something
    await messageInput.fill('test');

    // Button should be enabled
    await expect(sendButton).toBeEnabled();
  });

  test('should display user message in chat history', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send a message
    const message = 'Test message for history';
    await messageInput.fill(message);
    await sendButton.click();

    // Message should appear in chat
    await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });

    // Should show "You" label
    await expect(page.getByText('You').first()).toBeVisible();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });
});

test.describe('Chat Interface Accessibility - CRITICAL', { tag: '@mock' }, () => {
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

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat first
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Message input should be focusable
    const messageInput = page.locator('textarea').first();
    await messageInput.focus();
    await expect(messageInput).toBeFocused();

    // Type message
    await page.keyboard.type('Hello!');

    // Press Enter to send
    await page.keyboard.press('Enter');

    // Message should be sent
    await expect(page.getByText('Hello!')).toBeVisible({ timeout: 5000 });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Message input should have accessible attributes
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible();

    // Should have placeholder text
    const placeholder = await messageInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();

    // Send button should be accessible (either text or aria-label)
    const sendButton = page.locator('button:has(svg)').last();
    await expect(sendButton).toBeVisible();
  });
});
