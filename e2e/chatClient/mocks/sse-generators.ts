/**
 * SSE Response Generators
 *
 * Generates SSE-formatted responses for A2A protocol testing
 */

import { randomUUID } from 'crypto';

// Helper to create SSE messages
function createSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function generateSSEResponse(requestId: string, userMessage: string, messageType?: string): string {
  const contextId = `ctx-${randomUUID()}`;
  const taskId = `task-${randomUUID()}`;
  const artifactId = randomUUID();

  let messages: string[] = [];
  // Determine response type based on user message

  if (userMessage.toLowerCase().includes('code')) {
    const codeText =
      'Here\'s a code example:\n\n```typescript\nfunction hello(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(hello("World"));\n```\n\nThis is a simple TypeScript function.';

    messages = [
      // Status: submitted
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      // Status: working
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      // Artifact: initial (empty)
      createSSEMessage({
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
      }),
      // Artifact: complete code
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [{ text: codeText, kind: 'text' }],
          },
          kind: 'artifact-update',
          append: true,
          lastChunk: true,
        },
      }),
      // Status: completed
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('image')) {
    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [],
          },
          kind: 'artifact-update',
          append: false,
          lastChunk: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [
              {
                kind: 'text',
                text: 'Here is the image you requested:',
              },
              {
                kind: 'data',
                data: {
                  type: 'image',
                  url: 'https://via.placeholder.com/300x200.png?text=Test+Image',
                  alt: 'Test image',
                  width: 300,
                  height: 200,
                },
              },
            ],
          },
          kind: 'artifact-update',
          append: true,
          lastChunk: true,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('structured') || userMessage.toLowerCase().includes('data')) {
    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [],
          },
          kind: 'artifact-update',
          append: false,
          lastChunk: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [
              {
                kind: 'text',
                text: 'Here is the structured data:',
              },
              {
                kind: 'data',
                data: {
                  type: 'table',
                  headers: ['Name', 'Age', 'City'],
                  rows: [
                    ['Alice', 30, 'New York'],
                    ['Bob', 25, 'San Francisco'],
                    ['Charlie', 35, 'Seattle'],
                  ],
                },
              },
            ],
          },
          kind: 'artifact-update',
          append: true,
          lastChunk: true,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('very long response')) {
    // Generate a very long response (1000+ words)
    const longResponseText =
      'This is a very long response that contains a lot of information. ' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum. ' +
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia. '.repeat(50) +
      'This is the end of the very long response.';

    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
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
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          artifact: {
            artifactId,
            parts: [{ text: longResponseText, kind: 'text' }],
          },
          kind: 'artifact-update',
          append: true,
          lastChunk: true,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('stream')) {
    const words = ['This', 'is', 'a', 'streaming', 'response', 'that', 'arrives', 'word', 'by', 'word'];

    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
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
      }),
    ];

    // Add word-by-word updates
    for (let i = 0; i < words.length; i++) {
      const currentText = words.slice(0, i + 1).join(' ');
      const isLastWord = i === words.length - 1;

      messages.push(
        createSSEMessage({
          jsonrpc: '2.0',
          id: null,
          result: {
            taskId,
            contextId,
            artifact: {
              artifactId,
              parts: [{ text: currentText, kind: 'text' }],
            },
            kind: 'artifact-update',
            append: true,
            lastChunk: isLastWord,
          },
        })
      );
    }

    messages.push(
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      })
    );
  } else if (userMessage.toLowerCase().includes('error')) {
    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32000,
          message: 'Simulated error for testing',
          data: {
            contextId,
            taskId,
          },
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('require auth')) {
    // Single auth requirement - using correct A2A protocol format
    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          kind: 'status-update',
          status: {
            state: 'auth-required',
            timestamp: new Date().toLocaleString('en-US'),
            message: {
              role: 'assistant',
              parts: [
                {
                  kind: 'data',
                  data: {
                    messageType: 'InTaskAuthRequired',
                    consentLink: 'http://localhost:3001/mock-consent',
                    status: 'Unauthenticated',
                    serviceName: 'Microsoft Graph',
                    serviceIcon: 'https://example.com/icons/graph.png',
                    description: 'Access to your Microsoft Graph data is required',
                  },
                },
              ],
            },
          },
          final: true,
        },
      }),
    ];
  } else if (userMessage.toLowerCase().includes('multiple auth')) {
    // Multiple auth requirements
    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      // Multiple auth required - using correct A2A protocol format
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          kind: 'status-update',
          status: {
            state: 'auth-required',
            timestamp: new Date().toLocaleString('en-US'),
            message: {
              role: 'assistant',
              parts: [
                {
                  kind: 'data',
                  data: {
                    messageType: 'InTaskAuthRequired',
                    consentLink: 'https://microsoft.com',
                    status: 'Unauthenticated',
                    serviceName: 'Microsoft Graph',
                    serviceIcon: 'https://example.com/icons/graph.png',
                    description: 'Access to your Microsoft Graph data is required',
                  },
                },
                {
                  kind: 'data',
                  data: {
                    messageType: 'InTaskAuthRequired',
                    consentLink: 'https://www.office.com',
                    status: 'Unauthenticated',
                    serviceName: 'SharePoint',
                    serviceIcon: 'https://example.com/icons/sharepoint.png',
                    description: 'Access to your SharePoint sites is required',
                  },
                },
              ],
            },
          },
          final: true,
        },
      }),
    ];
  } else if (messageType === 'AuthenticationCompleted') {
    // Response after authentication is completed
    const responseText = 'Authentication successful! Here is your secured data.';

    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
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
      }),
      createSSEMessage({
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
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  } else {
    // Simple text response
    const responseText = `I received your message: "${userMessage}"`;

    messages = [
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'submitted', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          taskId,
          contextId,
          status: { state: 'working', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: false,
        },
      }),
      createSSEMessage({
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
      }),
      createSSEMessage({
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
      }),
      createSSEMessage({
        jsonrpc: '2.0',
        id: null,
        result: {
          taskId,
          contextId,
          status: { state: 'completed', timestamp: new Date().toLocaleString('en-US') },
          kind: 'status-update',
          final: true,
        },
      }),
    ];
  }

  return messages.join('');
}

export const AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'A test agent for E2E testing with SSE support',
  url: 'http://localhost:3001/api/agents/test',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'data'],
  skills: [],
};
