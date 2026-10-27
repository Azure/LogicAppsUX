# VS Code CLI E2E authoring: established contracts

Read this guide before adding or changing VS Code native tests. It is the
canonical, repository-tracked source of reusable authoring lessons. Private case
catalogues, original-item text, run receipts and screenshots belong in the
separate private traceability records, not this guide.

## Evidence levels

| Level | Meaning |
| --- | --- |
| Policy | A deliberate engineering/user decision that implementations must follow. |
| Regression-tested | The real helper or production DOM is exercised by automated controls. |
| Native-validated | An actual source-bound Windows/Linux consumer proves the stated behavior. |
| Open limitation | A prerequisite, assertion or evidence gate still lacks proof. |

Do not promote a policy or unit control to native success. Record the exact
scope proved, and preserve earlier failures rather than rewriting their history.

## 1. Azure connector setup is affirmative

**Policy:** When standard setup detects **Enable connectors in Azure**, choose
**Use connectors from Azure**, or the exact **Yes** option when that is the
control's label. Do not automatically select Skip for now, No, Cancel or Escape.

Reuse `affirmativeAzureConnectorPrompt` and `selectWorkbenchPromptOption` in
`apps/vs-code-designer/src/test/e2e/workbenchPromptSelection.ts`. The selector
must use an enabled, visible control in the matching prompt container. Missing
or disabled affirmative controls are blocked setup, not permission to choose a
negative fallback.

Invoke prompt handling before and while waiting for the designer. Detection
already existing in a shared helper does not mean every new test actually calls
that helper. An unanswered connector quick-pick can appear as a designer
readiness timeout even when the design-time host has started.

Affirmative selection continues into subscription/resource-group/authentication
setup. Supply the existing approved service connection and fixture context,
select the existing approved resource group, and fail explicitly when they are
unavailable. Do not create new resources, acquire new grants or intercept dialog
return values to obtain a pass.

Check the consumer's activation mode as well as its credentials. Minimal
activation can register local commands but return before Azure Resources and
the account tree are initialized. An affirmative connector wizard then cannot
use the missing subscription picker. Reuse the actual production initialization
path needed by the consumer; do not fabricate an account tree or wizard result.
Environment target values alone also do not select subscription/resource-group
UI controls. Verify the exact approved selection and persisted location rather
than assuming that the runner's location parameter controls the selected group.

The HTTP fixture consumer reads the existing `LA_E2E_CLI_AZURE_*` account/target
exports in `azureConnectorFixture.ts`. Its native picker journey uses the approved
subscription identity and existing resource-group name only, and independently
checks the local target settings written by the product wizard before authoring.
The installed Azure utility can label its existing resource-group list
**Select a resource group for new resources.**; that title is not permission to
select **Create new resource group**. Exact existing-target selection and a
read-only subscription-name lookup have regression controls in
`azureConnectorFixture.unit.ts`; source-bound native verification remains open.
Strict reusable fixture parsing/verification and exact existing-target policy
live in `approvedAzureFixture.ts`. HTTP consumes these contracts while retaining
its actual UI journey and independent product-persistence proof; it does not use
the preconfiguration lease to claim picker coverage. Pure lease controls do not
resolve the separate Stateless review or native evidence gates.
Affirmative wizard consumers must not use command-only minimal activation: the
normal activation path initializes the real Azure Resources account tree used
by `getSubscriptionPromptStep`. HTTP keeps bootstrap admission separate and
uses normal activation with strict managed runtime validation for reopen.
Quick-pick title/input readiness is not row readiness. The shared helper waits
within the original deadline for the exact affirmative or approved existing
target row to become uniquely hit-testable. A read-only input or an initially
empty subscription/resource-group list is transitional, not permission to
choose another row. Ambiguous rows, unsupported prompt transitions, creation,
sign-in and foreign targets still fail closed.
The selected existing RG's actual ARM location is the persistence oracle;
template location defaults are not proof of the resource's location.

This policy is specific to Azure connector setup. Tests intentionally exercising
workspace **No** or **Cancel** retain those original actions and assertions.

