# VS Code E2E Testing Knowledge

Curated durable learnings for VS Code ExTester UI E2E tests. Add entries through `session-knowledge-curator`.

## Triggers → use this file

- ExTester / `run-e2e.js`, any phase work (4.0–4.8), `E2E_MODE=*` selection
- `apps/vs-code-designer/src/test/ui/**/*.test.ts`, helpers in `designerHelpers.ts` / `runHelpers.ts` / `helpers.ts`
- CI matrix shards `independent`, `designer`, `newtests`, `conversion`, `scenarios-pilot`
- VS Code webview iframe switching, overview/run lifecycle, modal dialog interaction on xvfb
- Adding a new E2E test, debugging a CI-only failure, writing diagnostic dumps
- See also: [`runtime-readiness-probes.md`](runtime-readiness-probes.md) for runtime/HTTP probe rules,
  [`vscode-task-env-propagation.md`](vscode-task-env-propagation.md) for `func: host start` env bugs,
  [`ci-patterns.md`](ci-patterns.md) for the shard matrix workflow and coverage gate.

## Core Sources

- `apps/vs-code-designer/src/test/ui/SKILL.md`
- `apps/vs-code-designer/src/test/ui/run-e2e.js`
- `apps/vs-code-designer/src/test/ui/designerHelpers.ts`
- `apps/vs-code-designer/src/test/ui/runHelpers.ts`
- `apps/vs-code-designer/src/test/ui/workspaceManifest.ts`

## Current Learnings

### `@vscode/test-cli` Create Workspace CI publishes structured results

- Learning: `.github/workflows/vscode-e2e.yml` runs the latest-stable `@vscode/test-cli` Create Workspace labels in the `vscode-e2e-cli-create-workspace` matrix and each label must publish structured results, not only logs.
- Why it matters: Without JUnit/JSON summaries, screenshots, and aggregate pass-rate output, failures are discovered by reading long VS Code host logs and users cannot quickly see which label failed.
- Pattern:
  1. Run each label through `apps/vs-code-designer/scripts/run-e2e-cli.js`.
  2. Tee the raw log to `.vscode-test/results/<label>.log`.
  3. Generate `.json`, `.junit.xml`, and `.summary.md` with `scripts/summarize-e2e-cli-results.js`.
  4. Upload `vscode-e2e-cli-test-results-<label>`, `vscode-e2e-cli-log-<label>`, and `vscode-e2e-cli-screenshots-<label>`.
  5. Let `vscode-e2e-cli-create-workspace-report` download all label result artifacts and publish the aggregate pass-rate dashboard plus JSON/JUnit/JSONL trend artifacts.
- Source: `apps/vs-code-designer/scripts/summarize-e2e-cli-results.js`, `.github/workflows/vscode-e2e.yml`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`, `release-scribe`.
- Status: verified.

### `run-e2e.js` is the suite entry point

- Learning: VS Code UI E2E tests must be wired through `apps/vs-code-designer/src/test/ui/run-e2e.js` and its phase model.
- Why it matters: One-off ExTester scripts can pass locally while being invisible to CI.
- Source: `apps/vs-code-designer/src/test/ui/run-e2e.js`, `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`, `vscode`, `ci-sentinel`.
- Status: verified.

### `run-e2e.ts` registration is not CI coverage

- Learning: Adding a scenario to `run-e2e.ts` or adding a focused `E2E_MODE` only makes the test runnable locally. PR CI runs the grouped scenario matrix in `.github/workflows/vscode-e2e.yml`; a new scenario must be added there with the correct fixture/bundle flags, or explicitly documented as local-only.
- Why it matters: Issue #7040's `p49-nugetdebugconversion` scenario was present behind `E2E_MODE=nugetdebugonly`, but CI did not run it until it was added to the workflow matrix. That left the regression protected locally but not on pull requests.
- Pattern:
  1. Add or update the scenario entry in `run-e2e.ts`.
  2. Add it to `.github/workflows/vscode-e2e.yml` under an appropriate `vscode-e2e` matrix shard.
  3. Set `use_workspace_fixtures` and `use_bundle_artifact` to match the scenario's `workspaceSpec` and runtime needs.
  4. Update `apps/vs-code-designer/src/test/ui/SKILL.md` scenario/mode documentation in the same PR.
  5. If it is intentionally local-only, document that explicitly near the scenario and in the local run instructions.
- Source: Issue #7040 PR #9508 review; `p49-nugetdebugconversion` CI wiring gap.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`, `chief-engineer`.
- Status: verified.

### Focused scenarios must satisfy their fixture prerequisites first

- Learning: Before running a focused `E2E_MODE` or `LA_E2E_SCENARIO`, inspect the scenario's `workspaceSpec` in `run-e2e.ts`. Any scenario with `workspaceSpec: { ... }` or `workspaceSpec: 'manifest-multi'` consumes the Phase 4.1 fixture manifest at `%TEMP%\la-e2e-test\created-workspaces.json`; object specs may use `use: 'none'` to require the manifest without opening a startup resource. Run `p41a-fixtures` (or a grouped/full mode that runs Phase 4.1 first) before the focused scenario when that manifest is missing, stale, or was cleaned up.
- Why it matters: Running p49 (`E2E_MODE=nugetdebugonly`) without the p41 fixture setup starts the wrong problem: the scenario has no generated Standard/Stateful `.code-workspace` to open, so agents waste cycles debugging workspace-open/setup failures instead of the NuGet debug lifecycle.
- Pattern:
  1. Check `run-e2e.ts` for the target scenario's `workspaceSpec`.
  2. If it is `self-contained`, `self-creates`, or `plain-folder`, no Phase 4.1 manifest is required.
  3. If it is an object such as `{ appType: 'standard', wfType: 'Stateful' }` or `manifest-multi`, first run `p41a-fixtures` or an E2E mode that includes Phase 4.1/createWorkspace setup.
  4. Confirm `%TEMP%\la-e2e-test\created-workspaces.json` exists and points at live workspace directories before running the focused scenario.
  5. If a prior run's cleanup removed or corrupted fixture directories, rerun the fixture phase instead of patching paths by hand.
