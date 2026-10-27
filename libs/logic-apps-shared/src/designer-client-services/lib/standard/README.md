# Standard direct management

The ARM-protected Reader and Contributor issuers return exactly
`{ endpoint, apiKey, expiresOn }`. The endpoint is the trusted app origin plus
`/api/v1`. Direct requests send only `X-API-Key: <apiKey>`, not an ARM bearer
credential or `x-functions-key`. The runtime verifies all management claims
and the app-specific signature; clients treat the credential as opaque.
The former `{ extensionCode, accessToken }` response is not supported.

`StandardManagementHttpClient` is the shared, tab-local API entry layer for
Standard workflow management. It exposes one named method per in-scope API and
uses the existing experimentation-service gate
`enableStandardDirectManagement`. The default `BaseExperimentationService` returns
false. Existing consumers that do not supply `standardManagement` are unchanged.
Do not enable the gate until ARM admission, runtime deployment, payload parity,
host admission, browser CORS/reachability and capacity have been verified.

## Central API methods

Portal helpers and UX services call these methods with their existing
`HttpRequestOptions`. Every caller checks `await standardManagement.isEnabled()`
before invoking a named method. If false (or no management client is supplied),
it executes its original implementation directly, retaining its transport,
retries, headers, response validation and error contract. Callers do not acquire
tokens, select a profile or construct direct URLs.
Named methods also accept an optional second `legacyRequest` callback
for callers that previously used a different transport or response validation:

```typescript
const legacyRequest = async () => {
  const response = await existingAxios.post(request.uri, request.content, existingOptions);
  if (response.status !== 200) {
    throw response;
  }
};
if (standardManagement && await standardManagement.isEnabled()) {
  await standardManagement.validateWorkflow(request, legacyRequest);
} else {
  await legacyRequest();
}
```

The callback is used whenever the original request is selected: disabled,
unsupported context, outside the catalog, token acquisition failure, or confirmed
pre-dispatch direct rejection permitting fallback. It is never used for issuance.
Its response and rejection are returned without normalization.

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

The management facade does **not** implement `IHttpClient` and has no generic
GET/POST/PUT/PATCH/DELETE methods or URL-to-operation adapter.
Generic `BaseResourceService.executeHttpCall` and `executeResourceAction`
always retain their original HTTP transport, even for URLs in the management
catalog. Workflow-specific callers must explicitly select a named operation.
Standard run, connector, manifest, search and workflow-inventory methods perform
their own feature selection. Hybrid requests and content links retain their
original transport.

The designer's existing MCP resource action remains a generic ARM request.
`IResourceService` has no MCP-specific extension. Standalone's separate MCP helper
explicitly selects the named management operation when enabled.

```typescript
const request = {
  uri: `${existingArmManagementBase}/workflows/${workflowName}/runs/${runId}`,
  queryParameters: { 'api-version': existingApiVersion },
};
const run = standardManagement && await standardManagement.isEnabled()
  ? await standardManagement.getRun<Run>(request)
  : await existingArmHttpClient.get<Run>(request);
```

Hosts that do not yet supply the direct-management lifecycle/configuration can
retain a permanently disabled owner without inventing a circuit duration:

```typescript
const standardManagement = StandardManagementHttpClient.createArmOnly(existingArmHttpClient);
```

This explicit mode always returns false from `isEnabled()`, requires no direct transport or
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
  directManagementArmClient: isolatedStatusPreservingArmHttpClient,
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
`503 DirectAccessDisabled` latches ARM routing for this context until an
explicit, positive refresh. A refresh discards cached sessions/pending work.
An unavailable experimentation service fails closed to the existing ARM path.

Both transports use the existing `IHttpClient` interface:

- `armClient` remains the original business transport. Do not replace it to
  implement token issuance: disabled and unrelated requests must retain legacy
  behavior. When issuance requires different retry/error handling, provide
  `directManagementArmClient`; it is used only for issuance. Without it, issuance
  also uses `armClient`. Every fallback uses `armClient` or the caller's original
  `legacyRequest`, never the isolated issuance transport.
- ARM issuance must retain normal ARM authentication and authorization, honor
  `skipBatch`, and send `undefined` content as **no body**, never `{}` or `null`.
