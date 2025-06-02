---
sidebar_position: 6
---

# Developer Troubleshooting Guide

This comprehensive guide helps developers resolve common issues when working on the Logic Apps UX codebase. Issues are organized by category for quick reference.

## 🚀 Quick Reference

### Most Common Issues & Solutions

| Issue | Quick Fix | Platform |
|-------|-----------|----------|
| **Port 4200 in use** | `lsof -ti:4200 \| xargs kill -9` | macOS/Linux |
| **TypeScript errors** | `pnpm run build` | All |
| **HMR not working** | `rm -rf node_modules/.vite` | All |
| **PNPM install fails** | `pnpm store prune` | All |
| **Tests timing out** | Add `test.setTimeout(120000)` | All |
| **Module not found** | `pnpm dedupe && pnpm install` | All |
| **Build cache stale** | `rm -rf .turbo && pnpm build --force` | All |

### 🔧 Essential Commands

```bash
# Clean install (fixes most issues)
rm -rf node_modules pnpm-lock.yaml .turbo
pnpm install

# Reset everything
git clean -xfd
pnpm install
pnpm run build

# Debug environment
npx envinfo --system --npmPackages --binaries --browsers
```

## 🛠️ Environment Setup Issues

### Node.js Version

<details>
<summary><strong>❌ Error: The engine "node" is incompatible</strong></summary>

**Cause**: Wrong Node.js version installed

**Solution**: Install and use the correct Node.js version

```bash
# 1. Check required version
cat .nvmrc

# 2. Install and use correct version
nvm install 20.19.0
nvm use 20.19.0

# 3. Set as default (optional)
nvm alias default 20.19.0

# 4. Verify
node --version  # Should show v20.19.0
```

**Alternative without nvm**:
- Download Node.js v20.19.0 from [nodejs.org](https://nodejs.org)
- Use [Volta](https://volta.sh/) or [fnm](https://github.com/Schniz/fnm) as alternatives
</details>

### Package Manager (PNPM)

<details>
<summary><strong>❌ PNPM command not found</strong></summary>

**Solution 1**: Install via Corepack (Recommended)
```bash
# Enable Corepack (comes with Node.js 16.9+)
corepack enable

# Prepare PNPM
corepack prepare pnpm@latest --activate

# Verify
pnpm --version
```

**Solution 2**: Install via npm
```bash
npm install -g pnpm@latest
```

**Solution 3**: Install via script
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```
</details>

<details>
<summary><strong>❌ PNPM install hangs or fails</strong></summary>

**Try these solutions in order**:

**1. Clear PNPM store cache**:
```bash
pnpm store prune
```

**2. Switch to npm registry** (if behind corporate proxy):
```bash
pnpm config set registry https://registry.npmjs.org/
```

**3. Complete reset**:
```bash
# Remove all node modules and lock files
rm -rf node_modules pnpm-lock.yaml
rm -rf ~/.pnpm-store

# Fresh install
pnpm install
```

**4. Network issues**:
```bash
# Increase timeout
pnpm config set fetch-timeout 60000

# Disable strict SSL (corporate networks)
pnpm config set strict-ssl false
```

**5. Use different store location**:
```bash
# Set custom store directory
pnpm config set store-dir ~/.my-pnpm-store
```
</details>

## 🖥️ Development Server Issues

### Port Conflicts

<details>
<summary><strong>❌ Port 4200 already in use</strong></summary>

**🍎 macOS/Linux**:
```bash
# Quick fix - kill process on port 4200
lsof -ti:4200 | xargs kill -9

# Detailed approach
# 1. Find what's using the port
lsof -i :4200

# 2. Kill specific process by PID
kill -9 <PID>
```

**🪟 Windows Command Prompt**:
```cmd
# 1. Find process using port
netstat -ano | findstr :4200

# 2. Note the PID (last column)
# 3. Kill process
taskkill /PID <PID> /F
```

**🪟 Windows PowerShell** (one-liner):
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 4200).OwningProcess | Stop-Process -Force
```

**Alternative**: Use a different port
```bash
# Specify custom port
pnpm run start -- --port 4201
```
</details>

### SSL/HTTPS Issues

<details>
<summary><strong>❌ SSL certificate errors in browser</strong></summary>

**Solution 1**: Accept self-signed certificate
1. Open https://localhost:4200
2. Click "Advanced" → "Proceed to localhost"

**Solution 2**: Regenerate certificates
```bash
# Clear old certificates
rm -rf node_modules/.vite

# Restart dev server
pnpm run start
```

**Solution 3**: Chrome flag for localhost
1. Navigate to `chrome://flags/`
2. Search for "localhost"
3. Enable "Allow invalid certificates for resources loaded from localhost"
4. Restart Chrome

**Solution 4**: Disable HTTPS (development only)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    https: false
  }
});
```
</details>

### Hot Module Replacement (HMR)

<details>
<summary><strong>❌ Changes not reflecting without manual refresh</strong></summary>

**Solution 1**: Clear Vite cache
```bash
rm -rf node_modules/.vite
pnpm run start
```

**Solution 2**: Fix file watcher limits

**🍎 macOS**:
```bash
# Check current limit
launchctl limit maxfiles

