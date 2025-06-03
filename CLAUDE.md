# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Azure Logic Apps UX is a monorepo containing the UI components for Azure Logic Apps visual workflow designer. It powers the designer experience across Azure Portal, VS Code extension, Power Automate, and standalone environments.

## Essential Commands

### Development
```bash
pnpm install              # Install all dependencies
pnpm run start           # Start standalone designer (https://localhost:4200)
pnpm run start:arm       # Start with Azure ARM authentication
```

### Building
```bash
pnpm run build           # Build all packages
pnpm run build:lib       # Build libraries only
pnpm run build:extension # Build VS Code extension
```

### Testing
```bash
pnpm run test:lib        # Run unit tests
pnpm run test:e2e        # Run E2E tests with Playwright
pnpm run test:e2e:ui     # Run E2E tests with UI
pnpm run test:extension-unit # Test VS Code extension

# Run specific tests
pnpm --filter @microsoft/logic-apps-designer test -- <test-name>
```

### Code Quality
```bash
pnpm run check           # Format and lint with Biome
pnpm run extract         # Extract i18n strings
```

### VS Code Extension
```bash
pnpm run vscode:designer:pack # Package VS Code extension
```

### Other Utilities
```bash
pnpm run generateArmToken # Generate Azure ARM token for live API testing
pnpm run templates       # Download workflow templates
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18, TypeScript, Redux Toolkit, React Query
- **UI Libraries**: Fluent UI v8/v9, Monaco Editor, React Flow (XY Flow)
- **Build Tools**: PNPM workspaces, Turborepo, Vite, tsup
- **Testing**: Vitest (unit), Playwright (E2E)

### Repository Structure
```
/apps
  /Standalone         - Development environment (Vite + React)
  /docs              - Documentation site (Docusaurus)
  /vs-code-designer  - VS Code extension host
  /vs-code-react     - VS Code webviews

/libs
  /designer          - Main workflow designer component
  /data-mapper-v2    - Visual data transformation tool
  /designer-ui       - Shared UI components (stateless)
  /logic-apps-shared - Common utilities and services
  /chatbot          - AI chatbot integration
  /vscode-extension - VS Code extension utilities
```

### Key Architectural Patterns

#### State Management
- Redux Toolkit with feature-based slices in `/libs/designer/src/lib/core/state/`
- Each domain has its own slice (workflow, operations, connections, panels, etc.)
- Normalized state shape with separate concerns
- Custom middleware for undo/redo functionality

#### Service Architecture
- Abstract base classes for all services (e.g., `BaseConnectionService`)
- Services injected via React Context providers
- Clear interface contracts separate from implementations
- All API calls through standardized HTTP client interface

#### Data Fetching
- React Query for server state management
- 24-hour cache with localStorage persistence
- Structured query keys for cache management
- Separate from Redux client state

#### Component Patterns
- Provider pattern with nested contexts (Redux, Theme, Intl, Layout)
- Feature-based folder structure
- Stateless UI components in `designer-ui` library
- Smart components with hooks in main `designer` library

#### Workflow Engine
- Graph representation with nested node structure
- Parser pattern for different workflow formats (Consumption vs Standard)
- Complex actions composed of smaller operations
- Separate serializers/deserializers for each format

### Development Considerations

#### Testing Strategy
- Unit tests co-located in `__test__` folders
- Custom test utilities with providers in test helpers
- E2E tests for critical user flows
- Mock state centralized for consistency

#### Performance Optimizations
- Code splitting with dynamic imports
- React optimization patterns (memo, useMemo, useCallback)
- Virtualization for large node lists
- Turborepo build caching

#### Theme Support
- Dual theme support (light/dark)
- Fluent UI integration (migrating from v8 to v9)
- Theme provider via React context

#### Localization
- Full i18n support with formatjs
- 18+ language support
- String extraction workflow with `pnpm run extract`

#### Environment Configuration
- Separate configs for dev/prod environments
- Feature flags via experimentation service
- Build-time configuration with Vite env variables

### Important Files to Understand

1. **Entry Points**:
   - `/apps/Standalone/src/designer/app/DesignerShell.tsx` - Standalone app entry
   - `/libs/designer/src/lib/core/DesignerProvider.tsx` - Main designer provider
   - `/apps/vs-code-react/src/app/designer/app.tsx` - VS Code designer entry

2. **State Management**:
   - `/libs/designer/src/lib/core/state/` - All Redux slices
   - `/libs/designer/src/lib/core/actions/` - Complex action creators

3. **Services**:
   - `/libs/designer/src/lib/core/actions/bjsworkflow/` - Workflow operations
   - `/libs/logic-apps-shared/src/designer-client-services/` - Service interfaces

4. **Key Components**:
   - `/libs/designer/src/lib/ui/panel/` - Panel components
   - `/libs/designer/src/lib/ui/settings/` - Operation settings
   - `/libs/designer/src/lib/core/parsers/` - Workflow parsers

### Debugging Tips

1. **Standalone Development**: Use `pnpm run start` for rapid development with hot reload
2. **Redux DevTools**: Available in development for state debugging
3. **E2E Test Traces**: Run `pnpm run test:e2e:ui` for visual debugging
4. **Console Logging**: Extensive debug logging available in development mode
5. **Source Maps**: Enabled for all builds to aid debugging

## Active Migration Projects

### LESS to Fluent UI v9 makeStyles Migration
**Status**: In Progress
**Document**: `LESS_TO_MAKESTYLES_MIGRATION_PLAN.md`

The codebase is actively migrating from .less CSS files to Fluent UI v9's makeStyles CSS-in-JS system. This affects 124 .less files across the monorepo.

**Key Points for Development**:
- **New components** should use makeStyles, not .less files
- **Existing patterns** are established in `/libs/data-mapper-v2/` and other v9 components
- **Design tokens** will be centralized in `/libs/designer-ui/src/lib/tokens/designTokens.ts`
- **Theme support** is maintained through Fluent UI v9 design tokens

**When working on styling**:
1. Check if the component is in the migration plan
2. Use makeStyles patterns from existing v9 components
3. Reference design tokens instead of hardcoded values
4. Test with both light and dark themes
5. Update the migration plan progress when completing components

**Migration Progress Tracking**:
- Follow the checklist in `LESS_TO_MAKESTYLES_MIGRATION_PLAN.md`
- Mark tasks as completed with checkboxes
- Update the plan's status section when milestones are reached