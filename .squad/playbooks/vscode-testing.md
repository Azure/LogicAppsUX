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
4. Reuse existing helpers:
   - `designerHelpers.ts`;
   - `runHelpers.ts`;
   - `workspaceManifest.ts`;
   - shared dialog dismissal, command palette retry, webview switching, and overview helpers.
5. Prefer semantic assertions and visible UI evidence over implementation details.
6. Use Selenium Actions API for React clicks inside webviews.
7. Use detection-based polling instead of static sleeps when possible.
8. Use active/visible iframe switching when multiple webviews can exist.
9. Close editors before opening overview webviews.
10. Prefer built-in operations such as Request and Response for reliable designer tests.
11. Avoid connector-dependent operations unless dependencies are explicitly provisioned.

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
- What validation commands ran?
- Are any gaps intentional, blocked, or follow-up work?

## Knowledge Updates

When a new stable pattern is discovered, ask `session-knowledge-curator` to update:

- `.squad/knowledge/vscode-e2e-testing.md`;
- `.squad/knowledge/unit-testing.md`;
- `.squad/knowledge/customer-repro.md` when the learning came from customer reproduction;
- `.squad/knowledge/ci-patterns.md` when the learning came from CI.
