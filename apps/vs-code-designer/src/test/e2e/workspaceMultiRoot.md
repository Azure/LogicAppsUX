# Multi-root workspace native family

The protected selector runs inside the shared outer native containment host.
That owner retains the original child process identities while the Multi-root
worker runs, waits for worker closure, verifies those exact identities are
absent, and only then performs bounded transient-root cleanup and publishes the
final suite terminal. The inner family proves the three ordered native phases
and reports `processClosureProof="outer-containment-pending"`; it cannot claim
final retained-process closure itself.

Parent acceptance requires
`originalProcessClosureVerified=true` and
`processClosureProof="retained-original-identities"`. These values never derive
from post-exit empty ancestry, ordinary exit zero, directory absence or a caller
model. If retained identity closure, diagnostics, or cleanup cannot be verified,
the run fails closed and preserves the fixture. No V1–V22 framework, provider,
broker, broad-name kill or caller-supplied process proof is introduced.

Selector: `node scripts/run-e2e-cli.js --workspace-multi-root` from
`apps/vs-code-designer`, or `pnpm --dir apps/vs-code-designer run
test:e2e-cli:workspace-multi-root`. It uses the official CLI wizard setup and the
same admitted Code executable, extensions, dependency root and generated
`.code-workspace`. It is a registered lifecycle suite whose protected credit
comes from the strict family terminal, not from aggregate Mocha counts.

The shared suite ID is **`workspaceMultiRoot`**. It is also explicitly selectable
with `node scripts/run-e2e-cli.js --suites workspaceMultiRoot`; it participates
in both full platform aliases and the protected rollup. Its exact ordered phase
IDs are:

1. `runtimeDependencyBootstrap:bootstrap` — real official CLI managed-runtime
   validation, including its native executable probes; never inferred from
   preflight file presence.
2. `workspaceMultiRoot:create` — the official wizard creates the original first
   app/workspace and supplies its verified same-job handoff.
3. `workspaceMultiRoot:reopen` — the fresh regular window opens that same
   workspace, creates the additional projects through Explorer, performs the
   real same-window reload and all count/debug/Mapper assertions, then completes
   ordinary window close, diagnostics and final fixture cleanup.

The family writes these phases through the existing official phase reporter.
Missing, duplicate, unexpected, reordered, failed or unfinalized phases cannot
produce a complete family result. Source ordinal 1 spans the create phase and
the first part of reopen; the real source Reload Window remains inside reopen,
not a substituted host relaunch. Supporting pipeline/admission contracts and
all public/private OGF mappings remain parent-owned and unchanged here.

## Clause boundary

1. Create the first Standard/Stateful app with the official Create Workspace
   wizard. In a fresh regular window, use the Explorer folder's real **Create
   new project...** action twice, including the project webview's actual
   review/create path. Three example Logic App roots reproduce the recovered
   fixture shape; there is no extra app-type matrix and no maximum of three in
   the root, collector or sequential-debug contracts.
2. Invoke **Developer: Reload Window** once, retaining the same workbench CDP
   target. Require a different document time origin, new execution contexts,
   a different native extension-host observer activation, and every original
   Explorer/project root. The regular-window observer runs outside the
   extension host so a real reload cannot replace/restart its test. There is
   no terminate/relaunch substitute.

   The supported Core Tools runtime launches a `func` launcher and a distinct
   `in-proc8/func` worker for each Logic App. The oracle is **one complete native
   launcher/worker pair per current physical root**, with **all** `func`
   executables accounted for (two executables per root). The former scalar
   executable-count oracle incorrectly rejected this real two-process runtime.
   The denominator comes from every persisted
   workspace folder with generated host/settings/workflow artifacts and must
   agree with the fresh native workspace view. Artifact folders are not apps.
   The numerator is the complete native machine population of `func` /
   `func.exe`, not selected task PIDs or a filtered list that drops workers.
   Both exact role paths/bytes are attested before and after the existing real
   bootstrap version probes. Current recorder host birth, the actual owning
   spawn's native birth and physical cwd, successful per-root startup, and
   birth-bound native ancestry establish the root bijection. A stale fourth
   pair, shared/foreign root, reused PID or unknown binary cannot receive credit.
   Every candidate's PID, creation identity,
   executable and admitted SHA-256 must be readable. Double native scans,
   binary revalidation and at least three identical samples over 1.5 seconds
   reject incomplete enumeration, PID reuse, races and unstable cardinality.
   Permissions and wrong/unrelated binaries fail immediately; races restart
   stability only within the original deadline.
