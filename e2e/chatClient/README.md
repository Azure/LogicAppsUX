# E2E Testing

Comprehensive end-to-end testing suite for A2A Chat using Playwright.

## Status

✅ **106/106 tests passing** including full SSE streaming support

- ✅ 19 critical path tests
- ✅ 68 feature tests (validation, error handling, edge cases)
- ✅ 10 UI tests (session management)
- ✅ 9 integration tests (SSE streaming with code, images, structured data)

---

## Quick Start

**IMPORTANT**: You must start the dev server first before running tests.

```bash
# 1. Start the dev server (in one terminal)
pnpm --filter @a2achat/iframe-app dev

# 2. Run tests (in another terminal)
# Run all e2e tests
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run only critical path tests
pnpm test:e2e:critical

# Debug tests
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

## Project Structure

```
e2e/
├── fixtures/
│   └── sse-fixtures.ts          # Custom Playwright fixture for SSE mocking
├── mocks/
│   └── sse-generators.ts        # SSE response generation logic
├── tests/
│   ├── critical/                # 19 tests - Mission-critical user journeys
│   ├── features/                # 68 tests - Feature-specific tests
│   │   ├── accessibility.spec.ts
│   │   ├── edge-cases.spec.ts
│   │   ├── error-handling.spec.ts
│   │   ├── input-validation.spec.ts
│   │   └── multi-session.spec.ts
│   ├── ui/                      # 10 tests - UI interaction tests
│   │   └── session-management.spec.ts
│   └── integration/             # 9 tests - SSE streaming integration
│       └── sse-responses.spec.ts
├── README.md                    # This file
├── SSE_TESTING_GUIDE.md         # Comprehensive guide for SSE testing
└── E2E_TESTING_PLAN.md          # Original test plan
```

## SSE Testing

The test suite includes comprehensive SSE (Server-Sent Events) testing using Playwright's route interception with custom fixtures. This allows testing of:

- ✅ Complete SSE streaming responses
- ✅ Code block rendering with syntax highlighting
- ✅ Image display from data parts
- ✅ Structured data (tables, lists)
- ✅ Word-by-word streaming responses
- ✅ SSE connection management and error handling

**📖 See `SSE_TESTING_GUIDE.md` for detailed information on SSE testing.**

## Test Categories

### Critical Tests (`e2e/tests/critical/`)

**These tests MUST NEVER FAIL.**

Critical tests cover essential user journeys that, if broken, make the application unusable. All critical tests must pass before deployment.

- Basic chat flow
- Authentication flow
- Error recovery

### Feature Tests (`e2e/tests/features/`)

Tests for specific features and behaviors:

- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Edge Cases**: Browser back/forward, rapid interactions, concurrent requests
- **Error Handling**: Network errors, server errors, timeout handling
- **Input Validation**: Empty messages, long messages, special characters
- **Multi-Session**: Session creation, switching, isolation

### UI Tests (`e2e/tests/ui/`)

Tests for UI interactions:

- Session management
- Loading states
- Empty states
- User feedback

### Integration Tests (`e2e/tests/integration/`)

Tests for complete SSE streaming flows:

- Simple text responses
- Code block rendering
- Image display
- Structured data display
- Progressive streaming
- Error responses
- Multi-turn conversations

## Writing Tests

### Standard Tests

Use Playwright's standard test import for UI and feature tests:

```typescript
import { test, expect } from '@playwright/test';

test('should handle empty input validation', async ({ page }) => {
  await page.goto('https://localhost:3001');

  const sendButton = page.locator('button:has(svg)').last();
  await expect(sendButton).toBeDisabled();
});
```

### SSE Integration Tests

Use the custom fixture for SSE testing:

```typescript
import { test, expect } from '../../fixtures/sse-fixtures';

test('should display code blocks correctly', async ({ page }) => {
  // The fixture automatically sets up SSE mocking
  await page.goto('https://localhost:3001/?agentCard=...');
  await page.waitForLoadState('networkidle');

  const messageInput = page.locator('textarea').first();
  const sendButton = page.locator('button:has(svg)').last();

  await messageInput.fill('show me code');
  await sendButton.click();

  // SSE response is automatically mocked
  await expect(page.getByText(/Here's a code example/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('function').first()).toBeVisible();
});
```

## Best Practices

### 1. Use Semantic Selectors

Prefer role-based and text-based selectors over CSS:

```typescript
// ✅ Good
page.getByRole('button', { name: 'Send' });
page.getByText('Welcome message');

// ⚠️ Okay (when data-testid exists)
page.locator('[data-testid="send-button"]');

// ❌ Avoid
page.locator('.btn-primary');
page.locator('#message-input');
```

### 2. Wait for Visibility

Always wait for elements to be visible:

```typescript
// ✅ Good
await expect(element).toBeVisible({ timeout: 5000 });

// ❌ Avoid
await page.waitForTimeout(1000);
```

### 3. Handle Timing Properly

Use Playwright's built-in waiting mechanisms:

```typescript
// ✅ Good
await expect(element).toBeVisible({ timeout: 5000 });
await page.waitForLoadState('networkidle');

// ❌ Avoid
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### 4. Use Appropriate Timeouts for SSE

SSE responses take longer than UI interactions:

```typescript
// For SSE responses
await expect(page.getByText(/agent response/)).toBeVisible({ timeout: 10000 });

// For UI interactions
await expect(button).toBeDisabled(); // Default timeout is fine
```

## Debugging Tests

### Run in Debug Mode

```bash
pnpm test:e2e:debug
```

### Use Trace Viewer

Playwright automatically captures traces on failure. View them with:

```bash
pnpm test:e2e:report
```

### Run in Headed Mode

See the browser while tests run:

```bash
pnpm test:e2e:headed
```

### Use UI Mode

Interactive test runner:

```bash
pnpm test:e2e:ui
```

## CI/CD Integration

Tests are configured to run in CI with:

- 2 retries on failure
- HTML report generation
- Screenshots on failure
- Video on first retry
- Trace on failure

Example GitHub Actions workflow:

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

## Coverage Goals

- **Critical paths**: 100% coverage, zero failures allowed
- **Features**: 100% coverage of happy paths and error paths
- **Edge cases**: Cover all boundary conditions
- **SSE Integration**: Cover all response types and streaming behaviors

## Adding New Tests

1. Choose the appropriate test category directory
2. Create a new spec file: `*.spec.ts`
3. For SSE tests, use the custom fixture from `e2e/fixtures/sse-fixtures.ts`
4. Add descriptive test names
5. Use proper waits and timeouts
6. Follow semantic selector patterns

## Common Issues

### Port Already in Use

If the dev server fails to start, kill the process on port 3001:

```bash
lsof -ti:3001 | xargs kill -9
```

### Tests Timing Out

Increase timeout in playwright.config.ts or use per-test timeout:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Flaky Tests

- Avoid hard-coded delays (`setTimeout`)
- Use proper waits (`waitForSelector`, `expect().toBeVisible()`)
- Check for race conditions
- Ensure proper cleanup in afterEach
- For SSE tests, ensure generous timeouts (10s+)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [SSE Testing Guide](./SSE_TESTING_GUIDE.md)
- [E2E Testing Plan](../E2E_TESTING_PLAN.md)
