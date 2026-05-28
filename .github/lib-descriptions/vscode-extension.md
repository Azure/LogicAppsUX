# libs/vscode-extension — VS Code Extension Utilities

## Purpose
Shared utilities, services, and type definitions used by the VS Code extension
host (`apps/vs-code-designer/`). Provides the bridge between VS Code APIs and
the designer/data mapper components.

## NPM Package
`@microsoft/vscode-extension-logic-apps`

## Key Functionality

### Command System (commandName.ts)
60+ registered extension commands covering:
- Workflow management (create, open, save, delete, overview, code view, designer)
- Connection management (create, edit, detach from local, configure)
- Data mapper commands (create, load, save)
- Deployment (deploy to Azure, configure CICD)
- Debugging (start debug, attach, stop)
- Project management (create project, init, configure, switch SKU)
- Monitoring (open run, resubmit run, view content)
- Template and MCP management

### HTTP Client (httpClient.ts)
Axios-based HTTP client with:
- Bearer token authentication
- Azure management API headers
- Retry logic and error handling

### Multi-Cloud Support
Azure environment configuration for:
- Azure Public (portal.azure.com)
- Azure Government (portal.azure.us)
- Azure China (portal.azure.cn)
- Classified clouds (EagleX, SCloud)

### JWT Helper (jwtHelper.ts)
Token introspection for authentication flows.

### Data Models
- Connection models: Function connections, service provider connections,
  API Management connections, agent connections, manual auth connections
- Data mapper models: Map definition, schema, function metadata
- Unit test models: Test definitions, mock data, assertion types
- Parameter gathering types for multi-step wizard flows

### Webview Communication Protocol
Typed message passing between VS Code extension host and React webviews.
Defines request/response interfaces for:
- Designer state synchronization
- Connection picker interactions
- File system operations
- Deployment status updates

## Dependencies
- `logic-apps-shared` — Service interfaces and utilities

## Common Issue Patterns

### Issues that belong HERE:
- Communication failures between VS Code extension and designer webview
- VS Code command registration or execution issues
- Extension service adapter bugs (incorrect API calls to local runtime)
- File system operations for local workflow management
- Multi-cloud configuration issues (wrong endpoint for gov/china clouds)
- HTTP client authentication or retry failures
- Connection model serialization/deserialization for local projects
- Data mapper file handling in VS Code context

### Issues that are often MISATTRIBUTED here:
- Designer UI bugs visible in VS Code → usually `designer` or `designer-ui`
- VS Code tree view issues → `apps/vs-code-designer/` (the host app)
- Azure connection issues in VS Code → may be `logic-apps-shared` services
- Extension activation failures → `apps/vs-code-designer/`
