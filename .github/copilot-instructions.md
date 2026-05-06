<!-- AUTO-GENERATED from docs/ai-setup/. DO NOT EDIT directly. Run: pnpm run ai:generate -->


# Logic Apps UX — AI Assistant Guide

## Repository Overview

Azure Logic Apps UX is a monorepo containing the UI components for Azure Logic Apps visual workflow designer. It powers the designer experience across Azure Portal, VS Code extension, Power Automate, and standalone environments.

## Essential Commands

### Development
```bash
pnpm install              # Install all dependencies (run from root)
pnpm run start            # Start standalone designer (https://localhost:4200)
pnpm run start:arm        # Start with Azure ARM authentication (generates token then starts)
```

### Building
```bash
pnpm run build            # Build all packages
pnpm run build:lib        # Build libraries only (for NPM publishing)
pnpm run build:extension  # Build VS Code extension
```

### Testing
```bash
# Unit tests
pnpm run test:lib              # Run all unit tests
pnpm run test:iframe-app       # IFrame chat app unit tests
pnpm run test:extension-unit   # VS Code extension unit tests

# Run a single unit test file
pnpm vitest run path/to/file.spec.ts

# Run tests for a specific package
pnpm --filter @microsoft/logic-apps-designer test -- <test-name>

# E2E tests (Playwright)
pnpm run e2e:setup             # One-time: install Playwright browsers
pnpm run test:e2e              # Run all E2E tests
pnpm run test:e2e --grep @mock # Run mock-API tests only
pnpm run test:e2e:ui           # Open E2E test UI (visual debugging)
pnpm run testgen               # Generate E2E test code

# VS Code extension E2E (ExTester)
pnpm run vscode:designer:e2e:ui       # UI mode
pnpm run vscode:designer:e2e:headless # Headless mode
```

### VS Code Extension E2E Tests (ExTester)
```bash
cd apps/vs-code-designer
npx tsup --config tsup.e2e.test.config.ts
node src/test/ui/run-e2e.js

# Run specific phases via E2E_MODE env var
E2E_MODE="createonly"    # Phase 4.1: workspace creation
E2E_MODE="designeronly"  # Phase 4.2: designer lifecycle
E2E_MODE="newtestsonly"  # Phases 4.3-4.6: new tests
```

Key knowledge files for E2E tests:
- `apps/vs-code-designer/src/test/ui/SKILL.md` — Complete learning document (700+ lines)
- `apps/vs-code-designer/src/test/ui/designerHelpers.ts` — Shared designer test helpers
- `apps/vs-code-designer/src/test/ui/runHelpers.ts` — Shared debug/run test helpers
- `apps/vs-code-designer/src/test/ui/run-e2e.js` — Test launcher (7 phases)

### Code Quality
```bash
pnpm run check           # Format and lint with Biome (biome check --write .)
pnpm run extract         # Extract i18n strings
pnpm run compile:loc     # Compile localization strings
eslint --cache --fix     # Run ESLint
```

### VS Code Extension
```bash
pnpm run vscode:designer:pack  # Package VS Code extension
```

### Other Utilities
```bash
pnpm run generateArmToken  # Generate Azure ARM token for live API testing
pnpm run templates         # Download workflow templates
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18, TypeScript, Redux Toolkit, React Query (TanStack Query)
- **UI Libraries**: Fluent UI v8/v9, Monaco Editor, React Flow (XY Flow)
- **Build Tools**: PNPM workspaces, Turborepo, Vite, tsup
- **Testing**: Vitest (unit), Playwright (E2E)

### Repository Structure
```
/apps
  /Standalone         - Development environment / test harness (Vite + React)
  /docs               - Documentation site (Docusaurus)
  /iframe-app         - A2A Chat iframe application
  /vs-code-designer   - VS Code extension host
  /vs-code-react      - React views for VS Code webviews

/libs
  /a2a-core           - A2A protocol chat client SDK
  /chatbot            - AI chatbot integration
  /data-mapper        - Data transformation tool (v1, legacy)
  /data-mapper-v2     - Visual data transformation tool (current)
  /designer           - Main workflow designer component
  /designer-ui        - Shared UI components (stateless only)
  /designer-v2        - Next-generation designer (in development)
  /logic-apps-shared  - Common utilities and services
  /vscode-extension   - VS Code extension utilities

