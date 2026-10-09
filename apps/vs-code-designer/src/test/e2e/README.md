# VS Code Extension E2E Tests (CLI-based)

This directory contains extension-host smoke tests for the Logic Apps VS Code extension using the official `@vscode/test-cli` framework.

## Overview

**Before authoring or changing a test, read the canonical
[established-contracts guide](../../../../../docs/testing/vscode-cli-authoring.md).**
It records shared prompt policy, actual V2/CodeMirror controls, configuration
snapshots, navigation, cancellation and evidence boundaries. Reuse the named
helpers and regression controls before introducing another local workaround.

These tests follow the pattern from [helloworld-test-cli-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample) and run directly inside VS Code's extension host environment on latest stable VS Code. They intentionally start from an empty VS Code window with no folder or `.code-workspace` loaded, then cover activation, command registration, Create Workspace, focused generated-workspace designer/runtime lifecycle, bundle-to-NuGet debug/run lifecycle, and codeful modern-vs-legacy debug task behavior. Keep ExTester webview DOM scenarios in `src/test/ui/` for deeper designer and wizard UI coverage.

## Canonical MSN finalization limitation

The MSN direct and batch selectors currently fail closed after recording body
results because original-process closure has not been established. Generated
workspace and dependency roots are retained; passing scenario assertions never
override `complete: false` / `cleanupVerified: false`.
Read the canonical guide's **Canonical MSN cleanup** boundary before interpreting
these results or changing cleanup. Its read-only Windows lock instrumentation
and exact-source ADO diagnostic procedure are not an ownership/termination API.
Run `test:e2e-cli:msn-reporting-unit` after strict CLI compilation for the
production-orchestrator/finalization controls. Native validation remains on
isolated source-bound consumers, not concurrent local worktrees.

## Test Structure

```
src/test/e2e/
├── extension.test.ts       # Basic extension activation tests
├── commands.test.ts        # Command registration and execution tests
├── createWorkspace.test.ts # Latest-VS Code Create Workspace webview behavior, matrix, and artifact checks
├── workspaceLifecycle.test.ts # Generated workspace, NuGet conversion, and codeful debug-task lifecycle checks
├── runTest.ts              # Test runner entry point
└── integration/            # Legacy prototypes; not wired into the default CLI baseline
```

## Running Tests

### Standard Azure connector setup

When **Enable connectors in Azure** appears, shared designer/debug setup must
choose **Use connectors from Azure** or exact **Yes**, even for workflows that
only author built-in operations. Reuse `affirmativeAzureConnectorPrompt`; missing
authentication or fixture context is blocked setup, not permission to choose Skip.
Intentional workspace No/Cancel tests keep their original actions.

The opt-in HTTP Compose and Stateless variables consumers reuse the existing
approved MSN service connection and fixture context on both operating systems.
The shared Azure CLI template supplies tenant, subscription, resource group and
location through `LA_E2E_CLI_AZURE_*`. Use only the existing approved target; do
not create resources or expand permissions. Workspace-only consumers remain
credential-free, and canonical selectors and native acceptance gates are unchanged.

Workspace lifecycle/MSN Weather, HTTP timeout Compose and Stateless variables
also share `designerCdpActions.ts` for native Designer mechanics. This helper
owns visible and hit-tested Add-trigger variants, action discovery and exact
selection, node/panel interaction, semantic parameter editing and saving.
Family tests must retain their own workflow/runtime assertions and should not
introduce local copies of those selectors or interaction sequences.

### HTTP timeout lifecycle: OGF Scenarios 1-3

`pnpm --dir apps/vs-code-designer run test:e2e-cli:http-timeout-lifecycle`
first validates dependencies in an isolated runtime root using the existing
bootstrap label, uses the existing Create Workspace fixture label filtered to
Standard Stateless, then reopens that generated `.code-workspace` once in a fresh
latest-stable official CLI host under the supplementary `httpTimeoutLifecycle` label.
The family explicitly selects V2 in its generated workspace and binds
`designerLocalV2` throughout. VS Code configuration is reacquired after the awaited
version update because
`WorkspaceConfiguration` objects retain their acquisition-time snapshot.
Startup resource and actual reopened workspace are checked by canonical physical
file identity under the owned fixture root. Windows drive/path case normalization
is platform-specific; Linux remains case-sensitive. Missing files, wrong
workspaces, escaped roots and symlink/reparse-point aliases are rejected.
Opening polls the actual workbench for this app's exact "Enable connectors in
Azure" prompt through the shared workbench detector/selector and uses trusted native
mouse input to choose **Use connectors from Azure**, or **Yes** for a matching yes/no dialog.
The same handling remains active while waiting for the designer frame's content.
Unknown, ambiguous, unfocused, disabled or covered prompts fail; no dialog API is
intercepted and no timeout is extended. The family never chooses Skip/No/Cancel or
blanks the subscription settings. Existing approved fixture settings are preserved.
Affirmative setup may next require the existing WIF subscription provider to sign
in/list subscriptions and the Azure wizard to select an existing resource group.
The HTTP lane requires the existing approved `requiresAzureAccessToken=true` WIF
context and all five `LA_E2E_CLI_AZURE_{TENANT_ID,SUBSCRIPTION_ID,RESOURCE_GROUP_NAME,
LOCATION_NAME,MANAGEMENT_BASE_URL}` exports. The shared journey selects only the
approved existing subscription and resource group through native UI. If the
subscription picker is shown, an authenticated **GET** of that exact existing
subscription resolves its display name and verifies subscription/tenant identity;
no ambient Azure CLI or credential fallback is used. The product wizard—not the
harness—persists the approved Azure target, which is independently checked before
Request/Compose authoring. Missing context/auth, absent or ambiguous targets,
sign-in/elevation prompts and resource-creation choices fail explicitly.
No resources, identities or grants are created or changed.
HTTP reuses `approvedAzureFixture.ts` for strict environment/GUID/WIF-tenant
contracts, exact existing-target picker rules and saved-target verification.
The helper and its 15 pure controls are taken from the shared fixture prior art;
HTTP does **not** install its preconfiguration lease. Preconfiguration, binding
and restoration controls are not affirmative picker/native coverage, and that
lease's separate Stateless review/native limitations remain unchanged.
Only HTTP reopen uses normal (non-minimal) Logic Apps activation so the actual
Azure Resources account tree is initialized before the affirmative wizard.
Bootstrap admission remains unchanged; reopen keeps strict managed dependency
validation and the same isolated runtime root. The activated dependency's real
account-tree API is checked, never fabricated.
The approved existing RG is read with an authenticated **GET** before selection.
Its returned resource ID/name must match the configured subscription/group; its
actual location is authoritative. Product-persisted location is compared with
that observed location, not blindly with the template's `westus` hint.
Denied WIF reads or missing tree/fixture prerequisites remain explicit blockers.
It adds Request and Compose through the actual designer, saves through the enabled
V2 ToolbarButton's accessible Save text,
closes that designer, reveals and double-clicks its exact generated `workflow.json`
through the native Explorer, and replaces only Compose with input `"test"` and
`runtimeConfiguration.requestOptions.timeout: "PT24H"` through native Monaco
keyboard/input events. It saves and closes that exact text editor, independently
checks the persisted definition, then right-clicks the same selected Explorer row
and chooses **Open Designer**. Wrong files/tabs, hidden or ambiguous Explorer rows,
stale text editors and incomplete native saves fail; there is no filesystem/editor-model
injection or fallback save. The exact unsupported-timeout error must then be visible
on the newly reopened active workflow designer target, frame and document. A different
message, hidden text, a stale webview, stale save or expired observation fails.

The focused non-GUI controls are
`test:e2e-cli:http-timeout-compose-original:unit` (after CLI compilation), also
included in `test:e2e-cli:unit`. They validate the source oracle and driver
failure behavior only; they are not native GUI coverage.
The DOM controls mount an actual CodeMirror `EditorView` with production theme,
keybinding and content-change extensions, run the driver against its rendered
lines/gutters/caret, and render the actual Fluent V2 Save `ToolbarButton`.
Only jsdom's missing browser layout/input platform is supplied; editor-model
replacement and preassembled driver page replies are not used.
The immutable configuration-snapshot regression is mandatory and self-contained.
An additional installed-code probe is optional: it reads an explicit
`LA_E2E_CLI_VSCODE_CONFIGURATION_BUNDLE`, or an existing system Code installation
under LocalAppData, `/usr/share/code`, `/usr/share/code-insiders`, or the macOS app.
It does not search `.vscode-test`, download Code, or start a Code process.
No installation on a cold producer reports **NOT EXECUTED** and contributes no
passing-control count; an explicit missing bundle or a found incompatible provider
fails rather than substituting a model. Native V2 configuration readback is always
required independently of this optional probe.
Canonical baseline labels/counts and rollup are unchanged. This supplementary
label is runnable, not automatically admitted to an Azure DevOps baseline or
credited from units. The explicit batch selector is
`node scripts/run-e2e-cli.js --suites httpTimeoutLifecycle`; canonical
`linux`/`windows` aliases remain unchanged. Its exact expected phases, also
recorded by the direct route in the existing phase JSONL format, are:

1. `runtimeDependencyBootstrap:bootstrap` (existing bootstrap label);
2. `httpTimeoutLifecycle:create` (`createWorkspaceFixturesManifest`, Standard Stateless only);
3. `httpTimeoutLifecycle:reopen` (one host running Scenarios 1, 2, and 3 in order).

The direct route replaces prior results with a fresh incomplete invocation before
work starts and writes label-specific acceptance files under `.vscode-test/results/`:
`httpTimeoutLifecycle.terminal-result.json` and
`httpTimeoutLifecycle.cleanup-ledger.json`. Its unique original phase JSONL
is retained under the family lifecycle artifact directory. Final success requires
the exact ordered current-invocation phases, positive actual test counts, each
original CLI host's observed owned-descendant closure, actual owned-root absence
after cleanup, and a final closure observation using the existing process observer.
Exit zero alone cannot finalize success. Missing, stale, malformed or incomplete
evidence and cleanup/closure failures produce a current failed result and nonzero
exit. Batch execution keeps its existing `reports/*` finalization.

Retained-original process identities are a separate native acceptance gate.
The outer suite wrapper starts the child suspended inside a non-breakaway
Windows Job Object, or under a Linux `PR_SET_CHILD_SUBREAPER` supervisor. The
supervisor remains alive through root closure, so a detached/reparented process
stays owned and makes containment fail. It reports
`retainedOriginalIdentitiesVerified === true` only when the kernel ownership
container is empty. No identity-proof flag is inferred from an empty current
ancestry tree, exit zero, directory absence, or unit fixture data.

Native acceptance requires the source-bound compiled producer artifact and
actual Windows and Linux isolated consumer runs with their generated fixture,
raw CLI results, saved-definition snapshot and accepted screenshots.

The reopened host runs the three Standard VS Code scenarios sequentially:

1. The first workflow authors Request + HTTP through Designer Settings with
   `PT1S` and asynchronous pattern disabled, verifies the serialized definition,
   invokes the exact local callback, correlates the returned run ID, and requires
   that run's HTTP action to fail with timeout-specific evidence.
2. The same workflow changes only the existing HTTP timeout to `PT24H`, requires
   fresh Functions validation text from the real `Azure Logic Apps (Standard)`
   Output channel, then proves current V2 `InvalidString` ISO-8601 validation
   leaves Save disabled and the persisted `PT24H` definition unchanged.
