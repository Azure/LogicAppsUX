# VS Code Extension E2E Tests

This directory contains end-to-end tests for the Logic Apps VS Code extension using WebdriverIO and the wdio-vscode-service.

## Setup

1. Install test dependencies:
   ```bash
   pnpm run test:e2e:setup
   ```

2. Build the extension first:
   ```bash
   pnpm run build:extension
   ```

## Running Tests

### Headless Mode (CI/Automated Testing)
```bash
# Run all tests in headless mode (no VS Code window visible)
pnpm run test:e2e:headless

# Or use the default command (which is headless)
pnpm run test:e2e

# Watch mode headless
pnpm run test:e2e:watch
```

### Headful Mode (Development/Debugging)
```bash
# Run all tests with VS Code window visible
pnpm run test:e2e:headful

# Run specific test suites in headful mode
pnpm run test:e2e:commands    # Test extension commands
pnpm run test:e2e:workflows   # Test workflow operations

# Watch mode with visible VS Code window
pnpm run test:e2e:watch:headful
```

### Utility Commands
```bash
# Clean test artifacts (screenshots, results)
pnpm run test:e2e:clean

# Setup test dependencies
pnpm run test:e2e:setup
```

## Headless vs Headful Testing

### Headless Mode (`wdio.conf.ts`)
- **Use for**: CI/CD pipelines, automated testing, fast execution
- **Features**: 
  - No VS Code window visible
  - Faster execution
  - Lower resource usage
  - Suitable for continuous integration
  - Automatically captures screenshots on failures

### Headful Mode (`wdio.headful.conf.ts`)
- **Use for**: Development, debugging, test creation, demonstration
- **Features**:
  - VS Code window is visible during test execution
  - Longer timeouts for observation
  - Pauses on test failures for inspection
  - Better for understanding test behavior
  - Larger font sizes for visibility
  - Detailed console logging

### Example Usage Scenarios

**Development Workflow:**
```bash
# While writing tests - see what's happening
pnpm run test:e2e:headful

# Debugging a specific failing test
pnpm run test:e2e:commands

# Continuous development with auto-reload
pnpm run test:e2e:watch:headful
```

**CI/CD Pipeline:**
```bash
# Fast, automated testing
pnpm run test:e2e:headless

# Or simply
pnpm run test:e2e
```

## Test Structure

### Configuration
- `wdio.conf.ts` - Main WebdriverIO configuration
- `package.json` - Test-specific dependencies with ES modules configuration
- `tsconfig.json` - TypeScript configuration for tests

### Page Objects
- `pageobjects/workbench.ts` - Base VS Code workbench interactions
- `pageobjects/logicAppsExtension.ts` - Logic Apps extension-specific actions

### Test Specs
- `specs/extension.e2e.ts` - Basic extension loading and command tests
- `specs/designer.e2e.ts` - Designer-specific functionality tests

## Test Architecture

### Page Object Pattern
Tests use the Page Object pattern to abstract UI interactions:

```typescript
// Using the workbench page object
const logicAppsPage = new LogicAppsExtensionPage();
await logicAppsPage.waitForReady();
await logicAppsPage.executeCommand('Azure Logic Apps: Create New Project');
```

### VS Code Service Integration
The `wdio-vscode-service` automatically handles:
- VS Code installation and setup
- Extension loading
- Webview frame management
- User settings configuration

### Test Environment
- Uses a dedicated test workspace (`test-workspace/`)
- Configures VS Code with testing-friendly settings
- Captures screenshots on test failures
- Generates JSON test reports

## Key Features

### Automated VS Code Management
- Automatically downloads and installs VS Code
- Loads your extension in development mode
- Handles VS Code lifecycle (start/stop)

### Webview Testing Support
- Methods to switch between VS Code frames and webview frames
- Designer webview interaction capabilities
- Frame management utilities

### Robust Error Handling
- Screenshot capture on failures
- Retry logic for flaky tests
- Proper cleanup after test runs

## Writing New Tests

### Basic Test Structure
```typescript
describe('My Feature', () => {
  let logicAppsPage: LogicAppsExtensionPage;
  
  before(async () => {
    logicAppsPage = new LogicAppsExtensionPage();
    await logicAppsPage.waitForReady();
  });
  
  afterEach(async () => {
    await logicAppsPage.clearNotifications();
    await logicAppsPage.closeAllEditors();
  });
  
  it('should do something', async () => {
    // Test implementation
  });
});
```

### Testing Commands
```typescript
// Execute a command
await logicAppsPage.executeCommand('Azure Logic Apps: Create New Project');

// Check if command exists
const commandPrompt = await logicAppsPage.openCommandPalette();
await commandPrompt.setText('Azure Logic Apps');
const suggestions = await commandPrompt.getQuickPicks();
expect(suggestions.length).toBeGreaterThan(0);
```

### Testing Webviews (Designer)
```typescript
// Switch to designer webview
const frameFound = await logicAppsPage.switchToDesignerFrame();
if (frameFound) {
  // Interact with designer elements
  const canvas = await browser.$('[data-automation-id*="designer-canvas"]');
  expect(await canvas.isDisplayed()).toBe(true);
}
// Switch back to main frame
await logicAppsPage.switchToMainFrame();
```

## Troubleshooting

### Common Issues

1. **VS Code doesn't start**: Check that the extension path is correct in `wdio.conf.ts`
2. **Tests timeout**: Increase timeout values in the configuration
3. **Extension not loaded**: Ensure the extension is built before running tests
4. **Webview not found**: Use proper frame switching methods

### Debug Mode
Run tests with increased logging:
```bash
DEBUG=wdio* pnpm run test:e2e
```

### Screenshots
Failed test screenshots are saved to `./test/screenshots/`

## CI/CD Integration

For GitHub Actions or other CI systems:
```yaml
- name: Setup E2E Tests
  run: pnpm run test:e2e:setup
  
- name: Build Extension
  run: pnpm run build:extension
  
- name: Run E2E Tests
  run: pnpm run test:e2e
  
- name: Upload Screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: test-screenshots
    path: apps/vs-code-designer/test/screenshots/
```

## Monorepo Considerations

This setup is designed to work within the Logic Apps UX monorepo:
- Uses workspace dependencies
- Integrates with existing build processes
- Respects monorepo tooling (pnpm, turbo)
- Follows established patterns for test organization