3. Choose each generated, **folder-qualified** debug configuration sequentially.
   The registered family receives the existing approved WIF fixture context:
   local debug may request Azure connector setup even for a request workflow.
   Drive only the shared affirmative policy and exact existing subscription/
   resource-group choices, verify the group's real ARM location with a read-only
   lookup, and verify the product saved that context. Never choose Skip/No or
   synthesize local settings; this path creates no Azure resources.
   An additive test observer records actual VS Code start/termination events,
   including the native workspace folder, session ID, name and debug type.
   Require the correct session plus the visible debug toolbar; stop it and
   observe actual termination before selecting another folder. This clause
   proves launch/stop, not workflow execution, trigger callbacks or run history.
   The actual **Debug: Select and Start Debugging** quick-access list renders
   the configuration name and workspace description separately. Match both
   exact fields against the generated configuration and persisted physical
   root/display alias, not the toolbar dropdown's parenthesized label. Reject
   duplicate, disabled, hidden or occluded matches. The family retains bounded
   hash-only input/focus/candidate receipts; these cannot substitute for real
   session start, ownership, toolbar and termination evidence.
4. Open the actual Azure view, expand Data Mapper if necessary and click its
   **Create data map** action. Select a real workspace folder, enter a map name,
   and require an active, visible, correctly owned webview with loaded
   **Source schema** and **Target schema** UI. A discovered command, arbitrary
   designer frame, hidden old Mapper or caught discovery error is not a pass.
   The source does not require selecting schemas, saving/testing a map or any
   external schema asset; those are deliberately outside this family.

All source identifiers, titles, images and private mappings remain outside
tracked files. The public names above describe only observable behavior.

## Explorer folder-menu interaction

The folder helper binds the requested physical root to the current persisted
`.code-workspace` folder, honoring its optional display-name override. Duplicate
root labels, a missing physical root, a stale visible root set, or lost tree
focus fail closed. It clicks the root label, observes selection and the tree's
`aria-activedescendant`, then sends the native **ContextMenu** key down/up
gesture. Monaco List handles this on keyup using the focused root as its
anchor; this is UI input, not a programmatic Create Project command.

If that exact root set is already visible and the requested root is
hit-testable, the helper goes directly to its real root gesture. It does not
open a redundant command palette, whose focus can be displaced by a newly
opened dependency announcement webview. A missing projection still uses the
real **View: Show Explorer** command, then requires the same exact-root oracle.
The menu's selection, focus, enablement and invocation requirements are unchanged.

Before initial Explorer input, the family now waits for the recorder's
**same-boot `runtimeResolution` event**, validates its admitted Func identity,
and propagates activation errors. The recorder emits `activation` before
awaiting the Logic Apps extension; only `runtimeResolution` follows completed
product activation (including `updateLogicAppsContext`). A started recorder
and visible root do not establish that the product's context-menu
contributions are ready. The same gate also applies after Reload Window.
It does not set context keys or substitute a programmatic Create Project call.

Each later debug-root stage has a separate bounded diagnostic scope, rather
than sharing the stream already consumed by project creation. While waiting
for an actual root-owned debug start, a secondary hashed QuickInput snapshot
retains a pending prompt on failure. It cannot satisfy the real start event,
change the deadline or replace a primary recorder failure.

Opening and activation are separate postconditions. A visible Monaco menu must
exist before its exact **Create new project...** item is clicked using native
CDP pointer input. Item enablement comes from the menu item/container, not its
label span; keyboard-shortcut text is excluded from label matching. Require
one visible, enabled, hit-tested match and menu closure after the click. There
is no command-service fallback, click replay, extra fixed wait, or suppressed
assertion.

