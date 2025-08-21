# VS Code Extension Testing with ExTester

This project is set up to use [VS Code Extension Tester (ExTester)](https://github.com/redhat-developer/vscode-extension-tester) for comprehensive UI testing of VS Code extensions.

## 🚀 Quick Start & Execution Guide

### Prerequisites ✅

Make sure you're in the correct directory:
```bash
cd /Users/carloscastrotrejo/Documents/static/LogicAppsUX/apps/vs-code-designer
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
├── demo.test.ts          # Basic VS Code functionality tests
├── smoke.test.ts         # Extension smoke tests  
├── commands.test.ts      # Logic Apps command tests
├── basic.test.ts         # Extended UI interaction tests
└── standalone.test.ts    # Framework validation tests
```

### Built Test Files
```
out/test/
├── demo.test.js         # Compiled test files
├── smoke.test.js        
├── commands.test.js     
├── basic.test.js        
└── standalone.test.js   
```

### 🔍 What Each Test File Does

| Test File | Description | Complexity |
|-----------|-------------|------------|
| `standalone.test.ts` | Basic framework validation (no VS Code) | ⭐ Simple |
| `demo.test.ts` | Basic VS Code functionality tests | ⭐⭐ Medium |
| `smoke.test.ts` | Extension loading and basic checks | ⭐⭐ Medium |
| `commands.test.ts` | Logic Apps specific command tests | ⭐⭐⭐ Advanced |
| `basic.test.ts` | Extended UI interaction tests | ⭐⭐⭐ Advanced |

### File Structure After Execution

```
apps/vs-code-designer/
├── src/test/ui/           # Source test files (TypeScript)
├── out/test/              # Compiled test files (JavaScript)
├── test-resources/        # ExTester downloads (VS Code, ChromeDriver)
├── .extester.json         # ExTester configuration
├── demo-extester.sh       # Demo script
└── README-ExTester.md     # This documentation
```

## � Command Reference & Available Scripts

| Command | Description | Mode | When to Use |
|---------|-------------|------|-------------|
| `pnpm run build:ui` | Compile TypeScript test files | - | Before running any tests |
| `npx mocha out/test/standalone.test.js` | Framework validation | - | Test setup works |
| `pnpm run test:ui:setup` | Download VS Code & ChromeDriver | - | One-time setup |
| `pnpm run test:ui` | Run tests with visible UI | Visual | Development/debugging |
| `pnpm run test:ui:headless` | Run tests without UI | Headless | CI/CD pipelines |
| `pnpm run test:ui:run` | Run pre-built tests (UI) | Visual | After build |
| `pnpm run test:ui:run:headless` | Run pre-built tests (headless) | Headless | After build |
| `./demo-extester.sh` | Runs complete demo | - | Quick validation |

### 🎯 Recommended Execution Order

**For First Time Setup:**
```bash
# 1. Validate framework works
pnpm run build:ui
npx mocha out/test/standalone.test.js --timeout 10000

# 2. Run demo script
./demo-extester.sh

# 3. Setup VS Code environment (optional)
pnpm run test:ui:setup

# 4. Try UI tests (optional)
pnpm run test:ui
```

**For Daily Development:**
```bash
# Quick test after making changes
pnpm run build:ui && npx mocha out/test/standalone.test.js

# Full test suite
pnpm run test:ui:headless
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

## ⚙️ Configuration

### .extester.json
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

### tsup.e2e.test.config.ts (Build Configuration)
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
import { VSBrowser, Workbench } from 'vscode-extension-tester';
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
    expect(true).to.be.true;
  });
});
```

### 3. Build and run
```bash
pnpm run build:ui
pnpm run test:ui
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
   # Check TypeScript errors
   npx tsc --noEmit
   
   # Clean and rebuild
   rm -rf out/test/
   pnpm run build:ui
   ```

2. **VS Code setup fails:**
   ```bash
   # Clean test resources
   rm -rf test-resources/
   
   # Try setup again
   pnpm run test:ui:setup
   ```

3. **Extension packaging errors:**
   - The full VS Code tests require the extension to be built
   - Standalone tests work without the extension
   - Use standalone tests for framework validation

4. **Node.js version warning:**
   - ExTester officially supports Node.js 20.x.x
   - Tests should still work with newer versions
   - Warning can be ignored for development

5. **"Warning: You are using the untested NodeJS version"**
   - ExTester officially supports Node.js 20.x.x
   - Tests should still work with newer versions

6. **"Extension entrypoint(s) missing"**
   - ExTester is trying to package the extension
   - For basic tests, set `"extensions": []` in .extester.json

7. **Timeout errors**
   - Increase timeout in .extester.json
   - Add `await driver.sleep()` after actions

8. **ChromeDriver issues**
   - Delete `test-resources/` folder and run setup again
   - Make sure VS Code and ChromeDriver versions are compatible

### Debug Mode
```bash
# Run with verbose logging
npx extest run-tests out/test/**/*.js --log_level Debug
```

### 🎉 Success Indicators

**✅ Framework Working:**
- Standalone tests pass (4 passing tests)
- Build completes without errors
- Demo script runs successfully

**✅ Full Setup Working:**
- VS Code launches in test mode
- UI tests interact with VS Code elements
- Tests complete with results

**✅ Ready for Production:**
- Headless tests run in CI/CD
- All test files pass
- No timeout or WebDriver errors

## � Next Steps After Setup

1. **Write Your Own Tests:**
   - Copy `standalone.test.ts` as a template
   - Add your Logic Apps specific test cases
   - Use ExTester Page Objects for VS Code interaction

2. **Integrate with CI/CD:**
   - Use `pnpm run test:ui:headless` in pipelines
   - Add test results reporting
   - Set up screenshot capture on failures

3. **Expand Test Coverage:**
   - Test extension commands
   - Test UI workflows
   - Test error scenarios

---

**Start here:** Run `./demo-extester.sh` to see everything in action! 🎯

## �📚 Resources

- [ExTester Documentation](https://github.com/redhat-developer/vscode-extension-tester/wiki)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Selenium WebDriver](https://selenium.dev/documentation/webdriver/)
- [Mocha Test Framework](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)

## 🎯 Best Practices

1. **Use Page Objects**: Leverage ExTester's built-in page objects
2. **Wait for Elements**: Always wait for UI elements to load
3. **Clean Tests**: Each test should be independent
4. **Descriptive Names**: Use clear test and describe block names
5. **Proper Timeouts**: Set appropriate timeouts for different test types
6. **Error Handling**: Add try-catch blocks for flaky UI interactions
7. **Screenshots**: Take screenshots on failures for debugging

Example with error handling:
```typescript
it('should handle errors gracefully', async () => {
  try {
    // Potentially flaky operation
    await workbench.executeCommand('some.command');
    await driver.sleep(1000);
  } catch (error) {
    console.error('Test failed:', error.message);
    // Take screenshot for debugging
    await driver.takeScreenshot();
    throw error;
  }
});
```

Happy testing! 🎉
