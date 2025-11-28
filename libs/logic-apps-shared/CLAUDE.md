# Logic Apps Shared

Foundation library containing shared utilities, service interfaces, and common functionality used across all Logic Apps packages.

**Package**: `@microsoft/logic-apps-shared`

## Purpose

- **Service interfaces** - Abstract contracts for all services
- **Common utilities** - Shared helper functions
- **Type definitions** - Core TypeScript types
- **Parsers** - Expression and schema parsers
- **Internationalization** - i18n utilities

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports all public APIs.

### Structure
```
/src
  /designer-client-services/   - Service interfaces and base classes
    /lib/base/                 - Abstract base services
    /lib/consumption/          - Consumption tier implementations
    /lib/standard/             - Standard tier implementations
    /lib/common/               - Shared service utilities
  /parsers/                    - Expression and schema parsers
  /intl/                       - Internationalization
  /utils/                      - General utilities
    /lib/exception/            - Error handling
    /lib/helpers/              - Helper functions
    /lib/models/               - Data models
    /lib/mocks/                - Test mocks
```

## Service Architecture

### Base Services (`/designer-client-services/lib/base/`)
Abstract classes defining service contracts:

| Service | Purpose |
|---------|---------|
| `BaseConnectionService` | Connection management |
| `BaseOperationManifestService` | Operation metadata |
| `BaseSearchService` | Operation search |
| `BaseWorkflowService` | Workflow CRUD |
| `BaseOAuthService` | OAuth authentication |
| `BaseGatewayService` | On-premises gateway |
| `BaseTenantService` | Tenant information |

### Environment Implementations
- `consumption/` - Azure Consumption tier
- `standard/` - Azure Standard tier (Functions-hosted)

### Usage Pattern
```typescript
// Define interface
interface IConnectionService {
  getConnection(id: string): Promise<Connection>
}

// Implement for environment
class StandardConnectionService extends BaseConnectionService {
  async getConnection(id: string): Promise<Connection> {
    // Standard tier implementation
  }
}

// Inject via provider
<ServiceProvider connectionService={connectionService}>
  <Designer />
</ServiceProvider>
```

## Utilities

### Expression Helpers
```typescript
import { isExpression, parseExpression } from '@microsoft/logic-apps-shared'

isExpression('@{triggerBody()}') // true
parseExpression('@{concat("a", "b")}') // { function: 'concat', args: [...] }
```

### Type Guards
```typescript
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared'
```

### Error Handling
```typescript
import { AssertionException, ValidationException } from '@microsoft/logic-apps-shared'
```

## Internationalization

i18n utilities using `react-intl`:
```typescript
import { getIntl, IntlMessages } from '@microsoft/logic-apps-shared'

const intl = getIntl()
intl.formatMessage({ defaultMessage: 'Hello' })
```

## Key Types

Important type definitions:
- `Workflow` - Workflow definition
- `Operation` - Operation metadata
- `Connection` - Connection configuration
- `Connector` - Connector metadata
- `Parameter` - Operation parameters

## Testing

```bash
pnpm run test:lib
```

Test utilities provided in `/utils/src/lib/mocks/`:
- Mock services
- Test data factories
- Provider wrappers

## Dependencies

Minimal dependencies (foundation package):
- `@apidevtools/swagger-parser` - API parsing
- `@xyflow/react` - Graph types
- `axios` - HTTP client
- `react-intl` - i18n

## Development Guidelines

1. **No UI dependencies** - This is a foundation library
2. **Abstract interfaces** - Define contracts, not implementations
3. **Backward compatibility** - Changes affect all consumers
4. **Documentation** - Export types should be documented
5. **Test coverage** - Critical utilities need comprehensive tests
