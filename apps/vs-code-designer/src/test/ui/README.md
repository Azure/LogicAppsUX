# ExTester UI Testing Setup for Logic Apps VS Code Extension

This directory contains UI tests for the Logic Apps VS Code Extension using [vscode-extension-tester (ExTester)](https://github.com/redhat-developer/vscode-extension-tester).

## Overview

ExTester allows you to write automated UI tests for VS Code extensions using Selenium WebDriver. It provides:

- **Page Object APIs** for VS Code UI elements
- **Selenium WebDriver** integration for complex interactions  
- **Headless and UI modes** for different testing scenarios
- **Automatic VS Code and ChromeDriver management**

## Setup and Installation

### 1. Install Dependencies

Dependencies are already configured in `package.json`. Run:

```bash
pnpm install
```

### 2. Setup Test Environment

Before running tests for the first time, set up the test environment:

```bash
# This downloads VS Code and ChromeDriver binaries
pnpm run test:ui:setup
```

## Running Tests

### UI Mode (with visible VS Code window)

Perfect for development and debugging:

```bash
# Build and run tests with visible VS Code
pnpm run test:ui

# Or run tests without building (if already built)
pnpm run test:ui:run
```

### Headless Mode (no UI)

Ideal for CI/CD pipelines:

```bash
# Build and run tests in headless mode
pnpm run test:ui:headless

# Or run tests without building (if already built) 
pnpm run test:ui:run:headless
```

## Test Structure

```
src/test/ui/
├── smoke.test.ts      # Basic VS Code functionality tests
├── commands.test.ts   # Logic Apps command testing
└── basic.test.ts      # Extended UI interaction tests
```

### Test Categories

1. **Smoke Tests** (`smoke.test.ts`)
   - VS Code loads successfully
   - Activity bar is functional
   - Command palette works
   - Basic navigation

2. **Command Tests** (`commands.test.ts`)
   - Logic Apps specific commands
   - Azure command availability
   - Command palette search functionality

3. **Basic Tests** (`basic.test.ts`)
   - Extension-specific UI elements
   - Azure views and panels
   - File explorer interaction

## Configuration

### ExTester Configuration (`.extester.json`)

```json
{
  "vscodeVersion": "1.76.0",
  "chromeDriverVersion": "latest", 
  "mocha": {
    "timeout": 60000,
    "ui": "mocha"
  },
  "runTests": {
    "headless": true
  }
}
```

### Build Configuration

Tests are built using `tsup.ui.config.ts` which:
- Compiles TypeScript to CommonJS (Mocha requirement)
- Outputs to `out/test/` directory
- Handles ExTester dependencies properly

## Writing New Tests

### Basic Test Structure

```typescript
/// <reference types="mocha" />

import { expect } from 'chai';
import { VSBrowser, Workbench, ActivityBar } from 'vscode-extension-tester';

describe('My Test Suite', function () {
  this.timeout(60000);

  let workbench: Workbench;

  before(async function () {
    this.timeout(120000);
    workbench = new Workbench();
    await VSBrowser.instance.driver.sleep(3000);
  });

  it('should do something', async function () {
    // Your test code here
    const activityBar = new ActivityBar();
    const controls = await activityBar.getViewControls();
    expect(controls.length).to.be.greaterThan(0);
  });
});
```

### Key ExTester APIs

- **Workbench**: Main VS Code window
- **ActivityBar**: Side activity bar with extension icons
- **SideBarView**: Explorer, Search, Extensions panels
- **EditorView**: File editor tabs and content
- **CommandPalette**: Command palette (Ctrl/Cmd+Shift+P)
- **StatusBar**: Bottom status bar
- **TitleBar**: Window title bar

## Debugging Tests

### VS Code Debug Mode

1. Set breakpoints in your test files
2. Run in UI mode: `pnpm run test:ui`
3. VS Code window will appear - you can inspect elements manually

### Console Logging

Add `console.log()` statements in tests to output debug information:

```typescript
it('should debug something', async function () {
  const controls = await activityBar.getViewControls();
  console.log(`Found ${controls.length} controls`);
  
  for (const control of controls) {
    const title = await control.getTitle();
    console.log(`Control: ${title}`);
  }
});
```

## Common Issues and Solutions

### 1. Tests timeout

Increase timeout in test:
```typescript
it('slow test', async function () {
  this.timeout(120000); // 2 minutes
  // test code
});
```

### 2. Element not found

Add waits before interacting with elements:
```typescript
await VSBrowser.instance.driver.sleep(2000);
const element = await workbench.getElement();
```

### 3. Extension not loaded

Ensure extension is built and available:
```bash
pnpm run build:extension
```

## Integration with CI/CD

For automated testing in GitHub Actions or similar:

```yaml
- name: Run UI Tests
  run: |
    pnpm run build:extension
    pnpm run test:ui:headless
```

The headless mode is perfect for CI environments as it doesn't require a display.

## Test Resources

ExTester stores downloaded binaries in:
- `test-resources/` - VS Code and ChromeDriver binaries
- `.vscode-test/` - VS Code test instances

These directories are excluded from git and can be deleted to force re-download.

## Further Reading

- [ExTester Documentation](https://github.com/redhat-developer/vscode-extension-tester/wiki)
- [ExTester Page Object APIs](https://github.com/redhat-developer/vscode-extension-tester/wiki/Page-Object-APIs)
- [ExTester Example Project](https://github.com/redhat-developer/vscode-extension-tester-example)
