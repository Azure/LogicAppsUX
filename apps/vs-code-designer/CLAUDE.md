# VS Code Designer Extension

The VS Code extension host for Azure Logic Apps. This is the main extension that gets published to the VS Code marketplace.

## Purpose

- **VS Code extension entry point** - Activates and manages the extension lifecycle
- **Command registration** - Provides Logic Apps commands in VS Code
- **Webview hosting** - Launches React-based designer panels
- **Azure integration** - Connects to Azure services for workflow management
- **File system operations** - Handles local Logic Apps projects

## Commands

```bash
pnpm run build:extension         # Build extension
pnpm run vscode:designer:pack    # Package .vsix file
pnpm run test:extension-unit     # Run unit tests
pnpm run vscode:designer:e2e:ui  # E2E tests with UI
```

## Structure

```
/src
  /app           - Extension activation and commands
  /commands      - VS Code command implementations
  /designers     - Webview panel management
  /services      - Azure service implementations
  /utils         - Helper utilities
/dist            - Build output and packaged extension
```

## Key Components

### Extension Activation (`src/app/`)
- `extension.ts` - Main activation entry point
- Registers commands, tree views, and webview providers

### Command Handlers (`src/commands/`)
- Workflow CRUD operations
- Connection management
- Deployment commands
- Debug and run commands

### Designers (`src/designers/`)
- `DesignerPanel` - Main workflow designer webview
- `DataMapperPanel` - Data transformation webview
- Panel state management and messaging

### Azure Services
- ARM API clients for Logic Apps resources
- Storage account integration
- App Service deployment

## Webview Communication

Extension ↔ Webview messaging:
```typescript
// Extension sends to webview
panel.webview.postMessage({ type: 'WORKFLOW_LOADED', data: workflow })

// Webview sends to extension (via vscode-extension lib)
vscode.postMessage({ type: 'SAVE_WORKFLOW', data: workflow })
```

## Extension Packaging

The extension is packaged with dependencies:
1. Build: `pnpm run build:extension`
2. Copy files: Runs `extension-copy-svgs.js`
3. Install deps: `cd dist && npm install`
4. Package: `vsce package`

## Testing

### Unit Tests
```bash
pnpm run test:extension-unit
```

### E2E Tests (vscode-extension-tester)
```bash
pnpm run vscode:designer:e2e:ui      # With UI
pnpm run vscode:designer:e2e:headless # Headless
```

## Configuration

### `package.json` (Extension Manifest)
Defines:
- Commands and keybindings
- View containers and tree views
- Configuration settings
- Activation events

## Dependencies

- `@microsoft/vscode-extension-logic-apps` - Shared VS Code utilities
- `@microsoft/logic-apps-shared` - Common Logic Apps utilities
- Azure SDK packages for resource management
- VS Code extension APIs

## Development Tips

1. **Debugging**: Use VS Code's "Run Extension" launch config
2. **Reload**: Use "Developer: Reload Window" after changes
3. **Logs**: Check "Output" panel → "Azure Logic Apps"
4. **Webview DevTools**: Command Palette → "Open Webview Developer Tools"
