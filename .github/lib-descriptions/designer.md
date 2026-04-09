# libs/designer — Main Workflow Designer (v1)

## Purpose
The core workflow designer component library that powers the Logic Apps visual
editing experience. This is the primary designer used in production across Azure
Portal, VS Code, and standalone environments.

## NPM Package
`@microsoft/logic-apps-designer`

## Key Exports
- `DesignerProvider` — Top-level React context provider (Redux, theme, services)
- `BJSWorkflowProvider` — Workflow data initialization provider
- `Designer` — Main designer canvas component
- `TemplatesDataProvider`, `TemplatesDesignerProvider` — Template browsing/creation
- `CloneDataProvider`, `CloneWizardProvider` — Clone-to-Standard workflow wizard
- `McpDataProvider`, `McpWizardProvider` — MCP resource integration
- `KnowledgeDataProvider`, `KnowledgeWizardProvider` — Knowledge management
- `ConfigureTemplateDataProvider` — Template configuration
- Serialization: `serializeWorkflow`, `serializeBJSWorkflow`, `serializeUnitTestDefinition`
- Redux stores (`store`, `mcpStore`, `templateStore`), hooks, and selectors

## Architecture

### State Management (core/state/)
Redux Toolkit with feature-based slices (14 core slices + feature-specific):
- `workflowSlice` — Graph structure (nodes, edges, ordering)
- `operationMetadataSlice` — Operation definitions, parameters, and metadata
- `connectionSlice` — Connection mappings and references
- `panelSlice` — Side panel open/close state and selected tabs
- `designerOptionsSlice` — Feature flags and configuration
- `designerViewSlice` — Zoom, scroll, canvas viewport, minimap state
- `settingsSlice` — Operation-level settings (retry, timeout, etc.)
- `tokensSlice` — Expression token state
- `workflowparametersSlice` — Workflow-level parameter definitions and validation
- `staticresultsSlice` — Static test result schemas
- `unitTestSlice` — Unit test definitions and assertions
- `customcodeSlice` — Custom code file management
- `undoRedoSlice` — Undo/redo history stack
- `modalSlice` — Modal dialog state
- `devSlice` — Development-only debug state

**Separate Redux stores:**
- `mcpStore` — MCP (Model Context Protocol) wizard state
- `templateStore` — Template configuration and wizard state

### Workflow Parsing (core/parsers/)
Converts workflow JSON definitions into the internal graph representation.
Separate parsers for Consumption vs Standard workflow formats.

### Serialization (core/actions/bjsworkflow/)
Converts the internal graph state back to workflow JSON for saving.
Handles both Consumption and Standard serialization formats.

### Graph Layout (core/graphlayout/)
ELK (Eclipse Layout Kernel) based engine for automatic graph positioning.
Handles complex workflow layouts with nested scopes and parallel branches.

### Custom Nodes (ui/CustomNodes/)
Graph node type implementations for the React Flow canvas:
- `OperationCardNode` — Standard operation nodes
- `ScopeCardNode` — Scope container nodes (For Each, Until, Switch, etc.)
- `SubgraphCardNode` — Nested subgraph nodes
- `CollapsedCardNode` — Collapsed view of operations
- `PlaceholderNode` — Add-node placeholders
- `GraphContainerNode` — Graph container

### UI Layer (ui/)
- `ui/panel/` — Side panels (node details, parameters, monitoring, templates,
  agent chat, assertions, connections, errors, run history, workflow parameters)
- `ui/connections/` — Connection selection and configuration UI
- `ui/settings/` — Operation settings tabs
- `ui/templates/` — Template gallery and wizard
- `ui/clonetostandard/` — Clone workflow wizard
- `ui/mcp/` — MCP resource integration UI
- `ui/knowledge/` — Knowledge management UI
- `ui/common/` — Shared designer components (delete modals, context menus,
  performance debug, resource pickers)

### Service Integration
Uses abstract service interfaces from `logic-apps-shared`. The designer
does NOT implement services directly — host applications (Portal, VS Code)
provide concrete implementations via the DesignerProvider.

## Dependencies
- `logic-apps-shared` — Service interfaces, utilities, models
- `designer-ui` — Stateless UI components
- `chatbot` — AI assistant integration

## Common Issue Patterns

### Issues that belong HERE:
- Workflow canvas rendering problems (nodes not showing, layout broken)
- State management bugs (undo/redo, dirty state, lost changes)
- Parameter editing issues (values not saving, incorrect coercion)
- Panel behavior (wrong tab selected, panel not opening/closing)
- Serialization/deserialization failures (workflow JSON corruption)
- Operation search and operation card display
- Template wizard or clone wizard behavior
- MCP resource selection issues
- Unit test definition serialization
- Graph layout / auto-positioning problems
- Custom code file management

### Issues that are often MISATTRIBUTED here:
- Connection auth failures → usually `logic-apps-shared` (service layer) or backend
- Connector-specific bugs → usually backend or specific service provider
- UI component rendering glitches → often `designer-ui` (stateless components)
- VS Code-specific behavior → `vscode-extension` or `apps/vs-code-designer`
- Data mapping issues → `data-mapper-v2`
- Template gallery problems → check whether it's the panel (here) or template data (shared)
