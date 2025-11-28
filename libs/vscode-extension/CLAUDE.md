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
  /commands/         - Command definitions
  /models/           - Shared types
  /services/         - Service implementations
  /utils/            - Utility functions
```

## Key Features

### Extension Commands
Command definitions and constants:
```typescript
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps'

// Command identifiers
ExtensionCommand.openDesigner
ExtensionCommand.saveWorkflow
ExtensionCommand.createConnection
```

### Webview Communication
Message protocol for extension ↔ webview:
```typescript
// From webview to extension
import { sendMessage } from '@microsoft/vscode-extension-logic-apps'
sendMessage({ command: 'SAVE', payload: workflow })

// Message types
interface WebviewMessage {
  command: string
  payload: unknown
}
```

### Service Adapters
VS Code-specific service implementations:
```typescript
import { VSCodeConnectionService } from '@microsoft/vscode-extension-logic-apps'

// Adapts designer services for VS Code environment
const service = new VSCodeConnectionService(context)
```

## Usage

### In Extension Host (`vs-code-designer`)
```typescript
import {
  ExtensionCommand,
  handleWebviewMessage
} from '@microsoft/vscode-extension-logic-apps'

panel.webview.onDidReceiveMessage(handleWebviewMessage)
```

### In Webview (`vs-code-react`)
```typescript
import { sendMessage } from '@microsoft/vscode-extension-logic-apps'

const saveWorkflow = (workflow) => {
  sendMessage({ command: 'SAVE_WORKFLOW', payload: workflow })
}
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