- Current manifest-backed scenarios:

  | Scenario | Required manifest entry / resource |
  |---|---|
  | `p42-standard` | Standard Stateful `.code-workspace` |
  | `p42-customcode` | CustomCode Stateful `.code-workspace` |
  | `p42-rulesengine` | RulesEngine Stateful `.code-workspace` |
  | `p42-connectionprompt` | Standard Stateful `.code-workspace` |
  | `p43-inlinejavascript` | Standard Stateful `.code-workspace` |
  | `p43-customcode` | CustomCode Stateful `.code-workspace` |
  | `p43-rulesengine` | RulesEngine Stateful `.code-workspace` |
  | `p44-statelessvariables` | Standard Stateless `.code-workspace` |
  | `p45-designerviewextended` | Standard Stateful `.code-workspace` |
  | `p46-keyboardnav` | Standard Stateful `.code-workspace` |
  | `p47-suite` | `manifest-multi`; preferred Standard Stateful startup resource, then test reads the manifest |
  | `p48a-conversionno` | Standard Stateful workspace directory (`use: 'wsDir'`) |
  | `p48c-multipledesigners` | `manifest-multi`; preferred Standard Stateful startup resource, then test reads the manifest |
  | `p48e-conversionsubfolder` | Standard Stateful app directory (`use: 'appDir'`) |
  | `p49-descriptionpersistence` | Standard Stateful `.code-workspace` |
  | `p49-nugetdebugconversion` | Standard Stateful manifest entry, but no startup resource (`use: 'none'`) because the test clones and opens its own workspace |
  | `p412-bundlerepair` | Standard Stateful `.code-workspace` |

- Current scenarios that do **not** require the Phase 4.1 fixture manifest: `p40-nonlogicapp` (`plain-folder`), `p41a-fixtures` (`self-creates`), `p41b-createworkspace-behavior` (`self-creates`), `p48b-conversioncreate` (`self-contained`), and standalone `p48d-conversionyes` (`plain-folder`). The grouped `conversiononly` mode still needs the manifest because its p48a/p48c/p48e phases and workspace-dir resource selection are manifest-backed.
- Debug-pane/focused runner support: `run-e2e.ts` automatically runs `p41a-fixtures` when manifest-backed focused modes or `LA_E2E_SCENARIO` selections detect a missing/stale manifest before continuing to the requested scenario.
- When adding a new scenario, update this map in the same PR as the `run-e2e.ts` scenario entry.
- Source: Issue #7040 local p49 iteration; `run-e2e.ts` scenario table (`p41a-fixtures`, `p49-nugetdebugconversion`) and `selectWorkspaceForSpec`.
- Applies to: `vscode-test-specialist`, `test`, `customer-repro-tester`, `ci-sentinel`.
- Status: verified.

### Read `SKILL.md` before VS Code E2E edits

- Learning: `apps/vs-code-designer/src/test/ui/SKILL.md` captures prior session learnings for ExTester setup, phase behavior, selectors, webviews, overview navigation, and CI pitfalls.
- Why it matters: Many VS Code E2E failures are caused by known suite-specific constraints rather than product regressions.
- Source: `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`, `chief-engineer`, `senior-swe-critic`.
- Status: verified.

### Prefer helper-driven interactions

- Learning: New VS Code E2E tests should reuse `designerHelpers.ts`, `runHelpers.ts`, and `workspaceManifest.ts` before adding raw Selenium flows.
- Why it matters: Shared helpers encode retries, webview switching, command palette behavior, and overview/run lifecycle rules.
- Source: `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`.
- Status: verified.

### Opening designer requires proactive popup hygiene

- Learning: Any E2E that opens the designer must proactively account for common blocking UI before and during designer launch:
  1. Ensure `local.settings.json` contains `WORKFLOWS_SUBSCRIPTION_ID: ""` before opening designer so `getAzureConnectorDetailsForLocalProject()` does not launch the "Enable connectors in Azure for Logic App" / "Use connectors from Azure" QuickPick.
  2. Call shared prompt-dismissal helpers around workspace open, command-palette actions, designer launch, and webview waits so connector parameterization prompts, C# Dev Kit sign-in prompts, auth dialogs, notifications, and stale QuickInputs are cleared.
  3. Treat any new modal/QuickPick/notification blocker as suite infrastructure: add it to shared helpers (`helpers.ts` / `designerHelpers.ts`), not to a single test.
  4. Fatal Azure Logic Apps notifications that indicate a broken extension install, such as `ENOENT: no such file or directory, open ... vs-code-react/index.html`, must fail fast through the shared `helpers.ts` guard instead of being dismissed or handled in a scenario-specific test.
  5. `.vscode` regeneration prompts can be visible in CI screenshots but appear absent locally because local helper timing may confirm/dismiss the modal before a human sees it. Tests should opportunistically confirm the prompt but assert the durable invariant: exact regenerated `.vscode` file contents.
