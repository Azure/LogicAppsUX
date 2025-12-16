/**
 * Complete E2E Flow Test
 *
 * Based on actual browser behavior discovered via Playwright MCP.
 * This test properly mocks all required endpoints with correct formats.
 */

import { test, expect, type Route } from '@playwright/test';

const VALID_AGENT_CARD = {
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

test.describe('Complete Chat Flow', { tag: '@mock' }, () => {
  test('should complete a full chat conversation', async ({ page }) => {
    // Track which endpoints were called
    const calls = {
      agentCard: false,
      contextsList: false,
      messageStream: false,
    };

    // Mock authentication - return authenticated user
    await page.route('**/.auth/me', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
      });
    });

    // Mock 1: Agent card endpoint
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      calls.agentCard = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VALID_AGENT_CARD),
      });
    });

    // Mock 2: All JSON-RPC endpoints to the agent
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();

      // Only handle POST requests
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      try {
        const postData = request.postDataJSON();

        // Handle contexts/list (for loading sessions)
        if (postData?.method === 'contexts/list') {
          calls.contextsList = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              result: [], // Empty sessions list
            }),
          });
          return;
        }

        // Handle message/stream (for chat messages) - returns SSE stream
        if (postData?.method === 'message/stream') {
          calls.messageStream = true;

          // Create SSE response with multiple events
          const taskId = `task-${Date.now()}`;
          const contextId = postData.params?.message?.contextId || `ctx-${Date.now()}`;

          // SSE format: each event starts with "data: " and ends with "\n\n"
          const sseEvents = [
            // Event 1: Initial task state
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                taskId,
                contextId,
                state: 'working',
                message: {
                  role: 'assistant',
                  parts: [{ kind: 'text', text: '' }],
                },
              },
            })}\n\n`,

            // Event 2: Streaming text update
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                taskId,
                contextId,
                state: 'working',
                message: {
                  role: 'assistant',
                  parts: [{ kind: 'text', text: 'Hello! I received your message: "' }],
                },
              },
            })}\n\n`,

            // Event 3: More text
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                taskId,
                contextId,
                state: 'working',
                message: {
                  role: 'assistant',
                  parts: [
                    {
                      kind: 'text',
                      text: `Hello! I received your message: "${postData.params?.message?.parts?.[0]?.text || 'your message'}"`,
                    },
                  ],
                },
              },
            })}\n\n`,

            // Event 4: Completion
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              id: postData.id,
              result: {
                taskId,
                contextId,
                state: 'completed',
                message: {
                  role: 'assistant',
                  parts: [
                    {
                      kind: 'text',
                      text: `Hello! I received your message: "${postData.params?.message?.parts?.[0]?.text || 'your message'}"`,
                    },
                  ],
                },
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
      } catch (error) {
        console.error('[MOCK] Error parsing request:', error);
        await route.continue();
      }
    });

    // Navigate to app
    const agentCardUrl = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify empty state shows
    await expect(page.getByText('No chats yet')).toBeVisible({ timeout: 5000 });

    // Click "Start a new chat"
    const startChatButton = page.getByRole('button', { name: /start a new chat/i });
    await startChatButton.click();

    // Wait for chat interface to appear
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Type a message
    await messageInput.fill('Hello, test agent!');

    // Click send button (look for aria-label or icon)
    const sendButton = page
      .getByRole('button', { name: /send/i })
      .or(page.locator('button[aria-label*="Send"]').or(page.locator('button:has(svg)').last()));
    await sendButton.click();

    // Wait for user message to appear in chat
    await expect(page.getByText('Hello, test agent!')).toBeVisible({ timeout: 5000 });

    // Wait for typing indicator
    await expect(page.getByText(/agent is typing/i)).toBeVisible({ timeout: 5000 });

    // Verify all expected calls were made
    expect(calls.agentCard).toBe(true);
    expect(calls.contextsList).toBe(true);
    expect(calls.messageStream).toBe(true);
  });

  test('should show typing indicator while waiting for response', async ({ page }) => {
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
        body: JSON.stringify(VALID_AGENT_CARD),
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
        // Return an incomplete stream to keep typing indicator showing
        const taskId = `task-${Date.now()}`;
        const contextId = `ctx-${Date.now()}`;

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              taskId,
              contextId,
              state: 'working',
              message: { role: 'assistant', parts: [{ kind: 'text', text: '' }] },
            },
          })}\n\n`,
        });
        return;
      }

      await route.continue();
    });

    const agentCardUrl = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /start a new chat/i }).click();
    await page.locator('textarea').first().fill('Hello!');

    const sendButton = page.getByRole('button', { name: /send/i }).or(page.locator('button:has(svg)').last());
    await sendButton.click();

    // Should show typing indicator
    await expect(page.getByText(/agent is typing/i)).toBeVisible({ timeout: 5000 });
  });
});