/e2e                  - Playwright E2E tests (mock API default, @mock tag)
```

### Key Architectural Patterns

#### State Management
- Redux Toolkit with feature-based slices in `/libs/designer/src/lib/core/state/`
- Each domain has its own slice (workflow, operations, connections, panels, etc.)
- Normalized state shape with separate concerns
- Custom middleware for undo/redo functionality
- React Query for server state (24-hour cache with localStorage persistence)

#### Service Architecture
- Abstract base classes for all services (e.g., `BaseConnectionService`)
- Services injected via React Context providers
- Clear interface contracts separate from implementations
- All API calls through standardized HTTP client interface

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
- Unit tests co-located in `__test__` folders as `*.spec.ts(x)`
- Vitest with JSDOM environment; React Testing Library for components
- Custom test utilities with providers in test helpers
- Mock state centralized for consistency
- E2E tests in `/e2e/` using Playwright (Chromium + Firefox)
- E2E auto-retry on failure (3 attempts) with video on first retry

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
- Full i18n support with formatjs (18+ languages)
- String extraction workflow: `pnpm run extract`

#### Environment Configuration
- Separate configs for dev/prod environments
- Feature flags via experimentation service
- Build-time configuration with Vite env variables

## Important Files to Understand

1. **Entry Points**:
   - `/apps/Standalone/src/designer/app/DesignerShell.tsx` — Standalone app entry
   - `/libs/designer/src/lib/core/DesignerProvider.tsx` — Main designer provider
   - `/apps/vs-code-react/src/app/designer/app.tsx` — VS Code designer entry

2. **State Management**:
   - `/libs/designer/src/lib/core/state/` — All Redux slices
   - `/libs/designer/src/lib/core/actions/` — Complex action creators

3. **Services**:
   - `/libs/designer/src/lib/core/actions/bjsworkflow/` — Workflow operations
   - `/libs/logic-apps-shared/src/designer-client-services/` — Service interfaces

4. **Key Components**:
   - `/libs/designer/src/lib/ui/panel/` — Panel components
   - `/libs/designer/src/lib/ui/settings/` — Operation settings
   - `/libs/designer/src/lib/core/parsers/` — Workflow parsers

## Debugging Tips

1. **Standalone Development**: Use `pnpm run start` for rapid development with hot reload
2. **Redux DevTools**: Available in development for state debugging
3. **E2E Test Traces**: Run `pnpm run test:e2e:ui` for visual debugging
4. **Console Logging**: Extensive debug logging available in development mode
5. **Source Maps**: Enabled for all builds to aid debugging

## Knowledge Graphs (Graphify)

Each library has a Graphify knowledge graph at `libs/<lib>/src/graphify-out/` containing:
- **GRAPH_REPORT.md** — God nodes (most-connected abstractions), communities, surprising cross-file connections
- **graph.json** — Queryable graph for structural questions

Graphs are **auto-rebuilt by CI** when source files change on main.

**Before exploring a library, read its `GRAPH_REPORT.md` first** — it tells you the core abstractions, how they connect, and what's surprising. This is faster and more accurate than grepping raw files.

### Available graph reports
- `libs/designer-v2/src/graphify-out/GRAPH_REPORT.md` — designer-v2 (2314 nodes)
- `libs/designer/src/graphify-out/GRAPH_REPORT.md` — designer v1 (2410 nodes)
- `libs/designer-ui/src/graphify-out/GRAPH_REPORT.md` — designer-ui (1228 nodes)
- `libs/logic-apps-shared/src/graphify-out/GRAPH_REPORT.md` — shared utilities (1242 nodes)
- `libs/data-mapper-v2/src/graphify-out/GRAPH_REPORT.md` — data mapper (446 nodes)
- `libs/a2a-core/src/graphify-out/GRAPH_REPORT.md` — A2A core (408 nodes)

### Quick commands (one-time setup: `pnpm run graphify:setup`)
```bash
pnpm run graphify:rebuild                    # Rebuild all graphs (pure AST, no LLM, runs in seconds)
pnpm run graphify:rebuild -- designer-v2     # Rebuild a specific lib

# Query, trace, and explain
graphify query "how does serialization work?" --graph libs/designer-v2/src/graphify-out/graph.json
graphify path "serializeWorkflow" "BJSDeserializer" --graph libs/designer-v2/src/graphify-out/graph.json
graphify explain "getOperationSettings" --graph libs/designer-v2/src/graphify-out/graph.json