**Current boundary:** The affirmative policy has helper regression coverage;
its new native HTTP flow still requires source-bound validation. Do not claim
that the affirmative journey has already passed on both operating systems.

## 2. Bind to the actual designer and editor

Choose the required designer version explicitly. A V2 flow must target
`designerLocalV2`, not the V1 `designerLocal` tab or a different designer window.

For native workflow JSON editing, reveal and verify the exact physical Explorer
file, then issue one shared hit-tested `clickPoint` on that selected row and
bind the resulting `TextEditor` plus `TabInputText` to the same URI. Explorer's
single-click behavior opens the native preview editor. Do not invent a raw
double-click sequence or fall back to the Designer's embedded Code view.
Run `pnpm --dir apps/vs-code-designer run test:e2e-cli:native-editor-click`
for a credential-free real VS Code host proof of open, JSON-path selection,
targeted insertion, save and close. Native JSON changes must derive a bounded
text edit from the current document and the requested JSON path, focus Monaco's
actual input surface, prove the VS Code selection matches that edit's offsets,
then paste the edit through the clipboard and `Ctrl+V`. Do not overwrite the
whole document when a targeted JSON edit represents the user action, and do not
use `Input.insertText` for serialized JSON: Monaco treats it as
character-by-character typing and auto-closes quotes and brackets.
After `Ctrl+S`, require the native document to become clean and compare parsed
disk JSON semantically. Property order can differ after a targeted edit without
changing the workflow, so do not use `JSON.stringify` equality. Once the
semantically exact saved file is observed, close the native tab and continue
immediately to **Open Designer**.
After choosing **Open Designer**, prove the context menu actually closes before
waiting for a webview. CDP pointer input can move the native menu highlight
without activating the item on a remote host; when the exact menu item remains
open, press Enter once to activate that highlighted item.

Generic Designer authoring must use
`apps/vs-code-designer/src/test/e2e/designerCdpActions.ts`. The shared
`DesignerCdpActions` layer owns hit-tested Add-trigger variants, action
discovery, exact operation selection, node/panel interaction, semantic
parameter editing and toolbar saving. Workspace lifecycle/MSN Weather, HTTP
timeout Compose and Stateless variables are reference consumers. Keep only
scenario-specific setup and assertions in those families; do not copy their
selectors or build another family-local Designer driver.

For Designer V2 scenarios that must retain stable identity across React
rerenders and persistence, use `ProvenDesignerCdpActions`:

- `addRequestTriggerAndGetIdentity` and `addActionAndGetIdentity` return the one
  newly observed exact canvas node ID after selecting one enabled, hit-tested
  operation card through the shared title/profile selector. Action insertion is
  acknowledged only after the same sole new node remains stable, discovery is
  closed, and insertion loaders are absent. Do not replay the operation click
  merely because acknowledgement is delayed. Responsive hosts may replace the
  canvas with the newly opened details panel; insertion identity therefore
  combines canvas-card IDs with the one visible exact details-panel ID and its
  semantic header title. The details-panel content and title header are siblings
  inside `.msla-panel-layout`, so resolve the title from the enclosing layout,
  not from descendants of `msla-node-details-panel-*`. A new panel ID can still
  precede header-title hydration; treat an empty title as pending and start
  stability counting only after the same ID has a nonempty matching title.
  Before capturing the insertion baseline, close any existing responsive
  details panel and wait for the canvas to remount; otherwise a pre-existing
  node that reappears during insertion can be misclassified as another new node.
- Opening Request discovery is non-mutating. If the Add trigger click receives
  focus but no discovery panel appears, the shared flow may retry only after a
  bounded explicit no-panel acknowledgement.