The product contributes this command directly to `explorer/context` under
`azureLogicAppsStandard.hasProject && explorerResourceIsRoot == true`, not an
Azure submenu. The controls verify that contribution as well as the actual
helper expressions against production-shaped Code 1.144 Menu / Monaco List
DOM. The DOM fixture supplies layout and CDP input translation; it is **not**
a running Code renderer or native proof.

Root selection, menu opening and menu invocation receive diagnostic screenshot
attachments. Failure also records the exact root selection/focus, menu items,
active element and QuickInput visibility, then attempts a diagnostic capture
without masking the original failure. These attachments do not enter the
strict `roots.length + 3` evidence array or become undeclared ordered evidence.
Existing phase, reload, population, original-process and terminal gates remain
unchanged.

**Validation boundary:** The latest isolated Linux/Windows diagnostic images
show the selected root's real Explorer menu with generic actions but no Logic
Apps contributions. That rules out a missing root gesture at that checkpoint;
it does not expose the product context key's value or activation completion.
The source previously allowed menu opening before product activation had
completed. The new activation gate and production-shaped interaction controls
are control-verified only; success still requires isolated Windows/Linux
consumers. Never label those controls as native approval.

## Native consumer requirements — parent-owned

Design-time startup and original-spawn receipts must hash the same canonical
physical project path. On Windows, a URI-derived lowercase drive letter and a
native filesystem path can identify the same directory but produce different
raw-string hashes. Canonicalize diagnostic project identity with
`fs.realpathSync.native`; retain the original map keys and product behavior.
Do not fix the ownership join by ignoring hashes, accepting a missing startup,
or crediting recognized executable paths as ownership.

After accepting a stock debug configuration, Code can retain the picker and
its rows during its `quick-input-widget-closing` animation while making the
widget `inert` and returning focus to the editor. The shared prompt detector
excludes these explicitly dismissed provider states, not arbitrary unknown or
covered pickers. This avoids routing a closing debug picker into Azure setup.
Active unknown prompts still fail with a detection-time diagnostic screenshot.
No additional sleep, unknown-option approval or changed debug-start oracle is
introduced. Controls distinguish retained closing/inert rows from active
non-hit-testable rows; isolated native proof is still required.

No native run is authorized on a shared development host. The parent must
merge the bounded family into an **isolated Windows/Linux Azure DevOps
consumer**. Protected credit comes from the registered phases and strict
terminal receipt; baseline Mocha counts are not GUI or cleanup credit.

The consumer must supply:

- Current-source compiled extension, React webview HTML/nonempty JavaScript,
  compiled CLI tests and the recorder fixture from this same checkout.
- `LA_E2E_CLI_MULTI_ROOT_ISOLATED=1`.
- `LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT` and
  `LA_E2E_CLI_EXTENSIONS_DIR`, prepared for this job.
- **No caller-supplied Func path/hash.** The successful ordinary native
  bootstrap resolves the configured job-root executable, snapshots its bytes
  before the existing real version probes and attests unchanged bytes after
  those probes and the no-dialog assertion. The route consumes the attestation
  only after the exact bootstrap phase succeeds with ordinary Code closure,
  verified phase cleanup and diagnostics. Deprecated
  `LA_E2E_CLI_MULTI_ROOT_FUNC_PATH` / `LA_E2E_CLI_MULTI_ROOT_FUNC_SHA256` inputs
  are rejected, not used as assumed admission.
- Current-run/source/job identity variables and fresh diagnostic/profile
  parents. Use `LA_E2E_CLI_MULTI_ROOT_DIAGNOSTICS_PARENT`,
  `LA_E2E_CLI_USER_DATA_PARENT`, `LA_E2E_CLI_WORKSPACE_ROOT` as needed.
- A free job-local `LA_E2E_CLI_REMOTE_DEBUGGING_PORT`, process-observation
  permissions, native .NET/debug/Functions/Azurite dependencies, and no
  unrelated `func` population. Linux requires the existing secure Xvfb/D-Bus/
  GNOME-libsecret wrapper; there is no plaintext-password-store fallback.

