# Chat Connector Action Learnings (All Connector Types)

## Scope

This note captures implementation and debugging learnings for chat-generated connector actions in the VS Code designer extension, covering managed API connectors (ApiConnection), built-in connectors (ServiceProvider), and the resolution/ranking pipeline.

## Connector Types

### Managed API Connectors (Shared tab)
- Action type: `ApiConnection`
- Connection section in `connections.json`: `managedApiConnections`
- Operation discovery: ARM endpoint (`management.azure.com/.../managedApis/{name}`)
- Shape: `inputs.host.connection.referenceName` + `method` + `path`
- Examples: SQL (shared), SharePoint, Office 365, Weather

### Built-in Connectors (Built-in tab)
- Action type: `ServiceProvider`
- Connection section in `connections.json`: `serviceProviderConnections`
- Operation discovery: Local design-time runtime (`localhost:{port}/.../operationGroups/{name}/operations`)
- Shape: `inputs.serviceProviderConfiguration.connectionName` + `operationId` + `serviceProviderId`
- Examples: Service Bus (built-in), Azure Blob, Cosmos DB, Azure OpenAI

## Symptoms Observed

- Chat could add actions successfully, but the designer showed **"Unable to initialize operation details"** for ApiConnection actions.
- Generated paths were sometimes plausible but not canonical for the connector operation expected by designer hydration.
- Chat responses could include a clickable `connections.json` link that pointed to a non-resolvable local path.
- Connectors not already in `connections.json` were blocked even though their swagger/operations were accessible.
- The `{connectionId}` prefix in exported swagger paths caused path mismatches during designer hydration.
- Hardcoded workflow name/type (`Workflow1`/`stateful`) in project creation tool ignored user intent.

## Root Causes

1. **Operation selection ambiguity**
   - Naive ranking was too weak when connectors had similar operations (list vs single-item, send vs receive vs peek).

2. **Non-canonical method/path acceptance**
   - Model-generated method/path could bypass swagger canonicalization.
   - Designer hydration relies on connector + operation metadata consistency.

3. **Response link fabrication**
   - Model text could fabricate local clickable links for files.

4. **`connections.json` gating**
   - Only connectors already present in `connections.json` were supported. New connectors (SharePoint, Office 365, etc.) were rejected even when ARM metadata was accessible.

5. **`{connectionId}` prefix in swagger paths**
   - Exported swagger paths include `/{connectionId}/...` but designer strips this prefix during operation-id matching. Our generated paths kept it, causing "Operation Id cannot be determined" errors.

6. **No built-in (ServiceProvider) connector support**
   - Chat only generated `ApiConnection` shapes. Built-in connectors like Azure Blob, Service Bus (built-in), Cosmos DB require `ServiceProvider` type with `serviceProviderConfiguration`.

7. **Overly strict canonical resolution gate**
   - When swagger/ARM resolution failed, the tool blocked action creation even when the LLM provided explicit method+path+operationId that would have worked.

8. **Project tool hardcoded defaults**
   - `projectTools.ts` hardcoded `Workflow1` and `stateful` for every new project, ignoring user-specified workflow name and type.

## Fixes Applied

### 1) Stronger operation ranking
- Weighted scoring: exact/partial operationId, action-token relevance, method intent, connector-specific intent (SQL single/list, Service Bus send/receive/peek).
- Pre-filter by method/path hints before final scoring.

### 2) Canonicalization via swagger
- ApiConnection resolution always attempts swagger canonicalization when connector metadata is available.
- `{connectionId}` prefix stripped from swagger paths via `normalizeManagedConnectorPath()`.

### 3) Offline canonical fallback (SQL/Service Bus)
- When swagger/ARM is unavailable, generates designer-compatible encoded paths for SQL and Service Bus using `resolveOfflineManagedConnectorOperation()`.

### 4) Support for connectors not in connections.json
- Derives ARM connector ID from existing connection's `api.id` base path.
- Constructs full ARM resource path for unknown connectors: `extractManagedApiBasePath()` + `constructManagedApiConnectorId()`.
- Auto-adds placeholder `managedApiConnections` entry with `api.id` set and empty `connection.id`.

### 5) Built-in ServiceProvider connector support
- Queries local design-time runtime for built-in connector discovery: `listBuiltInConnectors()`, `listBuiltInConnectorOperations()`.
- Matches connector hint to built-in connectors via `matchBuiltInConnector()`.
- Generates `ServiceProvider` action shape via `buildServiceProviderAction()`.
- Auto-adds placeholder `serviceProviderConnections` entry.
- AddActionTool tries built-in path first, then managed API path.

