# Data Mapper V2

Current-generation visual data transformation tool. Create mappings between source and target schemas with a modern drag-and-drop interface.

**Package**: `@microsoft/logic-apps-data-mapper-v2`

## Purpose

- **Visual data mapping** - Intuitive drag-and-drop mapping creation
- **Schema support** - XML and JSON schema visualization
- **Function library** - Built-in and custom transformation functions
- **XSLT generation** - Generate transformation code
- **Tree navigation** - Efficient large schema browsing

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports `DataMapperDesignerV2` and related components.

### Structure
```
/src/lib
  /components/
    /canvas/         - Main mapping canvas
    /schema/         - Schema tree views
    /functions/      - Function panel
    /common/         - Shared components
  /core/
    /state/          - Redux slices
    /services/       - Data services
  /utils/            - Utilities
  /models/           - TypeScript types
```

## Key Components

### DataMapperDesignerV2
Main designer component:
```tsx
<DataMapperDesignerV2
  sourceSchema={sourceSchema}
  targetSchema={targetSchema}
  dataMap={existingMap}
  onSave={handleSave}
/>
```

### Schema Panel
Displays source/target schemas:
- Tree view with search
- Drag source for connections
- Type indicators

### Canvas
Visual mapping area:
- Uses `@xyflow/react` for connections
- ELK.js for layout
- Function nodes

### Functions Panel
Transformation functions:
- String functions
- Math functions
- Date functions
- Collection functions
- Custom functions

## State Management

### Redux Slices
| Slice | Purpose |
|-------|---------|
| `dataMapSlice` | Map connections and state |
| `schemaSlice` | Source/target schemas |
| `functionSlice` | Available functions |
| `panelSlice` | UI panel state |

### Undo/Redo
Built-in undo/redo via `redux-undo`.

## Styling

**Uses Fluent UI v9 makeStyles** - Good reference for makeStyles patterns:
```typescript
const useStyles = makeStyles({
  root: {
    display: 'flex',
    ...tokens.typographyStyles.body1,
  },
})
```

## Technologies

- `@xyflow/react` v12 - Graph visualization
- `elkjs` - Auto-layout
- `react-arborist` - Tree views
- Redux Toolkit with `redux-undo`
- Fluent UI v9

## Testing

```bash
pnpm run test:lib
```

## Usage

Access via Standalone app at `/datamapper-v2` route:
```bash
pnpm run start
# Navigate to https://localhost:4200/datamapper-v2
```

## Dependencies

- `@microsoft/designer-ui`
- `@microsoft/logic-apps-shared`
- `@xyflow/react`
- `@fluentui/react-components`
- Redux Toolkit

## Development Tips

1. **Style reference**: Good examples of makeStyles patterns
2. **Tree performance**: Uses virtualization for large schemas
3. **Connection logic**: Validation in `core/services/`
4. **Testing mappings**: Use test schemas in `/test/` folder