Missing Mapper HTML/JS, compiled tests, native permissions or binary admission
is a meaningful blocked/failing prerequisite. The official bootstrap may
populate its genuinely empty isolated batch runtime root; a prepared direct
root is never falsely reported as starting empty. There is no extension/
webview build or asset-discovery fallback in the supplementary route.

### Original spawn binding and supplemental observer receipts

The asynchronous `design-time-spawn-native-identity` receipt alone is not
population admission. The owning `cp.spawn` initiates
a lazy, test-only observation of exactly its returned shell PID and the actual
extension-host PID through the existing retained native observer. No worker
discovery, global scan, port query, runtime inventory, hash warmup, startup wait,
or product lifecycle change is added. Ordinary runs without the existing
isolated MultiRoot diagnostic tuple perform no project/native reads.

The bounded original design-time stream records the physical project digest,
native birth domain, host/shell identities and native parent metadata only
after two coherent scoped responses. Missing, denied, exited, duplicate,
reused/changed, wrong-parent/boot/clock, stale-response or changed-project
observations remain explicitly unavailable. Paths and birth strings pass
through the existing real hash-only serializer; command metadata from the
native response is not copied. Existing event/byte caps and secondary-error
semantics are unchanged.

That supplemental RPC is **not an at-spawn identity receipt**: it is
asynchronous, and Linux returns retained metadata plus a live pidfd probe, not
a fresh parent/executable scan. A coherent response cannot establish the exact
creation identity at `cp.spawn`, current activation boot, a current-root
launcher/worker bijection, worker byte admission, or startup readiness.
`spawnIdentityProven`, `ancestryProven`, `workspaceProven` and `ready` therefore
stay false even when `nativeIdentityObserved` is true. Nothing consumes this
diagnostic as admission. `runtimeResolution` remains configuration evidence,
not startup health.

The separate `design-time-spawn-native-binding` captures the original host and
shell births synchronously immediately after `cp.spawn`, while Node still owns
the original child handle and cannot reap/release it on another event-loop turn.
It reads only those specific PIDs, verifies the original child is live before
and after capture, and binds the actual physical project/cwd passed to spawn.
Linux uses boot/start ticks; Windows holds process handles and records CIM
creation ticks separately from native FILETIME. Commands and environment are
never copied. The recorder independently captures its current host birth.

The population gate joins that binding to actual successful owning startup,
the exact current activation host, and native ancestry from the existing full
collector. Both role paths/bytes remain bootstrap-admitted. Three pairs for
three roots can pass only that complete join; six arbitrary executables cannot.
Real UI Reload/debug/Mapper, original native closure, the 90-second population
budget and three stable samples over 1.5 seconds are unchanged.

Require `final-result.json.complete === true` **after** ordinary Code
completion, profile diagnostics and final fixture cleanup. Preserve the
invocation, verified official wizard handoff, actual recorder events, full
native population/identities, required accepted screenshot PNG/sidecars,
Code log/exit, profile logs and terminal result. Original observation and
teardown errors are both retained. Failed/unclosed native runs preserve their
fixture for parent-owned diagnostics; this family contains no process kill,
port cleanup or prior process-owner protocol.

### Exact ADO defaults and evidence paths

The existing consumer's `TF_BUILD` does **not** satisfy the explicit isolated
worker guard. Parent wiring must add `LA_E2E_CLI_MULTI_ROOT_ISOLATED=1` only on
an actual exclusive native worker. No additional caller Func path/hash is
required or accepted.

The direct route uses the consumer's existing
`LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT` (normally
`$(Agent.TempDirectory)/runtime-dependencies/workspaceMultiRoot`),
`LA_E2E_CLI_EXTENSIONS_DIR` (normally
`$(Agent.TempDirectory)/test-resources/test-extensions`),
`LA_E2E_CLI_WORKSPACE_ROOT` and `LA_E2E_CLI_USER_DATA_PARENT`. It preserves job
ownership and has no user-home dependency fallback. Explicit batch selection
instead creates its own new suite-owned dependency/workspace/profile roots.