- Why it matters: These prompts are environmental blockers, not the behavior under test. Letting them surface burns iteration cycles waiting on a test that is blocked by a known popup instead of exercising the product path.
- Source: Issue #7040 local E2E iteration; `apps/vs-code-designer/src/test/ui/helpers.ts`; `designerHelpers.ts` `ensureLocalSettingsForDesigner`, `handleDesignerPrompts`, `executeOpenDesignerCommand`.
- Applies to: `vscode-test-specialist`, `test`, `customer-repro-tester`, `ci-sentinel`.
- Status: verified.

### React webview clicks need Selenium Actions

- Learning: Direct `.click()` calls inside React webview iframes can fail to trigger handlers; use Selenium Actions API for React element clicks.
- Why it matters: Direct clicks can create false test failures or false positives around designer UI actions.
- Source: `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`.
- Status: verified.

### Overview navigation requires editor cleanup

- Learning: Close editors and switch back to the default VS Code frame before opening overview webviews.
- Why it matters: Multiple webview iframes can cause tests to enter the wrong frame.
- Source: `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`.
- Status: verified.

### Manual visible iframe switching can be required in CI

- Learning: For VS Code ExTester tests, manual visible iframe switching can be more reliable than ExTester's generic `WebView` helper when multiple webviews or stale iframes exist.
- Why it matters: PR #9080 stabilized custom-code E2E flows by replacing brittle webview switching patterns that were reliable locally but flaky in CI.
- Source: Azure/LogicAppsUX#9080 commit `Replace ExTester WebView with manual iframe switching for CI reliability`; `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### E2E review-page assertions need page-specific evidence

- Learning: Do not treat persistent wizard navigation labels as proof that a VS Code webview reached the intended step. Assert page-specific evidence such as step text, review content, enabled Create buttons, or expected files.
- Why it matters: PR #9148 fixed a conversion-create E2E failure where `Review + create` was always visible and could falsely pass while the wizard was still on setup.
- Source: Azure/LogicAppsUX#9148, commit `test(vscode): harden conversion create review step`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-critic`.
- Status: verified.

### Single-click create flows need both UI and host guards

- Learning: For VS Code webview create flows, tests should prove a single user click starts work and the implementation should guard both webview UI state and extension-host message handling against duplicate create messages.
- Why it matters: PR #9148 needed an immediate pending/disabled state plus host-side `isCreateInProgress` de-duping to make convert-to-workspace creation reliable.
- Source: Azure/LogicAppsUX#9148 commits `fix: prevent multiple Create clicks in convert-to-workspace webview` and `fix(vscode): harden workspace conversion create`.
- Applies to: `vscode`, `vscode-test-specialist`, `test`.
- Status: verified.

### Output channel mocks need full surfaced methods

- Learning: VS Code unit tests that mock output channels should include methods used by the implementation, including `appendLog` when extension code logs through that helper.
- Why it matters: PR #9127 fixed `enableDevContainer` integration test failures by adding the missing output-channel mock surface instead of weakening the test.
- Source: Azure/LogicAppsUX#9127 commit `Fix enableDevContainer output channel mock`.
- Applies to: `test`, `vscode-test-specialist`, `vscode`.
- Status: verified.

### Debug regressions need the real workspace and launch path

- Learning: VS Code debug-path regressions should create Logic App workspaces through the Create Workspace webview, then reopen the generated `.code-workspace` as the startup resource in a fresh `run-e2e.js` phase before starting debug.
- Why it matters: Hand-written folders, opening only the parent directory, or continuing in the workspace-creation session can miss generated settings, launch shape, extension reload behavior, prompts, and the actual Logic Apps debug provider path.
- Pattern:
  1. Create the workspace through the product webview in one session.
  2. Patch only minimal test-specific generated files after creation.
  3. End that VS Code session and launch a fresh session with the generated `.code-workspace`.
  4. Wait for design-time startup evidence such as `workflow-designtime/` before debug assertions.
  5. Close unrelated info/sign-in prompts before command-palette or debug actions.
