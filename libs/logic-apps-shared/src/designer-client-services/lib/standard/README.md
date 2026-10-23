# Standard direct management

`StandardManagementHttpClient` is the shared, tab-local API entry layer for
Standard workflow management. It exposes one named method per in-scope API and
uses the existing experimentation-service gate
`enableStandardDirectManagement`. The default `BaseExperimentationService` returns
false. Existing consumers that do not supply `standardManagement` are unchanged.
Do not enable the gate until ARM admission, runtime deployment, payload parity,
host admission, browser CORS/reachability and capacity have been verified.

## Central API methods

Portal helpers and UX services call these methods with their existing
`HttpRequestOptions`; callers do not check the gate, acquire tokens, select a
profile or construct direct URLs. Each method returns the unchanged transport
response. With the feature off, the original ARM request object is passed to
the host transport unchanged.

| Method | Catalog operation | Profile |
| --- | --- | --- |
| `getCallbackUrl` | `callback.get` | Contributor |
| `validateWorkflow` | `workflow.validate` | Contributor |
| `invokeConnector` | `connector.invoke` | Contributor |
| `cancelRun` | `run.cancel` | Contributor |
| `listMcpServers` | `mcp.list` | Contributor |
| `getRun` | `run.get` | Reader |
| `resubmitTrigger` | `trigger.resubmit` | Contributor |
| `getDraftAgentKeys` | `agent.draftKeys.get` | Contributor |
| `listRuns` | `run.list` (including continuation pages) | Reader |
| `runTrigger` | `trigger.run` | Contributor |
| `getConnectorOperation` | `connector.operation.get` | Reader |
| `listConnectorGroups` | `connector.group.list` | Reader |
| `listOperations` | `operation.list` | Reader |
| `listWorkflows` | `workflow.runtimeList` | Reader |

All fourteen methods share the same cache, acquisition, renewal and failure
policy. They do not create fourteen sessions. A named entry cannot select a
different catalog operation for direct dispatch.

`IHttpClient` compatibility is retained for generic `BaseResourceService`
actions: its GET/POST adapter selects the same named method from the fixed
catalog. It is not a second token implementation or a general runtime proxy.
Standard run, connector, manifest, search and workflow-inventory methods call the
named entry points explicitly. Unrelated service calls keep their original
transport, including hybrid requests and content links.

```typescript
const run = await standardManagement.getRun<Run>({
  uri: `${existingArmManagementBase}/workflows/${workflowName}/runs/${runId}`,
  queryParameters: { 'api-version': existingApiVersion },
});
```

Hosts that do not yet supply the direct-management lifecycle/configuration can
still migrate callers to these named methods without inventing a circuit duration:

```typescript
const standardManagement = StandardManagementHttpClient.createArmOnly(existingArmHttpClient);
```

This explicit mode is permanently ARM-only, requires no direct transport or
backoff, and cannot be enabled by `refreshEnablement()`. Enabling direct access
requires replacing it with a normally configured instance owned by a supported
host lifecycle. Disposal still rejects subsequent work and does not dispose the
host's transport.

## Host integration

Create **one instance per tab/authentication lifecycle**, shared by
`StandardRunService`, `StandardConnectorService`,
`StandardOperationManifestService`, `StandardSearchService` and
`BaseResourceService` through their optional `standardManagement` option:

```typescript
const standardManagement = new StandardManagementHttpClient({
  armClient: existingArmHttpClient,
  directClient: existingDirectHttpClient,
  experimentationService: existingExperimentationService,
  issuerFailureBackoffMs: portalConfiguration.issuerFailureBackoffMs,
});

standardManagement.setContext({
  resourceId: app.id,
  armOrigin: armEndpoint.origin,
  runtimeOrigin: trustedAppDiscoveryEndpoint.origin,
  tenantId: signedInTenantId,
  principalId: signedInPrincipalId,
  authContextKey: authenticationContextRevision,
});

const runService = new StandardRunService({
  ...existingRunServiceOptions,
  standardManagement,
});
const resourceService = new BaseResourceService({
  ...existingResourceServiceOptions,
  standardManagement,
});
```

The context comes from authenticated host state and trusted app discovery, **not**
from a token response or an arbitrary URL. Origins must be absolute HTTPS origins
without a trailing slash. `resourceId` is the full app ARM ID. Nonproduction slots,
hybrid apps and other unsupported resource types remain on ARM.