The route itself generates
`LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT` and
`LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION` for the ordinary bootstrap host.
The physical `FuncCoreTools/func.exe` (Windows) or `FuncCoreTools/func` (Linux)
resolved from that host's actual configuration supplies the bytes/digest.
`func-bootstrap.json` binds these to the current invocation, source/run/job,
physical root, actual Code version and successful native probe outputs. A
missing/stale record, failed bootstrap phase, outside-root/link path, denied
read, changed file during probes or later replacement fails closed.

Regular activation intentionally uses the real non-managed `ensureBinaries`
branch (`autoRuntimeDependenciesValidationAndInstallation=false`), which
overwrites the Func setting with plain `func`. The profile therefore does **not**
claim that pinning an absolute path survives activation. Instead the route
prepends the successful-bootstrap-attested executable directory to the regular
Code process's inherited PATH, removes empty/relative entries and duplicate
PATH keys, and keeps the job-owned dependency root for existing assets.
Windows also gets `NoDefaultCurrentDirectoryInExePath=1` and
`PATHEXT=.EXE;.CMD;.BAT;.COM`, with ambiguous same-name wrappers rejected.
These are route-derived launch values, not additional caller admission env.

The recorder awaits actual Logic Apps activation, reads actual global settings
after `ensureBinaries`, observes command/PATH resolution without executing Func
or installing anything, and records its physical path/SHA. After real Reload
Window the driver requires that fresh extension-host observation to match the
bootstrap attestation, then still verifies the complete running Func executable
population and exact identities. Wrong command, PATH, binary bytes, runtime
root, missing observation or observer error fails; no extra bootstrap/phase,
download, cache migration or process cleanup is added by this fix.

The admitted producer payload includes `dist/` and `out/`; it must be rebuilt
from this source revision so both the compiled bootstrap test and
`out/test/e2e/workspaceMultiRootBootstrap.js` contain the attestation hook.
The recorder is ordinary checked-in JavaScript plus its manifest at
`scripts/fixtures/workspace-multi-root-recorder/{extension.js,package.json}`:
no compilation or extra payload copy is needed when the consumer performs its
existing full pinned-source checkout. It is not in the default `dist/out`-only
archive, so a sparse/source-less consumer must explicitly preserve those same
source-admitted fixture files. The Mapper entry remains
`dist/vs-code-react/index.html`, with nonempty `dist/vs-code-react/assets/*.js`,
from the existing admitted extension/webview build.

Let **D** be the fresh directory made by
`mkdtemp((LA_E2E_CLI_MULTI_ROOT_DIAGNOSTICS_PARENT ??
<extensionRoot>/.vscode-test) + "/multi-root-")`. The route writes:

- `D/invocation.json`, `D/func-bootstrap.json`, `D/wizard-handoff.json`;
- `D/debug-events.jsonl`, `D/code.log`, `D/final-result.json`;
- `D/screenshots/workspace-multi-root-*.png` and matching `.json` sidecars;
- `D/vscode-logs/workspaceMultiRoot/workspace-multi-root[__<consumer-user-data-suffix>]/`
  through the existing sanitized profile-log copier;
- The supplied `LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH`: the fresh direct wrapper
  results file below, or the existing batch report-folder phase file.

Direct ADO execution now enters the existing general suite-process wrapper
before running the family body. Its stable required terminal is
`.vscode-test/results/workspaceMultiRoot.terminal-result.json`, with the general
`writeSuiteFinalEvidence` shape, ordered registry phase IDs and each phase's
complete/exit/signal/cleanup/diagnostics proof. The same existing wrapper
observes its actual child closure and descendant cleanup; the family reopen
phase separately proves actual ordinary Code closure, evidence/diagnostics
and removed fixture-root absence. No cleanup boolean is assumed from exit 0.

Its associated paths are:

- `.vscode-test/results/workspaceMultiRoot.cleanup-ledger.json`;
- `.vscode-test/results/workspaceMultiRoot.terminal-invocation.json`, binding
  source/run/job and a fresh invocation to the report paths;
- `.vscode-test/results/workspaceMultiRoot.phases-<invocation>.jsonl`.

