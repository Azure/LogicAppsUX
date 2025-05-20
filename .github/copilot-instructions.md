This is a PNPM-based monorepo for the Azure Logic Apps UX. It contains our Data Mapper, VSCode Extension and our Logic Apps Designer.
## Code Standards

### Required Before Each Commit
- Run all tests, both unit and end to end

### Development Flow
- Build: `pnpm run build`
- Unit  Test: `pnpm run test:lib`
- End To End Test: `pnpm run test:e2e`

## Repository Structure
- `apps/`: Full App Code Projects
  - `docs/`: App for Documentation for the project
  - `Standalone/`: Test scaffolding for testing the data mapper and designer quickly while developing and run end to end tests
  - `vscode-code-designer/`: VSCode Extension App
  - `vs-code-react`: VSCode web views that the extension app mounds for integrated UI
- `e2e/`: Location for e2e tests
- `libs/`: Shared libraries for the project
  - `data-mapper/`: Data Mapper library, the v1 version that will be deprecated soon
  - `data-mapper-v2/`: Data Mapper library, the v2 version that is currently in preview
  - `designer/`: Logic Apps Designer library
  - `vscode-extension/`: VSCode Extension library
  - `designer-ui`: Designer UI library which has components used by both data-mapper and designer. No stateful logic allowed here
  - `logic-apps-shared`: Shared utility libraries for the Logic Apps Designer and Data Mapper

## Key Guidelines
1. Follow good practices for react and typescript code 
   - Use functional components and hooks
   - Use `useCallback` and `useMemo` to optimize performance
   - Use `React.lazy` and `Suspense` for code splitting
   - Use `React.forwardRef` for components that need to forward refs
   - Use `PropTypes` or TypeScript interfaces for prop validation
   - Use `styled-components` or CSS modules for styling
   - Use `eslint` and `prettier` for code formatting and linting
   - Use `@testing-library/react` for unit testing
   - Use `vitest` with JSDOM for unit testing
2. Maintain existing code structure and organization
4. Write unit tests for new functionality. 
5. Document public APIs and complex logic. Suggest changes to the `apps/docs/` folder when appropriate