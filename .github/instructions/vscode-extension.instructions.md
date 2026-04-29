<!-- AUTO-GENERATED from docs/ai-setup/packages/vscode-extension.md. DO NOT EDIT directly. -->


# VS Code Extension Library

Shared utilities and services for the Logic Apps VS Code extension. Provides common functionality used by both the extension host and webviews.

**Package**: `@microsoft/vscode-extension-logic-apps`

## Purpose

- **Shared utilities** - Common functions for VS Code integration
- **Message protocol** - Extension ↔ webview communication
- **Service implementations** - VS Code-specific service adapters
- **Type definitions** - Shared types for extension development

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports all public APIs.

### Structure
```
/src/lib
  /helpers/          - Utility helper functions
  /models/           - Shared types, extension commands, workflow models
  /services/         - Service implementations
```

## Key Features

### Extension Commands
Command constants defined in `src/lib/models/extensioncommand.ts`:
```typescript
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps'

// Command identifiers (examples)
ExtensionCommand.initialize
ExtensionCommand.loadRun
ExtensionCommand.dispose
```

### Webview Communication
The VS Code webviews communicate via the standard `acquireVsCodeApi()` pattern:
```typescript
// In webview (vs-code-react)
const vscode = acquireVsCodeApi()
vscode.postMessage({ command: ExtensionCommand.initialize, data: payload })

// In extension host (vs-code-designer)
panel.webview.onDidReceiveMessage((msg) => {
  switch (msg.command) {
    case ExtensionCommand.initialize: // handle...
  }
})
```

### Service Adapters
VS Code-specific service implementations adapt designer services for the extension environment. See `apps/vs-code-react/src/app/designer/servicesHelper.ts`.

## Usage

### In Extension Host (`vs-code-designer`)
The extension host creates webview panels and handles message passing with the VS Code API directly.

### In Webview (`vs-code-react`)
```typescript
// Communication via acquireVsCodeApi (see apps/vs-code-react/src/webviewCommunication.tsx)
const vscode = acquireVsCodeApi()
vscode.postMessage({ command: 'save_workflow', data: workflow })
```

## Dependencies

- `@microsoft/logic-apps-shared` - Core utilities
- VS Code API types (`@types/vscode`)
- Azure SDK packages

## Development Tips

1. **Type safety**: Define message types clearly
2. **Error handling**: Catch and report errors properly
3. **Async operations**: Handle VS Code's async nature
4. **Testing**: Mock VS Code APIs for unit tests

## Graphify

Read `libs/vscode-extension/src/graphify-out/GRAPH_REPORT.md` for structural context (god nodes, communities, surprising connections).