- Source: Azurite auto-start debug regression session, `apps/vs-code-designer/src/test/ui/run-e2e.js`, `apps/vs-code-designer/src/test/ui/azuriteAutostartFailure*.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `customer-repro-tester`, `ci-sentinel`.
- Status: verified.

### NuGet debug conversion regressions need a two-F5 runnable lifecycle

- Learning: For bundle-to-NuGet debug regressions, use the `p49-nugetdebugconversion` / `E2E_MODE=nugetdebugonly` shape: start from a generated Standard Stateful workspace, seed a deterministic non-empty built-in Request trigger + Response action workflow, F5, run the workflow successfully, stop debugging, convert the same project to NuGet, then F5 again and run the same workflow successfully.
- Why it matters: Issue #7040 was not proven by host startup alone or by an empty workflow. The regression involved stale pre-conversion runtime/task state and only surfaced when the post-conversion project had to debug and execute the same real workflow.
- Test contract:
  1. Seed built-in Request + Response only; avoid connector catalog dependencies.
  2. Verify bundle debug can run the workflow before conversion.
  3. Stop debugging.
  4. Convert to NuGet.
  5. Verify NuGet `.csproj`, `.vscode/tasks.json`, `.vscode/launch.json`, and the `clean`/`build`/`func: host start` task chain.
  6. Start the second F5 without harness pre-F5 port cleanup so product cleanup code is exercised.
  7. Verify the workflow runs successfully again, including run history `Succeeded` and action evidence such as `Response:Succeeded`.
- Source: Issue #7040 investigation; `apps/vs-code-designer/src/test/ui/nugetDebugConversion.test.ts`; `apps/vs-code-designer/src/test/ui/run-e2e.ts` scenario `p49-nugetdebugconversion`.
- Applies to: `vscode-test-specialist`, `test`, `vscode`, `ci-sentinel`.
- Status: verified.

### Latest-stable CLI parity commands for NuGet and codeful debug

- Learning: The `@vscode/test-cli` baseline has focused manual parity commands for runtime-heavy Create Workspace gaps:
  - `pnpm run test:e2e-cli:nuget-conversion-lifecycle` creates a Standard Stateful workspace through the CLI Create Workspace webview, seeds a Request/Response workflow, proves bundle debug/run, converts to NuGet, verifies regenerated NuGet project/debug artifacts, and proves post-conversion debug/run without harness port cleanup.
  - `pnpm run test:e2e-cli:codeful-debug-tasks` creates modern and legacy-control codeful workspaces through the CLI Create Workspace webview, patches only generated codeful source to a connector-free Request/Response debug guard, reopens each generated `.code-workspace` in a fresh latest-stable host, records VS Code task events directly from the extension host, requires the F5 Functions host to report `Running`, and verifies modern skips `publish` while legacy runs `clean release` + `publish`.
- Run shape: Use the package scripts above, not raw `pnpm run test:e2e-cli --label ...`, for these lifecycle flows. The scripts intentionally launch multiple fresh VS Code hosts: one to create the workspace and write a manifest, then one or more hosts to reopen the generated project with the required startup resource and environment variables.
- Why it matters: These close the two latest-stable CLI parity rows that used to be documented as ExTester-only while keeping ExTester as the deeper Selenium/UI owner.
- Source: `apps/vs-code-designer/src/test/e2e/workspaceLifecycle.test.ts`, `apps/vs-code-designer/scripts/run-e2e-cli.js`, `apps/vs-code-designer/src/test/e2e/createWorkspaceParityMap.md`.
- Applies to: `vscode-test-specialist`, `test`, `vscode`, `ci-sentinel`.
- Status: verified.

### Do not use harness port cleanup when product cleanup is the regression

- Learning: If the regression is about stale `func` task/process cleanup across debug sessions, the critical F5 must bypass `runHelpers.startDebugging()` / `prepareForFreshFuncHost()` and invoke `Debug: Start Debugging` directly.
- Why it matters: Harness cleanup masks whether the extension itself stops stale scoped func tasks/processes before rebuilding and starting the post-conversion host.
- Source: Issue #7040 investigation; `nugetDebugConversion.test.ts` `startDebuggingWithoutHarnessCleanup`.
- Applies to: `vscode-test-specialist`, `test`, `vscode`.
- Status: verified.

### Use the root Debug menu for local run-e2e modes

- Learning: Root `.vscode/launch.json` contains Run and Debug entries for `run-e2e.ts` modes, including `E2E: p49 NuGet debug conversion` and `E2E: Select mode (run-e2e)`; root `.vscode/tasks.json` contains prelaunch tasks that build the extension and compile UI E2E tests.
- Why it matters: Running the same suite from the VS Code Debug menu avoids one-off terminal commands that drift from `run-e2e.ts` and makes focused local repros repeatable across sessions.
- Source: Issue #7040 investigation; `.vscode/launch.json`; `.vscode/tasks.json`.
- Applies to: `vscode-test-specialist`, `test`, `customer-repro-tester`.
- Status: verified.

### Fill webview wizard inputs by label, not index

- Learning: VS Code wizard webview E2Es should locate inputs by their visible label (e.g., `findInputByLabel('Workspace name')`) rather than by DOM index or positional order.
- Why it matters: PR #9161 stabilized `workspaceConversionCreate.test.ts` after the index-based fills wrote the workspace path into the name field when the wizard reordered/re-rendered inputs.
- Source: Azure/LogicAppsUX#9161; `apps/vs-code-designer/src/test/ui/workspaceConversionCreate.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-critic`.
- Status: verified.

### Wrap every webview DOM read against stale elements

- Learning: In VS Code webview E2Es, every per-element read — `label.getText()`, `label.getAttribute('for')`, parent traversal, and inner `findElement(...)` — must tolerate `StaleElementReferenceError` and `continue` to the next candidate. Filtering only on `isDisplayed()` is not enough.
- Why it matters: PR #9161 followup commit `Handle stale labels in conversion create E2E` (5283d8a) addressed reviewer feedback that the helper still threw when the webview re-rendered between the initial visibility filter and the later label-processing calls.
- Source: Azure/LogicAppsUX#9161 Copilot review comment on `findInputByLabel`; commit `5283d8a5`; `apps/vs-code-designer/src/test/ui/workspaceConversionCreate.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-reviewer`.
- Status: verified.

### Gate Next/Create on validation completion, not button visibility

- Learning: For VS Code wizard webviews, click `Next`/`Create` only after path/name validators report success (button enabled, no error decorators) — not just after the button becomes visible.
- Why it matters: Webview validators are async; clicking on visibility races with validation and advances the wizard with invalid fields, causing later assertions to fail. PR #9161 added waits for path/name validation before advancing.
- Source: Azure/LogicAppsUX#9161 commit `Harden conversion create E2E flow` (91a41294); `apps/vs-code-designer/src/test/ui/workspaceConversionCreate.test.ts`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### Target primary actions by exact button text

- Learning: Use exact-text predicates (e.g., `waitForButtonByExactText('Create')`) for `Create`/`Submit`/`Next` actions in VS Code webviews instead of position-based or partial-text selectors.
- Why it matters: PR #9161 commit `Target conversion create submit action` (d52a5172) fixed flakiness where the test could click an adjacent or earlier button after the wizard layout changed.
- Source: Azure/LogicAppsUX#9161 commit `d52a5172`; `apps/vs-code-designer/src/test/ui/workspaceConversionCreate.test.ts`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### Shared DOM helpers prevent suite drift

- Learning: When the same DOM-query helpers (`waitForButtonByExactText`, `toXPathLiteral`, `findInputByLabel`, `clearAndType`, etc.) appear in multiple VS Code E2E suites, extract them into `apps/vs-code-designer/src/test/ui/helpers.ts` (or `designerHelpers.ts`/`runHelpers.ts`) so they evolve together.
- Why it matters: Duplicated DOM helpers drift over time and reintroduce flakiness when the webview UI changes. PR #9161 reviewer flagged this for the conversion-create helpers vs. `createWorkspace.test.ts`.
- Source: Azure/LogicAppsUX#9161 Copilot review comment on helper duplication; `apps/vs-code-designer/src/test/ui/helpers.ts`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-reviewer`.
- Status: needs revalidation — the extraction was deferred in PR #9161 with documented scope rationale; future test-touching PRs should consolidate when scope permits.