# Temporary increase (until reboot)
sudo launchctl limit maxfiles 65536 200000

# Permanent increase
echo 'kern.maxfiles=65536' | sudo tee -a /etc/sysctl.conf
echo 'kern.maxfilesperproc=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

**🐧 Linux**:
```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Solution 3**: Check for issues
```bash
# Install circular dependency checker
pnpm add -D madge

# Check for circular dependencies
npx madge --circular src/

# Check which files are being watched
find . -name "*.ts" -o -name "*.tsx" | wc -l
```

**Solution 4**: Exclude folders from watching
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    }
  }
});
```

**Other tips**:
- Disable antivirus real-time scanning for project folder
- Ensure project is on local drive (not network/cloud drive)
- Close other file watchers (Dropbox, OneDrive, etc.)
</details>

## 🔨 Build Issues

### TypeScript Errors

<details>
<summary><strong>❌ Cannot find module or type definitions</strong></summary>

**Common error messages**:
- `Cannot find module '@microsoft/logic-apps-shared'`
- `Could not find a declaration file for module`
- `Module '"*.svg"' has no exported member`

**Solution 1**: Rebuild the project
```bash
# Build all libraries first
pnpm run build:lib

# Then build everything
pnpm run build
```

**Solution 2**: Clear TypeScript cache
```bash
# Remove TS cache
rm -rf node_modules/.cache/typescript

# VS Code: Restart TS Server
# Press: Cmd/Ctrl + Shift + P
# Type: "TypeScript: Restart TS Server"
```

**Solution 3**: Fix path mappings
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@microsoft/logic-apps-shared": ["./libs/logic-apps-shared/src"],
      "@microsoft/designer-ui": ["./libs/designer-ui/src"]
    }
  }
}
```

**Solution 4**: Ensure types are installed
```bash
# Check if @types are installed
pnpm ls @types/react @types/node

# Install missing types
pnpm add -D @types/react @types/react-dom @types/node
```

**Solution 5**: Force TypeScript to recompile
```bash
# Delete all .tsbuildinfo files
find . -name "*.tsbuildinfo" -delete

# Rebuild
pnpm run build
```
</details>

### Monorepo Module Resolution

<details>
<summary><strong>❌ Module not found in monorepo workspace</strong></summary>

**Understand workspace structure first**:
```bash
# See all workspaces
pnpm ls --depth 0

# Check specific package location
pnpm ls @microsoft/logic-apps-shared
```

**Solution 1**: Add dependency to correct workspace
```bash
# Add to specific app/library
pnpm add @microsoft/logic-apps-shared --filter=vs-code-react

