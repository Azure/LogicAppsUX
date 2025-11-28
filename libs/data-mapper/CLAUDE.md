# Data Mapper (V1)

Legacy data transformation tool. Visual editor for creating data mappings between source and target schemas.

**Package**: `@microsoft/logic-apps-data-mapper`

## Status

**Legacy** - Superseded by `data-mapper-v2`. Maintained for backward compatibility but new features should be added to v2.

## Purpose

- **Visual data mapping** - Drag-and-drop schema mapping
- **XSLT generation** - Generate transformations
- **Schema visualization** - Display XML/JSON schemas
- **Function library** - Built-in transformation functions

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports the main `DataMapperDesigner` component.

### Structure
```
/src/lib
  /components/      - React UI components
  /core/            - Business logic
  /models/          - TypeScript types
  /utils/           - Utilities
```

## Usage

Access via Standalone app at `/datamapper` route.

## Key Components

- `DataMapperDesigner` - Main component
- `SchemaPanel` - Source/target schema display
- `ConnectionsPanel` - Mapping connections
- `FunctionsPanel` - Transformation functions

## Technologies

- React Flow (reactflow v11) for graph visualization
- Redux for state management
- YAML for configuration

## Migration to V2

When possible, prefer `data-mapper-v2`:
- Better performance
- Modern architecture
- Uses @xyflow/react v12

## Dependencies

- `@microsoft/designer-ui`
- `@microsoft/logic-apps-designer`
- `@microsoft/logic-apps-shared`
- `reactflow` (v11)
- Redux Toolkit