### Azurite failure E2Es must prove root-cause behavior

- Learning: Azurite auto-start failure E2Es should prove the Azurite timeout appears and downstream `AzureWebJobsStorage` / `Debug anyway` prompts do not appear; prompt suppression alone is not a fix.
- Why it matters: The original regression continued after Azurite readiness failed, so hiding later prompts would mask the broken control flow rather than prove debug stopped correctly.
- Pattern:
  - Use a fake Azurite extension that registers `azurite.start` but does not start an emulator.
  - Occupy Azurite ports `10000`, `10001`, and `10002` with fast HTTP responders, not bare TCP sockets that can hang probes.
  - Use the Logic Apps launch shape: `type: "logicapp"`, `request: "launch"`, `funcRuntime: "coreclr"`, and `isCodeless: true`.
  - Capture visible workbench text plus terminal/output logs when the expected timeout is not visible.
  - Use a unique temp workspace parent per launcher run to avoid stale Windows locks.
- Source: Azurite auto-start debug regression session, `apps/vs-code-designer/src/test/ui/azuriteAutostartFailure*.test.ts`, `apps/vs-code-designer/src/test/ui/run-e2e.js`.
- Applies to: `vscode-test-specialist`, `test`, `vscode`, `ci-sentinel`.
- Status: verified.

### CI-dependent waits start at a 90s deadline

- Learning: VS Code E2E helpers gated on the Functions runtime (`func host start`) should use a 90s deadline as their default, not 30s. Cold-start of the ExtensionBundle on Linux CI runners routinely exceeds 30s, especially on shards that skip Phase 4.2 designer warm-up (e.g. `createplusnewtests` jumping from Phase 4.1 directly to Phase 4.3).
- Why it matters: Commit `9c5f6bd6d` extended `waitForRunStatusInList` 30s→90s; commit `2d959c9a9` extended `clickRunTrigger` 30s→90s after Phase 4.3 reproducibly failed (2/2) on the newtests shard while `func` was still loading bundle DLLs.
- Source: `apps/vs-code-designer/src/test/ui/runHelpers.ts:82` (`waitForRuntimeReady`), `runHelpers.ts:389` (`clickRunTrigger`), `runHelpers.ts:458` (`waitForRunStatusInList`); commits `9c5f6bd6d`, `2d959c9a9`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### Post-find enabled-stability re-check before clicking runtime-gated buttons

- Learning: After confirming a runtime-gated webview button is enabled, sleep ~500ms, re-find the element, and re-read both `disabled` and `aria-disabled`. Only click if it is still enabled. Fluent UI re-renders during `func` cold-start can flip the button back to disabled and race the click.
- Why it matters: Commit `2d959c9a9` added this poll to `clickRunTrigger` after Phase 4.3 (`inlineJavascript.test.ts`) reproducibly failed on shards where the runtime was mid-cold-start when the Run-trigger button first rendered.
- Source: commit `2d959c9a9`; `apps/vs-code-designer/src/test/ui/runHelpers.ts:415-440`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### Treat aria-disabled as equivalent to disabled on Fluent UI v9 buttons

