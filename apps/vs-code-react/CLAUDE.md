# VS Code React Webviews

React applications that run inside VS Code webview panels. These provide the UI for the Logic Apps Designer extension.

## Purpose

- **Designer webview** - Main workflow designer UI in VS Code
- **Data Mapper webview** - Data transformation UI
- **Overview panels** - Project and workflow overview UIs
- **Export/Create wizards** - Guided workflow creation

## Commands

```bash
pnpm run build              # Build for development
pnpm run build:extension    # Build to vs-code-designer/dist
pnpm run test:extension-unit # Run unit tests
```

## Structure

```
/src
  /app
    /designer      - Workflow designer webview
    /dataMapper    - Data mapper webview
    /export        - Export wizard
    /overview      - Project overview
    /createWorkspace - Workspace creation
  /state           - Redux store configuration
```

## Key Entry Points

Each webview has its own entry:
- `src/app/designer/app.tsx` - Designer entry
- `src/app/dataMapper/app.tsx` - Data mapper entry
- `src/app/overview/app.tsx` - Overview entry

## Communication with Extension

Uses `@microsoft/vscode-extension-logic-apps` for messaging:

```typescript
import { ExtensionCommand, sendMessage } from '@microsoft/vscode-extension-logic-apps'

// Send message to extension
sendMessage({ command: ExtensionCommand.save, data: workflow })

// Receive from extension (via state initialization)
// Extension sends initial state when webview loads
```

## State Management

- Redux Toolkit for UI state
- Initial state received from extension host
- State changes communicated back to extension

## Build Output

Built files go to `vs-code-designer/dist/vs-code-react/`:
- `index.html` - Webview HTML entry
- `assets/` - JS/CSS bundles

## Styling Considerations

- Must work within VS Code's webview security model
- Inherits VS Code theme colors via CSS variables
- Uses Fluent UI for consistency with Azure Portal

## Dependencies

All major designer libraries:
- `@microsoft/logic-apps-designer`
- `@microsoft/logic-apps-designer-v2`
- `@microsoft/designer-ui`
- `@microsoft/logic-apps-data-mapper`
- `@microsoft/logic-apps-data-mapper-v2`
- `@microsoft/vscode-extension-logic-apps`

## Development Tips

1. **Preview changes**: Build and reload VS Code extension
2. **DevTools**: Use VS Code's "Open Webview Developer Tools"
3. **Hot reload**: Not available - must rebuild and reload
4. **Debugging**: Console logs appear in webview DevTools