- `clickNodeById` requires exact card and details-panel ownership.
- `openSettingsTab`, `openRunAfterSection`,
  `expandRunAfterPredecessor`, `readRunAfterState`, and
  `setRunAfterStatuses` bind the exact child panel and predecessor. Toggle
  implementations reacquire controls after every React render; when moving from
  the default state to Failed-only, select `Failed` before clearing `Succeeded`.
  After opening the Run After section, reacquire the exact predecessor row until
  its Fluent expand button is enabled and hit-testable; the row can render before
  the transition exposes a clickable target. The product ARIA contract is exactly
  `Expand <title>` / `Collapse <title>`; do not use `util.format` with an already
  interpolated label because unused arguments are appended to the accessible name.
  Fluent v9 checkboxes render the native input and its label as siblings. Read
  and click each status through the input's one visible associated label from
  `input.labels`; reject multiple visible labels, and use the visible parent only
  as a compatibility fallback. Never require the hidden native input itself to
  be visible or center-point hit-testable.
  `openSettingsTab` supports both a directly visible Settings tab and Fluent's
  panel-owned `<count> more tabs` overflow trigger plus portal menu item. Resolve
  those controls through the exact panel content element's enclosing
  `.msla-panel-layout`, not an assumed narrower descendant subtree. Find the
  exact semantic `Settings` text/label first, then bind its closest owned
  button/tab; do not require the interactive owner's aggregate text to equal the
  title because Fluent can render the label in nested descendants.
  Panel interactions resolve the one visible element with the exact panel ID;
  do not use `document.getElementById` because a hidden stale React instance can
  precede the current visible panel in document order.
- Sequential insertion must reuse the shared append-action discovery flow, then
  derive exact node identity from the before/after canvas state. Do not infer
  React Flow edge IDs or introduce a family-local edge-plus selector.
- When a custom lifecycle needs MSN-style discovery/search evidence around a
  shared insertion, pass `DesignerInsertionEvidenceHooks` to
  `addRequestTriggerAndGetIdentity` or `addActionAndGetIdentity`. The helper
  retains ownership of the proven selectors and the single operation-card
  dispatch; the caller owns only the ordered semantic captures at the exposed
  discovery-open and search-entered boundaries.

These methods use trusted CDP point input and inherit the caller's single
absolute deadline and cancellation guard.

The shared layer accepts the already-owned CDP connection, frame context,
deadline and active-tab assertion. Reuse that same instance through a scenario
so navigation, screenshots and assertions remain bound to the known Designer
frame. A hidden, occluded, disabled or wrong-frame match is not readiness.
Support both current `Add trigger` and legacy `Add a trigger` labels, and verify
operation insertion before editing the resulting panel.

## Step-by-step screenshot evidence is mandatory

Capture a uniquely named evidence screenshot after every meaningful native UI
interaction and after every resulting state that the scenario depends on. This
includes navigation, operation insertion, field entry, option changes, saves,
run initiation, status transitions and action-level monitoring. When a step
enters a value, the screenshot expectation must validate that exact visible
value; for example, HTTP authoring must prove the selected method and complete
request URI before moving to Settings.

Follow the proven MSN authoring sequence:

```text
interaction
→ exact-state wait
→ viewport normalization when the canvas is the subject
→ semantic screenshot
→ next interaction
```

For operation insertion, separately capture discovery open, the exact search
text, the exact inserted node/panel identity, and every configured field value.
For multi-step controls such as Run After, separately capture Settings open,
the section open, the exact predecessor expansion, each required checkbox
transition, and the final state. A final aggregate canvas screenshot supplements
these intermediate checkpoints; it never replaces them. Before a canvas
capture, call the shared `normalizeDesignerCanvasViewport` seam so Output,
Terminal, or responsive details panels cannot clip required nodes. That seam
uses trusted CDP input for Fit view and waits for stable in-canvas node geometry;
when React Flow Fit excludes an unmounted virtualized node, it uses bounded
trusted Zoom Out recovery, reacquiring the control after every transform, until
every required node ID is mounted and stable.
Do not replace it with `HTMLElement.click()`, which can leave the React Flow
transform unchanged while logging a false click success.
For fresh-host evidence, persisted workflow action IDs are authoritative.
Generated display titles can differ from insertion-time assumptions (for
example, `Compose_1` renders as **Compose 1**, not **Compose 2**), so do not
guess titles when exact node IDs are available. Reopened workflows should use
`ProvenDesignerCdpActions.waitForPersistedDesignerReady()` to establish a
stable, non-busy canvas before viewport normalization. Do not require every
persisted ID before normalization because React Flow can virtualize offscreen
nodes; normalization must prove those exact IDs afterward. The MSN text
readiness path remains appropriate for a new empty workflow.