- Learning: When polling for a button to become clickable in webviews, check both the `disabled` HTML attribute and `aria-disabled="true"`. Fluent UI v9 surfaces disabled state via aria; `disabled`-only checks will click effectively-disabled buttons.
- Why it matters: Commit `2d959c9a9` switched `clickRunTrigger` to `!!disabledAttr || ariaDisabled === 'true'` after the existing `disabled`-only check raced cold-start re-renders.
- Source: commit `2d959c9a9`; `apps/vs-code-designer/src/test/ui/runHelpers.ts:403-405,427`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### Throttle polling logs and capture screenshot on deadline

- Learning: Long-running polls (>30s) should log "still waiting" state at most once per 10s and capture a screenshot when the deadline expires. This keeps CI logs readable and makes flakes diagnosable from artifacts alone.
- Why it matters: Commit `2d959c9a9` added throttled logging + a `clickRunTrigger-timeout` screenshot to `clickRunTrigger` to support shard-level diagnosis on Phase 4.3.
- Source: commit `2d959c9a9`; `apps/vs-code-designer/src/test/ui/runHelpers.ts:407-413,453`; pattern also in `runHelpers.ts:95-97` (`debug-waiting-for-runtime`).
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### Debug-toolbar readiness ≠ Functions host readiness

- Learning: `waitForRuntimeReady` can return as soon as the VS Code debug toolbar is visible (~1-2s after attach), while `func` is still loading bundle DLLs and port 7071 is not yet `running`. Downstream operations that touch the runtime (Run trigger, list runs) must either poll the 7071 admin endpoint themselves, pass `requireHostRunning: true`, or use a 90s+ deadline.
- Why it matters: This race is the root cause behind commit `2d959c9a9`'s shard-level Phase 4.3 regression on `createplusnewtests`, where the shard skips Phase 4.2 designer warm-up. Commit `54fab3c7b` added `waitForRuntimeReady(driver, { requireHostRunning: true })` and `assertRunTriggerable(driver)` to make the gate explicit.
- Source: `apps/vs-code-designer/src/test/ui/runHelpers.ts:100-114` (toolbar check) vs `runHelpers.ts:136-153` (port 7071 status); commits `2d959c9a9`, `54fab3c7b`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### Reusable click-with-fallback for webview elements

- Learning: Use `clickElementWithFallback(driver, element, description)` — which scrolls the element into view, attempts a Selenium Actions click, then falls back to `arguments[0].click()` — instead of bare `element.click()` for any webview button or menu item.
- Why it matters: Commit `9c5f6bd6d` introduced this helper and applied it to `clickAddActionMenuItem` after the bare `.click()` no-opped against React menu items. Commit `e1532feb1` applied the same Actions-first pattern to the workspaceConversionCreate "Create workspace" click.
- Source: `apps/vs-code-designer/src/test/ui/designerHelpers.ts:1261-1276`; commits `9c5f6bd6d`, `e1532feb1`.
- Applies to: `vscode-test-specialist`, `test`.
- Status: verified.

### prepareFreshSession is the contract for inter-phase isolation

- Learning: Every E2E phase boundary in `run-e2e.js` must call `prepareFreshSession(label)`, which (1) kills stale VS Code/chromedriver from `test-resources`, (2) sleeps 5s for IPC socket release, (3) removes stale `.sock` files on Linux/macOS, (4) deletes only `settings/User/` (not the entire `settings/`), and (5) chmods downloaded `func`/runtime binaries.
- Why it matters: Skipping the process-kill makes `code -r` route the workspace-open to the previous window (visible symptom: "empty VS Code" screenshots). Deleting all of `settings/` hits locked log/cache files; deleting only `User/` sidesteps ExTester's `fs.removeSync` race.
- Source: `apps/vs-code-designer/src/test/ui/run-e2e.js:769-870`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### Path-filtered PR workflows can be coalesced by GitHub after rapid pushes

- Learning: When a PR receives multiple pushes in quick succession, GitHub's `pull_request` sync triggers can stop firing for path-filtered workflows even when each push includes file changes matching the path filter. Other workflows on the same PR (e.g., `pull_request_target` ones with no path filter) continue to fire. Add a `workflow_dispatch:` trigger so maintainers/agents can manually re-run the workflow from the Actions UI as a fallback.
- Why it matters: PR #9164 hit this on commits `1ece020cb`, `9803d5615`, `a7821ed2c`, `cc294ffa7d`, `857567947` — none triggered `vscode-e2e.yml` despite each touching `apps/vs-code-designer/**`. `PR AI Validation` (`pull_request_target`, no path filter) fired on every push.
- Source: commit `857567947` (`.github/workflows/vscode-e2e.yml` adds `workflow_dispatch:`).
- Applies to: `ci-sentinel`, `chief-engineer`, `vscode-test-specialist`.
- Status: verified.


### Diagnostics-first discipline for CI-only failures (PR #9164 meta-lesson)

- Learning: For VS Code E2E failures that reproduce only in CI with no log signal, add dump-on-failure diagnostics early before adding broad retries or sleeps. Delayed diagnostics made PR #9164 triage longer than necessary; once diagnostics landed, the team identified the real root cause (`func: host start` PATH propagation, see `vscode-task-env-propagation.md`) cleanly.
- Rule: when a runtime-gated wait/click fails in CI, dump on failure:
  1. The terminal panel text for the relevant task (e.g. `func: host start`).
  2. A raw Node `http` probe to the suspected service (e.g. `:7071/admin/host/status`, `/management/workflows/{name}` filtered for health).
  3. `Get-Process` / `ps` for the relevant service binaries (`func`, `dotnet`, `vsdbg`).
  4. Filesystem state of expected artifacts (`workflow-designtime/`, generated `host.json`, `local.settings.json`).
  5. Config files: `host.json`, `local.settings.json`, `.vscode/launch.json`, `.vscode/tasks.json`.