Keep the instance/context stable across workflow, run, filter and view changes
within the same app. Repeating an identical context does not clear the cache or
release disabled routing. Call `setContext(newContext)` on app, tenant, principal,
environment or authentication-context changes; this discards previous credentials,
pending acquisition and late results. Call `setContext(undefined)` on sign-out or
context discard, and `dispose()` when the owning tab lifecycle ends. Disposal does
not dispose the host-owned transports. Already-dispatched business work cannot be
cancelled through `IHttpClient`; discarded-context results are not reusable.

Call `refreshEnablement()` on an explicit host feature/configuration refresh.
Enablement is read on first work, without new polling. An observed
`503 SessionTokenDisabled` latches ARM routing for this context until an
explicit, positive refresh. A refresh discards cached sessions/pending work.
An unavailable experimentation service fails closed to the existing ARM path.

Both transports use the existing `IHttpClient` interface:

- ARM issuance must retain normal ARM authentication and authorization, honor
  `skipBatch`, and send `undefined` content as **no body**, never `{}` or `null`.
- Direct transport must honor `noAuth: true`, `includeAuth: false`, `skipBatch`,
  and the explicit `Authorization` and `x-functions-key` headers. It must not
  inject an ARM bearer, persist/cache credentials, follow redirects, log request
  credentials or automatically retry mutations. Select an existing host transport
  satisfying these requirements; the client does not introduce a new HTTP stack.
- Errors must retain numeric HTTP status (`status`, `statusCode` or
  `response.status`) and the standard `{error:{code,message,target}}` body
  (`response.data`, `data` or the error itself). Forward `Retry-After` in headers.
  Without a status/code pair the client will **not** infer safe failover/replay.
- `issuerFailureBackoffMs` is required, positive and host-configured. There is no
  arbitrary product retry/circuit default, background timer or polling loop.

## Fixed wire mapping

Both issuance and direct `api-version` are exactly **`2018-11-01`**, mapping to
profile/transport version 1. Legacy ARM business requests retain their original
versions/options when selected. Issuance is bodyless GET
`{appId}/hostruntime/runtime/webhooks/workflow/api/management/tokens/reader` or
bodyless POST `.../getContributorToken`. Neither call executes business work.

The response is exactly `{endpoint, extensionCode, accessToken, expiresOn}`.
The endpoint must equal the trusted runtime origin plus
`/runtime/webhooks/workflow/api/management/v1`, without query, fragment or userinfo.
The 52-character opaque token's expiry prefix must match whole-second UTC
`expiresOn`, which must be in the future. The runtime configures the lifetime;
the client does not impose a second five-minute limit. Invalid or
already-expired issuance is terminal until context/enablement refresh; no guessed
lifetime or acquisition loop is used.

| Profile | Exact operations |
| --- | --- |
| Reader (6) | `run.get`, `run.list`, `connector.operation.get`, `connector.group.list`, `operation.list`, `workflow.runtimeList` |
| Contributor (14) | All Reader operations plus `callback.get`, `workflow.validate`, `connector.invoke`, `run.cancel`, `mcp.list`, `trigger.resubmit`, `agent.draftKeys.get`, `trigger.run` |

The checked-in catalog admits only those exact method/path patterns. It does not
grant arbitrary VFS, RP workflow GET, repetition/content/history routes or generic
runtime proxying. Supported additional queries are `$expand` on run/operation GET,
`$filter`/`$top`/`$skiptoken` on run list, and `workflowKind` on operations list.
Unknown/duplicate legacy query parameters retain the ARM path; direct paging
queries must satisfy the fixed contract. Existing bodies and business headers are
passed through, except authentication/host/cookie headers are replaced or removed.
The response shape is unchanged; direct `nextLink` must stay on the same collection
under the trusted endpoint with the exact version and no credential parameters.
Content/callback links do not gain session authority.

## Renewal and failures

Credentials live only in this instance's memory. Acquisitions coalesce per
context/class. A valid Contributor satisfies reads; Reader never authorizes an
action. At expiry minus 60 seconds, arriving work dispatches with a still-valid
session while one renewal runs in parallel. Idle time causes no renewal. Session
expiry gates dispatch, not completion.

- An issuer `500 SessionTokenPersistenceFailed`,
  `503 RuntimeUnavailable`/`AuthorizationUnavailable`, or upstream
  502/504, may select the original ARM business request **before** direct
  dispatch. The configured circuit suppresses issuer probes. A still-valid token
  remains preferred after transient renewal failure.
