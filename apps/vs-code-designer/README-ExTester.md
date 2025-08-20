# VS Code Extension Testing with ExTester

This project is set up to use [VS Code Extension Tester (ExTester)](https://github.com/redhat-developer/vscode-extension-tester) for comprehensive UI testing of VS Code extensions.

## 🚀 Quick Start

### Running Tests in Different Modes

#### 1. UI Mode (Visual Testing)
```bash
# Run tests with VS Code UI visible
pnpm run test:ui
```

#### 2. Headless Mode (CI/CD Friendly)
```bash
# Run tests without UI (faster, good for CI)
pnpm run test:ui:headless
```

#### 3. Standalone Test (No VS Code Required)
```bash
# Test the framework without VS Code
npx mocha out/test/standalone.test.js --timeout 10000
```

## 📁 Test Structure

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

## 🛠️ Available Scripts

| Command | Description | Mode |
|---------|-------------|------|
| `pnpm run build:ui` | Compile TypeScript test files | - |
| `pnpm run test:ui:setup` | Download VS Code & ChromeDriver | - |
| `pnpm run test:ui` | Run tests with visible UI | Visual |
| `pnpm run test:ui:headless` | Run tests without UI | Headless |
| `pnpm run test:ui:run` | Run pre-built tests (UI) | Visual |
| `pnpm run test:ui:run:headless` | Run pre-built tests (headless) | Headless |

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

### tsup.ui.config.ts (Build Configuration)
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

### Common Issues

1. **"Warning: You are using the untested NodeJS version"**
   - ExTester officially supports Node.js 20.x.x
   - Tests should still work with newer versions

2. **"Extension entrypoint(s) missing"**
   - ExTester is trying to package the extension
   - For basic tests, set `"extensions": []` in .extester.json

3. **Timeout errors**
   - Increase timeout in .extester.json
   - Add `await driver.sleep()` after actions

4. **ChromeDriver issues**
   - Delete `test-resources/` folder and run setup again
   - Make sure VS Code and ChromeDriver versions are compatible

### Debug Mode
```bash
# Run with verbose logging
npx extest run-tests out/test/**/*.js --log_level Debug
```

## 📚 Resources

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
