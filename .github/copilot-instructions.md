## Project Overview

Azure Logic Apps UX Monorepo - Contains the core UI libraries, standalone designer, documentation site, and VS Code extension for authoring and managing Logic Apps.

## Key Commands

### Development
```bash
# Install dependencies (run from root)
pnpm install

# Start development server for standalone designer
pnpm run start  # or pnpm turbo run dev

# Start with ARM authentication
pnpm run start:arm  # Generates ARM token then starts

# Build all packages
pnpm run build

# Build only libraries (for NPM publishing)
pnpm run build:lib  # or pnpm turbo run build:lib

# Build VS Code extension
pnpm run build:extension
```

### Testing
```bash
# Run all unit tests
pnpm run test:lib  # or pnpm turbo run test:lib

# Run VS Code extension unit tests
pnpm run test:extension-unit

# Run E2E tests (mock API)
pnpm run test:e2e --grep @mock

# Run all E2E tests
pnpm run test:e2e

# Open E2E test UI
pnpm run test:e2e:ui

# Setup E2E tests (install Playwright)
pnpm run e2e:setup

# Generate E2E test code
pnpm run testgen
```

### Code Quality
```bash
# Extract and compile localization strings
pnpm run extract
pnpm run compile:loc

# Run linting (ESLint)
eslint --cache --fix

# Format code (Biome)
pnpm run check  # or biome check --write .
```

### VS Code Extension
```bash
# Pack VS Code extension
pnpm run vscode:designer:pack
```

## Repository Architecture

### Monorepo Structure
- **PNPM Workspace**: Manages dependencies across packages
- **Turborepo**: Orchestrates builds with caching and task dependencies
- **Shared Libraries**: Common code in `libs/` used across applications

### Key Directories

#### `/apps/` - Applications
- **Standalone/**: React-based test harness for designer and data mapper (Vite)
- **docs/**: Documentation website (Docusaurus)
- **vs-code-designer/**: VS Code extension core functionality
- **vs-code-react/**: React views for VS Code webviews

#### `/libs/` - Shared Libraries
- **designer/**: Logic Apps Designer library (main UI component)
- **data-mapper/**: Data Mapper v1 (being deprecated)
- **data-mapper-v2/**: Data Mapper v2 (current version)
- **designer-ui/**: Stateless UI components shared between designer and data mapper
- **logic-apps-shared/**: Shared utilities and services
- **vscode-extension/**: VS Code extension shared functionality
- **chatbot/**: AI chatbot integration

#### `/e2e/` - End-to-End Tests
- Playwright-based tests for designer and templates
- Uses mock API by default (`@mock` tag)
- Real API tests available for integration testing

### State Management
- **Redux Toolkit**: Primary state management (slices pattern)
- **React Query (TanStack Query)**: Server state and caching
- **Redux + React-Redux**: Store integration

### UI Framework
- **Fluent UI v8 & v9**: Microsoft's design system
- **React 18**: Component framework
- **React Flow/XY Flow**: Graph visualization for designer
- **Monaco Editor**: Code editing capabilities

### Build Tools
- **Vite**: Development server and bundling for apps
- **tsup**: Library bundling
- **TypeScript**: Type safety across the codebase
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework

## Testing Approach

### Unit Tests
- Located alongside source files as `__test__/*.spec.ts(x)`
- Use Vitest with JSDOM environment
- React Testing Library for component tests
- Run with `pnpm run test:lib`

### E2E Tests
- Located in `/e2e/` directory
- Use Playwright with Chromium and Firefox
- Mock API tests marked with `@mock` tag
- Automatic retry on failure (3 attempts)
- Video recording on first retry

### Running Specific Tests
```bash
# Run a single unit test file
pnpm vitest run path/to/file.spec.ts

# Run E2E tests with specific grep pattern
pnpm run test:e2e --grep "test name"

# Debug tests in VS Code
# Install Vitest Explorer extension and use the test panel
```

## Development Workflow

1. **Before Starting**: Run `pnpm install` from root
2. **During Development**: 
   - Use `pnpm run start` for standalone designer
   - Tests run automatically in watch mode with Vitest extension
3. **Before Committing**:
   - Run `pnpm run test:lib` (unit tests)
   - Run `pnpm run test:e2e --grep @mock` (E2E tests)
   - Code is auto-formatted via lint-staged hooks

## Important Notes

- **Monorepo Navigation**: Always run commands from repository root unless specified
- **Node Version**: Requires Node.js v18+ and PNPM v9+
- **Localization**: Run `pnpm run extract` after adding new UI strings
- **VS Code Extension**: Built output goes to `apps/vs-code-designer/dist/`
- **Library Publishing**: Libraries are published to NPM from `build/lib/` directories

## Code Standards (from Copilot Instructions)

- Use functional React components with hooks
- Optimize performance with `useCallback` and `useMemo`
- Use TypeScript interfaces for props
- Follow existing patterns in codebase
- No stateful logic in `designer-ui` library
- Write unit tests for new functionality
- Use Vitest with JSDOM for testing