---
sidebar_position: 11
---

# Development Troubleshooting

This guide helps you resolve common issues encountered during Logic Apps UX development.

## Quick Fixes

### Most Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Port 4200 in use | `lsof -ti:4200 \| xargs kill -9` |
| TypeScript errors | `pnpm run build` |
| HMR not working | `rm -rf node_modules/.vite` |
| PNPM install fails | `pnpm store prune` |
| Tests timing out | Add `test.setTimeout(120000)` |

## Environment Setup

### Node.js Version Issues

<details>
<summary><strong>Error: The engine "node" is incompatible</strong></summary>

**Solution**: Use the correct Node.js version
```bash
# Check required version
cat .nvmrc

# Install and use
nvm install 20.19.0
nvm use 20.19.0

# Set as default
nvm alias default 20.19.0
```
</details>

### PNPM Installation Issues

<details>
<summary><strong>PNPM command not found</strong></summary>

**Solution**: Install PNPM globally
```bash
# Using npm
npm install -g pnpm@latest

# Using Corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate
```
</details>

<details>
<summary><strong>PNPM install hangs or fails</strong></summary>

**Solutions**:

1. Clear PNPM store:
```bash
pnpm store prune
```

2. Use different registry:
```bash
pnpm config set registry https://registry.npmjs.org/
```

3. Clear all and reinstall:
```bash
rm -rf node_modules pnpm-lock.yaml
rm -rf ~/.pnpm-store
pnpm install
```
</details>

## Development Server Issues

### Port Conflicts

<details>
<summary><strong>Port 4200 already in use</strong></summary>

**macOS/Linux**:
```bash
# Find process
lsof -i :4200

# Kill process
lsof -ti:4200 | xargs kill -9
```

**Windows**:
```cmd
# Find process
netstat -ano | findstr :4200

# Kill process (replace [PID])
taskkill /PID [PID] /F
```

**PowerShell**:
```powershell
# One-liner to kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 4200).OwningProcess | Stop-Process -Force
```
</details>

### SSL Certificate Issues

<details>
<summary><strong>SSL certificate errors in browser</strong></summary>

**Solution**: Regenerate certificates
```bash
# Remove old certificates
rm -rf node_modules/.vite

# Start dev server (will regenerate certs)
pnpm run start

# Accept the certificate in your browser
```

If using Chrome:
1. Navigate to chrome://flags/
2. Enable "Allow invalid certificates for resources loaded from localhost"
</details>

### Hot Module Replacement (HMR)

<details>
<summary><strong>Changes not reflecting without refresh</strong></summary>

**Solutions**:

1. Clear Vite cache:
```bash
rm -rf node_modules/.vite
pnpm run start
```

2. Check file watchers (macOS):
```bash
# Check current limit
launchctl limit maxfiles

# Increase limit
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

3. Disable antivirus scanning on project folder

4. Check for circular dependencies:
```bash
pnpm add -D madge
npx madge --circular src/
```
</details>

## Build Issues

### TypeScript Errors

<details>
<summary><strong>Cannot find module or type definitions</strong></summary>

**Solutions**:

1. Rebuild project:
```bash
pnpm run build
```

2. Clear TypeScript cache:
```bash
rm -rf node_modules/.cache/typescript
```

3. Restart TS server in VS Code:
   - `Cmd/Ctrl + Shift + P`
   - "TypeScript: Restart TS Server"

4. Check tsconfig paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@microsoft/logic-apps-shared": ["./node_modules/@microsoft/logic-apps-shared"]
    }
  }
}
```
</details>

### Module Resolution

<details>
<summary><strong>Module not found in monorepo</strong></summary>

**Solutions**:

1. Ensure dependency is in correct workspace:
```bash
# Add to specific workspace
pnpm add @microsoft/logic-apps-shared --filter=designer

# Add to root
pnpm add -w @microsoft/logic-apps-shared
```

2. Build dependencies:
```bash
pnpm run build:lib
```

3. Check workspace protocol:
```json
// package.json
{
  "dependencies": {
    "@microsoft/logic-apps-shared": "workspace:*"
  }
}
```
</details>

### Turbo Build Cache

<details>
<summary><strong>Build using outdated files</strong></summary>

**Solution**: Clear Turbo cache
```bash
# Clear cache
rm -rf .turbo

# Force rebuild
pnpm turbo run build --force

# Clear specific task cache
pnpm turbo run build:lib --force
```
</details>

## Testing Issues

### Unit Test Failures

<details>
<summary><strong>Tests fail locally but pass in CI</strong></summary>

**Solutions**:

