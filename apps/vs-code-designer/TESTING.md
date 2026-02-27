# Testing Guide for VS Code Designer Extension

## Running Tests

### VS Code Testing Tab (Recommended)
Use the VS Code Testing tab in the sidebar for an interactive testing experience with debugging support.

### Command Line

#### Run All Tests
```bash
cd apps/vs-code-designer
pnpm vitest run
```

#### Run Specific Test File
```bash
cd apps/vs-code-designer
pnpm vitest run <test-file-name>
```

Examples:
```bash
pnpm vitest run binaries.test.ts
pnpm vitest run enableDevContainerIntegration.test.ts
```

#### Run Tests in Watch Mode
```bash
cd apps/vs-code-designer
pnpm vitest
```

#### Run Tests with Coverage
```bash
cd apps/vs-code-designer
pnpm vitest run --coverage
```

## Test Types

### Unit Tests
- Location: `src/**/__test__/*.test.ts`
- Framework: Vitest
- Run with: `pnpm vitest run`

### Integration Tests
- Location: `src/**/__test__/*Integration.test.ts`
- Framework: Vitest with real file system operations
- These tests may take longer due to actual file I/O

### E2E Tests (Extension UI)
- Location: `out/test/**/*.js`
- Framework: VS Code Extension Test Runner
- Run with: `pnpm run vscode:designer:e2e:ui` (UI mode)
- Run with: `pnpm run vscode:designer:e2e:headless` (Headless mode)

## Common Test Commands

| Command | Description |
|---------|-------------|
| `pnpm vitest run` | Run all unit tests once |
| `pnpm vitest` | Run tests in watch mode |
| `pnpm vitest run --ui` | Run tests with Vitest UI |
| `pnpm vitest run <file>` | Run specific test file |
| `pnpm run test:extension-unit` | Run unit tests with retries |

## Test Configuration

- **Vitest Config**: `vitest.workspace.ts` (workspace root)
- **Test Timeout**: Default 5000ms (can be overridden per test)
- **Coverage**: Enabled by default with Istanbul

## Tips

1. **Long-running tests**: Some integration tests may need extended timeouts. Add `{ timeout: 30000 }` to slow tests.
   
2. **Debugging tests**: Use VS Code's Testing tab and click the debug icon next to any test.

3. **Mocking**: Tests use Vitest's `vi.mock()` for mocking modules. See existing tests for patterns.

4. **File system tests**: Tests that interact with the file system use `fs-extra` and create temp directories that are cleaned up in `afterEach`.

## Troubleshooting

### Chat-generated connector actions (SQL / Service Bus)
- If designer nodes show "Unable to initialize operation details" after chat-added actions, see:
	- `CHAT_CONNECTOR_ACTION_LEARNINGS.md`
- The note includes root causes, fixes, and a repair runbook for existing workflows.

### Tests timing out
- Increase timeout for specific test: `it('test name', { timeout: 30000 }, async () => { ... })`
- Check for missing `await` keywords in async operations

### Module not found errors
- Ensure all mocked modules are declared with `vi.mock('module-path')` at the top level
- Check import paths are correct

### Mock issues
- Use `vi.mocked()` to properly type mocked functions
- Import actual implementations with `vi.importActual()` when needed
