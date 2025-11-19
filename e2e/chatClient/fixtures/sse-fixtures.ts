/**
 * Playwright Fixtures for SSE Mocking
 *
 * Sets up route interception for A2A SSE endpoints using Playwright's built-in capabilities
 */

import { test as base, Page } from '@playwright/test';
import { generateSSEResponse, AGENT_CARD } from '../mocks/sse-generators';

async function setupSSEMocking(page: Page) {
  // Log browser console messages to see what's happening
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('[MOCK]') || text.includes('[AUTH]')) {
      console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    }
  });

  // Intercept mock consent page requests
  await page.route('**/mock-consent*', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mock Consent</title>
        </head>
        <body>
          <h1>Mock Authentication</h1>
          <p>This window will close automatically in 4 seconds...</p>
          <script>
            // Notify opener that auth is complete
            if (window.opener) {
              window.opener.postMessage({ type: 'AUTH_COMPLETE' }, '*');
            }

            // Auto-close after 4 seconds
            setTimeout(() => {
              window.close();
            }, 4000);
          </script>
        </body>
      </html>
    `;

    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: html,
    });
  });

  // Intercept agent card requests
  await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AGENT_CARD),
    });
  });

  // Intercept POST requests to the agent endpoint
  await page.route('**/api/agents/test', async (route) => {
    const request = route.request();

    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const postData = request.postDataJSON();
    const { method, id, params } = postData;

    // Handle contexts/list
    if (method === 'contexts/list') {
      // Check if the request came from a page with specific flags
      const referer = request.headers()['referer'] || '';
      const shouldReturnError = referer.includes('errorHistory=true');
      const shouldReturnMockHistory = referer.includes('withHistory=true');

      // Return error response if errorHistory flag is set
      if (shouldReturnError) {
        console.log('[SSE FIXTURE] Returning error for errorHistory test');
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: 'Internal server error',
            },
          }),
        });
        return;
      }

      // Return empty sessions array by default (unless withHistory flag is set)
      if (!shouldReturnMockHistory) {
        console.log('[SSE FIXTURE] Returning empty sessions (default)');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: [],
          }),
        });
        return;
      }

      // Return mock chat sessions only when withHistory=true is set
      const mockSessions = [
        {
          id: 'session-1',
          name: 'Project Discussion',
          isArchived: false,
          createdAt: '01/10/2025 10:30:00 AM',
          updatedAt: '01/10/2025 02:15:00 PM',
          status: 'Running',
          lastTask: {
            id: 'task-1',
            contextId: 'session-1',
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'I can help you with the project requirements.',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 02:15:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 02:15:00 PM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'I can help you with the project requirements.',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 02:15:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 02:15:00 PM',
            },
            history: [],
          },
        },
        {
          id: 'session-2',
          name: 'Bug Investigation',
          isArchived: false,
          createdAt: '01/09/2025 03:45:00 PM',
          updatedAt: '01/09/2025 04:30:00 PM',
          status: 'Running',
          lastTask: {
            id: 'task-2',
            contextId: 'session-2',
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-2',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The issue appears to be related to the API timeout.',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 04:30:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 04:30:00 PM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-2',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The issue appears to be related to the API timeout.',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 04:30:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 04:30:00 PM',
            },
            history: [],
          },
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: mockSessions,
        }),
      });
      return;
    }

    // Handle tasks/list
    if (method === 'tasks/list') {
      const contextId = params?.Id;
      console.log('[SSE FIXTURE] tasks/list request for context:', contextId);

      // Check for error scenario
      const referer = request.headers()['referer'] || '';
      const shouldReturnTasksError = referer.includes('errorTasks=true');

      if (shouldReturnTasksError) {
        console.log('[SSE FIXTURE] Returning error for errorTasks test');
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: 'Failed to load tasks',
            },
          }),
        });
        return;
      }

      // Return context-specific mock tasks/messages
      // NOTE: transformTasksToMessages reads from task.history array, not taskStatus.message
      let mockTasks: any[];

      if (contextId === 'session-1') {
        // Session 1: "Project Discussion" messages
        mockTasks = [
          {
            id: `task-${contextId}-1`,
            contextId: contextId,
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-user-s1-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Tell me about the project architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 10:30:00 AM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 10:30:00 AM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-user-s1-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Tell me about the project architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 10:30:00 AM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 10:30:00 AM',
            },
            history: [
              {
                messageId: 'msg-user-s1-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Tell me about the project architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 10:30:00 AM',
                },
                kind: 'message',
              },
            ],
          },
          {
            id: `task-${contextId}-2`,
            contextId: contextId,
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-agent-s1-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The project uses a modern microservices architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 02:15:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 02:15:00 PM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-agent-s1-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The project uses a modern microservices architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 02:15:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/10/2025 02:15:00 PM',
            },
            history: [
              {
                messageId: 'msg-agent-s1-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The project uses a modern microservices architecture',
                  },
                ],
                metadata: {
                  timestamp: '01/10/2025 02:15:00 PM',
                },
                kind: 'message',
              },
            ],
          },
        ];
      } else if (contextId === 'session-2') {
        // Session 2: "Bug Investigation" messages
        mockTasks = [
          {
            id: `task-${contextId}-1`,
            contextId: contextId,
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-user-s2-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Help me debug this timeout issue',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 03:45:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 03:45:00 PM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-user-s2-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Help me debug this timeout issue',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 03:45:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 03:45:00 PM',
            },
            history: [
              {
                messageId: 'msg-user-s2-1',
                role: 'user',
                parts: [
                  {
                    kind: 'text',
                    text: 'Help me debug this timeout issue',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 03:45:00 PM',
                },
                kind: 'message',
              },
            ],
          },
          {
            id: `task-${contextId}-2`,
            contextId: contextId,
            taskStatus: {
              state: 'completed',
              message: {
                messageId: 'msg-agent-s2-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The timeout is likely caused by the database connection pool',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 04:30:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 04:30:00 PM',
            },
            status: {
              state: 'completed',
              message: {
                messageId: 'msg-agent-s2-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The timeout is likely caused by the database connection pool',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 04:30:00 PM',
                },
                kind: 'message',
              },
              timestamp: '01/09/2025 04:30:00 PM',
            },
            history: [
              {
                messageId: 'msg-agent-s2-1',
                role: 'agent',
                parts: [
                  {
                    kind: 'text',
                    text: 'The timeout is likely caused by the database connection pool',
                  },
                ],
                metadata: {
                  timestamp: '01/09/2025 04:30:00 PM',
                },
                kind: 'message',
              },
            ],
          },
        ];
      } else {
        // Default fallback for unknown sessions
        mockTasks = [];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: mockTasks,
        }),
      });
      return;
    }

    // Handle message/stream with SSE
    if (method === 'message/stream') {
      console.log(`message full: ${JSON.stringify(params?.message?.parts?.[0], null, 2)}`);
      const userMessage = params?.message?.parts?.[0]?.text ?? '';
      const messageType = params?.message.parts?.[0]?.data?.messageType ?? '';
      console.log(`messageType ${messageType}`);
      console.log('[SSE FIXTURE] Generating SSE response for message:', userMessage, messageType);
      const sseContent = generateSSEResponse(id, userMessage, messageType);

      // Log the first 500 chars of the response
      console.log('[SSE FIXTURE] SSE response (first 500 chars):', sseContent.substring(0, 500));

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseContent,
      });
      return;
    }

    // Unknown method
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unknown method' }),
    });
  });
}

// Create a custom test that automatically sets up SSE mocking
export const test = base.extend<{ mockSSE: void }>({
  mockSSE: [
    async ({ page }, use) => {
      await setupSSEMocking(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