# Interactive HTML visualization (run from within a lib directory)
graphify update src/   # then open graphify-out/graph.html
```

### Key god nodes by library
- **designer-v2**: `getOperationSettings` (52 edges), `getReactQueryClient` (45), `initializeOperationDetails` (24)
- **designer**: `getOperationSettings` (52 edges), `getReactQueryClient` (45), `initializeOperationDetails` (25)
- **logic-apps-shared**: Check `libs/logic-apps-shared/src/graphify-out/GRAPH_REPORT.md`

## Active Migration Projects

### LESS to Fluent UI v9 makeStyles Migration
**Status**: In Progress
**Document**: `LESS_TO_MAKESTYLES_MIGRATION_PLAN.md`

The codebase is actively migrating from .less CSS files to Fluent UI v9's makeStyles CSS-in-JS system (124 .less files affected).

**Key Points**:
- **New components** must use makeStyles, not .less files
- **Existing patterns** are established in `/libs/data-mapper-v2/` and other v9 components
- **Design tokens** are centralized in `/libs/designer-ui/src/lib/tokens/designTokens.ts`
- **Theme support** is maintained through Fluent UI v9 design tokens

**When working on styling**:
1. Check if the component is in the migration plan
2. Use makeStyles patterns from existing v9 components
3. Reference design tokens instead of hardcoded values
4. Test with both light and dark themes
5. Update the migration plan progress when completing components

## Package Dependency Graph

```
logic-apps-shared (foundation)
    ↑
    ├── designer-ui (stateless UI)
    │       ↑
    │       ├── designer (main workflow designer)
    │       ├── designer-v2 (next-gen designer)
    │       ├── data-mapper (v1)
    │       ├── data-mapper-v2 (current)
    │       └── chatbot
    │
    └── vscode-extension (VS Code utilities)
            ↑
            └── vs-code-designer (extension host)

a2a-core (standalone SDK)
    ↑
    └── iframe-app (chat iframe)
```

## Cross-Cutting Concerns

### Adding New Operations/Connectors
1. Define operation metadata in `logic-apps-shared`
2. Add UI components in `designer-ui` if needed
3. Implement operation handling in `designer`
4. Update parsers if workflow format changes

### Modifying State Shape
1. Update Redux slice in `designer/src/lib/core/state/`
2. Update selectors
3. Update any affected serializers/deserializers
4. Add migration logic if needed for persisted state

### Adding New Services
1. Define interface in `logic-apps-shared/src/designer-client-services/`
2. Implement base class with common logic
3. Create environment-specific implementations (Consumption/Standard)
4. Register via service provider context

## Code Standards

- Use functional React components with hooks — no class components
- Optimize performance with `useCallback` and `useMemo` where appropriate
- Use TypeScript interfaces for component props
- Follow existing patterns in the codebase (find 3 examples before inventing new patterns)
- **No stateful logic in the `designer-ui` library** — it must remain purely presentational
- Write unit tests for new functionality (Vitest with JSDOM)

## Mandatory Formatting (Biome)

**Run before every commit**: `npx biome check --write <changed-files>`

Do NOT use the `--unsafe` flag — fix unsafe lint errors manually.
For E2E test files, verify compilation: `npx tsup --config tsup.e2e.test.config.ts`

**Biome rules that cause build errors if violated**:
- Use string literals (`'text'`) NOT template literals (`` `text` ``) when there are no interpolations
- Avoid unnecessary `catch` bindings — use `catch {` not `catch (e) {` when `e` is unused
- Keep imports organized and remove unused imports
- Always use block statements with braces — `if (x) { break; }` not `if (x) break;`

## Development Workflow

1. **Before Starting**: Run `pnpm install` from the repository root
2. **During Development**:
   - Use `pnpm run start` for standalone designer with hot reload
   - Tests run automatically in watch mode with the Vitest extension
3. **Before Committing**:
   - Run `npx biome check --write <files>` (formatting)
   - Run `pnpm run test:lib` (unit tests)
   - Run `pnpm run test:e2e --grep @mock` (E2E smoke tests)
   - Code is also auto-formatted via lint-staged hooks

## Important Notes

- **Monorepo Navigation**: Always run commands from repository root unless specified otherwise
- **Node Version**: Requires Node.js v18+ and PNPM v9+
- **Localization**: Run `pnpm run extract` after adding new UI strings
- **VS Code Extension**: Built output goes to `apps/vs-code-designer/dist/`
- **Library Publishing**: Libraries are published to NPM from `build/lib/` directories

## Per-Package Guidance

Each package has detailed guidance in `docs/ai-setup/packages/<name>.md`. Read the relevant file when working in a specific package.

## Squad Agents

This repo uses Squad for AI agent specialization. See `.squad/README.md` for the team roster and `.squad/routing.md` for work dispatch.