- Only exact direct **503 `SessionTokenDisabled`** permits one ARM fallback
  after a direct attempt; runtime guarantees that response precedes dispatch.
- Only exact **401 `SessionTokenExpired`** permits one coalesced renewal and
  one direct retry. A failed renewal does not convert that recovery to ARM.
- Issuer/direct 403, 429, generic direct errors, storage **503
  `RuntimeUnavailable`**, host 401 and ambiguous outcomes never trigger ARM
  fallback or mutation replay. A future, valid `Retry-After` suppresses subsequent
  work without timers. Issuer 429 without a usable retry deadline, other terminal
  issuance failures and invalid envelopes require explicit context/enablement
  refresh. Definitive renewal denial prevents future dispatch with the old token.
- Errors expose safe code/status/Retry-After diagnostics, not request
  configuration, token responses or transport error messages containing secrets.

## Verification boundary

`__tests__/management.spec.ts` exercises the actual Standard run, search,
manifest, connector and resource services against substituted `IHttpClient`
dependencies. It covers all 14 catalog routes, profile acquisition/reuse,
context isolation, renewal and consequential failover/replay failures. Named-entry
tests cover each API's required profile, unchanged request-object forwarding with
the gate off, permanently ARM-only hosts, cross-method session reuse and
wrong-catalog-method rejection. Service/adapter spies verify that real callers
reach the named methods rather than a parallel token path. Existing
service tests cover unchanged legacy request/response behavior. These are client
tests, not deployed ARM/runtime, payload-authorization, CORS or capacity evidence.
The gate remains off by default; the consuming Portal host must supply the above
lifecycle, trusted discovery, compatible transports and configured backoff.

## Application wiring status

**The production Azure Portal application is not integrated by these shared-library
changes.** Portal wiring is explicitly deferred until its authenticated lifecycle
and shared-owner contract are resolved. Supplying optional service parameters or
passing Standalone tests is not evidence of production Portal integration.

`scripts\portal-local.js` resolves the Portal application from a separate
`--portal-root`/`LOGIC_APPS_PORTAL_ROOT` checkout, under
`src\Extension\Client\React`. Its package installation/build helper is not the
Portal host source or its flag/authentication provider.

The Azure-connected **Standalone** constructors are
`apps\Standalone\src\designer\app\AzureLogicAppsDesigner\laDesigner.tsx`
and its sibling `laDesignerV2.tsx`. Both now inject one lifecycle-scoped client
into the relevant shared services and helper calls. Their default
`Services\StandardManagement.ts` owner uses `createArmOnly`, not a guessed
operational duration or synthetic authentication identity.

Each designer accepts optional `managementHost` configuration with a compliant
`directClient`, positive configured `issuerFailureBackoffMs`, experimentation
provider, trusted `tenantId`/`principalId` and `authContextKey`. The embedding host
must change that key on account/authority/context changes and clear it on sign-out.
App ID and runtime hostname come from ARM app discovery, not the token response.
The hook clears context synchronously on changes and teardown, then disposes
retired owners after StrictMode's synchronous effect replay; cached identity hooks decoding
the mutable development ARM token are deliberately not used to establish session
identity. Without this host contract, direct routing remains disabled.

The ARM transport uses a separate existing Axios instance without the legacy
global retry policy and retains status-bearing structured failures. Direct
transport remains host-owned and must satisfy the requirements above. Callback
and run-query cache keys include client identity to avoid reuse across configured
authentication-context changes.

Paths in this inventory are relative to this repository.

| Catalog operation | Centralized application/library entry point |
| --- | --- |
| `callback.get` | Standalone `Services\WorkflowAndArtifacts.tsx:listCallbackUrl` delegates to `getCallbackUrl`. |
| `workflow.validate` | Standalone `validateWorkflowStandard`, including save and code-view validation, delegates to `validateWorkflow`. |
| `connector.invoke` | Shared `standard\connector.ts` dynamic values/schema calls delegate to `invokeConnector`. |
| `run.cancel` | Shared `standard\run.ts:cancelRun` delegates to `cancelRun`. |
| `mcp.list` | Generic `BaseResourceService` actions select `listMcpServers`; Standalone MCP helpers use it directly. |
| `run.get` | Shared run service and Standalone `getRunInstanceStandard` delegate to `getRun`. |
| `trigger.resubmit` | Shared trigger-history resubmit delegates to `resubmitTrigger`. The separate `/runs/{runId}/resubmit` API remains on ARM. |
| `agent.draftKeys.get` | Standalone draft-mode `fetchA2AAuthKey` delegates to `getDraftAgentKeys`. Published `listApiKeys` is unchanged. |
| `run.list` | Shared run history and continuation pages delegate to `listRuns`. |
| `trigger.run` | Shared run service delegates management trigger POSTs to `runTrigger`. Signed callback URLs and draft-run APIs are not rewritten into catalog operations. |
| `connector.operation.get` | Shared manifest/operation metadata delegates to `getConnectorOperation`. |
| `connector.group.list` | Shared connector search delegates to `listConnectorGroups`. |
| `operation.list` | Shared operation search delegates to `listOperations`. |
| `workflow.runtimeList` | Shared app workflow inventory delegates to `listWorkflows`. |