- Reference helpers from PR #9164:
  - `dumpSuspiciouslyFastHost` — fires when `:7071` answers in <2s without a preceding `[killport]` log, signalling a stale host (commit `1fa956ca6`).
  - `dumpDialogDiagnostics` — captures modal dialog DOM state on click failure (commit `aa2c61cba`, conversionYes Track 3).
- Cost analysis: a small amount of targeted diagnostic code prevented further blind CI iteration.
- Source: PR #9164 commits `7bc8b05eb`, `1fa956ca6`, `aa2c61cba`; `apps/vs-code-designer/src/test/ui/runHelpers.ts`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`, `vscode`, `chief-engineer`.
- Status: verified.

### Grouped named shards are the current VS Code E2E CI shape

- Learning: VS Code E2E runs a small set of grouped, human-readable shards
  (`vscode-e2e (<shard>)`, e.g. `designer-lifecycle`, `runtime-actions`,
  `project-conversion`) plus the single `vscode-e2e-summary` rollup. Each shard
  passes a comma-separated `LA_E2E_SCENARIO` list; `run-e2e.js` runs every
  scenario in its OWN fresh VS Code session (`prepareFreshSession` kills
  lingering processes between scenarios), so grouping preserves per-scenario
  isolation and is NOT the flaky "multiple tests in one window" pattern. A
  failing scenario still runs its siblings and fails the shard (`run-e2e.js`
  aggregates exit = max). Do not reintroduce workflow-level `continue-on-error`
  or internal `allowFailure` masking; strict shards must fail loudly. Keep
  `workflow_dispatch:` as a manual fallback because path-filtered PR workflows
  can be coalesced after rapid pushes.
- Why it matters: the earlier strict per-scenario fan-out (one shard per
  `p*` id) minimized wall-clock but paid the fixed setup cost (pnpm install,
  node symlink, xvfb apt-get, artifact download/extract, bundle + fixtures
  hydration) on ~18 runners. Grouping amortizes that setup onto ~7 runners —
  cutting redundant setup and runner/queue pressure — while keeping failures
  attributable to a shard (open its log or `vscode-e2e-screenshots-<shard>`
  artifact to see which scenario failed). Group members share the same
  `use_workspace_fixtures` / `use_bundle_artifact` needs so no scenario is
  denied an artifact.
- Branch protection note: required status checks match on check NAME. Renaming
  or regrouping shards changes `vscode-e2e (<shard>)` names, so branch
  protection must require only the stable `vscode-e2e-summary` rollup — never
  the individual shard names — or merges will hang on never-reported checks.
- Source: supersedes the prior "Strict per-scenario matrix" learning; see
  Azure/LogicAppsUX#9181 run `26081963896` and #9164 run `26108941288` for the
  strict-fan-out precedent this consolidates.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`, `chief-engineer`.
- Status: verified.

### Scenario-level retry absorbs transient flakes without masking regressions

- Learning: `run-e2e.js` retries a failing scenario in a fresh VS Code session
  before giving up, gated by `LA_E2E_SCENARIO_RETRIES` (default `0` = fail fast
  locally; CI sets `1`). Each retry is a full `prepareFreshSession()` (kills
  VS Code/chromedriver/func, cleans `User/`), so it clears the stale-window /
  leftover-process flake class as well as transient xvfb/focus/cold-start races.
  This is NOT masking: a scenario that fails every attempt still fails the shard
  (`exit = max`), and a scenario that only passes after a retry is surfaced
  loudly via `console.warn('⚠ FLAKE…')` plus a `::warning title=E2E scenario
  flake::` GitHub annotation so the underlying race can still be root-caused.
  Do not conflate this with `continue-on-error`/`allowFailure` — those make a
  genuinely failing shard green and remain forbidden.
- Why it matters: ExTester UI flakes are dominated by transient runner-image /
  xvfb / Fluent-UI-rerender races that the team otherwise fixes one-by-one at
  the helper level. A single fresh-session retry recovers most of them per run
  while keeping real regressions red and every flake visible in the CI summary.
  Job timeouts were widened (vscode-e2e 35m, setup-fixtures 30m, compat 25m) so
  a retry is never killed mid-run.
- Prefer keeping retries at `1`. Raising it hides increasingly non-transient
  failures; if a scenario needs >1 retry to pass, fix the root cause (add the
  waits/focus/re-read patterns documented elsewhere in this file) instead.
- Source: `apps/vs-code-designer/src/test/ui/run-e2e.ts` (`runScenarioPhases`
  retry loop); `.github/workflows/vscode-e2e.yml` (`LA_E2E_SCENARIO_RETRIES`).
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`, `chief-engineer`.
- Status: verified.

- Learning: Shape-specific scenarios (`p42-*`, `p43-*`) must set and honor shape selectors such as `LA_E2E_SHAPE`; a shard named for one workflow shape must not silently run unrelated shapes.
- Why it matters: Earlier p42 shards were misleading because each named shard could still run multiple shapes. PR #9181 isolated `p42-standard`, `p42-customcode`, `p42-rulesengine`, `p43-inlinejavascript`, `p43-customcode`, and `p43-rulesengine`, making failures attributable to the named scenario.
- Source: Azure/LogicAppsUX#9181 run `26081963896`; #9164 collapsed-head run `26108941288`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### Runtime scenarios need action-level success evidence