When a lifecycle has a strict persisted-file semantic oracle, use
`ProvenDesignerCdpActions.saveWithExternalOracle()` and immediately run that
oracle. V2 Save can persist and return to its idle label faster than polling can
observe the transient disabled/`Saving` state. The external-oracle path owns
only the trusted semantic Save dispatch; it is successful only when the caller's
disk/hash oracle passes. Keep `save()` for consumers that require and can
observe the UI acknowledgement transition.
Save can also close or replace the operation Settings panel. After the persisted
oracle succeeds, bind the required post-save screenshot to the semantic surface
that is actually visible (normally the exact Designer canvas and node IDs);
never reuse a stale pre-save panel expectation.

Bind every evidence screenshot to the already-owned semantic CDP target and
frame. A tab title, workbench shell, blank webview or unrelated visible text is
not proof of the step. Readiness must reject loading/shimmer states, hidden or
stale webviews, and evidence from a different run or action. Keep diagnostic
failure screenshots separate from required evidence, and add source/readiness
controls that prevent required checkpoints from being removed, reordered or
weakened.

Every registered CLI suite must publish one versioned ordered-evidence manifest
for its complete logical invocation. Define the canonical sequence in
`apps/vs-code-designer/scripts/vscode-e2e-evidence-plans.js` using stable
semantic checkpoint IDs that exactly match the names passed to the shared
screenshot helpers. The runner initializes
`suite-evidence-manifest.json` under `LA_E2E_CLI_EVIDENCE_DIR`, and the shared
metadata-write boundary in `screenshot.ts` records accepted, failed, disabled,
and diagnostic outcomes. Do not update manifests from individual test methods
or create family-specific report logic. Every mutation is fenced by
`LA_E2E_CLI_EVIDENCE_INVOCATION` under the manifest lock so a surviving host
from an earlier invocation cannot write into a newer run.

Pipeline bootstrap and inherited active ownership are different contracts. The
pipeline may supply only `LA_E2E_CLI_EVIDENCE_SUITE_ID` and
`LA_E2E_CLI_EVIDENCE_DIR`; the owning runner then creates the invocation token
and initializes the manifest. A descendant that inherits an active manifest
must receive the complete suite/directory/invocation tuple. Reject a selected
suite mismatch before mutating evidence, and rely on invocation fencing for
active writes; do not infer authoritative ownership from a directory path alone
or reject the legitimate producer bootstrap shape.

The evidence directory is a self-contained producer bundle:

- `suite-evidence-manifest.json`;
- allowlisted public PNG/JSON pairs under `screenshots/`;
- diagnostic PNG/JSON pairs under `diagnostics/`.

Public sidecars contain only checkpoint, phase, classification, verdict, and
reason codes. Rich readiness metadata remains private runtime evidence. Failed
and aborted finalization preserves recorded outcomes and marks pending required
checkpoints `not-reached`, including the known static portion of a dynamic plan
that failed before expansion. Successful finalization requires the dynamic plan
to be complete and every declared checkpoint to have a terminal acceptable
status.

Helper hosts that do not own the logical suite's checkpoint plan must set
`LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED=0`. They may still capture private
diagnostic screenshots, but they must not write their local checkpoint names
into the parent suite manifest. Re-enable recording only in the phase that owns
the declared plan.

Never derive checkpoint identity or order from filesystem paths, directory
enumeration, timestamps, generated run IDs, or lexical sorting. Dynamic suites
must extend the producer manifest from authoritative semantic data before their
dynamic captures begin. `workspaceMultiRoot` calls
`declareMultiRootEvidenceCheckpoints` with ordered display labels and captures
stable ordinal IDs such as `workspace-multi-root-debug-root-01`; root basenames
are labels only, never IDs or paths.