Focused Azure-connected helper tests use the real shared session client and mock
only HTTP dependencies. They verify default ARM routing, actual helper payloads,
Contributor reuse, excluded Consumption/published-key calls, authentication-context
changes and teardown cancellation. Run from the repository root:

```powershell
pnpm exec vitest run --config apps\Standalone\src\designer\app\AzureLogicAppsDesigner\__test__\vitest.config.ts
```

This is not deployed authentication, host admission, browser CORS or capacity
evidence, and the production Portal checkout remains unchanged.

## Standalone offline host

The existing Standalone app now has an explicit `/standard-management` route,
lazy-loaded by `apps\Standalone\src\App.tsx`. It renders
`designer\app\LocalDesigner\StandardManagementTestHost.tsx`, not either of the
Azure-connected designer shells. Direct selection starts **disabled** and can
only be enabled through the page's **Enable synthetic direct management** control.
That control refreshes the existing library experimentation-service gate
`enableStandardDirectManagement`; it does not enable any production host.

`standardManagementHost.ts:SyntheticStandardManagementHost` composes real
`StandardRunService`, `StandardConnectorService`,
`StandardOperationManifestService`, `StandardSearchService` and
`BaseResourceService` instances with one shared `StandardManagementHttpClient`.
It retains that client across its synthetic app, tenant, account and authority
selectors, calls `setContext` on identity changes, clears context on sign-out,
and calls `dispose` on route teardown. Context and discovery come from fixed
synthetic fixtures, never the issuer response hostname.

Its HTTP dependencies extend the existing local `HttpClient` fixture through
`IHttpClient`; they have no network fallback or real ARM-token dependency. All
origins end in reserved `.invalid` domains. Tokens, the explicit 10-second fixture
circuit, errors and business payloads are synthetic test data, not production
configuration or authorization evidence. There are no storage writes or timers.
Only channel, method and path appear in the on-page transport trace; token/code,
authorization headers and body/response credentials are not recorded.

The fourteen operation buttons dispatch actual library APIs:

- Callback, validate, MCP and draft-key buttons call `BaseResourceService.executeResourceAction`.
- Dynamic invocation calls `StandardConnectorService.getListDynamicValues`.
- Cancel, run GET/list, history resubmit and trigger run call the corresponding
  `StandardRunService` methods.
- Connector metadata calls `StandardOperationManifestService.getOperation`.
- Group and operation inventory call `StandardSearchService` methods.
- Workflow inventory calls `BaseResourceService.listWorkflowsInApp`.

`LocalDesigner\__test__\standardManagementHost.spec.tsx` uses existing Vitest and
React Testing Library to operate the page, exercising all fourteen buttons,
cross-service session reuse, default-off routing, context changes, concurrent
issuance/sign-out, teardown, safe fallback/error outcomes and unsafe endpoints.
Additional tests advance Vitest's existing fake timers while invoking the same
host/service APIs for operation-driven renewal, transient renewal failure and
no-idle-timer assertions. No clock or test hook was added to the product client.
The cancel/history-resubmit integration also ensures session-client exceptions
reject instead of being returned as successful `Error` values by the older service.
Legacy error-return behavior without a session-client exception is unchanged.

Run the existing host tests from `apps\Standalone`:

```powershell
pnpm exec vitest run --config vite.config.ts src\designer\app\LocalDesigner\__test__\standardManagementHost.spec.tsx
```

This is automated **offline host/service integration**, not deployed HTTP, browser
CORS or production Portal-shell evidence. The separate Portal shell still needs
its actual flag provider, trusted app discovery, account/authority subscriptions,
compatible non-replaying HTTP transports and measured/configured operational
settings. The Azure-connected Standalone wiring is described separately above
and remains ARM-only without explicit host configuration.
