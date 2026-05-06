# libs/data-mapper-v2 — Visual Data Transformation Tool (Current)

## Purpose
The current-generation visual data mapper that allows users to create data
transformations between schemas. Users visually map source fields to target
fields and apply transformation functions. Generates XSLT output.

## NPM Package
`@microsoft/logic-apps-data-mapper-v2`

## Key Export
`DataMapperDesignerV2` — Main React component

## Architecture

### Components (components/)
- `canvas/` — Main mapping canvas (XY Flow v12 based, ELK layout engine)
- `schema/` — Schema tree views (source and target) using react-arborist
- `functions/` — Function library panel (string, math, date, collection functions)
- `codeView/` — XSLT code visualization and editing
- `commandBar/` — Toolbar with save, undo, redo, test, discard actions
- `mapChecker/` — Map validation and error reporting
- `common/` — Shared UI components

### Core Logic (core/)
Redux Toolkit state management with `redux-undo` integration:
- `appSlice` — Application-level state
- `dataMapSlice` — Mapping connections and transformation state
- `errorsSlice` — Validation errors and warnings
- `functionSlice` — Function library state
- `modalSlice` — Modal dialog management
- `panelSlice` — Side panel state
- `schemaSlice` — Source/target schema state

### Map Processing (mapHandling/)
- XSLT generation from visual mappings
- YAML-based map definition format (serialization/deserialization)
- Schema loading and parsing (XSD, JSON Schema)
- Map definition conversion utilities

### Services
- `dataMapperApiService` — Backend API calls for map testing
- `dataMapperFileService` — File system operations for schemas/maps
- `appInsights` — Telemetry and performance tracking

## Dependencies
- `logic-apps-shared` — Utilities and models
- `designer-ui` — Shared UI components

## Common Issue Patterns

### Issues that belong HERE:
- Visual mapping canvas bugs (connections not drawing, nodes misaligned)
- Schema tree rendering issues (large schemas, nested types)
- Function panel behavior (function search, parameter editing)
- XSLT generation errors (incorrect output, missing mappings)
- Map file loading/saving failures (YAML format)
- Data type coercion issues in mappings
- Code view rendering issues
- Map validation (mapChecker) errors
- Undo/redo bugs in the data mapper
- Canvas layout or ELK positioning issues

### Issues that are often MISATTRIBUTED here:
- Workflow designer bugs → `designer` or `designer-v2`
- General panel/editor component bugs → may be `designer-ui`
- Issues mentioning "data mapper" but describing workflow action configuration
  → likely about the designer's parameter editors, not the data mapper tool