3. Only after Scenario 2 passes, the same VS Code host reopens the same workflow,
   proves the persisted Request + HTTP `PT24H` state, deletes HTTP and Request
   through the real Designer, and waits for the canvas to clear. It then authors
   Request + Compose with input `test` in that same workflow, saves and closes the
   Designer, opens the same exact `workflow.json` in the native editor, inserts
   only the Compose `runtimeConfiguration.requestOptions.timeout`, saves and
   closes the editor, and reopens Designer to require the unsupported-timeout
   message. A Scenario 1 or 2 failure must stop before the reset.

Both use a runner-owned loopback delayed endpoint so Linux and Windows exercise
real timeout behavior deterministically without publishing the retired signed
service URL. That replacement is supplementary semantic coverage, not evidence
for the original credential-bearing endpoint identity. Portal-only validation
wording and the Consumption-only rejection remain host residuals; VS Code cannot
create the required Consumption workflow.

Run the family explicitly with
`node scripts/run-e2e-cli.js --http-timeout-lifecycle`, or select
`httpTimeoutLifecycle` in a diagnostic batch. The prior scenario-specific CLI
flags remain compatibility aliases to this same lifecycle and do not create
separate jobs or scenario processes.

### Stateless variables family (isolated native host only)

Compile with `pnpm --dir apps/vs-code-designer run test:e2e-cli:compile`.
Non-GUI controls run with
`pnpm --dir apps/vs-code-designer run test:e2e-cli:stateless-variables:unit`;
they are also additive members of the existing registered unit chain.

After the parent has admitted the extension/webview build on an isolated native
consumer, run
`pnpm --dir apps/vs-code-designer run test:e2e-cli:stateless-variables-lifecycle`.
The underlying selector is
`node apps/vs-code-designer/scripts/run-e2e-cli.js --stateless-variables-lifecycle`.
The additive batch suite ID is `statelessVariablesLifecycle`, selected explicitly
with `--suites statelessVariablesLifecycle`; it is not added to canonical OS aliases.
Both selectors run exactly these native phases, in order:

1. `runtimeDependencyBootstrap:bootstrap` — the existing dependency-bootstrap
   label populates a new job-owned `logicappsux-vscode-e2e-runtime-deps-*` root under
   the OS temporary directory, never the user's dependency cache.
2. `statelessVariablesLifecycle:create` — one real Standard/Stateless wizard host.
3. `statelessVariablesLifecycle:prepare` — a fresh host generates the real
   design-time baseline and binds the approved fixture without auto-start.
4. `statelessVariablesLifecycle:reopen` — a fresh activation-time auto-start host opened with that exact
   generated `.code-workspace`, including authoring/runtime/history/recovery.

The family does not report bootstrap from a prepared cache or from unit controls.
The bootstrap executable survives between phases in the job-owned runtime root,
but the bootstrap profile's global VS Code settings do not. Full activation can
normalize `azureLogicAppsStandard.funcCoreToolsBinaryPath` to plain `func`; the
reopen host therefore puts the bootstrap-admitted `FuncCoreTools` directory first
in its platform-correct `PATH`. Do not replace this with an absolute profile pin:
minimal-activation families such as MSN can retain an absolute managed path, but
that does not exercise the Stateless full-activation command-resolution contract.
Set the existing
`LA_E2E_CLI_USER_DATA_PARENT`, extensions directory and remote-debugging port as
appropriate for the isolated Windows/Linux consumer. Do not run concurrently with
other runtime families sharing port 7071. This family never kills an unowned port
occupant, creates live Azure resources, or provisions a connector.
When standard setup detects **Enable connectors in Azure**, the family reuses
`affirmativeAzureConnectorPrompt`: **Use connectors from Azure** / exact **Yes**,
never a negative fallback. Any ensuing authentication/subscription/resource-group
selection requires the existing approved service connection and fixture context;
unavailable approval/fixtures remain a native setup blocker, not permission to
skip setup or create resources. No such native journey is validated in this worker.
The Stateless suite now preserves the canonical MSN scoped WIF/token environment
(`requiresAzure: true`) through both direct and batch wrappers. It strictly reads
the parent-exported `LA_E2E_CLI_AZURE_*` tenant/subscription/existing group/location,
never an ambient CLI account/default or a guessed target. As in canonical MSN,
approved metadata is configured in the wizard-owned app settings before the real
designer producer; the actual product `getAzureConnectorDetailsForLocalProject`
reads those keys and `getAuthData` consumes the existing WIF/E2E token provider.
The token remains environment-only. Both app and generated design-time bindings
are verified. If subscription/group pickers appear, only the approved subscription
identity and exact existing group label may be selected; Create is never selected.
Preconfiguration is not GUI-picker coverage or proof of Azure availability.
The design-time file is generated independently, not copied from app settings.
After the real producer and file-readiness gate, a guarded per-file lease binds
its Azure keys before assertions and preserves every unrelated generator
setting. The preparation transaction intentionally leaves only the approved,
non-token target metadata for the following activation host. The family-owned
workspace is deleted after complete success and retained for diagnostics after
failure. The separate Stateless history-settings lease still restores only
after actual recovery quiescence; callback or cleanup failures remain failures.

The native family authors Request, one multi-variable Initialize (including the
actual Add a Variable control), both variable appends and Response through the real
designer. It validates saved types and dependencies, invokes the local callback
through the harness HTTP client, and validates the exact response. It opens Run
history before that first call, but **does not require default Stateless history**.
It then installs `WithStatelessRunHistory` into the generated app-root
`local.settings.json` and `workflow-designtime/local.settings.json`, stops/restarts,
and verifies a new callback-identified run, exact action identities, Response outputs
and the matching visible history row. A further stop/restart repeats that proof.
History-settings restoration and a recovered real callback have an independent bounded deadline,
including when the positive deadline expires. Any foreign settings edit or deletion
preserves both files rather than partly restoring or overwriting them.

Cold reopen starts the actual designer producer before awaiting generated
design-time settings, inside the positive/recovery cleanup boundary. Side-effect
operations receive cancellation signals and retain their underlying promises.
A separate preparation profile disables auto-start only while it runs the real
consistency command, waits for product-generated design-time settings and binds
the approved fixture to both targets. The following fresh reopen profile enables
activation-time startup, immediately shows the real **Azure Logic Apps
(Standard)** Output channel, and proves the design-time management endpoint is
reachable before opening the Designer. Native failure evidence therefore shows
the product-selected command, port, process output, readiness or early exit
without racing first-time settings generation or bypassing activation startup.
Restoration cannot overlap an unquiesced producer or debug start. Debug cleanup
uses only exact marked sessions and newly observed generated Functions task
handles in the wizard-owned app, never global task/session or port cleanup.
Late resolving owned starts remain observed and stopped even when bounded cleanup
fails; that failure is inadmissible, not a passing race against a timeout.

The direct selector uses the exported reusable
`runDirectFamily(suiteId, visibleDelayMs?, options?)` helper in `scripts/run-e2e-cli.js`.
It runs the actual family orchestrator inside the existing `runSuiteWrapperProcess`
and finalizes with `writeSuiteFinalEvidence`, using that wrapper's observed process
cleanup result, not a fabricated `verified: true`. Bootstrap, create and reopen use
one fresh journal and must succeed exactly once and in order. Final admission is
after family-owned roots and wrapper transient roots are actually removed.
The default label-specific ADO artifacts are
`.vscode-test/results/statelessVariablesLifecycle.terminal-result.json` and
`.vscode-test/results/statelessVariablesLifecycle.cleanup-ledger.json`.
Successful final terminals use the existing shared-writer shape: exact ordered
registry `expectedPhaseIds`/`observedPhaseIds`, empty missing/unexpected/duplicate/
blocked lists, complete per-phase proofs, `phaseCompleteness`, normal zero exit/
null signal, empty diagnostics, verified cleanup and finalized lifecycle. The
fresh `phaseJournalPath`, terminal `generatedAt`, cleanup ledger's observed
`processCleanup.checkedAt` and actual owned-root absence provide provenance.
Node-only controls assert these fields on the real emitted artifact; they do
not import the parent CI checker or replace native phase/runtime validation.
Original-process closure is a separate, stronger acceptance requirement.
`originalProcessClosureVerified` is true and `processClosureProof` is
`retained-original-identities` only when the wrapper is launched inside a
platform ownership container: a Windows Job Object that disallows breakaway,
or a Linux child-subreaper supervisor that adopts orphaned descendants. The
container must be empty after the wrapper root closes. This remains valid when
children reparent and does not depend on periodic ancestry snapshots. If the
container cannot be established, queried, or emptied, the result remains false
and `original-identities-unverified`.
Missing/stale/incomplete/unordered phases, retained roots, diagnostics or cleanup
failures produce `complete: false` and nonzero exit. Merely providing JSONL never
suppresses those final family receipts. Other registered families can
reuse the same helper; approved Azure suites reuse the canonical scoped credential
provider. It requires the existing prepared extension seed, and the
production CLI does not expose the Node-fixture `scriptPath` unit seam.
Sibling family selectors should call their native orchestrator only when the
existing wrapper set `LA_E2E_CLI_SUITE_WRAPPER_CHILD=1`; otherwise call
`runDirectFamily(theRegisteredSuiteId, visibleDelayMs)` and propagate its exit code.
Inherited JSONL or batch-mode environment alone is not a wrapper-child identity.
Registered Node-only integration controls run the actual orchestrator, real phase
writer, strict filesystem cleanup and shared finalizer with only VS Code phase
execution/Core Tools probing replaced. They exercise real bounded Node child
process observation and are not native GUI/runtime coverage.
Existing canonical labels and Stateful defaults are unchanged.

Boundary: private source text asks for “both” local-settings files without naming
their paths; the pair above follows the extension's two established generated
settings targets. Embedded source images were used only as a private authoring
oracle, not copied into the repository. Portal environment-variable configuration
and the original external HTTP-client UI are not driven here. The local HTTP client
is a transport substitute, not external-client certification. Native screenshots,
actual Windows/Linux consumer results, generated design-time readiness, runtime
restart/recovery and any source-image visual parity remain parent-owned validation.
Source catalogue metadata, screenshots, private assets and signed endpoints must
not be published. This additive family does not change canonical baseline counts,
the existing OGF rollup or any previously earned native coverage.

### Workspace artifact regeneration (focused, native validation pending)

After building the extension/webview and running `test:e2e-cli:compile`, use
`pnpm --dir apps/vs-code-designer run test:e2e-cli:workspace-artifact-regeneration`.
This is a registered supplement in `scripts/run-e2e-cli.js`, implemented in
`workspaceArtifactRegeneration.test.ts`. It reuses the official latest-stable
`createWorkspaceCoreMatrix` label filtered to **Standard Stateful** and the existing
current-invocation wizard handoff. No synthetic native fixture, product dialog
interception, baseline label replacement, or canonical execution-count change is
introduced. The `.vscode-test.mjs` label and handoff forwarding already exist;
no new ExTester mode or CLI label is required.

The original wizard host must finish first. The supplement uses its resolved Code
executable/hash/version and prepared extensions directory, then reopens that same
generated `.code-workspace` in fresh **regular** Code hosts (without
`--extensionTestsPath`). Normal activation/consistency checks remain enabled.
Each observation retains a 30-second deadline starting before launch; polling,
CDP operations, file settlement, and required screenshots consume that same budget.
Ordinary Close Window has its existing separate 10-second teardown budget, never
a forced process kill or an extension of the observation deadline.

Each partial deletion leaves existing `.vscode` files. Consequently the product
requires **two distinct renderer controls**, in this order:

1. The project-scoped notification, `Detected an Azure Logic App project "..."`
   / `Initialize for optimal use with VS Code?` → its real **Yes**.
2. The modal, `The .vscode configuration files will be regenerated to match the
   current project settings. This will overwrite any custom modifications.
   Continue?` → its separate real **Yes**.

The production prompt-sequence helper revalidates each enabled/unobstructed
control after its required capture, sends trusted renderer mouse input once per
control, and retains the same app/document and original deadline throughout.
It proves deletion/non-target invariants before overwrite Yes, then requires
durable writes and dismissal of both prompts. Missing/disabled/unrelated/
ambiguous/disappearing overwrite dialogs, navigation, early writes, capture
expiry, or uncertain input RPCs fail without input replay or a fresh clock.
`before-overwrite-yes` PNG/readiness pairs and both actual Yes counts are required
in addition to the existing branch evidence.

The shared suite ID is **`workspaceArtifactRegeneration`**, available explicitly
through `--suites workspaceArtifactRegeneration` or the package script
`test:e2e-cli:workspace-artifact-regeneration:batch`. It is additive in
`scripts/e2e-cli-batch.js`; the existing `linux` / `windows` aliases are unchanged.
Its exact ordered phase IDs are:

```text
workspaceArtifactRegeneration:create
workspaceArtifactRegeneration:baseline
workspaceArtifactRegeneration:vscode-single
workspaceArtifactRegeneration:vscode-single-reopen
workspaceArtifactRegeneration:vscode-multiple
workspaceArtifactRegeneration:vscode-multiple-reopen
workspaceArtifactRegeneration:vscode-repeat
workspaceArtifactRegeneration:vscode-repeat-reopen
workspaceArtifactRegeneration:root-single
workspaceArtifactRegeneration:root-single-reopen
workspaceArtifactRegeneration:root-multiple
workspaceArtifactRegeneration:root-multiple-reopen
workspaceArtifactRegeneration:root-repeat
workspaceArtifactRegeneration:root-repeat-reopen
```

`create` is the actual verified official wizard host; `baseline` is the initial
valid-project regular reopen. Every remaining phase is a real regular Code host,
reported only when attempted, with its actual observation/exit/error state. There
is **no runtime bootstrap phase**: this family never starts debug or the Functions
runtime. Missing, duplicate, unexpected, or failed phases cannot finalize the
family successfully. Direct and batch terminal results retain the same exact
phase sequence. The wizard's actual Mocha count is reported once; regular hosts
are not fabricated Mocha bodies or additions to canonical native counts.

The planned sequence is a valid-project fresh-reopen baseline, then:

| Branch | Deleted artifacts | Required observation |
|---|---|---|
| `vscode-single` | `.vscode/tasks.json` | Real initialization prompt, actual Yes mouse input |
| `vscode-multiple` | `.vscode/launch.json`, `settings.json`, `extensions.json` | Same real prompt/Yes |
| `vscode-repeat` | `.vscode/tasks.json` again | Another real prompt/Yes, not a fabricated repeat |
| `root-single` | Root `host.json` | Required initialization prompt/Yes; silent repair fails |
| `root-multiple` | Root `host.json`, `local.settings.json` | Required initialization prompt/Yes; silent repair fails |
| `root-repeat` | Root `local.settings.json` again | Required initialization prompt/Yes; silent repair fails |

Before deletion the test retains the exact JSON contracts of **all six** original
wizard artifacts. Regenerated JSON must deep-equal those contracts; existence or
valid JSON alone is insufficient. Every non-target workspace file stays byte-for-byte
unchanged, with exact directory-entry checks and no exclusion list. The initial
valid-project reopen may create the product's normal design-time directory, but
must preserve every original wizard file; that directory is then included in
the full unchanged-state baseline. No later healing file is exempted.
Every real Yes branch must dismiss the prompt, write the expected files durably,
close Code normally, and persist all file bytes/entries without another initialization
prompt on a separate fresh reopen. A failed branch stops the sequence; planned but
unobserved branches cannot receive credit.

**Known source/product boundary, not a waiver:** the retained source requires
initialization/Yes for missing `.vscode` artifacts and repeats deletion for root
`host.json` / `local.settings.json` with the original template oracle. Its root
repeat wording does not independently spell out another Yes; this family keeps the
requested strict root/repeated-Yes interpretation explicit for expectation review.
Current product activation repairs root files before `.vscode` consistency prompting.
Consequently root-only branches may heal silently and fail the required prompt/Yes
assertion. No native outcome is claimed here, and neither the source interpretation
nor an initial/intentionally changed expectation baseline is auto-approved.

Set `LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR` to a fresh job-owned path for
`invocation.json`, `wizard-handoff.json`, `final-result.json`, per-phase Code logs,
actual profile-log diagnostics and accepted PNG/readiness-sidecar pairs.
`LA_E2E_CLI_USER_DATA_PARENT` should be a short isolated path on Linux (the actual
UTF-8 socket path must be under 100 bytes); the existing encrypted GNOME/D-Bus/Xvfb
preparation remains required. The supplement inherits the admitted executable,
runtime dependency root, prepared extensions directory and current source/job
identity; it has no compilation, dependency-install or executable fallback of its own.
The creating wizard host uses the existing **managed dependency flow with strict
validation enabled**, not the activation branch that resets paths to system
`func`/`dotnet`/`node`. Before starting that host, the invocation binds an explicit
job-owned `LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT` and its actual profile settings path.
The verified creating host then captures its actual VS Code global runtime
configuration and checks it against the real `User/settings.json`.
`runtimeSettings` in `wizard-handoff.json` preserves an allowlist of managed-flow,
runtime-root, Func/.NET/Node binary and .NET-acquisition settings, an allowlisted
configuration hash, binary SHA-256 values, invocation/job/source identity and
capture time. Environment values alone are not a configuration handoff.

Every fresh baseline/regeneration/reopen profile writes those **same captured**
runtime settings to its own `User/settings.json`. Original-profile provenance,
admitted root/binary bytes and fresh-profile configuration are checked before
launch and after observation/ordinary closure. Stale invocations/timestamps,
another source profile, wrong roots, missing binaries, system-path substitution
or changed settings/bytes fail; the artifact JSON/hash oracles remain unchanged.
The harness does not install replacement binaries or invent global paths.
Normal product-managed validation stays on the same admitted dependency root.
Only allowlisted nonsecret settings cross hosts—never the original profile,
account/secret storage, `globalStorage`, terminal environment or arbitrary settings.
There is still no separate runtime-bootstrap phase and no debug/Functions host start.
Unconfirmed ordinary closure or an observation/diagnostic failure preserves the
wizard root through the existing runner retention path, never a false successful cleanup.

Focused non-GUI controls:

```powershell
pnpm --dir apps/vs-code-designer run test:e2e-cli:compile
pnpm --dir apps/vs-code-designer run test:e2e-cli:workspace-artifact-regeneration:unit
```

The controls cover missing/wrong/invalid regenerated files, actual deletion,
non-target byte/directory changes, path/link safety, duplicate/unrelated/disabled
Yes, absent prompt versus silent healing, late read/deadline expiration, transport
failure, final closure/cleanup failure and invalid runner flag combinations. They
also control the exact batch/direct phase contract, missing/failed/duplicate
phases, unsupported invented bootstrap phases, and unchanged canonical aliases.
Production two-prompt sequencing and creating-host runtime/profile derivation
also have focused negative controls, including deadline expiry, uncertain input,
wrong-root/stale source settings, binary changes, environment-only configuration,
and proof that profile/secret-storage files are not copied.
They are appended to `test:e2e-cli:unit`; their temporary unit files are **not** wizard
fixtures and their passes provide no native GUI/source-case coverage.