- Direct transport must honor `noAuth: true`, `includeAuth: false`, `skipBatch`,
  and the explicit `X-API-Key` header. It must not
  inject an ARM bearer, persist/cache credentials, follow redirects, log request
  credentials or automatically retry mutations. Select an existing host transport
  satisfying these requirements; the client does not introduce a new HTTP stack.
- Issuance and direct errors must retain numeric HTTP status (`status`, `statusCode` or
  `response.status`) and the standard `{error:{code,message,target}}` body
  (`response.data`, `data` or the error itself). Forward `Retry-After` in headers.
  Header names are matched case-insensitively in `response.headers` and top-level
  `headers`; an explicit `retryAfter` value is also supported.
  An issuance failure always selects the original request. Without a direct
  status/code pair the client will **not** infer safe failover/replay.
- `issuerFailureBackoffMs` is required, positive and host-configured. There is no
  arbitrary product retry/circuit default, background timer or polling loop.

## Fixed wire mapping

Both issuance and direct `api-version` are exactly **`2018-11-01`**, mapping to
profile/transport version 1. Legacy ARM business requests retain their original
versions/options when selected. Issuance is bodyless GET
`{appId}/hostruntime/runtime/webhooks/workflow/api/management/tokens/reader` or
bodyless POST `.../getContributorToken`. Neither call executes business work.

