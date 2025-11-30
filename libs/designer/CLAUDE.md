# Logic Apps Designer

The main workflow designer component library. This is the core package that powers the visual Logic Apps editing experience.

**Package**: `@microsoft/logic-apps-designer`

## Purpose

- **Visual workflow editor** - Drag-and-drop workflow canvas
- **Operation configuration** - Parameter panels and expression editor
- **State management** - Redux-based workflow state
- **Workflow serialization** - Convert between UI state and workflow JSON

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports:
- `DesignerProvider` - Main provider component
- `Designer` - The designer canvas
- Redux store and hooks
- Service interfaces

### Core Structure
```
/src/lib
  /core
    /state/          - Redux slices
    /actions/        - Action creators
    /parsers/        - Workflow parsers
    /queries/        - React Query hooks
    /utils/          - Core utilities
  /ui
    /panel/          - Side panels
    /settings/       - Operation settings
    /connections/    - Connection UI
    /menuItems/      - Context menus
    /common/         - Shared UI components
```

## State Management

### Redux Slices (`/core/state/`)
| Slice | Purpose |
|-------|---------|
| `workflowSlice` | Workflow graph structure |
| `operationMetadataSlice` | Operation definitions |
| `connectionSlice` | Connection state |
| `panelSlice` | UI panel state |
| `designerOptionsSlice` | Designer configuration |
| `designerViewSlice` | View settings |
| `settingsSlice` | Operation settings |
| `tokensSlice` | Expression tokens |
| `undoRedoSlice` | Undo/redo history |

### Key Actions (`/core/actions/`)
- `initializeDesigner` - Load workflow and setup
- `addOperation` - Add node to workflow
- `moveOperation` - Reorder operations
- `saveWorkflow` - Serialize workflow

## Workflow Parsers (`/core/parsers/`)

Two parser implementations:
- `BJSWorkflowParser` - Standard (Azure Functions-hosted)
- `ConsumptionParser` - Consumption tier

Parsers handle:
- Deserializing workflow JSON to Redux state
- Serializing Redux state back to JSON
- Handling nested operations (scopes, loops)

## Key Components

### DesignerProvider
Wraps the designer with all required providers:
```tsx
<DesignerProvider options={...}>
  <Designer />
</DesignerProvider>
```

### Canvas (`/ui/`)
- Uses `@xyflow/react` for the graph visualization
- ELK.js for automatic layout
- Custom node and edge components

### Panels (`/ui/panel/`)
- `recommendationpanel/` - Add operation search
- `nodeDetailsPanel/` - Operation configuration
- `connectionsPanel/` - Connection management

## Services Integration

The designer accepts services via `DesignerProvider`:
- `connectionService` - Manage connections
- `operationManifestService` - Operation metadata
- `searchService` - Operation search
- `oAuthService` - Authentication
- `workflowService` - Workflow CRUD

## Testing

Tests are in `__test__/` folders alongside source:
```bash
pnpm run test:lib                    # All tests
pnpm run test:lib -- --watch         # Watch mode
pnpm run test:lib -- <pattern>       # Specific tests
```

## Development Tips

1. **State debugging**: Use Redux DevTools in Standalone app
2. **Operation flow**: Add operation → parse → state → serialize
3. **Parser changes**: Must update both parsers if format changes
4. **New operations**: Define in `logic-apps-shared`, implement UI here

## Dependencies

- `@microsoft/designer-ui` - Stateless UI components
- `@microsoft/logic-apps-shared` - Utilities and services
- `@microsoft/logic-apps-chatbot` - AI assistance
- `@xyflow/react` - Graph visualization
- `@reduxjs/toolkit` - State management