- Learning: Runtime E2Es must verify persisted workflow shape, top-level run completion, and action-level success evidence. A successful run-list row alone is insufficient.
- Why it matters: Run history can show a top-level `Succeeded` while details rows are missing, stale, or still rendering. PR #9181 strengthened `verifyAllNodesSucceeded` so p42/p43 runtime paths require non-empty action success evidence from the details UI or the latest-run actions API fallback.
- Source: Azure/LogicAppsUX#9181 final head `020d10403`; `apps/vs-code-designer/src/test/ui/runHelpers.ts`; #9164 collapsed-head run `26108941288`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-reviewer`, `ci-sentinel`.
- Status: verified.

### Classify UI-only/deserialization scenarios explicitly

- Learning: Scenarios such as `p45-designerviewextended` should be documented as UI/deserialization-focused and assert persisted graph state such as `Compose.runAfter`, rather than being counted as full runtime/run-history coverage.
- Why it matters: Clear scenario classification prevents future agents from over-counting coverage and avoids adding runtime waits to tests whose purpose is designer state persistence.
- Source: Azure/LogicAppsUX#9181 PR body and #9164 final body; `apps/vs-code-designer/src/test/ui/designerViewExtended.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `release-scribe`.
- Status: verified.

### Marketplace dependency installs must retry and fail closed

- Learning: `run-e2e.js` marketplace dependency bootstrap must retry failed direct dependency installs sequentially, rebuild `extensions.json`, and fail closed if dependency installation cannot be proven.
- Why it matters: Parallel VS Code CLI marketplace installs can race or leave a valid-looking extension directory while commands are not contributed. Treating that as success caused "Open Designer" activation failures in scenario shards.
- Source: Azure/LogicAppsUX#9181 final head `020d10403`; `apps/vs-code-designer/src/test/ui/run-e2e.js`; #9164 collapsed-head run `26108941288`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### `prepareFreshSession` contract: kill orphans between phases

- Learning: Each `run-e2e.js` phase must start from a clean process baseline. `prepareFreshSession` (and its sister `prepareForFreshFuncHost`) must kill orphan `func`, `dotnet`, and `vsdbg` processes plus free port 7071 before the next phase launches VS Code. Orphans from a previous phase will squat on 7071 and serve **stale** workflow registrations, producing false-positive readiness signals.
- Pattern: do port hygiene (`killPortBound(7071)`) before F5, log the occupant if present, and dump diagnostics when 7071 answers fast with no preceding kill log (`dumpSuspiciouslyFastHost`, commit `1fa956ca6`).
- See also: [`runtime-readiness-probes.md`](runtime-readiness-probes.md) for the full 4-probe readiness chain that consumes this baseline.
- Source: `apps/vs-code-designer/src/test/ui/runHelpers.ts`; commit `1fa956ca6`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.

### "True E2E" — verify the assertion fails when the contract is broken

- Learning: A keyboard-navigation pattern of "the test moves the focus and logs success but never asserts" is a silent failure mode — the test cannot detect regressions. Three rules:
  1. **Verify the assertion fails** when the contract is broken (delete the production behavior, run the test, expect red). That is the criterion for "true E2E."
  2. **Stable selectors**: prefer `role` + `aria-label` over CSS classes or English text-matching. Localized labels are out (see modal-dialog rule below).
  3. **Selenium Actions API for keyboard input**: `driver.actions().sendKeys(...)` triggers React `useHotkeys` callbacks inside webview iframes; direct `.sendKeys()` on an element does not.
- Source: PR #9164 commit `49e5e0134` `test(vscode-e2e): add Phase 4.6 keyboardNavigation with real assertions`; `apps/vs-code-designer/src/test/ui/keyboardNavigation.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-critic`.
- Status: verified.

### Modal dialog interaction on xvfb — 5 race conditions

- Learning: PR #9164 conversionYes R1–R9 fixes uncovered five generalizable xvfb modal-dialog races. Apply all five for any `{ modal: true }` dialog driven from VS Code:
  1. **Do not scan the notification center** if the surface is `{ modal: true }` — modal dialogs render in a different DOM widget. Use `ModalDialog`, not `Notification`.
  2. **Hold a single `ModalDialog` handle across detect+click**, with a stale-element retry. Re-resolving the handle between detect and click reintroduces the race the helper was added to fix.
  3. **Force-focus the dialog before clicking**; prefer `Tab+Enter` over `.click()` for xvfb-robust dispatch — xvfb input handling drops some `.click()` events on overlapping z-indexed surfaces.
  4. **Localized button labels are unstable**. Lock CI locale to `en-US` (extension launch env / VS Code args) so `Yes`/`No`/`Cancel` text matches.
  5. **Pre-flight `safeCancelAnyQuickInput`** before driving the dialog, to clear any lingering quick-input from a prior phase that would otherwise consume the first key event.
- Source: PR #9164 commit `aa2c61cba` `test(vscode-e2e): harden workspaceConversionYes with R1-R9 reliability + assertions`; `apps/vs-code-designer/src/test/ui/helpers.ts`.
- Applies to: `vscode-test-specialist`, `test`, `senior-swe-critic`.
- Status: verified.