The direct stable terminal/ledger are first invalidated to incomplete, before
child launch or preflight, so an older success cannot satisfy a failed new
invocation. Exact phase order, all phase proofs, actual general-wrapper cleanup
and finalized lifecycle are required for direct exit 0. Direct family phases
are routed to that fresh results file rather than `D/phases.jsonl`. Batch
execution keeps its existing suite report-folder paths and is not rewrapped.

Bootstrap/create profiles continue using the consumer's normal
`LA_E2E_CLI_VSCODE_LOG_DIR`, with profile names
`workspace-multi-root-bootstrap__multi-root-bootstrap-<invocation>` and
`workspace-multi-root-create__multi-root-create-<invocation>`.
The consumer's ordinary console log remains
`.vscode-test/results/workspaceMultiRoot.log`. The current generic diagnostics
gatherer does **not** recursively publish D; its ordinary screenshot/log roots
do not capture the regular-window family paths above. Parent must explicitly
publish D (or its controlled diagnostics-parent directory), and validate its
`final-result.json` after all three phases and teardown. Pipeline gathering,
source/admission support and any summarizer/OGF wiring remain parent-owned.

## Non-native controls

### Population diagnostics (not admission)

The population gate additionally writes `population-observations.jsonl` using
the existing diagnostic envelope, bound to the bootstrap source, run and
invocation and the population phase. Its independent producer is capped at
64 events / 128 KiB and reserves terminal capacity separately from routine UI
polling. The first four and every sixteenth collection supply sample counts,
collection intervals, native pass/row counts, race/error counts and at most
12 PID/birth/path/binary-hash receipts. Counts include the entire collected
population even when detailed receipts are capped; incomplete scans are marked
incomplete. Parent PIDs are observations from the existing native queries, not
birth-bound ancestry proof. No additional process scans are performed.

Launcher and `in-proc8` path counts are observational only. All ownership remains
unproven (`ownedCount: 0`); worker hash admission, command identity, ancestry and
durable workspace ownership must not be inferred from those counts. The
original complete global count, exact launcher path/hash, stability, metadata
and deadline assertions are unchanged. Paths, births and workspace identifiers
in this stream are hashed; no full commands or environment are collected.

The ADO staging allowlist preserves this stream and the original generated
`func-bootstrap.json` / `debug-events.jsonl` byte-for-byte, including rejected
families. It does not recursively copy `code.log`, profiles, arbitrary files or
environment. The final-result projection and all existing acceptance gates
remain authoritative and unchanged.

Prompt failures also use the existing bounded operation stream:
`azure-fixture-prompt`, `azure-fixture-prompt-observation` and
`azure-fixture-prompt-terminal`. The terminal preserves the first failed gate.
Title/placeholder/widget-title/input-label and candidate identities are hashed;
`knownTitleCode` is the one-based diagnostic-only list in
`workbenchPrompts.ts` (zero means unknown). Exact approved-fixture matches,
busy/focus/visibility, input hit testing and row hit-test counts distinguish a
source mismatch or covered UI from an actionable approved picker. An unknown
prompt is still rejected at detection: diagnostics do not poll or approve it,
perform an extra ARM lookup or substitute the widget title for the placeholder.

Unexpected or ambiguous Azure/affirmative-workbench prompts now trigger one
same-current-connection diagnostic screenshot **before** the original throw or
any dismissal/navigation. The existing diagnostic screenshot helper uses a fresh
5-second budget, never desktop fallback or a newly discovered window. Deadline
wrappers retain their actual owning CDP for this purpose. The PNG and sidecar
are diagnostic attachments, not additional ordered acceptance checkpoints.
The sidecar binds the capture operation ID, native invocation, phase and opaque
target identity; `[unexpected-ui]` flags the safe kind/category, known-title code,
hashed title and exact screenshot basename, or explicitly `screenshotMissing`.
Capture/storage/timeout failure is secondary and cannot replace the original
failure or permit a success fallback. The original failed run's created/reloaded
images do not establish the unknown prompt's contents; only a newly captured
detection-time image can answer that question.

