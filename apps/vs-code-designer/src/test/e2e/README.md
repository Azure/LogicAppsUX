# VS Code Extension E2E Tests (CLI-based)

This directory contains end-to-end tests for the Logic Apps VS Code extension using the official `@vscode/test-cli` framework.

## Overview

These tests follow the pattern from [helloworld-test-cli-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample) and run directly inside VS Code's extension host environment.

## Test Structure

```
src/test/e2e/
├── extension.test.ts       # Basic extension activation tests
├── commands.test.ts        # Command registration and execution tests
├── runTest.ts              # Test runner entry point
└── integration/
    ├── workflow.test.ts    # Workflow file integration tests
    └── designer.test.ts    # Designer panel tests
```

## Running Tests

### Run all e2e tests
```bash
pnpm run test:e2e-cli
```

### Run tests with a specific label
```bash
pnpm run test:e2e-cli --label unitTests
pnpm run test:e2e-cli --label integrationTests
```

### Compile tests only (without running)
```bash
pnpm run test:e2e-cli:compile
```

## Configuration

The test configuration is in [.vscode-test.mjs](../../.vscode-test.mjs):

- **unitTests**: Basic extension and command tests with shorter timeout
- **integrationTests**: Full integration tests with longer timeout

## Test Development

### Using VS Code Extension Test Runner

1. Install the [VS Code Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner) extension
2. Open the Test Explorer view
3. Run individual tests or test suites from the UI

### Writing New Tests

Tests use Mocha's BDD interface (`suite`, `test`) with Node.js assertions:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
  test('My test case', async () => {
    // Access VS Code API
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.length > 0);
  });
});
```

## Test Workspace

Tests run in the `e2e/test-workspace` directory which contains:
- Sample workflow files for testing
- VS Code settings and extension recommendations
- Any fixtures needed for tests

## Differences from vscode-extension-tester

The existing `src/test/ui/` tests use `vscode-extension-tester` which:
- Uses Selenium WebDriver to control VS Code UI
- Good for visual/UI testing
- Slower but more comprehensive UI interaction

These new CLI-based tests:
- Run directly in VS Code's extension host
- Faster execution
- Better for API-level testing
- Easier to debug