CI finalizes and stages the bundle through
`apps/vs-code-designer/scripts/stage-vscode-e2e-evidence.js`. The staging
boundary copies only manifest-referenced regular files after containment,
extension, size, hash, duplicate-reference, and symlink checks. It must not
bulk-copy screenshot trees or private sidecars. The manifest-only renderer,
`vscode-e2e-evidence-report.js`, then receives
`--evidence-manifest <staged suite-evidence-manifest.json>` and writes
`VS_CODE_CLI_EVIDENCE.md` and `VS_CODE_CLI_EVIDENCE.json`; HTTP timeout also
writes its historical `HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.*` aliases. The renderer
validates and presents the producer contract; it does not construct checkpoint
plans or scan directories.

The report allowlist remains intentionally narrow. Do not add raw logs,
exception excerpts, absolute paths, runtime roots, credentials, target/frame
IDs, event arrays, DOM details, auth stores, or arbitrary nested input data.
Ordered evidence is explanatory and investigative; it never replaces strict
native result, phase, test-count, cleanup, process-closure, or terminal gates.

`WorkspaceConfiguration` is a snapshot. After awaiting `update`, call
`workspace.getConfiguration` again before checking the effective value.

The current Code view uses CodeMirror `EditorView`, despite compatibility names
that still mention Monaco. Read rendered CodeMirror lines, gutters and viewport
boundaries. Preserve complete-document, overlap, document identity and EOF
checks; never inject a model or filesystem fallback after partial acquisition.

The V2 Save toolbar button has visible/accessible **Save** text; an
`aria-label="Save"` attribute is not guaranteed. Match the actual enabled
production control and independently inspect persisted workflow content.

Controls exercising production DOM live in
`httpTimeoutComposeDom.unit.ts`; configuration snapshot controls live in
`httpTimeoutComposeConfiguration.unit.ts`.

## 3. Treat explicit navigation differently from assertion-time reloads

File -> Open Folder and Close Folder can legitimately reload the workbench
document. Retain the original CDP session and wait for a changed
`performance.timeOrigin`, a loaded visible shell and the expected Explorer view
within the original deadline.

Do not replay the user action or silently attach to a different window. Reject
closed sessions, ambiguous targets, wrong workspaces and non-navigation errors.

Recovery is allowed only at the explicit navigation boundary. An unexpected
reload after the real **No** or **Cancel** is an assertion failure.

`workspacePromptCancel.ts` and `workspacePromptCancel.unit.ts` encode this
contract. The bounded No/Cancel native route has actual Windows/Linux evidence;
that does not certify all workspace variants or every original case.

## 4. Compare workspace identity using platform semantics

`Uri.fsPath` can normalize Windows drive-letter casing. The same physical
workspace expressed with `d:` and `D:` must not be rejected solely for that
difference.

Prefer the established platform-aware/canonical path helper. Preserve
wrong-workspace, escaped-root, missing-file and link-boundary checks. Do not
apply blanket case folding on Linux or use substring containment.

**Current boundary:** Native diagnostics exposed this issue; the HTTP path
correction and its next native validation remain separate from the diagnosis.

## 5. Preserve normal-runtime settings across fresh hosts

Fresh profiles must retain the creating host's admitted dependency-root and
binary-resolution contract. Forwarding an environment variable alone does not
configure the corresponding VS Code setting.

Ordinary activation can replace a pinned Functions path with plain `func` when
managed dependency validation is disabled. Verify actual post-activation
command/PATH resolution and binary identity rather than trusting the profile
pin. Do not migrate to a user cache or download another binary as a fallback.
Installing Func in one host does not transfer that host's global VS Code setting
to a fresh profile. When full activation selects plain `func`, put the
bootstrap-admitted `FuncCoreTools` directory first in the fresh host's `PATH`
using the existing platform-aware environment helper. Minimal-activation tests
that retain an absolute managed path do not prove this full-activation contract.