1. Run in CI mode:
```bash
CI=true pnpm run test:lib
```

2. Clear test cache:
```bash
rm -rf node_modules/.vitest
```

3. Check timezone issues:
```bash
TZ=UTC pnpm run test:lib
```

4. Update snapshots:
```bash
pnpm vitest -u
```
</details>

### E2E Test Issues

<details>
<summary><strong>Playwright tests timing out</strong></summary>

**Solutions**:

1. Increase test timeout:
```typescript
test('my test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // test code
});
```

2. Global timeout in config:
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
});
```

3. Debug with headed mode:
```bash
pnpm run test:e2e --headed --debug
```
</details>

<details>
<summary><strong>Playwright can't find elements</strong></summary>

**Solutions**:

1. Wait for elements properly:
```typescript
// Bad
await page.click('.button');

// Good
await page.waitForSelector('.button', { state: 'visible' });
await page.click('.button');

// Better
await page.locator('.button').click();
```

2. Use data-testid:
```typescript
await page.getByTestId('submit-button').click();
```

3. Debug selectors:
```bash
pnpm run testgen
```
</details>

## Runtime Errors

### React Errors

<details>
<summary><strong>Invalid hook call</strong></summary>

**Common causes**:

1. Multiple React versions:
```bash
# Check for duplicates
pnpm ls react

# Dedupe
pnpm dedupe
```

2. Hooks in wrong place:
```typescript
// ❌ Bad
if (condition) {
  const [state, setState] = useState();
}

// ✅ Good
const [state, setState] = useState();
if (condition) {
  // use state
}
```
</details>

### Redux Issues

<details>
<summary><strong>State not updating</strong></summary>

**Debugging steps**:

1. Check Redux DevTools
2. Verify action dispatched:
```typescript
console.log('Dispatching:', action);
dispatch(action);
```

3. Check for state mutation:
```typescript
// ❌ Bad - mutating
state.items.push(item);

// ✅ Good - immutable
return {
  ...state,
  items: [...state.items, item]
};
```

4. Use Immer for complex updates:
```typescript
import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    addItem: (state, action) => {
      // Immer handles immutability
      state.items.push(action.payload);
    }
  }
});
```
</details>

## VS Code Extension

### Extension Development

<details>
<summary><strong>Extension won't load</strong></summary>

**Solutions**:

1. Build extension first:
```bash
pnpm run build:extension
```

2. Check output panel:
   - View → Output
   - Select "Extension Host" from dropdown

3. Clear extension development host:
```bash
# macOS/Linux
rm -rf ~/.vscode-oss/

# Windows
rmdir /s "%APPDATA%\Code - OSS"
```
</details>

### Webview Issues

<details>
<summary><strong>Webview blank or not updating</strong></summary>

**Solutions**:

1. Open Developer Tools:
   - Help → Toggle Developer Tools
   - Find webview iframe
   - Right-click → Reload Frame

2. Clear webview state:
```typescript
// In extension
context.globalState.update('webviewState', undefined);
```

3. Enable resource loading:
```typescript
const panel = vscode.window.createWebviewPanel(
  'logicApps',
  'Logic Apps',
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'dist')
    ]
  }
);
```
</details>

## Performance Issues

### Slow Development Server

<details>
<summary><strong>Dev server takes long to start</strong></summary>

**Solutions**:

1. Exclude node_modules from antivirus
2. Use SSD for development
3. Optimize Vite config:
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    fs: {
      // Allow serving files outside of root
      strict: false,
    },
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: ['react', 'react-dom', '@fluentui/react'],
  },
});
```
</details>

### Memory Issues

<details>
<summary><strong>JavaScript heap out of memory</strong></summary>

**Solution**: Increase Node memory limit
```bash
# Set in .npmrc or .bashrc
export NODE_OPTIONS="--max-old-space-size=8192"

# Or for specific command
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build
```
</details>

## Getting Additional Help

If these solutions don't resolve your issue:

1. **Search existing issues**: [GitHub Issues](https://github.com/Azure/LogicAppsUX/issues)
2. **Ask in discussions**: [GitHub Discussions](https://github.com/Azure/LogicAppsUX/discussions)
3. **Create new issue** with:
   - Steps to reproduce
   - Error messages
   - Environment details
   - What you've already tried

### Useful Debug Commands

```bash
# System info
npx envinfo --system --npmPackages --binaries --browsers

# Check package versions
pnpm ls

# Verify installation
pnpm install --frozen-lockfile

# Clean everything
git clean -xfd
pnpm install
```

Remember: Most issues have been encountered before - search first, ask second! 🔍