The response is exactly `{endpoint, apiKey, expiresOn}`.
The endpoint must equal the trusted runtime origin plus
`/api/v1`, without query, fragment or userinfo.
The signed credential uses Base64URL transport encoding (1 to 16,384 characters,
matching the runtime's size limit). The client does not decode its claims or
infer role or expiry from it. Caller-supplied `X-API-Key`, bearer and extension-key
headers are removed case-insensitively before the issued API key is attached.
Whole-second UTC `expiresOn`
must be in the future. The runtime configures the lifetime;
the client does not impose a second five-minute limit. Invalid or
already-expired issuance selects the original ARM request and suppresses another
issuer attempt for the configured backoff; no guessed lifetime or acquisition
loop is used.

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

## Backend configuration

The target backend must deploy the issuer/direct routes and ARM admission and
enable `Microsoft.Azure.Workflows.EdgeDirectAccess.Enabled` (default `false`).
Admission is CPU-only: `Microsoft.Azure.Workflows.EdgeDirectAccess.CpuUtilizationThreshold`
accepts 1 through 100 percent and defaults to 80. At or above the threshold,
issuance and direct requests return 429 `DirectAccessRequestThrottled` with
`Retry-After: 1`. This default is not a measured capacity recommendation;
the earlier rate/concurrency settings are no longer used.
`Microsoft.Azure.Workflows.EdgeDirectAccess.SessionLifetime` is a positive,
whole-second `TimeSpan`, defaulting to five minutes. Changes affect newly issued
sessions only, and the client uses the returned expiry without imposing another
five-minute limit. The target must be
a supported production slot, not storage-hosted edge, codeful or SQL-backed.

## Renewal and failures

Credentials live only in this instance's memory. Acquisitions coalesce per
context/class. A valid Contributor satisfies reads; Reader never authorizes an
action. At expiry minus 60 seconds, arriving work dispatches with a still-valid
session while one renewal runs in parallel. Idle time causes no renewal. Session
expiry gates dispatch, not completion.

- Every Reader or Contributor acquisition failure selects the original ARM
  business request when no usable session is available: HTTP errors including
  401/403/404/429 and all 5xx, network errors, invalid envelopes and expired
  tokens. Issuance never executes business work, so this does not replay an
  operation. The original ARM endpoint still enforces its own authorization.
- Network, 5xx and invalid-response failures suppress issuer attempts for
  `issuerFailureBackoffMs`. Issuer 429 honors a usable `Retry-After`; other 4xx
  failures and a 429 without a usable deadline remain cached until explicit
  context/enablement refresh. Requests use the original ARM path during either
  suppression period. A still-valid token remains preferred after transient
  renewal failure; definitive renewal denial prevents future use of that token.
- Availability uses `DirectAccessDisabled` for both issuer 404 and direct 503.
  Exact direct **503 `DirectAccessDisabled`** permits one ARM fallback after a
  direct attempt; runtime guarantees that response precedes dispatch.
- Only exact **401 `SessionTokenExpired`** permits one coalesced renewal and
  one direct retry. If that acquisition fails, run the original ARM request:
  the expired-token rejection also guarantees no business dispatch occurred.
- Other direct failures, including 403, 429, generic 401, 500/503, network
  errors and ambiguous outcomes, never trigger fallback or mutation replay.
  A direct 429 with valid `Retry-After` suppresses subsequent work without timers.
- Acquisition failures log only safe class/status/code diagnostics, never
  request configuration, token responses or credential-bearing transport messages.
  Direct success responses and transport errors are preserved unchanged, including
  business error codes, messages, details and response bodies. The Standalone
  transport retains JSON or text error bodies and exposes the backend error
  message without attaching request credentials. Callers use
  `isStandardManagementError` to propagate direct errors without wrapping them or
  changing legacy ARM error handling. A suppressed direct 429 rethrows the same
  original error. Original ARM fallback responses and errors retain the original
  transport and caller contracts.
- Context discard, sign-out and disposal still reject stale work; they do not
  dispatch fallback requests under a discarded identity.

## Verification boundary

`__tests__/management.spec.ts` exercises the actual Standard run, search,
manifest, connector and resource services against substituted `IHttpClient`
dependencies. It covers all 14 catalog routes, profile acquisition/reuse,
context isolation, renewal and consequential failover/replay failures. Named-entry
tests cover each API's required profile, unchanged request-object forwarding with
the gate off, permanently ARM-only hosts, cross-method session reuse and
wrong-catalog-method rejection. Service spies verify that enabled callers
reach the named methods and disabled callers bypass them entirely. Generic
resource-service tests verify that matching catalog URLs are never intercepted. Existing
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
into the relevant shared services and helper calls. The existing designer shells
at `/` and `/v2` supply live-backend configuration from the programmatic
`hostOptions.enableStandardDirectManagement` flag and
`hostOptions.standardManagementIssuerFailureBackoffMs` setting. The flag is off
by default. This feature adds no controls, banners, loading screens, routes or
changes to existing alert text. Local fixtures, Consumption and hybrid apps keep
their existing routes. Unconfigured consumers still use `createArmOnly`.
The shell owns one client per selected app/authentication context and shares it
with the editor and the existing run-instance selector. While trusted ARM runtime
discovery is pending or unavailable, requests use the original ARM route without
blocking the existing designer or run selector. Once discovery completes, run
enumeration uses the same Reader session as editor reads. The selector's separate ARM `/sites/{app}/workflows`
inventory is not the catalog's runtime inventory API and remains unchanged.

Each designer accepts optional `managementHost` configuration with a compliant
`directClient`, positive configured `issuerFailureBackoffMs`, experimentation
provider, trusted `tenantId`/`principalId` and `authContextKey`. The embedding host
must change that key on account/authority/context changes and clear it on sign-out.
App ID and runtime hostname come from ARM app discovery, not the token response.
The local host derives identity from the ARM credential loaded by the existing
development authentication flow. It subscribes to token publication, replacement,
removal and expiry; it retires pending issuance synchronously before React updates
the account context. Token renewal conservatively starts a new management context.
Only nonsecret identity/revision metadata enters React state; the session token
and extension code are never persisted. The hook also clears context on teardown
and disposes retired owners after StrictMode's synchronous effect replay. It does
not use the indefinitely cached tenant/account queries as its authentication source.
Missing/invalid authentication, failed runtime discovery or a nonpositive retry
delay produces a credential-free warning and leaves original ARM routing available.
Management identity and experimentation configuration apply only to the management
client; the designer's existing identity and general experimentation services are
unchanged.

Token issuance uses a separate Axios instance without the legacy global retry
policy and retains status-bearing structured failures.
Disabled, fallback and unrelated service calls keep the original `HttpClient`; helpers and
the run selector execute their original Axios requests, including authentication,
payloads, exact validation-status checks and raw errors. The Standalone
direct transport uses browser Fetch with redirects rejected, cookies omitted,
HTTP caching disabled and no automatic retries. It retains the explicit session
and host-admission headers without injecting an ARM bearer. HTTP failures retain
their status and `Retry-After` even when the error body is not JSON or cannot be
read; malformed JSON on a successful response still rejects. Callback
and run-query cache keys include client identity to avoid reuse across configured
authentication-context changes.

### Testing the existing designer against a real backend

1. Start the existing app from the repository root:

   ```powershell
   pnpm --filter standalone dev
   ```

2. Open `https://localhost:4200/` or `/v2`. In **Logic App Source**, select
   Azure and Standard, then select your real app/workflow. Use the existing
   development Azure authentication flow.
3. Configure the existing Redux host options programmatically using `setHostOptions`:
   set `enableStandardDirectManagement` to `true` and provide a positive
   `standardManagementIssuerFailureBackoffMs`. No new settings UI is added.
   The initial 10-second retry delay is local configuration, not a production
   operational recommendation. With the flag off, traffic follows the original ARM route.
4. Start with read-only run history or run details. Verify one ARM Reader issuer
   request, then runtime `/api/v1/...` traffic and cached-credential reuse.
   A Contributor operation may acquire a Contributor session that also serves reads.
   Set the flag to `false` and verify the same designer uses ARM again.
5. To reset a latched issuer failure or disabled state after correcting backend
   configuration, change the flag to `false` and then `true`. Do not log, export or attach tokens,
   authorization headers, extension codes or signed callback URLs.

Allow the localhost origin and required headers in runtime CORS, and ensure the
browser can reach the runtime. This flag does not enable backend configuration.
Successful UI behavior alone is not direct-routing evidence: any issuer
failure can select ARM fallback. Saves, cancellations and trigger actions operate
on the actual app, so use an appropriate test resource.

Token acquisition failures use original ARM validation before saving; they never
skip validation or treat an issuer 404 as a missing validation route.
Direct business-validation failures still reject saves, except the compatibility
exception for a business validation 404 when `throwError` is not requested.
Disabled and fallback validation preserve original save behavior: a legacy 404
permits deployment even with `throwError`, and other legacy validation failures
stop the save without deployment. Fallback failures also preserve the original
cancellation/resubmission error-return behavior rather than normalizing errors.

Paths in this inventory are relative to this repository.

| Catalog operation | Centralized application/library entry point |
| --- | --- |
| `callback.get` | Standalone `Services\WorkflowAndArtifacts.tsx:listCallbackUrl` delegates to `getCallbackUrl`. |
| `workflow.validate` | Standalone `validateWorkflowStandard`, including save and code-view validation, delegates to `validateWorkflow`. |
| `connector.invoke` | Shared `standard\connector.ts` dynamic values/schema calls delegate to `invokeConnector`. |
| `run.cancel` | Shared `standard\run.ts:cancelRun` delegates to `cancelRun`. |
| `mcp.list` | Standalone MCP helpers explicitly select `listMcpServers`. Generic resource actions remain on their original transport. |
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

## Headless offline integration tests

`LocalDesigner\__test__\standardManagementHost.ts:SyntheticStandardManagementHost`
is test-only code. It adds no page, route or operation buttons to the application.
It composes real
`StandardRunService`, `StandardConnectorService`,
`StandardOperationManifestService`, `StandardSearchService` and
`BaseResourceService` instances with one shared `StandardManagementHttpClient`.
It retains that client across synthetic app, tenant, account and authority
changes, calls `setContext` on identity changes, clears context on sign-out,
and calls `dispose` on teardown. Context and discovery come from fixed
synthetic fixtures, never the issuer response hostname.

Its HTTP dependencies extend the existing local `HttpClient` fixture through
`IHttpClient`; they have no network fallback or real ARM-token dependency. All
origins end in reserved `.invalid` domains. Tokens, the explicit 10-second fixture
circuit, errors and business payloads are synthetic test data, not production
configuration or authorization evidence. There are no storage writes or timers.
Only channel, method and path appear in test transport events; token/code,
authorization headers and body/response credentials are not recorded.

The fourteen test operations dispatch actual library APIs:

- Callback, validate, MCP and draft-key tests call `BaseResourceService.executeResourceAction`.
- Dynamic invocation calls `StandardConnectorService.getListDynamicValues`.
- Cancel, run GET/list, history resubmit and trigger run call the corresponding
  `StandardRunService` methods.
- Connector metadata calls `StandardOperationManifestService.getOperation`.
- Group and operation inventory call `StandardSearchService` methods.
- Workflow inventory calls `BaseResourceService.listWorkflowsInApp`.

`LocalDesigner\__test__\standardManagementHost.spec.tsx` uses existing Vitest for
headless service calls, exercising all fourteen operations,
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
