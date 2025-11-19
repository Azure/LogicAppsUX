# E2E Testing Findings

## Summary

After implementing and debugging E2E tests using Playwright, we've discovered important limitations and best practices for testing the A2A Chat application.

## What Works ✅

### 1. Basic UI Testing

- Page loading and initialization
- Empty state verification ("No chats yet")
- Button interactions ("Start a new chat", "+ New Chat")
- Chat interface appearance after creating new session
- Message input interactions (typing, filling forms)
- User message display in chat history

### 2. API Endpoint Mocking

- ✅ Agent card endpoint (`GET /.well-known/agent-card.json`)
- ✅ Session listing endpoint (`POST` with `contexts/list` JSON-RPC method)
- ⚠️ Message streaming endpoint (partial - see limitations below)

### 3. Observable Behaviors

- Loading states
- Empty states
- UI transitions
- Form interactions
- Static content verification

## Limitations ⚠️

### SSE (Server-Sent Events) Streaming Challenges

**Problem**: Playwright's `route.fulfill()` doesn't properly support long-lived SSE connections.

**Technical Details**:

- SSE requires keeping an HTTP connection open and sending multiple events over time
- Playwright's `route.fulfill({ body: '...' })` sends the entire body and immediately closes the connection
- The A2A client uses `ReadableStream` to process SSE data chunk-by-chunk
- When the connection closes too quickly, the client may not process all events

**Observable Symptoms**:

```
1. User sends message ✅
2. "Agent is typing..." appears ✅ (indicates stream started)
3. Agent response never appears ❌ (stream closed before 'completed' event processed)
```

**Evidence from Testing**:

- Mock endpoint IS called with correct `message/stream` method
- SSE response body is correctly formatted: `data: {...}\n\n`
- Console logs show stream started
- But final response text never renders in UI

### What This Means

**Can Test**:

- UI interactions and state transitions
- Request formats and parameters being sent
- Error states and loading indicators
- User input validation
- Multi-session management UI

**Cannot Reliably Test with Playwright Mocks**:

- Complete SSE streaming responses
- Incremental text updates during streaming
- Stream interruption/reconnection behavior
- Real-time message accumulation

## Recommendations

### For E2E Tests (Playwright)

Focus on **user-visible behavior** that doesn't depend on SSE completion:

```typescript
test('should show typing indicator after sending message', async ({ page }) => {
  // Setup mocks...

  await page.goto(appUrl);
  await page.getByRole('button', { name: /start a new chat/i }).click();
  await page.locator('textarea').fill('Hello!');
  await page.getByRole('button', { name: /send/i }).click();

  // Verify user message appears
  await expect(page.getByText('Hello!')).toBeVisible();

  // Verify typing indicator shows
  await expect(page.getByText(/agent is typing/i)).toBeVisible();

  // ✅ This is testable without SSE completion
});
```

### For Streaming Tests

Use **integration tests** with a real mock server:

**Option 1: Use MSW (Mock Service Worker) with Node**

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('*/api/agents/test', async ({ request }) => {
    const body = await request.json();

    if (body.method === 'message/stream') {
      const stream = new ReadableStream({
        start(controller) {
          // Send events over time
          controller.enqueue(`data: ${JSON.stringify(event1)}\n\n`);

          setTimeout(() => {
            controller.enqueue(`data: ${JSON.stringify(event2)}\n\n`);
            controller.close();
          }, 100);
        },
      });

      return new HttpResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
  })
);
```

**Option 2: Run actual mock server**

```bash
# Start a simple Express server that properly handles SSE
node e2e/mock-server/index.js &
MOCK_SERVER_PID=$!

# Run tests against real server
pnpm test:e2e

# Cleanup
kill $MOCK_SERVER_PID
```

**Option 3: Test against real agent (staging environment)**

```typescript
test('full conversation flow @integration', async ({ page }) => {
  // Use real agent URL in CI/staging
  const agentUrl = process.env.TEST_AGENT_URL || 'https://staging.agent.com';

  // Test actual end-to-end flow
  await page.goto(`/?agentCard=${agentUrl}/.well-known/agent-card.json`);
  // ... rest of test
});
```

### Recommended Test Structure

```
e2e/
├── tests/
│   ├── ui/                    # Playwright tests (no SSE dependency)
│   │   ├── navigation.spec.ts
│   │   ├── session-management.spec.ts
│   │   └── input-validation.spec.ts
│   │
│   ├── integration/           # Tests with real mock server
│   │   ├── streaming.spec.ts
│   │   └── full-conversation.spec.ts
│   │
│   └── e2e/                   # Tests against real staging agent
│       └── production-flow.spec.ts
│
├── mock-server/               # Express server for integration tests
│   └── index.ts
│
└── fixtures/
    ├── agent-cards.ts
    └── mock-responses.ts
```

## Current Test Status

### Working Tests ✅

- `live-test.spec.ts` - App loads with mocks
- `multi-session-flow.spec.ts` - UI interactions (empty state, new chat button)
- `debug-sse.spec.ts` - Demonstrates SSE mock is called correctly

### Partially Working ⚠️

- `complete-flow.spec.ts` - Sends message, sees typing indicator, but response doesn't complete

### Not Implemented Yet

- Streaming completion tests (blocked by Playwright SSE limitations)
- Error recovery tests
- Authentication flow tests
- Network reconnection tests

## Next Steps

1. **Refactor existing tests** to focus on UI behavior only
2. **Create integration test suite** with real mock server for SSE
3. **Document test categories** clearly (unit / integration / e2e)
4. **Add CI configuration** for different test levels
5. **Consider visual regression tests** for UI consistency

## Technical Reference

### SSE Format (A2A Protocol)

```
data: {"jsonrpc":"2.0","id":"123","result":{...}}\n\n
```

### Message Stream Request

```json
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "kind": "message",
      "messageId": "...",
      "role": "user",
      "parts": [{ "kind": "text", "text": "Hello" }]
    },
    "configuration": {
      "acceptedOutputModes": ["text"]
    }
  }
}
```

### Stream Response States

1. `state: "working"` - Agent is processing (triggers "typing..." indicator)
2. `state: "completed"` - Agent finished (shows final response)
3. `state: "error"` - Something went wrong

## Conclusion

E2E testing with Playwright is excellent for **UI behavior and user interactions**, but has fundamental limitations with **SSE streaming**. The solution is to use a **layered testing approach**:

- **Playwright**: UI, navigation, forms, static content
- **Integration tests**: SSE streaming with real mock server
- **E2E tests**: Full flows against staging environment

This ensures comprehensive coverage while working within each tool's strengths.
