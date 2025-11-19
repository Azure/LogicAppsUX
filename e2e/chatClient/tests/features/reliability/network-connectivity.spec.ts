/**
 * Network Connectivity and Recovery Tests
 *
 * Tests for network error scenarios including:
 * - Connection interruptions during messaging
 * - SSE stream failures and recovery
 * - Server errors (500, 503, timeouts)
 * - Auto-reconnection behavior
 * - Partial message delivery
 * - Network offline/online transitions
 */

import { test, expect, type Route } from '@playwright/test';

const AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'A test agent for network testing',
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

test.describe('Server Error Responses', { tag: '@mock' }, () => {
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
  });

  test('should handle 500 Internal Server Error gracefully', async ({ page }) => {
    // Mock message/stream to return 500
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message');
    await sendButton.click();

    // Should show error message to user
    await expect(page.getByText(/error|failed|something went wrong/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Input should be re-enabled so user can retry
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
  });

  test('should handle 503 Service Unavailable', async ({ page }) => {
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Unavailable' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test message');
    await sendButton.click();

    // Should show service unavailable error
    await expect(page.getByText(/unavailable|error|failed|try again/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle network timeout', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        requestCount++;
        // Hang the request - don't respond at all (simulates timeout)
        // This will trigger client-side timeout handling

        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms to simulate a delayed response and trigger client-side timeout
        await route.abort('timedout');
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test timeout');
    await sendButton.click();

    // Should show timeout error after 5 seconds (configured via URL parameter)
    await expect(page.getByText(/timeout|error|failed|taking too long/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Input should be re-enabled
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
  });

  test('should handle malformed JSON response', async ({ page }) => {
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        // Return malformed JSON
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {this is not valid JSON\n\n',
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test malformed');
    await sendButton.click();

    // Should handle gracefully without crashing
    // Check page is still responsive
    await page.waitForTimeout(2000);
    await expect(messageInput).toBeVisible();

    // May show error or just fail silently - either is acceptable
    // Main thing is the app doesn't crash
  });
});

test.describe('SSE Connection Failures', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });
  });

  test('should handle network error on initial connection', async ({ page }) => {
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        // Simulate network failure
        await route.abort('failed');
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test network error');
    await sendButton.click();

    // Should show network error
    await expect(page.getByText(/error|failed|network|connection/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Input should be re-enabled for retry
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('Connection Recovery', { tag: '@mock' }, () => {
  test('should recover after temporary network failure', async ({ page }) => {
    let failCount = 0;
    const maxFails = 1;

    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        // Fail first attempt, succeed subsequent attempts
        if (failCount < maxFails) {
          failCount++;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary error' }),
          });
          return;
        }

        // Succeed after failure
        const contextId = `ctx-${Date.now()}`;
        const taskId = `task-${Date.now()}`;
        const artifactId = `artifact-${Date.now()}`;
        const responseText = 'Connection recovered! Message sent successfully.';

        const sseEvents = [
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              taskId,
              contextId,
              status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
              kind: 'status-update',
              final: false,
            },
          })}\n\n`,
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              taskId,
              contextId,
              status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
              kind: 'status-update',
              final: false,
            },
          })}\n\n`,
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            result: {
              taskId,
              contextId,
              artifact: {
                artifactId,
                parts: [{ text: '', kind: 'text' }],
              },
              kind: 'artifact-update',
              append: false,
              lastChunk: false,
            },
          })}\n\n`,
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            result: {
              taskId,
              contextId,
              artifact: {
                artifactId,
                parts: [{ text: responseText, kind: 'text' }],
              },
              kind: 'artifact-update',
              append: true,
              lastChunk: true,
            },
          })}\n\n`,
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            result: {
              taskId,
              contextId,
              status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
              kind: 'status-update',
              final: true,
            },
          })}\n\n`,
        ];

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseEvents.join(''),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // First attempt - will fail
    await messageInput.fill('Test recovery');
    await sendButton.click();

    // Should show error
    await expect(page.getByText(/error|failed/i).first()).toBeVisible({ timeout: 10000 });

    // Wait for input to be re-enabled
    await expect(messageInput).toBeEnabled({ timeout: 5000 });

    // Retry - should succeed
    await messageInput.fill('Test recovery retry');
    await sendButton.click();

    // Should succeed this time
    await expect(page.getByText('Connection recovered! Message sent successfully.')).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Session Loading Errors', { tag: '@mock' }, () => {
  test('should handle session list loading failure gracefully', async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        // Fail session list loading
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            error: { code: -32603, message: 'Failed to load sessions' },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // App should still load, possibly showing error or empty state
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    // Check for error message or empty state
    const hasError = await page
      .getByText(/error|failed/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no chats yet|start a new chat/i)
      .first()
      .isVisible()
      .catch(() => false);

    // Either error or empty state should be shown
    expect(hasError || hasEmptyState).toBe(true);
  });

  test('should retry session loading after initial failure', async ({ page }) => {
    let loadAttempts = 0;

    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        loadAttempts++;

        // Fail first attempt, succeed on retry
        if (loadAttempts === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              error: { code: -32603, message: 'Temporary failure' },
            }),
          });
          return;
        }

        // Succeed on retry
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

    // If there's a retry button, click it
    const retryButton = page.getByRole('button', { name: /retry|try again/i });
    const hasRetryButton = await retryButton.isVisible().catch(() => false);

    if (hasRetryButton) {
      await retryButton.click();
      await page.waitForTimeout(1000);
    }

    // After retry (manual or automatic), should eventually load
    // Check that we have UI elements indicating successful load
    const hasStartButton = await page
      .getByRole('button', { name: /start a new chat/i })
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no chats yet/i)
      .isVisible()
      .catch(() => false);

    // Should eventually show normal UI
    expect(hasStartButton || hasEmptyState).toBe(true);
  });
});

test.describe('Rate Limiting and Throttling', { tag: '@mock' }, () => {
  test('should handle 429 Too Many Requests', async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      if (postData?.method === 'message/stream') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '5',
          },
          body: JSON.stringify({ error: 'Too Many Requests' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('Test rate limit');
    await sendButton.click();

    // Should show rate limit error
    await expect(
      page.getByText(/too many requests|rate limit|slow down|try again later/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Input should be re-enabled
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
  });
});
