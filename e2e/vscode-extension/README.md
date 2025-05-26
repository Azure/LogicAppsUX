# VSCode Extension E2E Tests

This directory contains end-to-end (e2e) tests for the Azure Logic Apps VSCode Extension using the `vscode-extension-tester` library.

## Prerequisites

- Node.js 18 or newer
- PNPM 9 or newer
- Chrome or Chromium browser (required by WebDriver)
- Java Runtime Environment (JRE) for running WebDriver

## Setup

The tests are located in the `tests` directory and use the following libraries:
- `vscode-extension-tester` - For interacting with VSCode UI elements
- `mocha` - Test runner
- `chai` - Assertion library
- `selenium-webdriver` - For WebDriver interaction

## Running the Tests

To run the e2e tests for the VSCode extension, use the following command from the repository root:

```bash
pnpm run --filter vscode-designer test:e2e:vscode
```

Or navigate to the `apps/vs-code-designer` directory and run:

```bash
pnpm run test:e2e:vscode
```

## Creating New Tests

To create new e2e tests:

1. Create a new test file in the `tests` directory with the `.test.ts` extension
2. Import the required components from `vscode-extension-tester`:

```typescript
import { VSBrowser, ActivityBar, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('My Test Suite', function() {
  // Tests go here
});
```

3. Use the `VSBrowser` class to interact with VSCode
4. Use UI components like `ActivityBar`, `SideBarView`, `Workbench`, etc. to interact with specific parts of the UI
5. Use `chai` assertions to validate expected behavior

## Debugging Tests

If tests are failing, you can enable UI display during test execution by setting the `UI_SHOW` environment variable:

```bash
UI_SHOW=true pnpm run test:e2e:vscode
```

This will show the VSCode window while tests are running, making it easier to debug UI interactions.

## Documentation

- [vscode-extension-tester documentation](https://github.com/redhat-developer/vscode-extension-tester)
- [Mocha documentation](https://mochajs.org/)
- [Chai documentation](https://www.chaijs.com/)