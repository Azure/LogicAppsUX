/**
 * Username Display E2E Tests
 *
 * Tests for username extraction from JWT tokens and display in chat interface:
 * - Username extracted from access_token JWT 'name' claim
 * - Username displayed in user messages
 * - Graceful handling of missing username
 */

import { test, expect } from '../../../fixtures/sse-fixtures';

// Agent card URL - intercepted by our fixture
const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

// Helper to encode a string to Base64 with proper UTF-8 support (for Unicode characters)
function utf8ToBase64(str: string): string {
  // Use Buffer in Node.js environment (Playwright runs in Node)
  return Buffer.from(str, 'utf-8').toString('base64');
}

test.describe('Username Display', { tag: '@mock' }, () => {
  test('should display username from JWT in user messages', async ({ page }) => {
    // Navigate to app - fixture will provide JWT with 'Test User' name
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Send a message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Hello, this is a test message');
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.getByText('Hello, this is a test message')).toBeVisible({ timeout: 5000 });

    // The username 'Test User' should be displayed near the user message
    // Check for the username in the chat interface
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages without username gracefully', async ({ page }) => {
    // Navigate to app
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Send a message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message');
    await sendButton.click();

    // User message should appear regardless of username
    await expect(page.getByText('Test message')).toBeVisible({ timeout: 5000 });

    // Chat interface should not crash and should be functional
    await expect(messageInput).toBeEnabled({ timeout: 10000 });
  });

  test('should display username in multiple messages', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send first message
    await messageInput.fill('First message');
    await sendButton.click();
    await expect(page.getByText('First message')).toBeVisible({ timeout: 5000 });

    // Wait for response before sending second message
    await page.waitForTimeout(2000);

    // Send second message
    await messageInput.fill('Second message');
    await sendButton.click();
    await expect(page.getByText('Second message')).toBeVisible({ timeout: 5000 });

    // Username should still be visible (for user messages)
    const userNameElements = page.getByText('Test User');
    await expect(userNameElements.first()).toBeVisible({ timeout: 5000 });
  });

  test('should differentiate between user and agent names', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send a message to trigger a response
    await messageInput.fill('Hello agent');
    await sendButton.click();

    // Wait for both user message and agent response
    await expect(page.getByText('Hello agent')).toBeVisible({ timeout: 5000 });

    // Wait for agent response (mock returns "I received your message: <message>")
    await expect(page.getByText(/I received your message/i)).toBeVisible({ timeout: 10000 });

    // User name should be 'Test User' (from JWT)
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Username Edge Cases', { tag: '@mock' }, () => {
  test('should handle username with special characters', async ({ page }) => {
    // Override the mock to return a username with special characters
    await page.route('**/.auth/me', async (route) => {
      const header = utf8ToBase64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = utf8ToBase64(
        JSON.stringify({ name: "José O'Connor-Smith <test>", sub: 'test-user', exp: Math.floor(Date.now() / 1000) + 3600 })
      );
      const mockJwt = `${header}.${payload}.mock-signature`;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user', access_token: mockJwt }]),
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Testing username display');
    await sendButton.click();

    await expect(page.getByText('Testing username display')).toBeVisible({ timeout: 5000 });
    // Verify the special character username is displayed correctly
    await expect(page.getByText("José O'Connor-Smith <test>")).toBeVisible({ timeout: 5000 });
  });

  test('should persist username across page interactions', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Initial message');
    await sendButton.click();

    await expect(page.getByText('Initial message')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 5000 });

    // Scroll the page
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);

    // Username should still be visible
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should handle missing name claim in JWT gracefully', async ({ page }) => {
    // Override the mock to return a JWT without a 'name' claim
    await page.route('**/.auth/me', async (route) => {
      const header = utf8ToBase64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      // JWT with no 'name' claim - only has sub and exp
      const payload = utf8ToBase64(JSON.stringify({ sub: 'test-user-123', exp: Math.floor(Date.now() / 1000) + 3600 }));
      const mockJwt = `${header}.${payload}.mock-signature`;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user', access_token: mockJwt }]),
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message without username');
    await sendButton.click();

    // Message should still appear and chat should function normally
    await expect(page.getByText('Test message without username')).toBeVisible({ timeout: 5000 });
    // Chat should remain functional
    await expect(messageInput).toBeEnabled({ timeout: 10000 });
  });

  test('should handle malformed JWT token gracefully', async ({ page }) => {
    // Override the mock to return a malformed JWT (invalid base64 in payload)
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user', access_token: 'invalid.not-valid-base64!@#.signature' }]),
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test with malformed token');
    await sendButton.click();

    // Chat should still work despite malformed JWT
    await expect(page.getByText('Test with malformed token')).toBeVisible({ timeout: 5000 });
    await expect(messageInput).toBeEnabled({ timeout: 10000 });
  });

  test('should handle missing access_token in auth response', async ({ page }) => {
    // Override the mock to return auth response without access_token
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test without access token');
    await sendButton.click();

    // Chat should still function without username
    await expect(page.getByText('Test without access token')).toBeVisible({ timeout: 5000 });
    await expect(messageInput).toBeEnabled({ timeout: 10000 });
  });
});
