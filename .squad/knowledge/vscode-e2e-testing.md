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