# Add to root workspace
pnpm add -w @microsoft/logic-apps-shared

# Add as dev dependency
pnpm add -D @microsoft/logic-apps-shared --filter=designer
```

**Solution 2**: Use workspace protocol
```json
// package.json
{
  "dependencies": {
    // Reference local workspace package
    "@microsoft/logic-apps-shared": "workspace:*",
    
    // Or specific version
    "@microsoft/designer-ui": "workspace:^1.0.0"
  }
}
```

**Solution 3**: Build dependencies in order
```bash
# Build libraries first
pnpm run build:lib

# Then build apps
pnpm run build:apps

# Or build everything
pnpm run build
```

**Solution 4**: Fix import paths
```typescript
// ❌ Wrong - importing from dist
import { something } from '@microsoft/logic-apps-shared/dist';

// ✅ Correct - import from package root
import { something } from '@microsoft/logic-apps-shared';
```

**Solution 5**: Symlink issues
```bash
# Recreate symlinks
pnpm install --force

# Or completely reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
</details>

### Build Cache Issues

<details>
<summary><strong>❌ Build using outdated/cached files</strong></summary>

**Turbo cache issues**:
```bash
# Clear Turbo cache completely
rm -rf .turbo

# Force rebuild without cache
pnpm turbo run build --force

# Clear cache for specific task
pnpm turbo run build:lib --force --no-cache
```

**Vite cache issues**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear all Vite caches in monorepo
find . -name ".vite" -type d -exec rm -rf {} +
```

**TypeScript cache issues**:
```bash
# Clear TS build info
find . -name "*.tsbuildinfo" -delete

# Clear TS cache folder
rm -rf node_modules/.cache/typescript
```

**Complete cache reset**:
```bash
# Nuclear option - clear everything
rm -rf .turbo node_modules/.vite node_modules/.cache
find . -name "*.tsbuildinfo" -delete
pnpm run build --force
```

**Prevent cache issues**:
```json
// turbo.json - configure cache behavior
{
  "pipeline": {
    "build": {
      "outputs": ["dist/**", "*.tsbuildinfo"],
      "cache": false  // Disable cache for debugging
    }
  }
}
```
</details>

## 🧪 Testing Issues

### Unit Test Failures

<details>
<summary><strong>❌ Tests fail locally but pass in CI</strong></summary>

**Common causes**: Environment differences, timezone issues, snapshot mismatches

**Solution 1**: Run tests in CI mode locally
```bash
# Matches CI environment
CI=true pnpm run test:lib

# Or with Node environment
NODE_ENV=test CI=true pnpm run test:lib
```

**Solution 2**: Fix timezone-related failures
```bash
# Run with UTC timezone (matches CI)
TZ=UTC pnpm run test:lib

# Windows
set TZ=UTC && pnpm run test:lib
```

**Solution 3**: Clear test cache
```bash
# Clear Vitest cache
rm -rf node_modules/.vitest

# Clear all test caches
rm -rf node_modules/.cache
```

**Solution 4**: Update snapshots
```bash
# Update all snapshots
pnpm vitest -u

# Update specific test file snapshots
pnpm vitest MyComponent.test.tsx -u

# Review changes before committing!
git diff
```

**Solution 5**: Debug specific test
```bash
# Run single test file
pnpm vitest src/components/Button.test.tsx

# Run with debugging
pnpm vitest --inspect-brk --single-thread
```

**Platform-specific issues**:
```bash
# Check for Windows line ending issues
git config core.autocrlf false