Regeneration can produce a second, distinct overwrite confirmation after the
initial initialization prompt. Detect and affirm the actual second prompt once;
do not repeatedly click the first prompt while waiting for files.

## 6. Cancellation must establish quiescence

Racing a side-effecting operation against a timer does not stop that operation.
Retain the underlying promise and propagate cancellation. Require quiescence
before restoring settings or beginning a recovery restart.

Batch-native families must use the suite containment host's retained process
identities as their closure proof. Do not reconstruct ancestry after a phase
root has exited: an intermediate process can disappear while its child remains,
making an ordinary parent/child walk falsely report an empty tree. Per-phase
checks may remain as direct-run diagnostics, but batch acceptance belongs to
the Windows job-object or Linux subreaper receipt.
Direct supplementary selectors that publish strict family lifecycle evidence
must delegate through the registered suite containment wrapper before running
their scenario. The wrapper child may retain the focused selector, but the
outer process must own the Windows job object or Linux subreaper and write the
stable terminal evidence only after the original identities have closed.

For the Stateless variables family, use a preparation host with auto-start
disabled to run real consistency generation and bind the approved fixture to
both settings targets. Then use a separate fresh host with activation-time
design-time startup enabled. The activation host must expose the real **Azure
Logic Apps (Standard)** Output channel and prove the design-time management
endpoint is reachable before opening the Designer. This makes the
product-selected Func Core Tools command, working directory, port, child
process output, host readiness and early exit visible in native evidence
without racing first-time settings generation.

Late debug sessions may be stopped only when they match the test's exact attempt
marker and workspace identity. Never stop a foreign session or globally clear
tasks to conceal a delayed start. If the operation cannot quiesce, preserve the
fixture and report incomplete restoration.

`statelessVariablesControls.ts`, `statelessVariablesDebug.ts` and their controls
cover delayed resolving starts, not just promises that never finish.

## 7. Finalized evidence is not an exit-code shortcut

Direct and batch routes must produce a fresh invocation, exact registry phase
order, actual per-phase outcomes and truthful final cleanup. A wizard pass or
child exit zero cannot manufacture missing later GUI/runtime phases.

Shared direct orchestration is in `scripts/run-e2e-cli.js`; supplementary
publication is checked by `scripts/family-lifecycle-terminal.js`.

For the registered direct selector currently used by Multi-root,
`runDirectRegisteredSuite` is the ownership boundary. It must provide
`reportsRoot`, invocation identity in the child context, exact expected phases,
and stable phase/result/cleanup/terminal paths. Terminal and cleanup receipts
must carry the same invocation recorded by provenance. It must also create the configured
workspace-root parent before child launch. Other direct families retain their
existing owning orchestrators and must provide equivalent complete context
there. Do not assume that setting an environment path creates its directory.

Invalidate any stable terminal and cleanup receipts before workspace-root
creation, dependency setup, native preflight, or child launch. If setup fails,
the current invocation must remain visibly incomplete; an earlier success must
never survive as the apparent result.

Collect required profile diagnostics and validate required screenshots and
other non-cleanup evidence before removing the original generated fixture.
A failure discovered only after deletion cannot satisfy failure retention.
On required collection or validation failure, preserve the fixture and the
actual error; only successful pre-cleanup checks admit destructive cleanup.
The regeneration ordering correction remains an open implementation gate.

Reconstructing ancestry only after a parent exits can miss reparented
descendants. When original process identities have not been verified after
closure, report `originalProcessClosureVerified: false` and keep execution
diagnostic-only. Directory removal and an empty post-exit tree are not stronger
proof. Do not revive abandoned process-owner frameworks to disguise this gap.

### Canonical MSN cleanup: fail-closed exact-root boundary

**Source/control and isolated Linux/Windows native validated.** A successful MSN
response and a passing extension-host scenario are body evidence, not final
root-cleanup or original-process acceptance. The direct orchestrator starts
with incomplete receipts and a fresh three-phase JSONL journal. Only its outer
finalizer publishes the finalized verdict, after required shutdown observations,
workspace/profile diagnostics and exact-root owned-identity absence observation.
Original body and cleanup/instrumentation errors remain separate and are retained.

