# Complete Guide to Testing SSE Responses

## Quick Answer

To test SSE responses with complex content (code, images, structured data), use **Playwright route interception with custom fixtures**.

```bash
# Run SSE integration tests
npx playwright test e2e/tests/integration/sse-responses.spec.ts
```

## The Solution

We use **Playwright's route interception** with custom fixtures to mock SSE responses. This approach:

- ✅ Maintains proper SSE connections
- ✅ Sends properly formatted SSE events
- ✅ Supports all content types (code, images, structured data, streaming)
- ✅ No external dependencies (no Express server needed)
- ✅ Same testing technology across all tests

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Playwright     │         │  Your App        │         │  Playwright     │
│  Test           │────────▶│  (localhost:3001)│◀────────│  Route          │
│                 │         │                  │         │  Interception   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                   │
                                                                   │
                                                          Intercepts requests
                                                          and returns proper
                                                          SSE-formatted data
```

## Files Structure

```
e2e/
├── fixtures/
│   └── sse-fixtures.ts          # Custom Playwright fixture with auto-setup
│
├── mocks/
│   └── sse-generators.ts        # SSE response generation logic
│
└── tests/
    ├── critical/                # 19 tests - UI & state
    ├── features/                # 68 tests - Validation & edge cases
    ├── ui/                      # 10 tests - Session management
    └── integration/             # 9 tests - SSE streaming
        └── sse-responses.spec.ts
```

## How It Works

### 1. Custom Fixture (`e2e/fixtures/sse-fixtures.ts`)

The fixture automatically sets up route interception before each test:

```typescript
export const test = base.extend<{ mockSSE: void }>({
  mockSSE: [
    async ({ page }, use) => {
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
        if (request.method() === 'POST') {
          const postData = request.postDataJSON();
          const { method, id, params } = postData;

          if (method === 'message/stream') {
            const userMessage = params?.message?.parts?.[0]?.text || '';
            const sseContent = generateSSEResponse(id, userMessage);

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
        }
        await route.continue();
      });

      await use();
    },
    { auto: true }, // Automatically runs for all tests
  ],
});
```

### 2. SSE Response Generator (`e2e/mocks/sse-generators.ts`)

Generates proper A2A protocol SSE responses:

```typescript
export function generateSSEResponse(requestId: string, userMessage: string): string {
  const contextId = `ctx-${randomUUID()}`;
  const taskId = `task-${randomUUID()}`;
  const artifactId = randomUUID();

  let messages: string[] = [];

  // Determine response type based on user message
  if (userMessage.toLowerCase().includes('code')) {
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
      // Artifact updates...
      // Status: completed
    ];
  }
  // ... more response types

  return messages.join('');
}
```

## Usage

### Running Tests

```bash
# Run all SSE integration tests
npx playwright test e2e/tests/integration/sse-responses.spec.ts

# Run with UI mode for debugging
npx playwright test e2e/tests/integration/sse-responses.spec.ts --ui

# Run in headed mode
npx playwright test e2e/tests/integration/sse-responses.spec.ts --headed
```

### Writing Tests

Import the custom test fixture instead of the default Playwright test:

```typescript
import { test, expect } from '../../fixtures/sse-fixtures';

test.describe('SSE Response Tests', () => {
  test.beforeEach(async ({ page }) => {
    // The fixture automatically sets up SSE mocking
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
  });

  test('should display code blocks correctly', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('show me code');
    await sendButton.click();

    await expect(page.getByText(/Here's a code example/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('function').first()).toBeVisible();
  });
});
```

## Test Scenarios

The mock responds differently based on message content:

| Message Contains       | Response Type  | Description                            |
| ---------------------- | -------------- | -------------------------------------- |
| `code`                 | Code Block     | Returns markdown with TypeScript code  |
| `image`                | Image          | Returns data part with image URL       |
| `structured` or `data` | Table          | Returns structured data (table format) |
| `stream`               | Streaming Text | Sends response word-by-word            |
| `error`                | Error          | Returns JSON-RPC error response        |
| (anything else)        | Simple Text    | Returns echo of your message           |

## Adding New Response Types

Edit `e2e/mocks/sse-generators.ts`:

```typescript
export function generateSSEResponse(requestId: string, userMessage: string): string {
  const contextId = `ctx-${randomUUID()}`;
  const taskId = `task-${randomUUID()}`;
  const artifactId = randomUUID();

  let messages: string[] = [];

  // Add your custom response type
  if (userMessage.toLowerCase().includes('chart')) {
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
      // ... more status and artifact updates
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
                text: 'Here is your chart:',
              },
              {
                kind: 'data',
                data: {
                  type: 'chart',
                  chartType: 'bar',
                  data: [10, 20, 30, 40],
                  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
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
  }
  // ... existing response types

  return messages.join('');
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm exec playwright install chromium --with-deps

      # Run all tests
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            test-results/
```

## Test Coverage

| Test Suite  | Count   | What It Tests                          |
| ----------- | ------- | -------------------------------------- |
| Critical    | 19      | Core UI & state management             |
| Features    | 68      | Validation, error handling, edge cases |
| UI          | 10      | Session management UI                  |
| Integration | 9       | SSE streaming, content rendering       |
| **Total**   | **106** | **Complete E2E coverage**              |

## Benefits of This Approach

1. **No External Dependencies**: Uses Playwright's built-in capabilities
2. **Consistent Technology**: All tests use Playwright
3. **Fast Setup**: No server to start/stop
4. **Reliable**: No port conflicts or server startup issues
5. **Maintainable**: All mock logic in one place

## Troubleshooting

### Tests Timing Out

1. **Check dev server is running**: Visit https://localhost:3001
2. **Increase timeouts** if needed:
   ```typescript
   await expect(page.getByText(/response/)).toBeVisible({ timeout: 15000 });
   ```
3. **Check browser console** for JavaScript errors (run with `--headed`)

### SSE Events Not Appearing

1. **Verify fixture is being used**:

   ```typescript
   import { test, expect } from '../../fixtures/sse-fixtures'; // ✅ Correct
   import { test, expect } from '@playwright/test'; // ❌ Wrong
   ```

2. **Check response format** in `sse-generators.ts`:
   - Must be SSE format: `data: ${JSON.stringify(...)}\n\n`
   - Must follow A2A protocol structure

3. **Debug with UI mode**:
   ```bash
   npx playwright test --ui
   ```

## Summary

- **Use Playwright fixtures** for SSE mocking
- **No external dependencies** needed
- **All 9 SSE tests passing** and integrated with main test suite
- **Easy to extend** with new response types
- **Runs in CI/CD** without additional setup

For more details, see:

- **[e2e/fixtures/sse-fixtures.ts](./fixtures/sse-fixtures.ts)** - Fixture implementation
- **[e2e/mocks/sse-generators.ts](./mocks/sse-generators.ts)** - Response generation
- **[e2e/tests/integration/sse-responses.spec.ts](./tests/integration/sse-responses.spec.ts)** - Example tests