# Ensure consistent line endings
pnpm add -D prettier
pnpm prettier --write .
```
</details>

### E2E Test Issues (Playwright)

<details>
<summary><strong>❌ Playwright tests timing out</strong></summary>

**Solution 1**: Increase timeout for specific test
```typescript
test('slow loading test', async ({ page }) => {
  // Set timeout for this specific test
  test.setTimeout(120000); // 2 minutes
  
  await page.goto('/slow-page');
  // ... rest of test
});
```

**Solution 2**: Global timeout configuration
```typescript
// playwright.config.ts
export default defineConfig({
  // Global test timeout
  timeout: 60000, // 1 minute
  
  // Assertion timeout
  expect: {
    timeout: 10000, // 10 seconds
  },
  
  // Navigation timeout
  use: {
    navigationTimeout: 30000, // 30 seconds
    actionTimeout: 15000, // 15 seconds
  },
});
```

**Solution 3**: Debug why it's slow
```bash
# Run with debug mode
pnpm run test:e2e --debug

# Run with headed browser
pnpm run test:e2e --headed

# Record trace for debugging
pnpm run test:e2e --trace on
```

**Solution 4**: Wait for specific conditions
```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific request
await page.waitForResponse(response => 
  response.url().includes('/api/data') && response.status() === 200
);

// Custom wait function
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 10;
});
```
</details>

<details>
<summary><strong>❌ Playwright can't find elements</strong></summary>

**Solution 1**: Use proper locators
```typescript
// ❌ Bad - fragile selectors
await page.click('.btn-primary > span:nth-child(2)');

// ✅ Good - semantic selectors
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByTestId('submit-button').click();
await page.getByLabel('Email').fill('user@example.com');
```

**Solution 2**: Wait for elements
```typescript
// ❌ Bad - immediate click
await page.click('.dynamic-button');

// ✅ Good - wait for element
await page.locator('.dynamic-button').click(); // Auto-waits

// ✅ Better - explicit wait
await page.waitForSelector('.dynamic-button', { 
  state: 'visible',
  timeout: 30000 
});
await page.click('.dynamic-button');
```

**Solution 3**: Debug selectors
```bash
# Use Playwright Inspector
pnpm playwright test --debug

# Use codegen to generate selectors
pnpm playwright codegen localhost:4200

# Check selector in browser console
# Right-click element → Inspect → Console
document.querySelector('[data-testid="my-button"]')
```

**Solution 4**: Handle dynamic content
```typescript
// Wait for React to render
await page.waitForTimeout(100); // Last resort!

// Better - wait for specific condition
await expect(page.locator('.loading')).toBeHidden();
await expect(page.getByText('Content loaded')).toBeVisible();

// Handle elements that appear/disappear
const button = page.getByRole('button', { name: 'Save' });
await expect(button).toBeEnabled();
await button.click();
```

**Solution 5**: Fix flaky selectors
```typescript
// Add data-testid to your components
<button data-testid="save-workflow">Save</button>

// Then use in tests
await page.getByTestId('save-workflow').click();
```
</details>

<details>
<summary><strong>❌ E2E tests work locally but fail in CI</strong></summary>

**Common issues**:
- Different screen sizes
- Slower CI machines
- Missing dependencies
- Authentication issues

**Solutions**:
```bash
# Match CI viewport size
# In playwright.config.ts
use: {
  viewport: { width: 1280, height: 720 },
}

# Increase timeouts for CI
timeout: process.env.CI ? 120000 : 60000,

# Debug CI failures
# Add to test
await page.screenshot({ path: 'failure.png' });
```
</details>

## ⚡ Runtime Errors

### React Errors

<details>
<summary><strong>❌ Invalid hook call - Hooks can only be called inside function components</strong></summary>

**Common error**:
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**Cause 1**: Multiple React versions
```bash
# Check for duplicate React installations
pnpm ls react react-dom

# You might see:
# ├─ react@18.2.0
# └─ some-package
#    └─ react@17.0.2  ❌ Different version!

# Fix: Deduplicate
pnpm dedupe