Windows population receipts retain both native passes' timing and the original
collector budget/remaining time. `windowsFirstProbe` and `windowsProbe` report
numeric native stages: 0=no script marker, 1=PowerShell script entered,
2=unfiltered CIM query returned, 3=row projection complete, 4=JSON serialized,
5=stdout write complete. Startup includes command parsing; total RPC duration
also includes response/exit overhead. An incomplete stage gives a last observed
boundary, not proof of a stalled subsystem. `collectionStageCode` is 1=first RPC,
2=parse, 3=hash, 4=second RPC, 5=parse, 6=rehash, 7=lineage, 8=complete.
Only numeric markers from the existing RPC are retained on timeout; no new
process scan, filtered population, timeout extension or ownership credit exists.
Local controls cover synthetic PowerShell rows without scanning the shared
machine. These observations require source-bound native proof before attribution;
targeted complete proof must be followed by all 23 lanes on the same SHA before
another independent behavior fix.

```powershell
# Repository root; these commands never start Code, func, CDP or cloud resources.
node node_modules/typescript/bin/tsc -p apps/vs-code-designer/tsconfig.e2e.json
node --test apps/vs-code-designer/out/test/e2e/workbenchCdpActions.unit.js
pnpm --dir apps/vs-code-designer run test:e2e-cli:workspace-multi-root:unit
```

The controls are also additive to `test:e2e-cli:unit`. Native population tests
inject unit-owned process/file fixtures; they do not enumerate or kill actual
processes. They cover permissions, races, stale PIDs, wrong binary, wrong/extra/
partial counts, deadline overrun, incomplete roots, real-reload document
contract, hidden/wrong Mapper, sequential folder debug and finalization.
They are **not** native clause approval or full-source-case certification.
# Local Windows UI-only diagnostic (not acceptance)

`node scripts/workspace-multi-root-ui-only.js --artifacts <fresh-directory>`
is an explicit local supplementary diagnostic, not a registered suite/lane.
Set `LA_E2E_CLI_EXTENSIONS_DIR` to the verified prepared local seed and put
`node_modules/.bin` on PATH. It requires Windows Code 1.144.0 and an existing
FuncCoreTools binary cache; it does not install dependencies or provision Azure.
It refuses inherited ADO/Azure, isolation and full-suite evidence context.
The verified producer seed is copied into the owned short root before launch:
C# can write derived runtime caches even when Marketplace updates are disabled.

The supported Create Workspace helper creates the initial Standard Stateful
workspace. A fresh owned regular Code window awaits the existing recorder's
same-workspace product-activation completion before using
`ensureRegularWorkbenchExplorer` and `addWorkspaceMultiRootProjects`: the
**same** folder right-click/Create New Project, webview form, review/create and
wizard-disposal sequence used by the protected full family, twice sequentially.
Screenshots, input dispatch, focus and hit-testing observations preserve the first
failed boundary before Close Window; there is no automatic retry.

The explicit `--activation-capture-only` follow-up mode awaits that same activation
and captures `View: Show Explorer`, then closes without calling the project-add
stage. It never reports `uiPassed: true` and cannot retry a failed project add.

Design-time and Azurite auto-start are disabled for this UI-stage diagnostic.
Normal product activation/ensure remains enabled, but no reload, runtime
population, debug or Mapper acceptance is attempted. Thus it can diagnose the
Explorer/wizard boundary but cannot prove the full runtime lifecycle or establish
that a C# preview caused a cloud timeout.

Short `D:\la9f5298-ui-*` roots have an invocation ownership marker. The shared
Windows Job Object host owns setup, regular Code, and the bounded outer worker;
only retained-window native Close Window and Job-owned recovery are used. No
machine-wide process/port scan or name-based termination is allowed.
Missing/forced original closure is reported separately, never accepted as natural
closure, and prevents root deletion. Only sanitized logs, screenshots and receipts
are artifacts; raw profiles are not copied. Results explicitly say `uiOnly: true`
and `fullSuiteAccepted: false`, even when both UI adds succeed.

The full runner guard, full UI guard, population acceptance, phase inventory and
23-lane rollup are unchanged. This diagnostic does not substitute for them.
