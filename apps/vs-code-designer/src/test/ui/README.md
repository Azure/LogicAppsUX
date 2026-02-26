# VS Code Extension E2E Testing with ExTester

This directory contains UI tests for the Logic Apps VS Code Extension using [vscode-extension-tester (ExTester)](https://github.com/redhat-developer/vscode-extension-tester).

> **Current Status (2026-02-26)**: Phase 4.1 (workspace creation): **63 passing, 1 failing** (known product bug). Phase 4.3 smoke/demo suite: **14 passing**. Phase 4.2 varies with workspace freshness; strict `designerActions` validations are currently **11 passing** in actions-only runs. See [SKILL.md](SKILL.md) for details.

## Overview

ExTester allows you to write automated UI tests for VS Code extensions using Selenium WebDriver. It provides:

- **Page Object APIs** for VS Code UI elements
- **Selenium WebDriver** integration for complex interactions
- **Headless and UI modes** for different testing scenarios
- **Automatic VS Code and ChromeDriver management**

## 🚀 Quick Start & Execution Guide

### Prerequisites ✅

- **Node.js** v18+ and **pnpm** v9+
- **Windows** (recommended — primary development/test OS)
- Extension built via `pnpm run build:extension` from repo root

```bash
cd apps/vs-code-designer
```

### 1. Install Dependencies

Dependencies are already configured in `package.json`. Run from repo root:

```bash
pnpm install
```

### 2. Build Test Files

Tests are compiled from TypeScript to CommonJS using **tsup**:

```bash
# Build test TypeScript → CJS (required before running)
npx tsup --config tsup.e2e.test.config.ts

# Or use the npm script:
pnpm run build:ui
```

### 3. Build the Extension

Tests require the built extension in `dist/`:

```bash
cd ../../  # repo root
pnpm run build:extension
cd apps/vs-code-designer
```

## Running Tests

### Full Test Suite (Phase 4.1 + Phase 4.2)

```bash
# Build and run all phases
node src/test/ui/run-e2e.js

# Or use npm script:
pnpm run test:ui
```

### Phase 4.2 Only (Designer Tests)

Requires workspaces from a previous Phase 4.1 run:

```powershell
# PowerShell
$env:E2E_MODE="designeronly"
node src/test/ui/run-e2e.js
```

```bash
# bash/zsh
export E2E_MODE=designeronly
node src/test/ui/run-e2e.js
```

### PowerShell Helper (Recommended on Windows)

Kills stuck processes, compiles, and runs:

```powershell
powershell -ExecutionPolicy Bypass -File src/test/ui/run-clean.ps1
```

### Step-by-Step Execution

#### 1. Basic Test Execution (Recommended First Step)

**Run Standalone Tests (No VS Code Required)**
```bash
# Build the test files
pnpm run build:ui

# Run basic framework validation
npx mocha out/test/standalone.test.js --timeout 10000
```

**Expected Output:**
```
Simple Test Suite (No VS Code Required)
  ✔ should run basic assertion
  ✔ should test string operations  
  ✔ should test array operations
  ✔ should demonstrate async test
  
4 passing (105ms)
```

#### 2. Quick Demo Script
```bash
# Run our complete demo script
./demo-extester.sh
```

This will build all test files, run standalone tests, and show you next steps.

#### 3. Full VS Code UI Testing

**UI Mode (Visual Testing)**
```bash
# Setup VS Code test environment (one-time setup)
pnpm run test:ui:setup

# Run tests with VS Code UI visible
pnpm run test:ui
```

**Headless Mode (CI/CD Friendly)**
```bash
# Run tests without UI (faster, good for CI)
pnpm run test:ui:headless
```

**Standalone Test (No VS Code Required)**
```bash
# Test the framework without VS Code
npx mocha out/test/standalone.test.js --timeout 10000
```

## 📁 Test Structure & File Organization

### Test Files Location
```
src/test/ui/
├── createWorkspace.test.ts   # Phase 4.1: Workspace creation wizard (63 tests)
├── designerOpen.test.ts      # Phase 4.2: Open designer for each workspace type
├── designerActions.test.ts   # Phase 4.2: Add trigger/action flows in designer
├── workspaceManifest.ts      # Shared manifest types & utilities
├── run-e2e.js                # Test orchestrator (extension copy, deps, execution)
├── run-clean.ps1             # Windows process cleanup helper
├── smoke.test.ts             # Extension smoke tests
├── commands.test.ts          # Logic Apps command tests
├── basic.test.ts             # Extended UI interaction tests
├── demo.test.ts              # Basic VS Code functionality tests
├── standalone.test.ts        # Framework validation tests (no VS Code)
├── SKILL.md                  # Detailed knowledge base & lessons learned
└── README.md                 # This file
```

### Built Test Files
```
out/test/
├── createWorkspace.test.js   # Compiled via tsup (CJS format)
├── designerOpen.test.js
├── designerActions.test.js
├── workspaceManifest.js
├── smoke.test.js
├── commands.test.js
├── basic.test.js
├── demo.test.js
└── standalone.test.js
```

### Test Phases

Tests are organized into three phases:

#### Phase 4.1 — Workspace Creation (`createWorkspace.test.ts`)
- Creates 12 workspace types: Standard × {Stateful, Stateless, Agent, Conversational} × {Codeless, CustomCode}
- Tests the full Create Workspace wizard: form fields, validation, navigation, disk verification
- Writes a workspace manifest (`created-workspaces.json`) consumed by Phase 4.2
- **63 passing, 1 failing** (namespace validation product bug)

#### Phase 4.2 — Designer Tests (`designerOpen.test.ts` + `designerActions.test.ts`)
- Opens the workflow designer for each workspace type
- Tests adding triggers and actions via the designer UI
- Requires workspaces from Phase 4.1 (reads `created-workspaces.json`)
- Strict add-flow validation now requires successful selection and visible insertion of core nodes (for example, Request trigger and Compose action)

#### Phase 4.3 — Smoke/Demo/Standalone (`demo.test.ts` + `smoke.test.ts` + `standalone.test.ts`)
- Runs generic extension smoke and framework checks
- Useful for fast baseline confidence and environment sanity
- Does **not** validate trigger/action insertion flows in the discovery panel

### Supporting Files

| File | Purpose |
|------|---------|
| `run-e2e.js` | Orchestrates: extension copy → dependency install → process cleanup → test execution |
| `workspaceManifest.ts` | TypeScript types for `created-workspaces.json`; shared between Phase 4.1 and 4.2 |
| `run-clean.ps1` | PowerShell script: kills stuck language servers, rebuilds, runs tests |

### File Structure After Execution

```
apps/vs-code-designer/
├── src/test/ui/              # Source test files (TypeScript)
├── out/test/                 # Compiled test files (CJS via tsup)
├── dist/test-extensions/     # Extension + dependencies installed by run-e2e.js
├── test-resources/           # ExTester downloads (VS Code, ChromeDriver)
├── tsup.e2e.test.config.ts   # tsup build config for tests
├── created-workspaces.json   # Workspace manifest (generated by Phase 4.1)
└── SKILL.md                  # Deep technical reference
```

## 📋 Command Reference & Available Scripts

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm run build:ui` | Compile tests via tsup (TS → CJS) | Before running tests |
| `pnpm run test:ui` | Run `node src/test/ui/run-e2e.js` | Full test suite (Phase 4.1 + 4.2) |
| `npx tsup --config tsup.e2e.test.config.ts` | Direct tsup build | Manual build |
| `node src/test/ui/run-e2e.js` | Direct test execution | All phases |
| `E2E_MODE=designeronly node src/test/ui/run-e2e.js` | Phase 4.2 only | Designer iteration |
| `powershell -File src/test/ui/run-clean.ps1` | Clean + rebuild + run | Windows recovery |
| `npx mocha out/test/standalone.test.js --timeout 10000` | Framework validation | Quick sanity check |

### Recommended Execution Order

**First Time Setup:**
```bash
# 1. Build the extension (from repo root)
pnpm run build:extension

# 2. Build the tests (from apps/vs-code-designer/)
cd apps/vs-code-designer
npx tsup --config tsup.e2e.test.config.ts

# 3. Run all tests (Phase 4.1 + Phase 4.2)
node src/test/ui/run-e2e.js
```

**Iterating on Designer Tests:**
```powershell
# Rebuild tests after changes
npx tsup --config tsup.e2e.test.config.ts

# Run only Phase 4.2 (uses existing workspaces)
$env:E2E_MODE="designeronly"
node src/test/ui/run-e2e.js
```

**Quick Framework Validation (No VS Code):**
```bash
npx mocha out/test/standalone.test.js --timeout 10000
```

## 📋 Test Examples

### 1. Simple VS Code UI Test
```typescript
import { expect } from 'chai';
import { VSBrowser, Workbench } from 'vscode-extension-tester';

describe('VS Code Basic Test', function () {
  this.timeout(60000);
  
  it('should verify VS Code is running', async () => {
    const workbench = new Workbench();
    const titleBar = workbench.getTitleBar();
    const title = await titleBar.getTitle();
    
    expect(title).to.be.a('string');
    expect(title.length).to.be.greaterThan(0);
  });
});
```

### 2. Command Palette Test
```typescript
it('should open command palette', async () => {
  const workbench = new Workbench();
  
  // Use keyboard shortcut to open command palette
  await workbench.executeCommand('workbench.action.showCommands');
  
  // Wait for command palette to appear
  await driver.sleep(1000);
  
  console.log('Command palette opened successfully');
});
```

### 3. Extension-Specific Test
```typescript
it('should find Logic Apps commands', async () => {
  const workbench = new Workbench();
  
  await workbench.executeCommand('workbench.action.showCommands');
  await driver.sleep(500);
  
  // Type to filter Logic Apps commands
  await workbench.executeCommand('type', { text: 'Logic Apps' });
  await driver.sleep(1000);
  
  console.log('Logic Apps commands filtered');
});
```

## 🔧 Configuration

### ExTester Configuration (`.extester.json`)

```json
{
  "vscodeVersion": "1.76.0",
  "chromeDriverVersion": "latest",
  "mocha": {
    "timeout": 60000,
    "color": true,
    "ui": "mocha",
    "reporter": "spec"
  },
  "extensions": [],
  "installDependencies": false,
  "setupTests": {
    "downloadPlatform": "darwin",
    "setupTimeout": 120000
  },
  "runTests": {
    "headless": true,
    "logLevel": "info"
  }
}
```

### Build Configuration

Tests are built using `tsup.e2e.test.config.ts` which:
- Compiles TypeScript to CommonJS (Mocha requirement)
- Outputs to `out/test/` directory
- Handles ExTester dependencies properly

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/test/ui/**/*.test.ts'],
  format: ['cjs'],
  target: 'node16',
  outDir: 'out/test',
  external: [
    'vscode',
    'vscode-extension-tester',
    'selenium-webdriver',
    'mocha',
    'chai'
  ],
  sourcemap: true,
  clean: true,
});
```

## 🧪 Writing Your Own Tests

### 1. Create a new test file
```bash
# Create in src/test/ui/
touch src/test/ui/my-feature.test.ts
```

### 2. Basic test template
```typescript
/// <reference types="mocha" />

import { expect } from 'chai';
import { VSBrowser, Workbench, ActivityBar } from 'vscode-extension-tester';
import type { WebDriver } from 'vscode-extension-tester';

describe('My Feature Tests', function () {
  this.timeout(60000);

  let workbench: Workbench;
  let driver: WebDriver;

  before(async function () {
    this.timeout(120000);
    workbench = new Workbench();
    driver = VSBrowser.instance.driver;
    await driver.sleep(3000);
  });

  it('should test my feature', async () => {
    // Your test code here
    const activityBar = new ActivityBar();
    const controls = await activityBar.getViewControls();
    expect(controls.length).to.be.greaterThan(0);
  });
});
```

### 3. Build and run
```bash
pnpm run build:ui
pnpm run test:ui
```

### Key ExTester APIs

- **Workbench**: Main VS Code window
- **ActivityBar**: Side activity bar with extension icons
- **SideBarView**: Explorer, Search, Extensions panels
- **EditorView**: File editor tabs and content
- **CommandPalette**: Command palette (Ctrl/Cmd+Shift+P)
- **StatusBar**: Bottom status bar
- **TitleBar**: Window title bar

## 🔍 Debugging Tests

### VS Code Debug Mode

1. Set breakpoints in your test files
2. Run in UI mode: `pnpm run test:ui`
3. VS Code window will appear - you can inspect elements manually

### Console Logging

Add `console.log()` statements in tests to output debug information:

```typescript
it('should debug something', async function () {
  const activityBar = new ActivityBar();
  const controls = await activityBar.getViewControls();
  console.log(`Found ${controls.length} controls`);
  
  for (const control of controls) {
    const title = await control.getTitle();
    console.log(`Control: ${title}`);
  }
});
```

### Debug Mode
```bash
# Run with verbose logging
npx extest run-tests out/test/**/*.js --log_level Debug
```

## 📖 Available Page Objects

ExTester provides many pre-built page objects for VS Code elements:

- **Workbench**: Main VS Code interface
- **ActivityBar**: Left sidebar with icons
- **SideBar**: Side panels (Explorer, Search, etc.)
- **EditorView**: Code editor area
- **TitleBar**: Top window bar
- **StatusBar**: Bottom status bar
- **NotificationCenter**: Notification popups
- **SettingsEditor**: Settings interface
- **Terminal**: Integrated terminal

## 🐛 Troubleshooting

### Common Issues & Solutions

1. **Tests don't build:**
   ```bash
   # Clean and rebuild with tsup
   Remove-Item -Recurse -Force out/test -ErrorAction SilentlyContinue
   npx tsup --config tsup.e2e.test.config.ts
   ```

2. **Extension not loading (`.obsolete` file):**
   VS Code writes `.obsolete` to mark extensions for removal. `run-e2e.js` handles this automatically, but if running manually:
   ```powershell
   Remove-Item "dist/test-extensions/.obsolete" -ErrorAction SilentlyContinue
   ```

3. **Duplicate extension versions (auto-update):**
   VS Code downloads a newer version from the marketplace, causing duplicate commands. Check `out/test/vscode-settings.json` has `"extensions.autoUpdate": false`.

4. **EBUSY / locked files on Windows:**
   Language servers from previous test runs hold file locks:
   ```powershell
   # Kill stuck processes
   Get-Process -Name "Microsoft.CodeAnalysis.LanguageServer" -ErrorAction SilentlyContinue | Stop-Process -Force
   Get-Process -Name "Azure.Deployments.Express.LanguageServer" -ErrorAction SilentlyContinue | Stop-Process -Force
   Get-Process | Where-Object { $_.Path -like "*test-resources*" } | Stop-Process -Force
   Start-Sleep -Seconds 5
   ```
   Or use the helper: `powershell -ExecutionPolicy Bypass -File src/test/ui/run-clean.ps1`

5. **Command palette not opening:**
   The `workbench.openCommandPrompt()` API is unreliable after workspace switching. See SKILL.md Section 5 "Command palette fails to open" and Section 11 P0 items for potential solutions.

6. **Wrong webview opened ("Create Workspace From Package"):**
   Two commands match "create workspace". The test code filters picks to exclude labels containing "package". If you see a "Package path" field, you're in the wrong webview.

7. **Designer never loads (Azure connector prompts):**
   When `WORKFLOWS_SUBSCRIPTION_ID` is undefined in `local.settings.json`, the extension shows blocking QuickPick prompts. Fix: ensure `local.settings.json` contains `"WORKFLOWS_SUBSCRIPTION_ID": ""`.

8. **Command palette `setText()` clears the `>` prefix:**
   Always prefix search text with `> ` when typing in the command palette:
   ```typescript
   await input.setText('> logic app workspace');  // ✅ stays in command mode
   await input.setText('logic app workspace');    // ❌ switches to file search
   ```

9. **Tests timeout:**
   Increase timeout in test:
   ```typescript
   it('slow test', async function () {
     this.timeout(120000); // 2 minutes
     // test code
   });
   ```

10. **Phase 4.2 fails with "Missing workspace directories":**
    `E2E_MODE=designeronly` requires workspaces from a previous Phase 4.1 run. Run the full suite first (`node src/test/ui/run-e2e.js` without `E2E_MODE`).

### Full Clean Restart

```powershell
# Remove all test artifacts
Remove-Item -Recurse -Force dist/test-extensions -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\test-resources" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force out/test -ErrorAction SilentlyContinue
Remove-Item -Force created-workspaces.json -ErrorAction SilentlyContinue

# Kill any stuck processes
Get-Process | Where-Object { $_.Path -like "*test-resources*" } | Stop-Process -Force

# Full rebuild and run
pnpm run build:extension  # from repo root
npx tsup --config tsup.e2e.test.config.ts
node src/test/ui/run-e2e.js
```

## 📝 Lessons Learned (2026-02-24)

### Key Gotchas for ExTester UI Testing

1. **Workspace creation tests are reliable; designer interaction is not.** Phase 4.1 achieves 98.4% pass rate. Phase 4.2 sits at 20%. The bottleneck is ExTester's command palette API after workspace switching. If you're writing new tests, invest in making the command execution path more robust before adding more test coverage.

2. **ExTester's `openCommandPrompt()` is the weakest link.** It uses `By.css('.quick-input-widget')` with a fixed ~5s timeout that can't be configured. After VS Code loads a new workspace and activates extensions, the command palette may simply not respond to keyboard shortcuts for 10-60 seconds.

3. **Azure connector wizard prompts block the designer.** When `WORKFLOWS_SUBSCRIPTION_ID` is undefined, the extension launches a blocking wizard before the designer can open. The fix is non-obvious: set `WORKFLOWS_SUBSCRIPTION_ID: ""` (empty string, not absent) in `local.settings.json`.

4. **Process cleanup is critical on Windows.** Roslyn Language Server, Azure Deployment Express Language Server, and other child processes persist after test VS Code instances close. They hold file locks that cause `EBUSY` errors on subsequent runs. The `run-e2e.js` script has multi-layered cleanup, but you may need manual intervention if tests crash.

5. **`tsc` was replaced with `tsup`.** ExTester uses Mocha, which requires CommonJS format. `tsc` produced inconsistent module formats depending on TypeScript config. `tsup` (via `tsup.e2e.test.config.ts`) reliably produces CJS output.

6. **Webview iframe switching is fragile.** You must call `switchToFrame()` before interacting with webview elements and `switchBack()` before interacting with VS Code chrome. Getting the direction wrong produces confusing "element not found" errors with no indication that you're in the wrong context.

7. **Hyphens in generated code are a real bug class.** Test utilities like `uniqueName()` originally generated names like `myfunc-abc123`, which produce invalid C# identifiers. Always use underscores for identifiers that will appear in generated code.

8. **Two test systems coexist — know which to use.**
   - `src/test/ui/` (ExTester + Selenium) → Real GUI webview interaction, form filling, visual verification
   - `src/test/e2e/` (@vscode/test-cli) → Extension host API testing, file operations, programmatic commands
   
   Neither replaces the other. Use ExTester for things you'd do manually in VS Code. Use @vscode/test-cli for programmatic extension behavior.

### For detailed technical reference, see [SKILL.md](SKILL.md) — it contains the full debugging guide, known issues, architecture details, and test inventory.

## 📚 Resources

- [ExTester Documentation](https://github.com/redhat-developer/vscode-extension-tester/wiki)
- [ExTester Page Object APIs](https://github.com/redhat-developer/vscode-extension-tester/wiki/Page-Object-APIs)
- [ExTester Example Project](https://github.com/redhat-developer/vscode-extension-tester-example)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Selenium WebDriver](https://selenium.dev/documentation/webdriver/)
- [Mocha Test Framework](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)

## 🎯 Best Practices

1. **Use `VSBrowser.instance.openResources(path)`** to open files — don't build custom Quick Open logic
2. **Always prefix command palette input with `> `** — `setText('> my command')` to stay in command mode
3. **Call `switchToFrame()` / `switchBack()`** correctly — webview elements are invisible from VS Code chrome context and vice versa
4. **Set `WORKFLOWS_SUBSCRIPTION_ID: ""`** in `local.settings.json` before opening designer — prevents blocking Azure connector prompts
5. **Use underscores (not hyphens)** in generated identifiers — hyphens are invalid in C# names
6. **Kill language servers** before subsequent runs on Windows — they hold file locks
7. **Use `run-e2e.js`** as the entry point — it handles extension copying, dependency installation, `.obsolete` cleanup, and process management
8. **Separate creation from consumption** — Phase 4.1 creates workspaces and writes a manifest; Phase 4.2 reads the manifest. This allows fast iteration on designer tests.

Happy testing! 🎉