### 6) Relaxed strict gate with explicit-hints bypass
- When swagger resolution fails but LLM provides explicit method+path, the action is allowed through instead of being blocked.
- Only blocks when no method/path can be determined at all.

### 7) Chat response guardrails
- Prompt guardrails prevent fabricated local markdown links.

### 8) Project tool workflow name/type from user
- `projectTools.ts` now requires `workflowName` and `workflowType` from tool input.
- Schema updated to include and require these fields.
- Validation and clarification messages when missing.

Primary code files:
- `apps/vs-code-designer/src/app/chat/tools/workflowTools.ts`
- `apps/vs-code-designer/src/app/chat/tools/projectTools.ts`
- `apps/vs-code-designer/src/app/chat/logicAppsChatParticipant.ts`
- `apps/vs-code-designer/src/package.json`

## Test Coverage

File: `apps/vs-code-designer/src/app/chat/__test__/workflowTools.test.ts`
- SQL list vs single-item ranking
- Service Bus send vs receive vs peek disambiguation
- Swagger candidate ranking with and without explicit hints
- `{connectionId}` path normalization
- Offline SQL fallback (canonical encoded paths)
- Offline SQL plain path normalization
- `buildServiceProviderAction` shape (3 cases)

File: `apps/vs-code-designer/src/app/chat/__test__/projectTools.test.ts`
- Workflow name validation (`isValidWorkflowName`)

File: `apps/vs-code-designer/src/app/chat/__test__/chatParticipant.test.ts`
- Full chat participant routing (176+ tests)

Total: **243 tests passing, 0 failures**.

## Build Error Fixes (non-chat)

Fixed 7 pre-existing TypeScript compile errors in:
- `enableDevContainer.ts`: telemetry result union type
- `startStreamingLogs.ts`: AppInsights client type annotation
- `assets.ts`: icon path URI types
- `test-setup.ts`: IActionContext mock shape

## Repair Runbook for Existing Broken Actions

If actions were generated before these fixes, they may remain non-canonical in `workflow.json`.

1. Restart Extension Development Host to load latest code.
2. Delete the broken action from `workflow.json` (or re-add with the same name to overwrite).
3. Re-run the add-action prompt. The new pipeline will:
   - Try built-in ServiceProvider first
   - Then try managed ApiConnection with swagger canonicalization
   - Then try offline fallback
   - Then allow explicit LLM-provided method/path as last resort
4. Re-open in designer and verify operation details initialize.

## Verification Checklist

- No "Unable to initialize operation details" on new nodes
- ApiConnection: `inputs.host.connection.referenceName` resolves to valid `managedApiConnections` entry
- ServiceProvider: `inputs.serviceProviderConfiguration.connectionName` resolves to valid `serviceProviderConnections` entry
- `connections.json` has correct `api.id` or `serviceProvider.id` for each connector
- No `{connectionId}` in generated action paths
- Unit tests pass (243/243)
- `tsc --noEmit` passes

## Architecture: Action Resolution Flow

```
AddActionTool.invoke()
  ├── isTriggerType? → buildTriggerDefinition()
  ├── connectorHint provided?
  │     ├── resolveBuiltInServiceProviderAction()     ← Built-in tab
  │     │     ├── listBuiltInConnectors() via local runtime
  │     │     ├── matchBuiltInConnector()
  │     │     ├── listBuiltInConnectorOperations()
  │     │     ├── buildServiceProviderAction()
  │     │     └── addPlaceholderServiceProviderConnection()
  │     └── (fall through if no built-in match)
  ├── resolveGenericApiConnectionAction()              ← Shared/Managed tab
  │     ├── resolve reference from connections.json
  │     ├── OR construct ARM connector ID from basePath
  │     ├── resolveManagedApiOperationFromSwagger()    ← ARM swagger
  │     ├── resolveOfflineManagedConnectorOperation()  ← SQL/SB fallback
  │     ├── allow explicit method+path if swagger fails
  │     ├── buildManagedApiConnectionAction()
  │     └── addPlaceholderManagedApiConnection()
  ├── shouldAutoUseWeatherConnector()                  ← Legacy weather path
  └── buildActionDefinition()                          ← Generic fallback
```

## Follow-up Guidance

- For new connectors: the tool auto-discovers and auto-creates placeholder connections. User completes auth in designer.
- Prefer built-in connectors when available (they don't need ARM/Azure sign-in).
- Do not emit fabricated clickable local file links in chat responses.
- When adding support for more offline fallback connectors, add to `resolveOfflineManagedConnectorOperation()`.
- Keep the explicit-hints bypass as a safety valve — it lets the LLM self-correct when metadata services are down.