# Or force resolution in package.json
{
  "overrides": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**Cause 2**: Hooks used incorrectly
```typescript
// ❌ Bad - conditional hook
function Component({ isEnabled }) {
  if (isEnabled) {
    const [state, setState] = useState(); // Error!
  }
}

// ✅ Good - unconditional hook
function Component({ isEnabled }) {
  const [state, setState] = useState();
  if (isEnabled) {
    // use state here
  }
}

// ❌ Bad - hook in regular function
function helper() {
  const [state, setState] = useState(); // Error!
}

// ✅ Good - custom hook
function useHelper() {
  const [state, setState] = useState(); // OK!
  return state;
}
```

**Cause 3**: Importing from wrong build
```typescript
// ❌ Bad - might cause duplicate React
import React from '../node_modules/react/index.js';

// ✅ Good
import React from 'react';
```

**Debug steps**:
```bash
# 1. Check React DevTools for multiple instances
# 2. Add to your app temporarily:
console.log('React1:', React.version);
console.log('React2:', window.React?.version);

# 3. Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
</details>

<details>
<summary><strong>❌ Cannot read properties of undefined/null</strong></summary>

**Common scenarios & fixes**:

**1. Optional chaining for safety**:
```typescript
// ❌ Bad - will crash if user is null
const name = user.profile.name;

// ✅ Good - safe navigation
const name = user?.profile?.name;

// ✅ With default value
const name = user?.profile?.name ?? 'Anonymous';
```

**2. Component props**:
```typescript
// ❌ Bad
function Card({ user }) {
  return <h1>{user.name}</h1>; // Crashes if user is undefined
}

// ✅ Good - with default props
function Card({ user = {} }) {
  return <h1>{user.name || 'Unknown'}</h1>;
}

// ✅ Better - with prop validation
interface CardProps {
  user?: {
    name?: string;
  };
}

function Card({ user }: CardProps) {
  return <h1>{user?.name || 'Unknown'}</h1>;
}
```

**3. Async data loading**:
```typescript
// ❌ Bad
function UserList() {
  const [users, setUsers] = useState(); // undefined!
  
  return users.map(u => ...); // Error!
}

// ✅ Good
function UserList() {
  const [users, setUsers] = useState([]); // Default empty array
  const [loading, setLoading] = useState(true);
  
  if (loading) return <div>Loading...</div>;
  return users.map(u => ...);
}
```
</details>

### Redux/State Management Issues

<details>
<summary><strong>❌ Redux state not updating</strong></summary>

**Debug checklist**:

**1. Check Redux DevTools**:
- Install Redux DevTools extension
- Check if action is dispatched
- Check if state changes after action

**2. Verify action is dispatched**:
```typescript
// Add logging
const handleClick = () => {
  console.log('Before dispatch');
  dispatch(myAction(payload));
  console.log('After dispatch');
};

// Check action creator
console.log('Action:', myAction(payload));
```

**3. Common mutation mistakes**:
```typescript
// ❌ Bad - Direct mutation (won't trigger re-render)
const reducer = (state, action) => {
  state.items.push(action.payload); // Mutating!
  return state; // Same reference
};

// ✅ Good - Return new object
const reducer = (state, action) => {
  return {
    ...state,
    items: [...state.items, action.payload]
  };
};
```

**4. Using Redux Toolkit (recommended)**:
```typescript
import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'todos',
  initialState: { items: [] },
  reducers: {
    // Immer lets you "mutate" safely
    addTodo: (state, action) => {
      state.items.push(action.payload); // OK with Immer!
    },
    removeTodo: (state, action) => {
      state.items = state.items.filter(
        item => item.id !== action.payload
      );
    }
  }
});

export const { addTodo, removeTodo } = slice.actions;
```

**5. Selector issues**:
```typescript
// ❌ Bad - creates new object every time
const selectUser = (state) => ({
  ...state.user,
  fullName: `${state.user.first} ${state.user.last}`
});

// ✅ Good - use memoization
import { createSelector } from '@reduxjs/toolkit';