Accepted direct results require `complete: true`,
`cleanupVerified: true`, `originalProcessClosureVerified: true` and
`processClosureProof: "exact-root-owned-identities-absent"`. If any original
identity or required observation remains unproven, the path still fails closed,
retains diagnostics, and reports the independent `lifecycleBodySucceeded`
verdict without promoting it to native acceptance. The current batch finalizer
still keeps MSN diagnostic/fail-closed rather than propagating the direct
selector's exact-root proof.
The current-invocation `body-assertions.json` is written only after the actual
MSN body and required response screenshot assertions, before runtime teardown.
It keeps passing assertions visible even when later inner shutdown fails;
`bodyAssertionsPassed` is not process/root cleanup or native acceptance.
Do not remove this blocker using exit zero, disappearing VS Code task handles,
empty post-exit ancestry, directory absence or a synthetic control observation.
The protected canonical rollup is unchanged.

`scripts/msn-cleanup-diagnostics.js` adds **read-only** Windows Restart Manager
file-lock observations for the mapped Functions dependency DLL, together with
the existing process observer's PID, creation identity, parent PID and
executable records. Samples are taken in the original runtime cleanup boundary before task teardown,
after task teardown
and after the original CLI closes. A matching PID without the same creation
identity is not a matched process. Dependency-executable candidates and foreign
file-lock holders are diagnostics, never authority to terminate. Missing files,
unavailable native observations and partial failures provide no closure proof.
No command lines, environment variables or credentials are collected.
VS Code handle cleanup rejects foreign task scopes/names and debug invocation
markers, retains the original admitted handle objects across awaits, and does
not equate their termination with OS process exit.

Use the existing `--msn-weather-lifecycle` direct selector or explicit batch
`--suites msnWeatherLifecycle` only on an isolated, source-bound native consumer.
No new native mode, resource, grant or owner framework is introduced.
The existing ADO template stages `msn-cleanup-observations-*` under the diagnostic
artifact's `log/` before terminal rejection, including failed runs.
Require the compiled producer and consumer source manifests to identify the
same immutable correction source. Preserve all three samples, the phase
journal, final terminal, generated fixture snapshot and original profile/task
logs privately. Linux process samples are diagnostic-only and do not claim a
Windows file-lock observation.

The registered `test:e2e-cli:msn-reporting-unit` controls exercise the actual
orchestrator, phase writer and finalizer with only native phase/auth/probe
boundaries replaced. They cover late cleanup failure, fresh invocation ordering,
original errors, retained roots, PID reuse, foreign holders and unavailable lock
observations. These controls are included in `test:e2e-cli:unit`; they neither
exercise Windows Restart Manager nor certify native cleanup.

### Reporting failures discovered after Code closes

A synthetic **MSN lifecycle evidence** failure can be added after Mocha reported
a passing body and the original Code host exited. No live UI assertion failed
at that point, so the Mocha failure-screenshot hook cannot capture that later
cleanup failure. Do not relabel the last successful response PNG as failure
proof or manufacture a new failing screenshot.

`scripts/msn-finalization-reporting.js` creates a sanitized
`msnWeatherLifecycle.cleanup-finalization.txt` from actual runner cleanup lines
and allowlisted terminal claims. The summarizer associates this text attachment
with the **synthetic harness testcase**, using the existing JUnit
`[[ATTACHMENT|...]]` / ADO `PublishTestResults@2` mechanism. Original executed
Mocha counts remain separate from the normalized harness failure count.
The testcase also names the exact diagnostics artifact/log paths and, when
trusted ADO run/job/task context exists, links its producing run task log.
These references remain useful if the uploader does not expose the attachment.
Attachment-generation failures preserve the original harness error and report
the missing attachment explicitly instead of inventing evidence.

