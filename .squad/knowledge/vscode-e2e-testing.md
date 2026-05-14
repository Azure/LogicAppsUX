# VS Code E2E Testing Knowledge

Curated durable learnings for VS Code ExTester UI E2E tests. Add entries through `session-knowledge-curator`.

## Core Sources

- `apps/vs-code-designer/src/test/ui/SKILL.md`
- `apps/vs-code-designer/src/test/ui/run-e2e.js`
- `apps/vs-code-designer/src/test/ui/designerHelpers.ts`
- `apps/vs-code-designer/src/test/ui/runHelpers.ts`
- `apps/vs-code-designer/src/test/ui/workspaceManifest.ts`

## Current Learnings

### `run-e2e.js` is the suite entry point

- Learning: VS Code UI E2E tests must be wired through `apps/vs-code-designer/src/test/ui/run-e2e.js` and its phase model.
- Why it matters: One-off ExTester scripts can pass locally while being invisible to CI.
- Source: `apps/vs-code-designer/src/test/ui/run-e2e.js`, `apps/vs-code-designer/src/test/ui/SKILL.md`.
- Applies to: `test`, `vscode-test-specialist`, `vscode`, `ci-sentinel`.
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

### Fill webview wizard inputs by label, not index

- Learning: VS Code wizard webview E2Es should locate inputs by their visible label (e.g., `findInputByLabel('Workspace name')`) rather than by DOM index or positional order.
- Why it matters: PR #9161 stabilized `workspaceConversionCreate.test.ts` after the index-based fills wrote the workspace path into the name field when the wizard reordered/re-rendered inputs.
- Source: Azure/LogicAppsUX#9161; `apps/vs-code-designer/src/test/ui/workspaceConversionCreate.test.ts`; session `35f3ecef-6086-4148-9b2c-d57123f7c5e6`.
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

