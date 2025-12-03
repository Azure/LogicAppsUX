# E2E Testing Troubleshooting Guide

## Common Issues and Solutions

### Tests Stuck on "Loading..."

**Problem**: Playwright UI shows "Loading..." and never discovers tests.

**Root Causes**:

1. **Port mismatch** - Playwright waiting for wrong port
2. **Missing configuration** - App requires agentCard parameter to load
3. **Dev server not starting** - Check for port conflicts

**Solution**:

1. Check `playwright.config.ts` baseURL matches vite config server port
2. Ensure all tests provide required URL parameters (agentCard)
3. Use helper functions from `e2e/fixtures/agent-card.ts`

### Configuration Fixed (2025-10-31)

The following configuration issues were resolved:

#### 1. Port Mismatch & HTTPS

- **Problem**: Playwright config expected `http://localhost:5173`
- **Reality**: iframe-app runs on `https://localhost:3001` (HTTPS with mkcert)
- **Fix**: Updated `playwright.config.ts` baseURL to `https://localhost:3001` and added `ignoreHTTPSErrors: true`

#### 2. Missing Agent Card

- **Problem**: App requires `agentCard` URL parameter to load
- **Reality**: Tests were navigating to `/` without parameters
- **Fix**: Created helper functions and updated all tests:
  - `setupAgentCardMock(page)` - Mocks the agent card endpoint
  - `gotoWithAgentCard(page)` - Navigates with required parameters

#### 3. API Endpoint Mocking

- **Problem**: Mock server was configured for wrong URL
- **Fix**: Updated `e2e/config/mock-server.ts` to use port 3001

## How to Use

### Setup Tests Correctly

```typescript
import { test } from '@playwright/test';
import { setupAgentCardMock, gotoWithAgentCard } from '../../fixtures/agent-card';
import { setupMockServer } from '../../config/mock-server';

test.describe('My Test', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock agent card (required for app to load)
    await setupAgentCardMock(page);

    // 2. Mock API responses (optional, depends on test)
    await setupMockServer(page, 'success');
  });

  test('my test', async ({ page }) => {
    // 3. Navigate with agent card parameter
    await gotoWithAgentCard(page);

    // 4. Your test logic here
    // ...
  });
});
```

### Quick Verification

If tests are stuck, verify:

```bash
# 1. Check if dev server is running on correct port (HTTPS!)
curl -k https://localhost:3001

# 2. Check if agent card mock is needed
# Look for this in your browser console when manually testing:
# "data-agent-card is required or URL must follow..."

# 3. Run smoke test to verify basic setup
pnpm test:e2e e2e/tests/critical/smoke.spec.ts
```

**Note**: The dev server uses HTTPS (via mkcert plugin), not HTTP. All test configurations use `https://localhost:3001`.

## App Configuration Requirements

The iframe app requires one of the following to load:

1. **URL Parameter**: `?agentCard=<url>`
2. **Data Attribute**: `<html data-agent-card="<url>">`
3. **URL Pattern**: Must match `/api/agentsChat/{AgentKind}/IFrame` or `/scaleunits/{ScaleUnitId}/flows/{FlowId}/agentChat/IFrame`

Our tests use option #1 (URL parameter) with a mocked endpoint.

## Dev Server Configuration

The dev server (iframe-app) is configured in `apps/iframe-app/vite.config.ts`:

```typescript
plugins: [react(), renameIndexHtml(), mkcert()],  // ← mkcert enables HTTPS
// ...
server: {
  port: 3001,  // ← This is the port Playwright must wait for
  host: true,
}
```

**Important**: The `mkcert()` plugin automatically enables HTTPS for local development, so the server runs on `https://localhost:3001`, not `http://`.

## Helpful Commands

```bash
# Run tests with UI (best for debugging stuck tests)
pnpm test:e2e:ui

# Run in headed mode (see the browser)
pnpm test:e2e:headed

# Run just smoke tests
pnpm test:e2e e2e/tests/critical/smoke.spec.ts

# Debug mode (step through)
pnpm test:e2e:debug

# Check Playwright config
cat playwright.config.ts | grep -A 5 "baseURL\|url:"
```

## When Adding New Tests

**Checklist**:

- [ ] Import `setupAgentCardMock` and `gotoWithAgentCard`
- [ ] Call `setupAgentCardMock(page)` in `beforeEach`
- [ ] Use `gotoWithAgentCard(page)` instead of `page.goto('/')`
- [ ] Add any additional mocks needed (API endpoints, etc.)

**Example Template**:

```typescript
import { test, expect } from '@playwright/test';
import { setupAgentCardMock, gotoWithAgentCard } from '../../fixtures/agent-card';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await setupAgentCardMock(page);
    // Add other mocks as needed
  });

  test('should do something', async ({ page }) => {
    await gotoWithAgentCard(page);
    // Test logic
  });
});
```

## Further Help

- **Playwright Docs**: https://playwright.dev
- **Project E2E README**: `e2e/README.md`
- **Testing Plan**: `E2E_TESTING_PLAN.md`

## Known Limitations

1. **Agent Card Required**: The app MUST have an agent card URL to load. This is by design.
2. **HTTPS Only**: The dev server uses HTTPS (via mkcert). All test URLs must use `https://localhost:3001`.
3. **Port 3001**: Currently hardcoded. If you need to change it, update:
   - `apps/iframe-app/vite.config.ts`
   - `playwright.config.ts` (baseURL)
   - `e2e/config/mock-server.ts` (A2A_ENDPOINT)
   - `e2e/fixtures/agent-card.ts` (MOCK_AGENT_CARD_URL)