const selectUser = createSelector(
  state => state.user,
  user => ({
    ...user,
    fullName: `${user.first} ${user.last}`
  })
);
```

**6. Component not re-rendering**:
```typescript
// Check you're using the hook correctly
function MyComponent() {
  // ❌ Bad - not subscribing to updates
  const state = store.getState();
  
  // ✅ Good - subscribes to changes
  const state = useSelector(state => state.mySlice);
  
  return <div>{state.value}</div>;
}
```
</details>

## 🔧 VS Code Extension Issues

### Extension Development

<details>
<summary><strong>❌ Extension won't load or activate</strong></summary>

**Solution 1**: Build the extension first
```bash
# Build the extension
pnpm run build:extension

# Or build everything
pnpm run build
```

**Solution 2**: Check Extension Host output
1. Open VS Code
2. View → Output
3. Select "Extension Host" from dropdown
4. Look for error messages

**Solution 3**: Check extension logs
```typescript
// Add logging to your extension
console.log('Extension activating...');

// View logs in:
// - Debug Console (when debugging)
// - Output panel → "Extension Host"
```

**Solution 4**: Clear extension cache
```bash
# macOS/Linux
rm -rf ~/.vscode-oss/
rm -rf ~/.vscode/extensions/

# Windows
rmdir /s "%USERPROFILE%\.vscode-oss"
rmdir /s "%USERPROFILE%\.vscode\extensions"
```

**Solution 5**: Debug extension properly
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/apps/vs-code-designer"
      ],
      "outFiles": [
        "${workspaceFolder}/apps/vs-code-designer/dist/**/*.js"
      ]
    }
  ]
}
```

**Common issues**:
- Wrong activation events in package.json
- Missing dependencies
- TypeScript compilation errors
- Wrong file paths in production
</details>

### Webview Issues

<details>
<summary><strong>❌ Webview blank, not loading, or not updating</strong></summary>

**Solution 1**: Debug webview content
1. Help → Toggle Developer Tools
2. Find the webview iframe in Elements tab
3. Right-click iframe → "Reload Frame"
4. Check Console for errors

**Solution 2**: Check Content Security Policy
```typescript
// Ensure CSP allows your resources
const csp = [
  `default-src 'none'`,
  `script-src ${webview.cspSource} 'unsafe-inline'`,
  `style-src ${webview.cspSource} 'unsafe-inline'`,
  `img-src ${webview.cspSource} https: data:`,
  `font-src ${webview.cspSource}`
].join('; ');

// In your HTML
<meta http-equiv="Content-Security-Policy" content="${csp}">
```

**Solution 3**: Fix resource paths
```typescript
// ❌ Bad - hardcoded paths
const scriptUri = 'file:///path/to/script.js';

// ✅ Good - use webview URI
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js')
);
```

**Solution 4**: Clear webview state
```typescript
// Clear persisted state
context.globalState.update('webviewState', undefined);

// Or clear all extension state
context.globalState.keys().forEach(key => {
  context.globalState.update(key, undefined);
});
```

**Solution 5**: Enable resources and options
```typescript
const panel = vscode.window.createWebviewPanel(
  'logicApps',
  'Logic Apps Designer',
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'dist'),
      vscode.Uri.joinPath(context.extensionUri, 'node_modules')
    ]
  }
);
```

**Solution 6**: Debug communication
```typescript
// In extension
panel.webview.onDidReceiveMessage(message => {
  console.log('Received:', message);
});

// In webview
const vscode = acquireVsCodeApi();
vscode.postMessage({ type: 'ready' });

// Listen for messages
window.addEventListener('message', event => {
  console.log('Webview received:', event.data);
});
```
</details>

## ⚡ Performance Issues

### Development Server Performance

<details>
<summary><strong>❌ Dev server slow to start or reload</strong></summary>

**Solution 1**: Optimize file watching
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    watch: {
      // Ignore large folders
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      // Use polling in containers/VMs
      usePolling: false,
      interval: 300
    }
  }
});
```

**Solution 2**: Pre-bundle dependencies
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // Pre-bundle large dependencies
    include: [
      'react',
      'react-dom',
      '@fluentui/react',
      '@reduxjs/toolkit',
      'monaco-editor'
    ],
    // Exclude problematic packages
    exclude: ['@microsoft/logic-apps-shared']
  }
});
```

