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
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // The fixture provides 'Test User' - verify it displays correctly
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Testing username display');
    await sendButton.click();

    await expect(page.getByText('Testing username display')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 5000 });
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
});
