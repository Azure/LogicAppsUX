# Multi-root workspace supplementary native family

Selector: `node scripts/run-e2e-cli.js --workspace-multi-root` from
`apps/vs-code-designer`, or `pnpm --dir apps/vs-code-designer run
test:e2e-cli:workspace-multi-root`. It uses the official CLI wizard setup and the
same admitted Code executable, extensions, dependency root and generated
`.code-workspace`. It is **not** another baseline Mocha label: all existing
labels, canonical counts and rollup contracts remain unchanged.

The shared suite ID is **`workspaceMultiRoot`**. It is also explicitly selectable
with `node scripts/run-e2e-cli.js --suites workspaceMultiRoot`; legacy `linux` /
`windows` aliases are deliberately unchanged. Its exact ordered phase IDs are:

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

   The exact oracle is **total running `func` executables equals the number of
   Logic Apps in this workspace**. The denominator comes from every persisted
   workspace folder with generated host/settings/workflow artifacts and must
   agree with the fresh native workspace view. Artifact folders are not apps.
   The numerator is the complete native machine population of `func` /
   `func.exe`, not selected task PIDs, dotnet/NetFx workers or a fabricated
   one-host-per-root mapping. Every candidate's PID, creation identity,
   executable and admitted SHA-256 must be readable. Double native scans,
   binary revalidation and at least three identical samples over 1.5 seconds
   reject incomplete enumeration, PID reuse, races and unstable cardinality.
   Permissions and wrong/unrelated binaries fail immediately; races restart
   stability only within the original deadline.
3. Choose each generated, **folder-qualified** debug configuration sequentially.
   An additive test observer records actual VS Code start/termination events,
   including the native workspace folder, session ID, name and debug type.
   Require the correct session plus the visible debug toolbar; stop it and
   observe actual termination before selecting another folder. This clause
   proves launch/stop, not workflow execution, trigger callbacks or run history.
4. Open the actual Azure view, expand Data Mapper if necessary and click its
   **Create data map** action. Select a real workspace folder, enter a map name,
   and require an active, visible, correctly owned webview with loaded
   **Source schema** and **Target schema** UI. A discovered command, arbitrary
   designer frame, hidden old Mapper or caught discovery error is not a pass.
   The source does not require selecting schemas, saving/testing a map or any
   external schema asset; those are deliberately outside this family.

All source identifiers, titles, images and private mappings remain outside
tracked files. The public names above describe only observable behavior.

## Native consumer requirements — parent-owned

No native run is authorized on a shared development host. The parent must
merge the bounded family and add this supplementary requirement to an
**isolated Windows/Linux Azure DevOps consumer**, without adding a new
canonical baseline label or reusing baseline Mocha counts as GUI credit.

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

```powershell
# Repository root; these commands never start Code, func, CDP or cloud resources.
node node_modules/typescript/bin/tsc -p apps/vs-code-designer/tsconfig.e2e.json
pnpm --dir apps/vs-code-designer run test:e2e-cli:workspace-multi-root:unit
```

The controls are also additive to `test:e2e-cli:unit`. Native population tests
inject unit-owned process/file fixtures; they do not enumerate or kill actual
processes. They cover permissions, races, stale PIDs, wrong binary, wrong/extra/
partial counts, deadline overrun, incomplete roots, real-reload document
contract, hidden/wrong Mapper, sequential folder debug and finalization.
They are **not** native clause approval or full-source-case certification.
