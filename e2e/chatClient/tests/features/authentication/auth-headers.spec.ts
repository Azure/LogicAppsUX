/**
 * API Key and OBO Token Authentication E2E Tests
 *
 * Tests to verify that API keys and OBO tokens are properly
 * passed through HTTP headers in requests to the agent server.
 */

import { test, expect } from '../../../fixtures/sse-fixtures';

// Agent card URL - intercepted by our fixture
const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('API Key Authentication', { tag: '@mock' }, () => {
  test('should include API key header in agent card request', async ({ page }) => {
    // Set up request listener
    const requestPromise = page.waitForRequest(
      (request) => request.url().includes('.well-known/agent-card.json') && request.method() === 'GET'
    );

    // Navigate to app with API key
    const apiKey = 'test-api-key-12345';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}`);
    await page.waitForLoadState('networkidle');

    // Verify API key header was sent
    const request = await requestPromise;
    const headers = request.headers();
    expect(headers['x-api-key']).toBe(apiKey);
  });

  test('should include API key header in message/stream requests', async ({ page }) => {
    // Navigate to app with API key
    const apiKey = 'test-api-key-67890';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Set up request listener for message/stream
    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    // Send message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();
    await messageInput.fill('Test message with API key');
    await sendButton.click();

    // Verify API key header in message request
    const messageRequest = await messageStreamPromise;
    const headers = messageRequest.headers();
    expect(headers['x-api-key']).toBe(apiKey);
  });

  test('should include API key header in contexts/list requests', async ({ page }) => {
    const apiKey = 'test-contexts-api-key';

    // Set up request listener BEFORE navigation
    const contextsListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'contexts/list';
    });

    // Navigate to app with API key
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}`);
    await page.waitForLoadState('networkidle');

    // Verify API key header in contexts/list request
    const contextsRequest = await contextsListPromise;
    const headers = contextsRequest.headers();
    expect(headers['x-api-key']).toBe(apiKey);
  });
});

test.describe('OBO Token Authentication', { tag: '@mock' }, () => {
  test('should include OBO token header in agent card request', async ({ page }) => {
    // Set up request listener
    const requestPromise = page.waitForRequest(
      (request) => request.url().includes('.well-known/agent-card.json') && request.method() === 'GET'
    );

    // Navigate to app with OBO token
    const oboToken = 'obo-user-token-abc123';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&oboUserToken=${oboToken}`);
    await page.waitForLoadState('networkidle');

    // Verify OBO token header was sent
    const request = await requestPromise;
    const headers = request.headers();
    expect(headers['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });

  test('should include OBO token header in message/stream requests', async ({ page }) => {
    // Navigate to app with OBO token
    const oboToken = 'obo-user-token-def456';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&oboUserToken=${oboToken}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Set up request listener for message/stream
    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    // Send message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();
    await messageInput.fill('Test message with OBO token');
    await sendButton.click();

    // Verify OBO token header in message request
    const messageRequest = await messageStreamPromise;
    const headers = messageRequest.headers();
    expect(headers['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });

  test('should include OBO token header in contexts/list requests', async ({ page }) => {
    const oboToken = 'obo-contexts-token-xyz';

    // Set up request listener BEFORE navigation
    const contextsListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'contexts/list';
    });

    // Navigate to app with OBO token
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&oboUserToken=${oboToken}`);
    await page.waitForLoadState('networkidle');

    // Verify OBO token header in contexts/list request
    const contextsRequest = await contextsListPromise;
    const headers = contextsRequest.headers();
    expect(headers['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });
});

test.describe('Combined API Key and OBO Token Authentication', { tag: '@mock' }, () => {
  test('should include both API key and OBO token headers in requests', async ({ page }) => {
    const apiKey = 'combined-api-key';
    const oboToken = 'combined-obo-token';

    // Navigate to app with both credentials
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}&oboUserToken=${oboToken}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Set up request listener for message/stream
    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    // Send message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();
    await messageInput.fill('Test message with both credentials');
    await sendButton.click();

    // Verify both headers in message request
    const messageRequest = await messageStreamPromise;
    const headers = messageRequest.headers();
    expect(headers['x-api-key']).toBe(apiKey);
    expect(headers['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });

  test('should maintain credentials across multiple requests', async ({ page }) => {
    const apiKey = 'persistent-api-key';
    const oboToken = 'persistent-obo-token';

    // Navigate to app with both credentials
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}&oboUserToken=${oboToken}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Send first message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // First message
    const firstMessagePromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });
    await messageInput.fill('First message');
    await sendButton.click();
    const firstRequest = await firstMessagePromise;
    expect(firstRequest.headers()['x-api-key']).toBe(apiKey);
    expect(firstRequest.headers()['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);

    // Wait for response
    await page.waitForTimeout(1000);

    // Second message
    const secondMessagePromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      const text = postData?.params?.message?.parts?.[0]?.text;
      return postData?.method === 'message/stream' && text === 'Second message';
    });
    await messageInput.fill('Second message');
    await sendButton.click();
    const secondRequest = await secondMessagePromise;
    expect(secondRequest.headers()['x-api-key']).toBe(apiKey);
    expect(secondRequest.headers()['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });
});

test.describe('Authentication Edge Cases', { tag: '@mock' }, () => {
  test('should not include API key header when not provided', async ({ page }) => {
    // Navigate without API key
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    // Set up request listener
    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    // Send message
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();
    await messageInput.fill('Message without credentials');
    await sendButton.click();

    // Verify no API key header
    const messageRequest = await messageStreamPromise;
    const headers = messageRequest.headers();
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['x-ms-obo-usertoken']).toBeUndefined();
  });

  test('should handle special characters in API key', async ({ page }) => {
    const apiKeyWithSpecialChars = 'api-key_123!@#$%^&*()+=';

    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${encodeURIComponent(apiKeyWithSpecialChars)}`
    );
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();
    await messageInput.fill('Test');
    await sendButton.click();

    const messageRequest = await messageStreamPromise;
    expect(messageRequest.headers()['x-api-key']).toBe(apiKeyWithSpecialChars);
  });
});
