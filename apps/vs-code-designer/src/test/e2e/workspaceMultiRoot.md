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
- Admitted `LA_E2E_CLI_MULTI_ROOT_FUNC_SHA256` before bootstrap.
  `LA_E2E_CLI_MULTI_ROOT_FUNC_PATH`, when supplied, must be the same root's
  `FuncCoreTools/func.exe` (Windows) or `FuncCoreTools/func` (Linux). In batch mode
  omit a stale parent-root path; the family derives the path under its new
  isolated suite dependency root and still requires the admitted digest.
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
