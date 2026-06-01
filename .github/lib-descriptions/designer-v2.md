# libs/designer-v2 — Next-Generation Workflow Designer

## Purpose
The next-generation workflow designer with performance improvements, new features,
and architectural enhancements. Currently in active development alongside v1.
Accessible at `/designer-v2` in the standalone app.

## NPM Package
`@microsoft/logic-apps-designer-v2`

## Architecture
Same general structure as `libs/designer/` (Redux slices, parsers, serializers)
but with key improvements and new features:
- `react-window` for virtualized node lists (better performance with large workflows)
- Optimized Redux selectors with better memoization
- ELK (Eclipse Layout Kernel) graph layout engine
- Compressed undo/redo state snapshots (`lz-string`)
- Cleaner separation between UI and state layers

### Directory Structure
- `core/` — State management, actions, business logic
- `ui/` — UI components (canvas, panels, floating controls, custom nodes)
- `common/` — Shared utilities, models, constants

### State Management (core/state/)
Redux Toolkit with 15+ slices:
- `workflowSlice` — Workflow graph and structure
- `operationMetadataSlice` — Node parameters and metadata
- `connectionSlice` — API connections and references
- `panelSlice` — Right-side panel state
- `settingsSlice` — Operation settings validation
- `designerOptionsSlice` — Services, read-only mode, host options
- `designerViewSlice` — Viewport, minimap, zoom state
- `tokensSlice` — Expression tokens and autocomplete
- `workflowparametersSlice` — Workflow parameters validation
- `staticresultsSlice` — Static test result schemas
- `undoRedoSlice` — **v2 NEW**: Undo/redo with compressed state snapshots
- `unitTestSlice` — **v2 NEW**: Unit test definitions and assertions
- `customcodeSlice` — **v2 NEW**: Custom code management
- `notesSlice` — **v2 NEW**: Canvas sticky notes
- `modalSlice` — Modal dialog state

**Separate stores:** `mcpStore` (MCP wizard), `templateStore` (template config)

### New Features (not in v1)
- **Canvas Notes** — Sticky notes on the workflow canvas (`notesSlice`, `NoteNode`)
- **FloatingRunButton** — Workflow execution button with agent chat integration,
  payload preview, and authentication flows
- **Agent Support** — Agent connector operations, agentChat panel, `isAgentWorkflow`
  detection, Foundry agent integration
- **MCP Integration** — Model Context Protocol resource selection and management
- **Compressed Undo/Redo** — `Uint8Array` state snapshots with `lz-string` compression
- **Unit Testing** — Test definition serialization, assertions panel
- **Run History Panel** — In-designer run history viewer with tree view
- **Canvas Finder** — Node search/finder overlay
- **Performance Debug** — Performance metrics display

### UI Components (ui/)
- `Designer.tsx` — Top-level designer with hotkeys
- `DesignerReactFlow.tsx` — React Flow canvas
- `Controls.tsx`, `Minimap.tsx` — Designer controls
- `FloatingRunButton/` — Workflow run trigger with chat
- `CustomNodes/` — OperationCard, ScopeCard, SubgraphCard, CollapsedCard,
  GraphContainer, Placeholder, Hidden, **NoteNode** (sticky notes)
- Panels: agentChat, assertionsPanel, connectionsPanel, errorsPanel,
  nodeDetailsPanel, nodeSearchPanel, runHistoryPanel, runTreeView,
  templatePanel, workflowParametersPanel, recommendation
- `exportconsumption/` — Export workflow wizard
- `templates/` — Template gallery and designer
- `mcp/` — MCP UI

## Dependencies
- `logic-apps-shared` — Service interfaces, utilities
- `designer-ui` — Shared stateless UI components
- `chatbot` — AI assistant integration

## Common Issue Patterns

### Issues that belong HERE:
- Bugs specific to the v2 designer canvas or layout
- Performance issues in the v2 designer
- Feature parity gaps between v1 and v2
- FloatingRunButton or agent chat issues (v2 only)
- Canvas notes behavior
- Undo/redo bugs in v2 (compressed snapshots)
- Unit test panel or assertions issues
- Run history panel within the designer

### Issues that are often MISATTRIBUTED here:
- Most designer bugs currently affect v1 (`libs/designer/`) since v2 is not
  yet the default in production
- Unless the reporter explicitly mentions designer-v2 or the `/designer-v2`
  route, assume the issue is about v1
