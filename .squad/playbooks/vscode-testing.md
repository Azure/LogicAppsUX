# VS Code Testing Playbook

Use this playbook when adding, fixing, or reviewing tests for the VS Code Logic Apps extension.

## Entry Points

- `test` is the primary test owner.
- `vscode-test-specialist` is the focused specialist for VS Code extension unit tests and ExTester UI E2E tests.
- `customer-repro-tester` owns customer-facing reproduction and can request VS Code E2E coverage when the repro requires VS Code shell/webview behavior.
- `vscode` owns product code and extension infrastructure decisions.

## Choose the Right Test Layer

| Need | Preferred coverage |
|------|--------------------|
| Pure host-side logic | VS Code extension unit test |
| Webview state/rendering behavior | React webview unit test |
| User-visible VS Code workflow | ExTester UI E2E through `run-e2e.js` |
| Standalone designer browser flow | Playwright E2E under `/e2e` |
| Customer-reported VS Code behavior | `customer-repro-tester` plus ExTester through `run-e2e.js` |
| CI failure with artifacts | Failure diagnosis with `ci-sentinel`, then targeted unit/E2E fix |

## VS Code UI E2E Workflow

1. Read `apps/vs-code-designer/src/test/ui/SKILL.md`.
2. Inspect `apps/vs-code-designer/src/test/ui/run-e2e.js`.
3. Identify the correct phase or add a documented phase only when necessary.
4. Before running a focused mode/scenario, inspect its `workspaceSpec` and satisfy prerequisites:
   - `workspaceSpec: { ... }` and `manifest-multi` require the Phase 4.1 `created-workspaces.json` fixture manifest;
   - run `p41a-fixtures` or a grouped/full mode that runs Phase 4.1 first before scenarios like `p49-nugetdebugconversion`;
   - Debug-pane/focused modes auto-run `p41a-fixtures` when the manifest is missing/stale, but still verify the log shows prerequisite setup completed before interpreting the scenario result;
   - if fixture directories were cleaned up or corrupted, rerun the fixture phase instead of debugging a missing-workspace symptom.
   - when adding a new scenario, update the manifest-backed scenario map in `apps/vs-code-designer/src/test/ui/SKILL.md` and `.squad/knowledge/vscode-e2e-testing.md`.
5. Reuse existing helpers:
   - `designerHelpers.ts`;
   - `runHelpers.ts`;
   - `workspaceManifest.ts`;
   - shared dialog dismissal, command palette retry, webview switching, and overview helpers.
6. Before opening designer, proactively handle known blocking popups:
   - ensure `WORKFLOWS_SUBSCRIPTION_ID: ""` is present to avoid the "Use connectors from Azure" QuickPick;
   - run shared prompt-dismissal helpers for connector parameterization, C# Dev Kit sign-in, auth dialogs, notifications, modals, and stale QuickInputs;
   - put any newly discovered popup blocker into shared helpers instead of a test-local workaround.
7. Prefer semantic assertions and visible UI evidence over implementation details.
8. Use Selenium Actions API for React clicks inside webviews.
9. Use detection-based polling instead of static sleeps when possible.
10. Use active/visible iframe switching when multiple webviews can exist.
11. Close editors before opening overview webviews.
12. Prefer built-in operations such as Request and Response for reliable designer tests.
13. Avoid connector-dependent operations unless dependencies are explicitly provisioned.
14. For debug-path regressions:
    - create workspaces through the VS Code webview, not by hand;
    - reopen the generated `.code-workspace` as the startup resource in a fresh phase/session;
    - verify design-time startup evidence such as `workflow-designtime/`;
    - use deterministic built-in Request/Response workflows instead of empty workflows or connector-dependent operations;
    - do not stop at host readiness: prove workflow health, `listCallbackUrl`, Run trigger, run history `Succeeded`, and action-level success;
    - if the bug is stale product cleanup, preserve that coverage by avoiding harness cleanup on the critical F5;
    - capture terminal/output/log diagnostics on failure;
    - prove the root cause and absence of downstream prompts, not only prompt suppression.

## Unit Test Workflow

1. Put tests next to the changed code in existing `__test__` folders or established package locations.
2. Reuse existing test helpers, mock services, and state factories.
3. Assert observable behavior and outputs, not incidental implementation details.
4. Cover edge cases introduced by the change.
5. Avoid broad snapshots unless the repo already uses them for the same surface.

## Validation Commands

Run commands from the repo root unless the command explicitly changes directory.

```powershell
npx biome check --write <changed-files>
```

For VS Code E2E files:

```powershell
Set-Location apps\vs-code-designer
npx tsup --config tsup.e2e.test.config.ts
$env:E2E_MODE = '<mode>'
node src\test\ui\run-e2e.js
```

For focused unit tests, use the package's existing command or a targeted Vitest run.

## Coverage Review

Before final status, the test agent should answer:

- What behavior changed?
- Which unit tests prove the logic?
- Which E2E tests prove the user-critical flow?
- Which `run-e2e.js` phase covers the E2E path?
- If this was a focused scenario, were its fixture prerequisites satisfied first?
- What validation commands ran?
- Are any gaps intentional, blocked, or follow-up work?
- If this is a debug regression, did the test use the same `run-e2e.js` launch path and `launch.json` shape as users?
- Did the test prove design-time startup happened before debug assertions?
- Did the test assert that incorrect fallback prompts did not appear?
- Did the test proactively handle known designer-opening blockers, especially "Use connectors from Azure", C# Dev Kit sign-in, auth dialogs, and stale QuickInputs?

## Knowledge Updates

When a new stable pattern is discovered, ask `session-knowledge-curator` to update:

- `.squad/knowledge/vscode-e2e-testing.md`;
- `.squad/knowledge/unit-testing.md`;
- `.squad/knowledge/customer-repro.md` when the learning came from customer reproduction;
- `.squad/knowledge/ci-patterns.md` when the learning came from CI.
