# Logic Apps Designer V2

Next-generation workflow designer with performance improvements and architectural enhancements. Currently in active development alongside the main designer.

**Package**: `@microsoft/logic-apps-designer-v2`

## Purpose

- **Performance improvements** - Optimized rendering and state management
- **Modern architecture** - Cleaner separation of concerns
- **Enhanced UX** - Improved user interactions and workflows
- **Feature parity** - Eventually replace designer v1

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Status

**In Development** - Not yet feature-complete. The main `designer` package remains the production version.

## Architecture Differences from V1

### Key Improvements
- `react-window` for virtualized lists
- Optimized Redux selectors
- Improved graph layout algorithms
- Better separation of UI and state logic

### Structure
```
/src/lib
  /core/             - State and business logic
  /ui/               - UI components
```

## Usage

Access via Standalone app at `/designer-v2` route:
```bash
pnpm run start
# Navigate to https://localhost:4200/designer-v2
```

## Development

When working on v2:
1. Check if feature exists in v1 first
2. Ensure compatibility with existing workflows
3. Test performance improvements
4. Document architectural changes

## Dependencies

Same as designer v1:
- `@microsoft/designer-ui`
- `@microsoft/logic-apps-shared`
- `@microsoft/logic-apps-chatbot`
- `@xyflow/react`
- `@reduxjs/toolkit`

Plus:
- `react-window` - Virtualized rendering
