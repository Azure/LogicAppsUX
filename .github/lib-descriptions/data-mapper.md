# libs/data-mapper — Legacy Data Mapper (v1)

## Purpose
The original visual data transformation tool. **Superseded by `data-mapper-v2`**
but maintained for backward compatibility. No active feature development.

## NPM Package
`@microsoft/logic-apps-data-mapper`

## Key Export
`DataMapperDesigner` — Main React component

## Architecture
- React Flow v11 based canvas (older version than v2)
- Redux state management
- YAML-based map definitions
- LESS styling (legacy, not migrated to makeStyles)

## Dependencies
- `logic-apps-shared` — Utilities and models
- `designer-ui` — Shared UI components
- `designer` — Some shared types

## Common Issue Patterns
Most data mapper issues should be directed to `data-mapper-v2` unless the
reporter explicitly mentions the legacy data mapper or v1.

### Issues that belong HERE:
- Bugs explicitly reported against the legacy/v1 data mapper
- Migration issues when converting v1 maps to v2 format

### Issues that are often MISATTRIBUTED here:
- Any new data mapper bug → likely `data-mapper-v2`