**ADO integration remains parent-owned:** run the focused command in isolated
Windows and Linux jobs with the admitted compiled extension/tests, official stable
Code, prepared dependencies/extensions, fresh diagnostics and the existing Linux
secure desktop preparation. Archive the new diagnostic directory and check
`final-result.json.complete`, all planned branch observations, ordinary host exits,
accepted screenshots/sidecars, and verified final cleanup. Existing canonical suite
aliases/reporting counts and private mappings are unchanged. A focused success
would not establish canonical full-rollup, root expectation approval, or whole-case
acceptance; those require separate source-bound native runs and USER review.
Use `node apps/vs-code-designer/scripts/run-e2e-cli.js --workspace-artifact-regeneration`
after artifact admission (with the app's `node_modules/.bin` on PATH), rather than
building inside the consumer. Set `LA_E2E_CLI_EXTENSIONS_DIR` to the admitted prepared
directory and `LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL=0` for this independent invocation;
the focused runner sets the latter for its own invocation and rejects attempts to
combine the two supplements. Give this invocation separate
phase/result destinations if consumer result-staging variables are inherited;
do not overwrite an existing canonical lane or add unit groups to its native count.
For batch consumers use
`node apps/vs-code-designer/scripts/run-e2e-cli.js --suites workspaceArtifactRegeneration`
with the existing prepared extension seed/admission context. The batch allocates
owned fixtures/profiles/results and a suite-scoped regeneration diagnostics
directory. This explicit additional selection is not the canonical alias inventory
and therefore cannot claim canonical full-rollup success.
On Linux choose a short job-owned `LA_E2E_CLI_BATCH_ROOT` so the batch-owned profile
parent also fits the unchanged actual UTF-8 socket budget. Regular profile basenames
are opaque per-invocation/per-phase hashes; this shortens paths without changing
phase identities, weakening the byte-length check, or using a shared desktop profile.

#### ADO staging boundary and safe archive whitelist

For an existing per-job lifecycle archive, use the **direct** selector and set
`LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR` to a fresh dedicated child directory,
for example `<existing-job-lifecycle>/workspaceArtifactRegeneration`. It is fully
supported; no archive of arbitrary `.vscode-test/` directories is necessary.
The default direct root is
`apps/vs-code-designer/.vscode-test/workspace-regeneration-<user-data-suffix>`.
The explicit batch suite instead assigns
`<allocated-suite-root>/reports/workspace-regeneration`; its suite-scoped setting
replaces an inherited diagnostic-root override.

The runner **always** writes self-contained finalized family evidence beneath that
root, including when a consumer sets `LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH` (which
otherwise selects JSONL-only batch reporting). Consumer baseline result destinations
can remain separate; the family root is authoritative for this supplement:

| File/path relative to the family root | Safe archive use |
|---|---|
| `invocation.json` | Current invocation/job/source/platform and owned-root admission |
| `wizard-handoff.json` | Verified original wizard, Code hash/version and allowlisted nonsecret runtime settings |
| `final-result.json` | Final observation/closure/cleanup result and exact fourteen phase records |
| `terminal-result.json` | Strict finalized fourteen-phase terminal result, not the wizard's single Mocha body |
| `phase-results.jsonl` | Exact ordered executed phases; missing regular phases remain failures |
| `cleanup-ledger.json` | Actual owned wizard-root cleanup, invocation-bound; `removed`/verified required |
| `code.log` | Aggregate regular-Code stdout/stderr sanitized with the existing log redactor |
| `screenshots/workspace-regeneration-baseline.{png,json}` | Required baseline evidence/readiness pair |
| `screenshots/workspace-regeneration-<branch>-<checkpoint>.{png,json}` | Required branch evidence/readiness pairs |
| `vscode-logs/**` | **Only this producer-sanitized subtree**, including `profile-log-index.md`, `copy-summary.json`, copied logs and channel diagnostics |

`<branch>` is exactly `vscode-single`, `vscode-multiple`, `vscode-repeat`,
`root-single`, `root-multiple`, `root-repeat`; `<checkpoint>` is exactly
`before-yes`, `before-overwrite-yes`, `after-yes`, `reopened`.
Success requires all **25 PNG/accepted-sidecar pairs**. Archive only these exact
paths, not `*.json` or the whole diagnostic directory. **Exclude**
`*-profile.json` locator markers and raw `*-code.log` files (the safe aggregate
is `code.log`), all raw profiles/`User`/`globalStorage`/`workspaceStorage`,
account/keyring/auth stores, original unsanitized logs, prepared extensions and
runtime/dependency caches. Keep existing admitted baseline logs/results/generated
snapshots under their current separately governed archive rules.

Relevant environment paths:

- `LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR`: dedicated family archive root.
- `LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT`: explicit admitted job-owned managed
  dependency root; **not archived**.
- `LA_E2E_CLI_EXTENSIONS_DIR`: admitted prepared extensions; **not archived here**.
- `LA_E2E_CLI_USER_DATA_PARENT`: private fresh-profile parent, short on Linux;
  **never archive raw profile contents**.
- `LA_E2E_CLI_WORKSPACE_ROOT`: owned wizard fixture parent; normal verified removal
  is recorded in `cleanup-ledger.json`.
- `LA_E2E_CLI_VSCODE_VERSION`: producer-admitted resolved stable Code version.
- `LA_E2E_CLI_REMOTE_DEBUGGING_PORT`: optional isolated-job port (regular host
  default `9514`); no shared local-host native execution.
- Existing `LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH`,
  `LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH`, `LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH`
  may still point at the consumer's **separate** result area. The family copies
  above are emitted independently and cannot be replaced by baseline results.

  #### Canonical direct supplementary terminal

  The direct ADO invocation additionally writes these fixed **app-root-relative**
  paths, independent of the caller's working directory or batch result overrides:

  ```text
  .vscode-test/results/workspaceArtifactRegeneration.terminal-result.json
  .vscode-test/results/workspaceArtifactRegeneration.cleanup-ledger.json
  ```

  The terminal is cleared to a fresh `complete=false`, `lifecycleFinalized=false`
  scope before creating-host admission/launch can fail, then bound to the current
  invocation/job/source/platform. After actual normal host closure, final evidence
  checks and verified removal of the owned wizard root, it receives the same
  standardized result shape as the family-root `terminal-result.json`:

  **Diagnostic-only closure boundary:** this branch's custom finalizer does not yet
  have a genuine retained-original-process-identities observer. Both direct and
  archived receipts therefore explicitly carry
  `originalProcessClosureVerified: false` and
  `processClosureProof: "original-identities-unverified"`, even when all GUI phase
  observations and owned-directory cleanup complete. Caller/model flags, exit 0,
  an empty post-exit ancestry tree or a removed directory never promote these to
  true. Parent CI must reject supplementary **acceptance** until the existing
  helper's retained-identity correction supplies genuine observed proof; no such
  proof or native clean approval is claimed by these source/unit changes.
  The archive checker validates diagnostic evidence structure, not acceptance.

  - `suiteId: "workspaceArtifactRegeneration"`, `complete: true`,
    `lifecycleFinalized: true`, `exitCode: 0`, `signal: null`;
  - `cleanupVerified: true`, `diagnosticsError: ""`, `phaseCompleteness: true`;
  - `expectedPhaseIds` and `observedPhaseIds` both exactly the ordered fourteen
    registered phases; `missingPhaseIds`, `unexpectedPhaseIds`,
    `duplicatePhaseIds`, `blockedPhaseIds` are empty;
  - each `phaseResults` entry retains actual `phaseId`, `complete`, `exitCode`,
    `signal`, `cleanupVerified`, and `diagnosticsError`. The actual wizard's Mocha
    count remains once only; regular workbench phases are not extra Mocha bodies.

  Incomplete phases, diagnostics, failed/preserved/wrong-root cleanup, or failed
  final evidence leave the terminal unsuccessful. The canonical cleanup ledger
  records the actual existing owned-root removal result, current binding and phase
  proofs; it does not invent the outer wrapper's process-tree verification.
  Archive these two files through the existing results archive in addition to the
  safe family-root whitelist. Batch's general wrapper continues to finalize its
  standard report-folder result separately. No parent CI implementation was copied
  into this family branch; publication uses the existing terminal/cleanup helpers.

  After collecting the whitelist into a staged family directory, validate it using
the admitted source/compiled tests and the same current-job identity environment:

```text
node apps/vs-code-designer/scripts/run-e2e-cli.js --check-workspace-artifact-regeneration <staged-family-root>
```

This read-only checker starts no Code/runtime. It rejects stale/wrong invocation,
job/source/platform, incomplete/reordered/failed phase records, unsuccessful
ordinary host exits, missing real Yes counts, preserved/failed owned cleanup,
missing overwrite screenshots or unaccepted sidecars/log indices. It works from
the archive without reading the original profiles or runtime caches. A single
`1 passing` wizard log cannot satisfy it. Original expectation approval, canonical
rollup and the existing outer process-tree cleanup gate remain separate; this
family does not fabricate a new process-tree-verification receipt.

### Multi-root workspace supplementary family

`test:e2e-cli:workspace-multi-root` follows official wizard creation, Explorer
folder Create New Project, a real same-window Reload Window, the complete
native `func`-population count, sequential folder-qualified debug, and an
actual Azure Data Mapper open. This is an isolated-native-consumer-only
supplementary route, not a new baseline label or canonical-count change.
See [workspaceMultiRoot.md](./workspaceMultiRoot.md) for its exact clause
boundary, fail-closed prerequisites, local controls and parent-owned Azure
DevOps requirements. It must not be launched on a shared development host.

### Workspace prompt Cancel (Windows and Linux)

After building the extension/webviews and compiling the tests with the commands below,
run `pnpm --dir apps/vs-code-designer run test:e2e-cli:workspace-prompt-cancel`.
This focused command runs the existing Standard Stateful wizard setup once, closes that
original test host, and navigates to **that same created app** in a regular Code window:
**File -> Open Folder -> stock folder picker -> app -> workspace prompt -> Cancel**.
It is not another wizard fixture. The primary command and `:ui` alias use the same route.
The retained source sequence first opens this same app and clicks the real **No**,
then closes the folder through the stock File menu and repeats Open Folder for Cancel.
This lets normal activation initialize the app through the actual preceding source
step; no design-time files are seeded or excluded from the no-change comparison.
The regular window omits `--extensionTestsPath`: stock VS Code refuses this modal in
extension-test mode, and a smoke-driver flag alone does not bypass that refusal.

The existing Windows/Linux `createWorkspaceCoreMatrix` consumer jobs require this
supplementary check after their Standard Stateful creation host closes and **before**
its existing final cleanup. The other five matrix executions, all existing lanes,
canonical Mocha counts and strict rollup remain unchanged. Consumers use the admitted
compiled extension/tests, the **exact executable and SHA-256 reported by the creating
Code host**, and its prepared extensions directory. Cancel has no compilation,
download or extension-install fallback. The existing Linux Xvfb/PATH wrapper remains
active; the fresh regular profile honors `LA_E2E_CLI_USER_DATA_PARENT` (or the explicit
`LA_E2E_CLI_CANCEL_USER_DATA_DIR`) and checks the UTF-8 byte length of its actual socket
path, not another profile's path.

The existing Linux 1ES preparation installs GNOME Keyring, libsecret tools, and
D-Bus from the signed OS package repositories (without optional PAM/SSH setup).
The existing Xvfb command runs inside `dbus-run-session` with fresh job-temp
`XDG_DATA_HOME` and `XDG_RUNTIME_DIR`, not a shared desktop credential store.
A foreground, secrets-only GNOME provider receives a nonempty random job-only
password through stdin; neither that password nor credential-store files are
logged, committed, or archived. Preparation requires an unlocked real default
collection, an actual Secret Service store/lookup/clear round trip, and the
encrypted GNOME login-keyring format before the original command can run.
Normal Linux Code selects the documented `--password-store=gnome-libsecret`
backend, never `basic`, weaker-encryption UI, or in-memory secret storage.
Missing packages, unlock/provider failures, or plaintext storage fail closed.
The shell stops only its own foreground provider job; `dbus-run-session`
terminates its own bus after the original command. Original Xvfb/Node failures
remain failures, and no Code process is killed or fixture-retention gate changed.
This is OS prerequisite preparation on the existing isolated pipeline job,
not a process-owner protocol or permission to start services on a shared host.

The same-job handoff uses the existing verified manifest fields (`wsFilePath`, `wfDir`)
and rejects stale, wrong-root/job/source, missing or ambiguous Standard Stateful entries.
It observes the real picker/modal and trusted mouse Cancel, then checks eight original
file hashes, directory entries, app title/Explorer, and absence of a workbench reload.
Success sends **Close Window directly**. Escape is used only during failed-observation
teardown and cannot turn that failure into success. The final result is written after
ordinary Code completion and existing runner diagnostics/cleanup; teardown failure
overrides observation pass without dropping original errors.

Always-published 1ES diagnostics include a separate `workspace-cancel` directory with
the original `invocation.json` and `wizard-handoff.json` (including the creating
executable/hash and verified manifest entries), `cancel.log`, original `code.log`/exit,
`final-result.json`, the real picker/before/after
PNG files, and the actual regular profile logs. Missing invocation/handoff/evidence
fails the core job even when baseline Mocha tests pass. No `.empty` placeholder satisfies
the screenshot requirement; every required PNG must have its matching accepted
workbench capture/readiness sidecar. An unconfirmed ordinary Code close preserves the
app through the existing diagnostic retention path instead of attempting destructive
cleanup. Original source case/step mappings remain in the existing
private crosswalk (`workspacePromptCancel` mapping), never public source identifiers.
This is supplementary real workbench evidence, not an additional Mocha execution,
full source-case certification, OS-native-picker claim, MSN execution, or unit-derived
GUI/OGF credit.

Picker input waits for the stock folder listing to finish loading, and the typed app
path must settle and remain unchanged through capture before submission. Required
captures reuse the current workbench CDP connection and its real generation, with
stable workbench-shell readiness within the original case deadline; they do not
reattach a fresh screenshot session or treat diagnostic-only captures as evidence.
The preceding real-No setup has its own bounded 30-second phase. Cancel retains its
original 30-second observation budget beginning **before repeated Open Folder**, after
Close Folder reaches the empty workbench; clicking Cancel never resets that clock.
Captures use at most five seconds and the remaining phase budget. Phase timing and
original capture-RPC errors are retained in the case log, while the required unchanged
settling interval and final evidence acceptance remain strict.

File -> Open Folder and Close Folder reload the current workbench document. The
driver keeps its original CDP target/session and waits for a different document
time origin, a fully loaded visible shell, and the expected app/empty Explorer.
Only document-navigation errors from read-only readiness probes are retried,
within the existing phase deadline; user input is never replayed. A closed CDP
connection, other RPC errors, or the wrong app remain failures. The real No and
Cancel observations do not use this navigation recovery: their no-reload
assertions stay strict. Logs distinguish folder-navigation readiness from CDP
lifecycle events and record the phase, target, generation and document origin.

Focused non-GUI controls are available as `test:e2e-cli:workspace-prompt-cancel:unit`
and `test:e2e-cli:linux-secure-session:unit`; both are included in the existing
`test:e2e-cli:unit` chain on both consumer OSes. The secure-session controls use
unit-owned command fixtures only, including missing/locked/plaintext storage,
preparation errors, original exit propagation, and provider death. They do not
prove a live Linux credential provider, authentication, or GUI scenario; the
real encrypted backend and Cancel must pass on the actual Linux consumer job.

Run these commands from the repository root unless a section says otherwise.

### How the commands are organized

The root `package.json` scripts forward to `apps/vs-code-designer/package.json`. Each script handles the build steps it needs before launching VS Code:

1. Build the extension into `apps/vs-code-designer/dist`.
2. Build the VS Code React webview bundle into `dist/vs-code-react`.
3. Compile the TypeScript test files with `tsconfig.e2e.json`.
4. Launch latest stable VS Code through `@vscode/test-cli` with an isolated test profile.

There are two kinds of CLI E2E entry points:

| Command type | Use it for | How it runs |
|---|---|---|
| Single-host labels | Activation, command registration, and focused Create Workspace webview/artifact checks. | One latest-stable VS Code host runs one `.vscode-test.mjs` label. |
| Lifecycle scripts | Generated-project debug/run, NuGet conversion debug/run, and codeful F5 task parity. | A package script creates real workspaces in one VS Code host, saves a manifest, then reopens each generated project in fresh VS Code hosts with the required startup resource and environment variables. |

When this README says "multi-host lifecycle flow", it means the script intentionally uses multiple short-lived VS Code windows so Create Workspace, project reopen, debug, and run assertions do not share stale extension-host state.

### Recommended local workflow

1. Compile the E2E tests when changing test code:
   ```powershell
   pnpm run test:e2e-cli:compile
   ```
2. Run the quick extension-host smoke:
   ```powershell
   pnpm run test:e2e-cli:smoke
   ```
3. Run the focused Create Workspace slice you changed, or the full Create Workspace CLI group:
   ```powershell
   pnpm run test:e2e-cli:create-workspace:behavior
   pnpm run test:e2e-cli:create-workspace:full
   ```
4. Run a lifecycle target only when you need runtime/debug coverage:
   ```powershell
   pnpm run test:e2e-cli:workspace-lifecycle
   pnpm run test:e2e-cli:nuget-conversion-lifecycle
   pnpm run test:e2e-cli:codeful-debug-tasks
   ```

If your terminal is already in `apps/vs-code-designer`, use the same script names there, for example `pnpm run test:e2e-cli:smoke`. The root scripts are just convenience forwarders.

### Registered contract checks and Azure DevOps parity

After compiling the E2E tests, run the registered non-GUI contract chain from the repository root:

```powershell
pnpm --dir apps/vs-code-designer run test:e2e-cli:unit
```

The existing Azure DevOps E2E build already runs this chain on its Linux producer. The `unitTests` consumer jobs now also run the same chain on both Windows and Linux, after verifying the current-run artifact and exact source checkout and extracting its compiled tests. A nonzero contract result fails the consumer before extension-dependency preparation or the VS Code smoke; its raw output is retained as `registered-contract-chain.log` in that job's diagnostics artifact.

These contract checks are separate from the `unitTests` extension-host label, which runs activation and command-registration smoke on the resolved stable VS Code build. Contract passes do not count as native GUI scenarios, add to the canonical E2E counts, or certify workspace lifecycle coverage. Actual source-bound Windows and Linux job results are required to establish Azure DevOps parity.

### Open latest stable VS Code and see extension activation
```powershell
pnpm run test:e2e-cli:open
```

Use this when you want to visually confirm the extension is loading and activating in a latest stable VS Code instance. The command builds the extension into `apps/vs-code-designer/dist`, downloads or reuses latest stable VS Code, installs extension dependencies into an isolated test profile, opens an empty VS Code window in a fresh profile for each run, and leaves the VS Code window running.

### Author Azure-backed tests with a local signed-in profile

Use a dedicated test profile when authoring tests that need real Azure credentials. Do **not** point the harness at your daily VS Code profile because the test config writes test-specific settings, extension dependencies, Azurite paths, and runtime dependency paths.

For a new local auth profile, open the durable Azure-auth test profile:

```powershell
pnpm run test:e2e-cli:open:azure
```

In the opened Extension Development Host:

1. Sign in through the Accounts menu or the Azure Resources view.
2. Confirm the Azure Resources view shows your subscriptions/resources.
3. Close the Extension Development Host normally so VS Code can flush profile and secret-storage state.
4. Reopen with the same command above to verify the sign-in persisted.

Some VS Code builds can show an MSAL account in the Microsoft Authentication log but still return no cached session for the exact Logic Apps Azure scope. The MSN Weather lifecycle therefore uses Azure CLI as a test-only token fallback when `az account get-access-token` is available. Keep the signed-in profile anyway because the local authoring flow still uses the VS Code Azure extensions and profile settings.

To explicitly warm the scoped VS Code Microsoft authentication session in the same durable profile, run:

```powershell
pnpm run test:e2e-cli:warm-azure-auth
```

Follow the browser/VS Code sign-in prompts in the opened Extension Development Host, wait for the **Azure auth warm-up completed** notification, then close the window normally so VS Code can flush profile and secret-storage state. If you need a specific tenant, set `$env:LA_E2E_CLI_AUTH_WARMUP_TENANT_ID = '<tenant-id>'` first. If the session still does not persist, make sure `az account show` succeeds in the same shell before running Azure-backed tests.

When you run a local Azure-backed test, reuse the exact same profile path:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = "$PWD\apps\vs-code-designer\.vscode-test\local-azure-auth\user-data"
pnpm run test:e2e-cli --label <yourLabel>
```

`@vscode/test-cli` can only run extension tests when no other VS Code instance is open. If the test fails with `Running extension tests from the command line is currently only supported if no other instance of Code is running`, close all VS Code windows and rerun the same command.

If you already signed in through a one-off visible profile, reuse that exact profile path instead:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = 'apps\vs-code-designer\.vscode-test\visible\<run-folder>\user-data'
pnpm run test:e2e-cli:open
```

Use the same `LA_E2E_CLI_USER_DATA_DIR` value when running the local Azure-backed test. Prefer an explicit `LA_E2E_CLI_USER_DATA_DIR` for Azure-authored local work so the opened sign-in window and the later test process use the same VS Code profile folder.

In the opened VS Code window, confirm no folder or workspace is loaded, then run **Developer: Show Running Extensions** and confirm **Azure Logic Apps (Standard)** is active and loaded from `apps/vs-code-designer/dist`. Run **Extensions: Show Installed Extensions** to confirm the manifest dependencies are installed in the isolated profile. You can also search the Command Palette for **Azure Logic Apps** commands, such as **Create new project...**. The window uses the same test environment variables as the automated smoke: `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`.

### Run the activation and command-registration smoke
```powershell
pnpm run test:e2e-cli
```

This is the default quick check for this suite. It builds the VS Code extension into `apps/vs-code-designer/dist`, builds the VS Code React webview bundle into `dist/vs-code-react`, compiles the CLI test files, launches latest stable VS Code without a startup folder/workspace, verifies the Logic Apps extension is loaded from the development `dist` folder, verifies its manifest dependencies are visible to VS Code, activates the extension, verifies core Logic Apps commands are registered, and opens the Create Workspace webview from the empty window.

The smoke prints explicit `[activation-smoke]` lines with the VS Code version, extension development path, dependency extension IDs and versions, and activation completion. It keeps the VS Code test window visible briefly before closing so the launch is observable during local runs. When the VS Code test window is visible, the smoke also writes the same lines to the **Logic Apps @vscode/test-cli Smoke** output channel.

The smoke also scans VS Code output for setup warnings that indicate an invalid extension-host baseline. `DialogService: refused to show dialog` and guarded `showInformationMessage` / `showWarningMessage` / `showErrorMessage` calls fail the run instead of being ignored, except for the known VS Code debug notification that can be emitted when the `func: host start` prelaunch task logs errors while the lifecycle test still proves the host and workflow run successfully. Expected modal confirmations in lifecycle tests are answered by the test-only dialog guard in `dialogGuard.ts`; product command code still calls the normal VS Code/azext-utils dialog APIs.

Optional Chat cleanup allows at most two workbench CDP attach attempts and one shared CDP `Runtime.evaluate` response-timeout retry across all pre-visible Chat-state reads, including the initial read and absent settling. The same connection and original cleanup deadline (8 seconds by default) are retained; a timeout removes only its pending request. The absent-settle polling window is not restarted after recovery, and an in-flight read retry remains bounded by the cleanup deadline. Retry diagnostics contain stage, attempt, and a fixed reason code, not raw transport errors. Persistent failure remains fatal. Once any visible Chat state is observed, commands, editor-tab closure and closure-settling reads remain strict and do not retry or restart attachment.

Screenshots are saved under `apps/vs-code-designer/.vscode-test/screenshots/cli/`. Evidence screenshots use the VS Code workbench CDP endpoint and are accepted only after an explicit state-aware readiness probe observes the expected workbench, wizard, designer, overview, or monitoring state across stable samples. Accepted captures write a same-name `.json` sidecar with allowlisted metadata only: checkpoint/phase/classification/verdict, opaque target and frame ids, generation, counts, timings, anchor geometry, and reason codes. Readiness-timeout and disabled optional captures also write sidecars when the harness reaches the screenshot observation path. Early binding, ownership, transport, or connection failures can happen before a PNG or sidecar exists; those remain test failures or diagnostic log evidence rather than rejected-capture artifacts. The sidecar intentionally omits raw DOM text, field values, URLs, absolute paths, environment values, tokens, and unrestricted exceptions.

Wizard captures carry the asserted field values, visible validation messages, Next/Create button state, review values, and scroll position for their checkpoint. Designer captures distinguish an editor with focus, an open dynamic-content section, and an inserted token with the expected source action. Overview and monitoring evidence use the live semantic connection and exact workflow/run binding; opening a monitoring canvas does not assert that Response is selected until the test selects it. Warmup and authoring designer-ready checkpoints have separate filenames. The required Azure Connected screenshot name remains unchanged.

Diagnostic screenshots are best-effort and are used for failure attachments, transient debug/loading states, or states that are already proven by durable non-visual assertions, such as a created workspace after the wizard closes. They do not wait for semantic readiness, and a failed diagnostic connection cannot replace the original test failure. The debug-starting diagnostic runs alongside required prompt handling rather than delaying it. The Windows full-desktop fallback is diagnostic-only and is never treated as asserted evidence. Field-validation screenshots remain optional: when `LA_E2E_CLI_CAPTURE_FIELD_VALIDATION_SCREENSHOTS=0` is set, validation assertions still run, but the optional PNG is skipped and its sidecar records `verdict: "disabled"` rather than `"accepted"`.

The activation/command-only smoke alias skips the Create Workspace webview check:

```powershell
pnpm run test:e2e-cli:smoke
```

### Run Create Workspace checks
```powershell
pnpm run test:e2e-cli:create-workspace
```

This launches latest stable VS Code without a startup folder/workspace, asserts the window is still empty before the command runs, executes `azureLogicAppsStandard.createWorkspace`, verifies VS Code opens a `mainThreadWebview-CreateWorkspace` tab titled **Create workspace**, and drives the real rendered webview through Chrome DevTools Protocol. The default target mirrors the high-value ExTester Create Workspace validation and core artifact categories for:

- workspace parent folder path validation and Standard required-field progression gating;
- workspace, logic app, and workflow name format validation, including reserved workflow names;
- Standard workflow type selection, review-step echoing, and final Next-button enablement;
- custom-code folder, namespace, function name, and .NET version gating;
- rules-engine folder, namespace, and function name gating;
- initial-render/content assertions, including available workflow type options;
- actual workspace creation for core Standard, custom-code, and rules-engine projects.

It captures screenshots for representative initial, valid-form, review, scrolled form, and created-workspace states. After clicking **Create workspace**, it verifies durable disk artifacts such as the `.code-workspace` file, generated logic app folder, workflow JSON, function project files, rules-engine artifacts, and the stable essentials in generated `.vscode/settings.json`, `extensions.json`, `tasks.json`, and `launch.json`. These checks intentionally assert durable contract-level details (extension recommendations, Logic Apps local-project settings, debug configuration type/name/request, and task labels/dependency shape) rather than byte-for-byte layout.

Focused Create Workspace slices are available when you need broader parity without running the whole suite:

```powershell
pnpm run test:e2e-cli:create-workspace:behavior
pnpm run test:e2e-cli:create-workspace:core-matrix
pnpm run test:e2e-cli:create-workspace:preview-matrix
pnpm run test:e2e-cli:create-workspace:codeful
pnpm run test:e2e-cli:create-workspace:fixtures
pnpm run test:e2e-cli:create-workspace:full
```

The behavior target verifies initial render/content, Standard required-field progression, every field-level invalid-value validation message for Standard/custom-code/rules-engine fields, workflow type review/back preservation, and app-type cleanup. During field validation it logs `[create-workspace-validation]` lines and scrolls the active field into view before asserting the expected message. It also saves focused CDP screenshots named `create-workspace-validation-*` unless `LA_E2E_CLI_CAPTURE_FIELD_VALIDATION_SCREENSHOTS=0` is set. The core matrix covers Standard, custom-code, and rules-engine creation for Stateful/Stateless variants. The preview matrix covers Autonomous agents and Conversational agents across Standard/custom-code/rules-engine artifact generation, including deterministic workflow `kind`, Standard agent action/trigger shape, and custom-code/rules-engine starter function action names. Custom-code and rules-engine preview selections currently reuse their function/rules starter workflow templates; the stable preview distinction there is the generated workflow `kind`. The codeful target covers the current/modern codeful template plus the legacy-control `.csproj` target shape used by ExTester Phase 4.10: both cases create through the same `Logic app (codeful)` product radio, then the legacy-control case patches only the generated `.csproj` target hooks to `AfterTargets="Publish"` because latest stable VS Code exposes no separate legacy-control picker. Both cases verify `.csproj`, workflow `.cs`, `Program.cs`, `host.json`, `local.settings.json`, and stable codeful `.vscode` settings/tasks/launch essentials while asserting no codeless `workflow.json` is generated. ExTester remains the owner for legacy/modern codeful runtime-task semantics.

The fixtures target is a focused Create Workspace parity mode for the `@vscode/test-cli` harness. It creates the four downstream fixture shapes through the real wizard — Standard Stateful, Standard Stateless, CustomCode Stateful, and RulesEngine Stateful — and writes a downstream-compatible manifest to `%TEMP%\la-e2e-test\created-workspaces.json` (or `os.tmpdir()/la-e2e-test/created-workspaces.json` on non-Windows). The manifest shape intentionally matches `src/test/ui/workspaceManifest.ts` so consumers can read `wsDir`, `wsFilePath`, `appDir`, `wfDir`, `appType`, and `wfType` the same way they read ExTester fixtures. The mode preserves the generated workspace directories because the manifest points at absolute paths.

This CLI fixture mode does not replace or remove ExTester coverage. `run-e2e.js` downstream ExTester phases continue to treat `p41a-fixtures` as their canonical fixture owner; use this CLI target when you specifically need latest-stable `@vscode/test-cli` Create Workspace parity or a local manifest produced by the CLI harness.

The full Create Workspace script builds once, then runs the focused labels in separate VS Code hosts instead of one very long webview session. This keeps dropdown/popover state isolated without repeating the extension/webview/test compile step for every slice. The wrapper suppresses known non-test VS Code host noise, such as AgentHost token probes, TextMate worker import chatter, and C# Dev Kit background solution-open errors from generated projects. Set `LA_E2E_CLI_SHOW_VSCODE_NOISE=1` to show the raw host output when debugging VS Code itself.

### CI coverage

`.github/workflows/vscode-e2e.yml` runs the focused Create Workspace labels in a dedicated `vscode-e2e-cli-create-workspace` matrix:

- `createWorkspaceBehavior`
- `createWorkspaceCoreMatrix`
- `createWorkspacePreviewMatrix`
- `createWorkspaceCodeful`

`createWorkspaceFixturesManifest` is intentionally a focused/manual fixture producer for now; ExTester `p41a-fixtures` remains the fixture-backed downstream owner in the `run-e2e.js` matrix.

This job is additive to the existing ExTester matrix; it does not replace `src/test/ui/` coverage. The generated workspace designer/runtime lifecycle, NuGet conversion lifecycle, and codeful debug task parity targets remain focused/manual for now because they exercise designer open, .NET build, Azurite/runtime startup, trigger execution, conversion, or long-running task chains, making them substantially higher-cost and higher-flake than the focused Create Workspace parity checks.

Each matrix row is a separate GitHub Actions check named `vscode-e2e-cli-create-workspace (<label>)`. The test process exit code controls the check result, so a failing assertion fails only that label row while the other labels continue because the matrix uses `fail-fast: false`.

Result artifacts and summaries are intentionally structured so users do not need to read the raw log first:

- Each label writes a GitHub Actions step summary with outcome, Mocha pass/fail/pending counts, pass rate, structured-result artifact name, log artifact name, and screenshot artifact name.
- Each label uploads `vscode-e2e-cli-test-results-<label>` containing `<label>.json`, `<label>.junit.xml`, and `<label>.summary.md`.
- Each label uploads raw logs as `vscode-e2e-cli-log-<label>`.
- Each label uploads screenshots as `vscode-e2e-cli-screenshots-<label>` with 30-day retention.
- A follow-up `vscode-e2e-cli-create-workspace-report` job downloads all label result artifacts and writes an aggregate GitHub Actions dashboard with total passing, failing, pending, failed labels, and pass rate across the whole Create Workspace CLI matrix.
- The aggregate report uploads `vscode-e2e-cli-test-results-summary`, which contains aggregate JSON, aggregate JUnit XML, a Markdown dashboard, and `vscode-e2e-cli-create-workspace-trend.jsonl` for pass-rate ingestion across workflow runs.

On failure, the per-label summary includes a short failure excerpt and points to both the structured result artifact and screenshot artifact. Use the uploaded log only when you need the complete stack trace or full VS Code host output. For multi-profile lifecycle labels, VS Code profile logs are copied under the lifecycle artifact label with phase-named folders such as `vscode-logs/cli/msnWeatherLifecycle/msn-weather-bootstrap__...`, `vscode-logs/cli/msnWeatherLifecycle/msn-weather-create__...`, and `vscode-logs/cli/msnWeatherLifecycle/msn-weather-run__...`. Each folder contains a `profile-log-index.md` plus an `azure-logic-apps-channel/` directory with the copied **Azure Logic Apps (Standard)** output-channel log when VS Code produced one. Generated project snapshots are published separately as `vscode-e2e-cli-generated-workspaces-<label>`; start with `index.md`, then open the relevant `*/index.md` and `workspaces/<workspace>/` folder for the redacted on-disk `.code-workspace`, `host.json`, `local.settings.json`, workflow JSON, project source, `.vscode/tasks.json`, `launch.json`, and `settings.json`. These snapshots are captured before harness cleanup on success and failure, redact sensitive JSON/text values in memory before writing diagnostic copies to disk (including `connectionKey` in `local.settings.json` and `connectionRuntimeUrl` in `connections.json`), exclude bulky/generated/auth-cache paths such as `.vscode-test`, `node_modules`, `.git`, `bin`, `obj`, VS Code storage, extensions, and files over 1 MiB, and reflect only saved on-disk state; unsaved designer canvas state may be absent if the failure happened before save. The `createWorkspaceBehavior` label intentionally validates wizard fields, review/back, and app-type cleanup without clicking **Create**, so its generated-workspaces artifact should contain an explicit `no-workspace-created.txt` reason instead of project files. Snapshot artifacts are diagnostic evidence, not fully rebuildable workspace archives: unsupported formats remain omitted until their redaction is explicitly supported. Current known omissions include Rules Engine `.xsd` schema files and Codeful `nuget.config`; use the log plus saved allowlisted project files for diagnosis, not for byte-for-byte project reconstruction.

#### Azure DevOps execution model for the GitHub repo

The LogicAppsUX source can stay in GitHub while the VS Code E2E gate runs in Azure DevOps. Use one of these two checkout models:

| Model | Use when | Checkout shape |
|---|---|---|
| Azure Pipeline created from the GitHub repo | Required for GitHub PR checks and normal branch triggers. | Install/authorize the Azure Pipelines GitHub App or a GitHub service connection for `Azure/LogicAppsUX`; keep the YAML in the GitHub repo and use `checkout: self`. |
| Azure Repos bootstrap pipeline with a GitHub repository resource | Good for scheduled/manual ADO-only runs owned by an existing ADO project. | Store a tiny launcher YAML in Azure Repos, add `resources.repositories` with `type: github`, `endpoint: <GitHub service connection>`, `name: Azure/LogicAppsUX`, and `checkout: logicappsux`. Repository-resource triggers do not provide GitHub PR validation; pass the ref manually or run on a schedule. |

The staged checked-in starting point is `.config/vscode-e2e-cli.1es.yml`. It is a 1ES/MicroBuild pipeline for the latest-stable `@vscode/test-cli` baseline, with shared templates under `.config/templates/vscode-e2e-cli-*.yml`; legacy registered-path copies under `.azure-pipelines/` remain separate until an owner-approved cutover.

The canonical full ADO inventory is twelve independent jobs: both Linux and Windows run `unitTests`, `createWorkspaceBehavior`, `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix`, `createWorkspaceCodeful`, and `msnWeatherLifecycle`. Parity is defined by the same stable scenario/assertion/variant set on each OS, including the core matrix, preview matrix, and codeful variant identities, not by dummy tests or job-count padding. The Windows-only `createWorkspaceBehaviorSmoke` lane remains selectable in diagnostic mode for a shorter compatibility check, but it is not part of the `windows` alias or the protected `verify_both_os_full_rollup` gate.

Recommended first ADO gate:

1. Create a pipeline in the ADO project that will own the gate, preferably from the GitHub repo if the result should appear as a GitHub PR check.
2. Start with the existing non-Azure `@vscode/test-cli` Create Workspace labels. They need GitHub checkout, Node/pnpm, Linux GUI dependencies, and `xvfb`; they do not need an Azure ARM service connection.
3. Mirror the existing GitHub Actions build-once/fan-out pattern:
   - install Node and pnpm;
   - run `pnpm install --frozen-lockfile --strict-peer-dependencies`;
   - run `pnpm turbo run build:extension --cache-dir=.turbo`;
   - run `npx tsup --config apps/vs-code-designer/tsup.e2e.test.config.ts`;
   - run `pnpm --dir apps/vs-code-designer run test:e2e-cli:compile`;
   - publish a tar artifact containing `apps/vs-code-designer/dist/` and `apps/vs-code-designer/out/`;
   - fan out one job per label and run `xvfb-run ... pnpm exec node scripts/run-e2e-cli.js --label <label>` from `apps/vs-code-designer`.
4. Publish `apps/vs-code-designer/.vscode-test/results/*.junit.xml` with `PublishTestResults@2`, then stage one diagnostics artifact per independent lane. Each `vscode-e2e-cli-diagnostics-<os-suite>` artifact should contain `results/`, `log/`, `screenshots/`, and `generated-workspaces/`; keep the shared extension/test build artifact separate. ADO run summaries can use `##vso[task.uploadsummary]<path-to-summary.md>`.

The first native scenario, `ogf-launch-config-generated-name-standard-stateful`, proves that a real wizard-created workspace has a generated `.vscode/launch.json` debug configuration name ending with the created Logic App name, not the hardcoded default. Public `ogfScenarios` evidence retains exact phase, variant, assertion identities and source/build/platform provenance, but contains no private catalogue identifiers or links. Private traceability is a separate read-only crosswalk join; a native pass neither approves visual baselines nor certifies a catalogue case or writes external results.

The private pipeline requires the secret definition variable `E2E_TRACEABILITY_CROSSWALK_JSON`. Its generic schema is `{ schemaVersion: 1, scenarios: [{ scenarioId, suiteId, expectedPhase, executedVariant, assertionIdentities, source: { system, caseId, caseRevision, stepMappings: [{ stepId, stepOrdinal }] } }] }`. Every registered scenario needs an exact variant/assertion binding; missing, malformed or incomplete configuration fails explicitly before GUI execution. The secret is read only by the preparation step into an agent-temporary file, never passed to VS Code or added to public source/results. A successful complete core-matrix result is joined separately under the existing restricted diagnostics artifact's `private-traceability/createWorkspaceCoreMatrix.json`; source SHA, build ID, platform and resolved VS Code version must match admitted execution, and terminal evidence must match summary evidence. Failed terminals, signals, diagnostic errors, zero-test or missing scenario evidence cannot produce a successful join. Local standalone native execution does not require private enrichment. Private npm-feed selection is supplied through the existing release pipeline's required `npmFeed` parameter, not a public organization-specific default; release execution is not validated by these test-only checks.

The Azure-backed MSN Weather lifecycle uses the specifically owner-approved operational connection `LogicAppsVSCode-E2E-SignIn`, scoped to its approved test tenant, subscription and resource group. Do not reuse another team's service connection or change scopes without explicit ownership and pipeline authorization.

The Azure-backed job should run inside `AzureCLI@2`, mint a token for `https://management.core.windows.net/`, and pass the existing environment contract into `@vscode/test-cli`:

```yaml
- task: AzureCLI@2
  displayName: Run VS Code MSN Weather lifecycle
  inputs:
    azureSubscription: LogicAppsVSCode-E2E-SignIn
    scriptType: bash
    scriptLocation: inlineScript
    useGlobalConfig: false
    visibleAzLogin: false
    inlineScript: |
      set -euo pipefail
      account_subscription_id="$(az account show --query id --output tsv)"
      account_tenant_id="$(az account show --query tenantId --output tsv)"
      if [[ -z "$account_subscription_id" || -z "$account_tenant_id" ]]; then
        echo 'AzureCLI service connection did not provide subscription and tenant identity.' >&2
        exit 1
      fi
      export LA_E2E_CLI_AZURE_SUBSCRIPTION_ID="$account_subscription_id"
      export LA_E2E_CLI_AZURE_TENANT_ID="$account_tenant_id"
      export LA_E2E_CLI_AZURE_ACCESS_TOKEN="$(az account get-access-token --resource https://management.core.windows.net/ --query accessToken -o tsv)"
      cd apps/vs-code-designer
      xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" pnpm exec node scripts/run-e2e-cli.js --msn-weather-lifecycle
  env:
    LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: LogicAppsVSCode-E2E-Fixtures
    LA_E2E_CLI_AZURE_LOCATION_NAME: westus
```

Keep any shared live-resource job serialized with an ADO Exclusive Lock or equivalent if multiple runs use the same resource group or managed connections.

### Run generated workspace designer/runtime lifecycle
```powershell
pnpm run test:e2e-cli:workspace-lifecycle
```

This launches latest stable VS Code from an empty window, creates Standard, custom-code, and rules-engine workspaces through the real Create Workspace webview, opens the generated folders in fresh test hosts, opens the local designer, and captures screenshots at the important creation/designer/debug/overview stages. The Standard lifecycle adds the built-in Request trigger and Response action through the designer UI, saves the workflow, starts the generated Logic Apps debug configuration, opens Overview, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

The custom-code and rules-engine lifecycles use the workflows generated by Create Workspace. Before debug, the test explicitly builds the sibling generated .NET function project with `dotnet build` so the runtime has `lib\custom\<functionName>\function.json` metadata even though the test host starts from only the Logic App folder. It then opens designer, saves, starts debug, opens Overview, waits for the Run trigger and callback URL to become ready, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

This smoke proves the latest-VS Code extension host can load generated projects, hydrate designer webviews, start the product-managed Azurite/runtime path, and execute saved workflows. It deliberately keeps the broader webview DOM authoring flows in ExTester.

### Run local Azure-backed MSN Weather designer lifecycle
```powershell
pnpm run test:e2e-cli:msn-weather-lifecycle
```

This local-only target reuses the signed-in test profile described above, creates a Standard Stateful workspace through the real Create Workspace webview, opens the designer with **Use connectors from Azure**, authors **Request → Get current weather → Response** through the designer UI, sets the MSN Weather Location parameter to `98058`, saves the workflow, starts debug, opens Overview, clicks **Run trigger**, opens the new succeeded run row, and inspects the Response action output through the runtime management API to prove it returns the full MSN Weather action body.

Before the Create Workspace and run profiles open the designer, the wrapper runs a dedicated `runtimeDependencyBootstrap` `@vscode/test-cli` profile against an empty isolated dependency root created with `mkdtemp` under the OS temp directory. The wrapper proves the root starts empty before VS Code launches, then the profile uses minimal activation, enables strict dependency validation, invokes the product **Azure Logic Apps: Validate and install dependency binaries** command, and fails fast unless the isolated Func Core Tools launcher plus the .NET 8 Standard `FuncCoreTools/in-proc8/func` worker host (`func.exe` on Windows) both exist and `--version` succeeds. Other Func Core Tools variants, such as `in-proc6`, are captured as diagnostics only. Runtime binaries are not copied into `.vscode-test` artifacts; the lifecycle keeps only manifests, VS Code logs, channel logs, generated-workspace snapshots, and `msn-weather-lifecycle/runtime-dependency-probe-*.md`, and deletes its owned temp dependency root after a successful lifecycle unless preservation is explicitly requested. This intentionally does not delete or reuse a developer's `~/.azurelogicapps/dependencies` cache, and it catches cold-agent provisioning failures before the later designer-open wait.

The MSN Weather run also validates the generated app's root `local.settings.json` Azure target at multiple stages: after preseed, after warmup, after workflow save, immediately before debug, and after debug start. It compares the saved `Values` object against an independent expected target from `LA_E2E_CLI_AZURE_SUBSCRIPTION_ID`, `LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME`, `LA_E2E_CLI_AZURE_LOCATION_NAME`, `LA_E2E_CLI_AZURE_TENANT_ID`, and the normalized `LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL`/`WORKFLOWS_MANAGEMENT_BASE_URI` value. Each expected and actual value must be a non-empty string, and mismatches fail with per-key status (`missing`, `empty`, `wrong-type`, or `mismatch`) without dumping tokens or full settings. Safe per-stage evidence is written under workspace-level `.vscode-e2e-diagnostics/` outside the live Logic App root and summarized in the generated-workspace artifact index.

After the MSN Weather action is selected and configured, the test keeps that operation's details panel open and waits for the scoped connection status for **Get current weather** to show the exact visible **Connected** state before adding the Response action. **Disconnected** and connection-error states fail immediately, persistent **Loading connection...** times out with the last scoped panel text, and the test captures `workspace-lifecycle-<label>-get-current-weather-connected` while the status is visible before closing the panel. The ordered log milestones are `azure-action-added`, `azure-action-configured`, `azure-action-connected`, then `azure-action-ready-for-next-action`.

When the MSN Weather lifecycle fails, the diagnostics preserve the phase contract instead of only reporting the final assertion. Request insertion, MSN insertion, and discovery attempts are retained in the workspace phase JSON. After the response Body picker is configured, the lifecycle requires Save and a saved workflow definition containing the Weather Body binding before runtime preparation continues. It intentionally does not run the generic post-save full-canvas `designer-open` checkpoint for MSN Weather, because that checkpoint only proves Request/Response viewport visibility and is redundant with the stricter picker/configured/save/saved-definition evidence. Non-MSN lifecycle flows still keep the generic final canvas checkpoint. Failed or canceled workflow runs terminate with the run ID plus redacted run/action diagnostics; collection failures are reported explicitly and do not mask the terminal run status. Discovery failures log the scoped target, actual hit-test result, frame, viewport, and post-click state so selector, overlay, and menu-opening failures can be distinguished from connector/runtime failures.

Direct `msnWeatherLifecycle.terminal-result.json` keeps the original schema and aggregates exactly the actual `msnWeatherLifecycle:create` and `msnWeatherLifecycle:run` records. The wrapper separately awaits the preparatory `runtimeDependencyBootstrap:bootstrap` profile and retains its standalone terminal; it does not fabricate a third observation in the direct MSN aggregate. Both unique lifecycle phases must be complete with exit zero, no signal or diagnostic error, and their existing cleanup verification. Missing, duplicate, unexpected or failed phase records remain incomplete. Aggregate completeness is phase accounting, not a new whole-lifecycle or process-cleanup certification.

The restored MSN execution path keeps the previously successful panel/debug/task teardown and runner-owned workspace/runtime cleanup policy unchanged. It does not add cached-extension deactivation, PID/ancestry preflight, strict workspace-removal or root-absence gates. Existing removal warnings remain warnings; successful phase reporting must not be interpreted as proof that all runtime handles or directories were removed. Later owned-process/shutdown controls remain separate from this baseline execution path.

Summary generation and existing staging use the same terminal validator. The original direct schema is recognized only without `suiteId` or `lifecycleFinalized`; newer/batch terminals still require their finalized three-phase contract. Missing, malformed, incomplete or unsuccessful terminals remain failures. `executedTestCounts` retains actual feature-body counts separately from harness failures; these preparation phases represent one logical MSN runtime scenario, not extra tests or case coverage. Run `npm run test:e2e-cli:msn-reporting-unit` for saved Linux/Windows reporting and consumer regressions; these offline controls do not execute the native scenario again.

Use the following repeatable setup for a new developer machine or a new test profile:

1. Sign in with Azure CLI and choose the subscription the test should use.
   ```powershell
   az login
   az account set --subscription '<subscription-id-or-name>'
   az account show
   ```
2. Close all VS Code windows. `@vscode/test-cli` cannot launch extension tests while another Code instance is running.
3. Open the durable Azure-auth test profile, sign in through VS Code, verify the Azure Resources view can see the target subscription, then close the Extension Development Host normally.
   ```powershell
   pnpm run test:e2e-cli:open:azure
   ```
   The durable profile is `apps\vs-code-designer\.vscode-test\local-azure-auth\user-data`. Do not reuse your daily VS Code profile.
4. Warm the exact Microsoft Authentication scope used by Logic Apps designer connector calls, wait for the **Azure auth warm-up completed** notification, then close the Extension Development Host normally.
   ```powershell
   pnpm run test:e2e-cli:warm-azure-auth
   ```
5. Configure the Azure connector target. The wrapper auto-detects the current Azure CLI subscription/tenant and defaults the managed API location to `westus`, but it still needs a resource group. Set it once as an Azure CLI default, or preseed the environment variable in the shell that will run the test. Use a managed API location where `Microsoft.Web/locations/managedApis/msnweather` is available; `westus` is the recommended local default. `australiacentral` is not currently valid for this managed connector catalog call. Automated MSN Weather runs require a complete expected target, including tenant; if you intentionally want to let a local interactive VS Code profile populate the Azure target without preseed assertions, set `LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS=1`.
   ```powershell
   az configure --defaults group='<resource-group-name>'

   # Optional explicit overrides:
   $account = az account show | ConvertFrom-Json
   $env:LA_E2E_CLI_AZURE_SUBSCRIPTION_ID = $account.id
   $env:LA_E2E_CLI_AZURE_TENANT_ID = $account.tenantId
   $env:LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME = '<resource-group-name>'
   $env:LA_E2E_CLI_AZURE_LOCATION_NAME = 'westus'
   ```
6. Run the lifecycle. Add `-- --visible-delay-ms 15000` when you want time to watch each short-lived Extension Development Host before it exits.
   ```powershell
   pnpm run test:e2e-cli:msn-weather-lifecycle
   pnpm run test:e2e-cli:msn-weather-lifecycle -- --visible-delay-ms 15000
   ```

The wrapper automatically injects an Azure CLI ARM token into the extension host under `VSCODE_RUNNING_TESTS` if the scoped VS Code session is not available. That means the VS Code title bar can still show **Sign in** while the test has a valid ARM token for connector discovery. Set `LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK=1` to debug pure VS Code auth persistence, or set `LA_E2E_CLI_AZURE_ACCESS_TOKEN` yourself to provide a token explicitly.

If you signed in through a one-off visible profile instead of the durable Azure-auth profile, set `LA_E2E_CLI_USER_DATA_DIR` to that exact `user-data` folder before running the lifecycle:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = 'apps\vs-code-designer\.vscode-test\visible\<run-folder>\user-data'
pnpm run test:e2e-cli:msn-weather-lifecycle
```

Use this target when authoring Azure-backed designer tests locally. It is intentionally not part of the default CI matrix because it depends on cached Azure credentials, a real subscription/resource group/location, and managed connector availability. `LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL` is optional when your profile needs a non-public Azure cloud.

#### Using an owner-approved test tenant

LogicAppsUX VS Code E2E can target an owner-approved test tenant for Azure connector tests, but it cannot directly reuse a browser test suite's authentication cache:

- Browser authentication tokens and certificate-based sign-in fixtures are specific to their browser test environment.
- VS Code E2E runs inside an extension host and uses VS Code Microsoft authentication plus the test-gated Azure CLI ARM-token fallback. Browser `storageState.json` / `session-storage.json` files do not populate `vscode.authentication` sessions.
- To run this lifecycle against an owner-approved test tenant, sign Azure CLI into that tenant, use an already authorized subscription/resource group where the test identity can create managed API connections, and set the same `LA_E2E_CLI_AZURE_*` variables above. Do not provision resources, expand permissions, or mutate another suite's shared fixtures without separate authorization.

Example local setup:

```powershell
az login --tenant '<tenant-id>'
az account set --subscription '<subscription-id-or-name>'
az configure --defaults group='<logicappsux-vscode-e2e-resource-group>'

$account = az account show | ConvertFrom-Json
$env:LA_E2E_CLI_AZURE_SUBSCRIPTION_ID = $account.id
$env:LA_E2E_CLI_AZURE_TENANT_ID = $account.tenantId
$env:LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME = '<logicappsux-vscode-e2e-resource-group>'
$env:LA_E2E_CLI_AZURE_LOCATION_NAME = 'westus'
pnpm run test:e2e-cli:msn-weather-lifecycle
```

For CI, use the pipeline's existing authorized test-tenant Azure service connection or equivalent approved secretless login rather than importing browser authentication state. Mint an ARM token for `https://management.core.windows.net/`, export it as `LA_E2E_CLI_AZURE_ACCESS_TOKEN`, and pass the tenant/subscription/resource-group/location variables into `@vscode/test-cli`. Keep the run serialized if the resource group or managed connections are shared.

### Run NuGet conversion debug/run lifecycle
```powershell
pnpm run test:e2e-cli:nuget-conversion-lifecycle
```

This focused parity target creates a Standard Stateful workspace through the Create Workspace webview, reopens the generated Logic App folder in a fresh latest-stable VS Code host, seeds a deterministic built-in Request trigger + Response action workflow, starts the bundle-based debug configuration, runs the workflow through Overview, and verifies run history plus action success. It then converts the same project through `azureLogicAppsStandard.switchToDotnetProject`, confirms the regenerated NuGet `.csproj`, `.vscode/tasks.json`, `.vscode/launch.json`, `.vscode/settings.json`, and `.vscode/extensions.json` contracts, starts the post-conversion debug session without harness port cleanup, and proves the workflow runs successfully again. The post-conversion proof is run-id specific: the test records the pre-click latest run, waits for a new run id after clicking **Run trigger**, requires the Overview run-history row for that new id to reach `Succeeded`, and then verifies the same new run through the runtime API and action history.

This is the CLI counterpart for the issue #7040-style NuGet lifecycle. ExTester still owns the Selenium command-palette/UI path, but this latest-stable baseline now owns the extension-host runtime contract.

### Run codeful modern-vs-legacy debug task parity
```powershell
pnpm run test:e2e-cli:codeful-debug-tasks
```

This focused parity target creates codeful workspaces through the real Create Workspace webview. The modern case uses the current generated `.csproj` target hooks. The legacy-control case patches only the generated `.csproj` `CopyToCodefulFolder` and `ReplaceLanguageNetCore` hooks to `AfterTargets="Publish"`, matching the ExTester Phase 4.10 negative-control shape.

Each variant is reopened from its generated `.code-workspace` in a fresh latest-stable VS Code host with runtime dependency validation and codeful design-time auto-start enabled. The test patches only the generated codeful source to a connector-free built-in Request/Response workflow so the F5 path validates task/runtime behavior instead of connector SDK surface drift, records VS Code task events during F5, requires the Functions host to report `Running`, and captures debug screenshots. Modern must run `clean` + `build` and start `func: host start` without running `clean release` or `publish`; legacy must run `clean`, `build`, `clean release`, `publish`, and start `func: host start`. Build/clean/publish exit codes must be 0. If a `workflow-designtime/local.settings.json` file is created in the latest-stable host, the test also asserts it uses `FUNCTIONS_WORKER_RUNTIME=node` and does not set `FUNCTIONS_INPROC_NET8_ENABLED`; the ExTester Phase 4.10 scenario remains the hard owner for the pre-F5 design-time auto-start side-effect.

To keep that Create Workspace window visible longer while debugging locally:

```powershell
pnpm run test:e2e-cli:show-create-workspace
```

That runs the same Create Workspace smoke and keeps VS Code open for 60 seconds before the test host exits.

### Run single-host tests with a specific label
```powershell
pnpm run test:e2e-cli --label unitTests
pnpm run test:e2e-cli --label createWorkspace
pnpm run test:e2e-cli --label createWorkspaceBehavior
pnpm run test:e2e-cli --label createWorkspaceCoreMatrix
pnpm run test:e2e-cli --label createWorkspacePreviewMatrix
pnpm run test:e2e-cli --label createWorkspaceCodeful
pnpm run test:e2e-cli --label createWorkspaceFixturesManifest
```

Use raw `--label` only for labels that can run in one VS Code host. Do not run `workspaceLifecycle`, `nugetConversionLifecycle`, or `codefulDebugTasks` directly with `--label` unless you are debugging `scripts/run-e2e-cli.js`; those labels require manifest and environment setup from their package scripts:

```powershell
pnpm run test:e2e-cli:workspace-lifecycle
pnpm run test:e2e-cli:nuget-conversion-lifecycle
pnpm run test:e2e-cli:codeful-debug-tasks
```

### Compile tests only (without running)
```powershell
pnpm run test:e2e-cli:compile
```

## Configuration

The test configuration is in [.vscode-test.mjs](../../.vscode-test.mjs):

- **unitTests**: extension activation and command-registration smoke tests
- **createWorkspace**: default Create Workspace validation plus core creation smoke
- **createWorkspaceBehavior**: initial render/content, review/back, and app-type cleanup checks
- **createWorkspaceCoreMatrix**: Standard/custom-code/rules-engine Stateful and Stateless artifact creation
- **createWorkspacePreviewMatrix**: Autonomous agents and Conversational agents artifact creation across app types
- **createWorkspaceCodeful**: current/modern and legacy-control codeful artifact creation
- **createWorkspaceFixturesManifest**: creates Standard Stateful, Standard Stateless, CustomCode Stateful, and RulesEngine Stateful fixtures and writes the ExTester-compatible `created-workspaces.json` manifest
- **workspaceLifecycle**: generated-workspace designer open and runtime execution smoke for Standard, custom-code, and rules-engine projects
- **nugetConversionLifecycle**: creates a Standard Stateful workspace, seeds a deterministic Request/Response workflow, proves bundle debug/run, converts the same project to NuGet, verifies regenerated NuGet `.csproj` and `.vscode` artifacts, then proves post-conversion debug/run without harness port cleanup
- **codefulDebugTasks**: creates modern and legacy-control codeful workspaces, reopens each in a fresh latest-stable host with design-time auto-start, records VS Code task events to verify modern skips `publish` while legacy still runs `clean release` + `publish`, and asserts the design-time Node-worker guard if latest stable creates design-time settings before F5

The config builds from `dist/`, sets `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`, lets `@vscode/test-cli` install extension dependencies into its managed test profile, does not pass a startup workspace folder, and uses an isolated user-data directory. Set `LA_E2E_CLI_USER_DATA_DIR` to reuse an explicit local profile, such as a profile where you signed in for Azure-backed test authoring. On non-Windows agents it uses a short temp user-data path to avoid Unix socket path-length issues. The CLI-only extension build externalizes `@microsoft/vscode-azext-utils` so the test harness can register expected dialog responses on azext action contexts without adding test guards to product command files.

The legacy files under `src/test/e2e/integration/` are not part of this baseline. Some of them open designer webviews or exercise workspace-conversion UI without the ExTester harness, which can produce errors such as missing `dist/vs-code-react/index.html` or refused dialogs in extension-host tests.

For a detailed traceability view from the ExTester Create Workspace behavior and fixture suites to these CLI labels, see [createWorkspaceParityMap.md](./createWorkspaceParityMap.md).

## Test Development

### Using VS Code Extension Test Runner

1. Install the [VS Code Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner) extension
2. Open the Test Explorer view
3. Run individual tests or test suites from the UI

### Writing New Tests

Tests use Mocha's BDD interface (`suite`, `test`) with Node.js assertions:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
  test('My test case', async () => {
    // Access VS Code API
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.length > 0);
  });
});
```

## Startup Workspace

These CLI tests intentionally start with no folder and no `.code-workspace` loaded. Do not add `e2e/test-workspace` or another prebuilt project as the default startup resource for this baseline; the first project/workspace entry point under test is the Create Workspace command.

## Differences from vscode-extension-tester

The existing `src/test/ui/` tests use `vscode-extension-tester` which:
- Uses Selenium WebDriver to control VS Code UI
- Good for visual/UI testing
- Slower but more comprehensive UI interaction

These CLI-based tests:
- Run directly in VS Code's extension host
- Faster execution
- Better for API-level testing
- Easier to debug
- Provide focused Chrome DevTools Protocol coverage for Create Workspace, designer, and Overview smoke paths
- Do not replace ExTester; keep ExTester for full designer and wizard DOM flows
