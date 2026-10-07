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

### Canonical MSN cleanup: fail-closed diagnostic boundary

**Source/control correction; native lock-holder diagnosis pending.** A successful
MSN response and a passing extension-host scenario are body evidence, not final
root-cleanup or original-process acceptance. The direct orchestrator now starts
with incomplete receipts and a fresh three-phase JSONL journal. Only its outer
finalizer publishes the finalized verdict, after required shutdown observations,
workspace/profile diagnostics and exact-root absence observation. Original body
and cleanup/instrumentation errors remain separate and are retained.

The current path cannot prove original Functions/Code descendant identity
closure. It therefore deliberately retains the original generated workspace
and isolated dependency root and exits nonzero. Direct and batch results report
`complete: false`, `cleanupVerified: false`,
`originalProcessClosureVerified: false` and
`processClosureProof: "original-identities-unverified"`, even if every body phase
passed. `lifecycleBodySucceeded` records the independent body verdict.
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
6. For each lesson, record symptom, root cause, reusable helper/control paths,
   verification level and any remaining limitation. Update this guide after
   meaningful investigation, not only after a green run.

Generated package instructions must be updated from
`docs/ai-setup/packages/vs-code-designer.md` through `pnpm run ai:generate`;
do not edit autogenerated instructions directly.