The existing staging template preserves the sanitized text under the diagnostic
artifact's `log/` before terminal rejection. Non-native controls verify the
actual summarizer/JUnit association, token redaction, successful-image rejection
and failed-run staging; actual ADO attachment upload remains native/CI-owned.

## 8. Diagnose and validate shared CLI infrastructure by layer

Do not collapse all pipeline failures into "the E2E failed." Classify the first
failing boundary:

1. build/bootstrap/preflight, where no native lane ran;
2. native scenario execution and assertions;
3. phase, terminal, process-closure and cleanup finalization;
4. ordered-evidence finalization and staging;
5. report, artifact publication and protected rollup.

Use native JSON/JUnit, phase journals, terminal receipts, cleanup ledgers,
`ORDERED_EVIDENCE_VALIDATION.json` and the staged report to make that
classification. A native pass followed by staging rejection is not an
interaction regression. A skipped lane after a build failure is unverifiable,
not a failed native scenario.

Use stable product identity before presentation text. Monitoring containers may
prefix action titles with duration or status text. Resolve the exact node ID
derived from the action identity; use the existing exact-title fallback only
when the product ID is unavailable. Never replace identity with broad substring
matching, and do not claim fallback uniqueness unless the helper verifies it.

Prompt completion is not target stability. F5 can navigate or replace the
workbench/CDP target after known prompts are handled. Preserve early transition
diagnostics, but capture required post-prompt evidence only after
`waitForDebugStartup` or an equivalent stable-target condition.

Keep actionable diagnostics private and complete. Serialize `Error.stack` when
available. When wrapper logs prefix lines with `[suite]`, strip prefixes only
for detecting an error header and its contiguous stack frames; retain the
original prefixed lines in the failure excerpt. Do not add raw stacks or
absolute paths to the public ordered-evidence allowlist.

Source-string, order and AST controls are explicit implementation-shape
contracts. Update dependent controls in the same change when the implementation
shape changes, and prefer executing extracted production functions or DOM
expressions where practical. A stale source-shape assertion must not masquerade
as a product regression.

Use this proof ladder for shared runner, evidence or lifecycle changes:

1. focused local controls;
2. the complete registered `test:e2e-cli:unit` chain;
3. exact-full-SHA targeted Linux and Windows diagnostic selectors;
4. downloaded artifact inspection at every gate above;
5. the complete canonical non-diagnostic Linux/Windows inventory.

A targeted green accelerates iteration but never certifies unrelated suites or
satisfies the protected full rollup. Preserve stricter family gates such as
Multi-root phase order and retained-identity cleanup even when body assertions
and ordered evidence are complete.

`runAfterPersistenceLifecycle` is part of the canonical Linux and Windows
inventory after exact-SHA targeted run 15827501 / 20261027.7 passed both
operating systems at `1d89db5c3dfc33468b8144087afa2c274b4a8467` with all 35
ordered checkpoints, all four phases, terminal completion, and cleanup verified.
HTTP timeout, Stateless variables, workspace artifact regeneration, and
Multi-root remain targeted-only until they receive separate evidence-backed
baseline promotion.

## Validation and maintenance

1. Read this guide and the relevant suite/fixture prerequisites.
2. Search existing helper implementations and controls before adding logic.
3. Compile before running controls:
   `pnpm --dir apps/vs-code-designer run test:e2e-cli:compile`.
4. Run the smallest relevant controls, then the registered
   `test:e2e-cli:unit` chain after shared-helper changes.
5. Validate the actual native selector on isolated source-bound consumers.
   Parallel worktrees do not isolate localhost ports, Code profiles or runtime
   processes on a shared machine.
6. After shared runner/evidence/lifecycle changes, inspect targeted artifacts
   and run the complete canonical Linux/Windows inventory.
7. For each lesson, record symptom, root cause, reusable helper/control paths,
   verification level and any remaining limitation. Update this guide after
   meaningful investigation, not only after a green run.

Generated package instructions must be updated from
`docs/ai-setup/packages/vs-code-designer.md` through `pnpm run ai:generate`;
do not edit autogenerated instructions directly.
