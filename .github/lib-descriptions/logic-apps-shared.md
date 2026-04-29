# libs/logic-apps-shared — Foundation Library

## Purpose
The foundation library providing shared utilities, abstract service interfaces,
data models, expression parsers, and HTTP client infrastructure used by ALL other
packages in the monorepo. This is the lowest-level library in the dependency graph.

## NPM Package
`@microsoft/logic-apps-shared`

## Key Subsystems

### Service Interfaces (designer-client-services/)
Abstract base classes that define contracts for all designer services. Host
applications (Portal, VS Code, standalone) provide concrete implementations.

**Core Services:**
- `BaseConnectionService` — Connection CRUD, connection references, resource picker
- `BaseConnectorService` — Connector metadata, swagger fetching
- `BaseOperationManifestService` — Operation metadata, schemas, built-in connectors
- `BaseSearchService` — Operation/connector search and filtering
- `BaseWorkflowService` — Workflow CRUD, callback URLs, workflow triggers
- `BaseOAuthService` — OAuth consent, confirm login, token management
- `BaseGatewayService` — On-premises data gateway lookup
- `BaseTenantService` — Azure tenant discovery
- `BaseRunService` — Workflow run history, run action details, input/output content

**Integration Services:**
- `BaseApiManagementService` — API Management operations and swaggers
- `BaseFunctionService` — Azure Functions app/function listing
- `BaseAppServiceService` — App Service operations
- `BaseCognitiveServiceService` — Cognitive Services integration

**Designer Feature Services:**
- `BaseChatbotService` — AI chatbot integration
- `BaseCopilotWorkflowEditorService` — Copilot workflow editing (system prompt, tools,
  discover_connectors, workflow mutation proposals)
- `BaseTemplateService` — Template gallery and configuration
- `BaseTemplateResourceService` — Template resource management
- `BaseCloneService` — Clone-to-Standard workflow wizard

**Platform Services:**
- `BaseHostService` — Host-specific configuration
- `BaseExperimentationService` — Feature flag/experiment evaluation
- `BaseUserPreferenceService` — User preference storage
- `BaseResourceService` — Azure resource discovery
- `BaseRoleService` — Azure RBAC role checking
- `BaseCustomCodeService` — Custom code file management

### Environment-Specific Implementations
- `consumption/` — Consumption (multi-tenant) Logic Apps implementations
- `standard/` — Standard (single-tenant) Logic Apps implementations,
  including Foundry agent service
- `common/` — Shared implementation utilities

### Copilot Workflow Editing (designer-client-services/lib/copilot/)
System prompt, tool definitions (e.g., `discover_connectors`), and the service
interface for AI-powered workflow editing. The copilot proposes workflow mutations
that the designer can preview and apply.

### Connector Models (designer-client-services/lib/connector.ts + connections/)
Type definitions for all connector types: managed API, custom, service provider,
API Management, Functions, App Service. Connection reference types for both
Consumption and Standard SKUs.

### Parsers (parsers/)
- Expression parser for Logic Apps expression language
- Expression evaluator for template expression evaluation
- Schema parsers for OpenAPI/Swagger definitions
- Resolution service for dynamic content resolution

### Utilities (utils/)
- HTTP client wrapper with retry, auth, and Azure management headers
- Exception hierarchy (10+ typed exceptions: `ValidationException`,
  `ConnectorConnectionException`, `UserException`, `NotFoundException`, etc.)
- Data model definitions (40+ models for connectors, operations, connections,
  workflows, run history, monitoring)
- Type coercion and validation helpers
- Mock data for testing

### Internationalization (intl/)
- i18n utilities and string extraction support
- `IntlProvider` component

## Dependencies
- No internal dependencies on other libs in this monorepo (foundation layer)

## Common Issue Patterns

### Issues that belong HERE:
- HTTP request failures to Azure APIs (connection service, operation service)
- Connector metadata loading failures
- Expression parsing bugs (template expressions, function evaluation)
- OAuth/authentication flow issues in the designer
- Service interface contract issues (missing methods, incorrect types)
- Swagger/OpenAPI parsing failures for connectors
- Consumption vs Standard behavioral differences in service responses
- Copilot workflow editing tool/prompt issues
- Run history data fetching failures
- Type coercion errors for parameter values
- Connection reference resolution failures

### Issues that are often MISATTRIBUTED here:
- Visual bugs → almost always `designer-ui` or `designer`
- Workflow saving failures → usually `designer` serialization, not the service
- Canvas/layout issues → `designer` or `designer-v2`
- VS Code-specific issues → `vscode-extension` or `apps/vs-code-designer`

### Important boundary note
This library defines service **interfaces** — the actual service **implementations**
for Portal live in the Portal repo (Microsoft_Azure_EMA), not here. If an issue
involves Portal-specific API behavior, the fix may be in the Portal extension, not
in this library.