**Solution 3**: System optimizations
- **Antivirus**: Exclude project folder and node_modules
- **Disk**: Use SSD, avoid network drives
- **Indexing**: Disable Windows Search, Spotlight on project folder
- **File watchers**: Close Dropbox, OneDrive, etc.

**Solution 4**: Reduce bundle size
```bash
# Analyze bundle
pnpm add -D rollup-plugin-visualizer
# Add to vite.config.ts, then check stats.html

# Find large dependencies
du -sh node_modules/* | sort -hr | head -20
```
</details>

### Memory Issues

<details>
<summary><strong>❌ JavaScript heap out of memory</strong></summary>

**Solution 1**: Increase Node.js memory
```bash
# Temporary (current session)
export NODE_OPTIONS="--max-old-space-size=8192"

# Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.bashrc

# For specific command
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build

# Windows
set NODE_OPTIONS=--max-old-space-size=8192
```

**Solution 2**: Fix memory leaks
```typescript
// Common causes:
// 1. Event listeners not cleaned up
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  
  // ✅ Clean up!
  return () => window.removeEventListener('resize', handler);
}, []);

// 2. Timers not cleared
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  
  // ✅ Clear timer!
  return () => clearInterval(timer);
}, []);

// 3. Large objects in closures
// Avoid keeping references to large objects
```

**Solution 3**: Optimize build process
```json
// turbo.json - run tasks in sequence to reduce memory usage
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

**Solution 4**: Monitor memory usage
```bash
# Watch memory during build
NODE_OPTIONS="--max-old-space-size=8192" \
  node --trace-gc pnpm run build

# Profile memory usage
node --inspect pnpm run build
# Open chrome://inspect in Chrome
```
</details>

## 💡 Getting Help

### Before Asking for Help

1. **Try the quick fixes** at the top of this guide
2. **Search existing issues**: 
   - [GitHub Issues](https://github.com/Azure/LogicAppsUX/issues)
   - Use search terms from your error message
3. **Check recent commits** for related changes
4. **Review pull requests** for similar problems

### How to Ask for Help

**1. GitHub Discussions** (for questions):
- [Logic Apps UX Discussions](https://github.com/Azure/LogicAppsUX/discussions)
- Good for: "How do I...?", "Best practices for..."

**2. GitHub Issues** (for bugs):
Include:
- **Environment**: OS, Node version, pnpm version
- **Steps to reproduce**: Minimal steps to recreate
- **Expected vs actual**: What should happen vs what happens
- **Error messages**: Full error output
- **What you tried**: Solutions attempted

**Template**:
```markdown
## Environment
- OS: macOS 14.0
- Node: 20.19.0
- pnpm: 8.0.0
- Branch: main

## Steps to Reproduce
1. Run `pnpm install`
2. Run `pnpm run start`
3. Navigate to http://localhost:4200

## Expected
Dev server starts successfully

## Actual
Error: Port 4200 already in use

## Error Output
```
[paste full error here]
```

## What I Tried
- Killed process on port 4200
- Cleared node_modules
- Tried different port
```

### Debug Information Commands

```bash
# Gather system info
npx envinfo --system --npmPackages --binaries --browsers

# Check workspace structure
pnpm ls --depth 0

# Verify dependencies
pnpm install --frozen-lockfile

# Check for outdated packages
pnpm outdated

# Validate monorepo structure
pnpm run lint:monorepo
```

### Emergency Reset

If nothing else works:
```bash
# Complete reset (⚠️ loses all local changes)
git clean -xfd
git reset --hard origin/main
pnpm install
pnpm run build
```

---

💪 **Remember**: Every developer has faced these issues. You're not alone, and the solution is usually simpler than you think!