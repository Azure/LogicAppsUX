# Customer Issue Reproduction Playbook

Use this playbook when a customer-facing issue, support ticket, screenshot, log, or bug report needs to be reproduced safely.

## Entry Points

- `customer-repro-tester` owns reproduction.
- `chief-engineer` owns orchestration and user decisions.
- `test` owns regression strategy.
- `vscode-test-specialist` supports VS Code ExTester repros.
- Domain agents own product fixes after reproduction.

## Intake Checklist

Collect only safe details:

- customer-visible symptom;
- expected behavior;
- actual behavior;
- exact steps tried;
- host surface: Standalone, Azure Portal-like designer, VS Code extension, webview, data mapper, monitoring, templates;
- SKU/workflow kind/runtime version;
- browser, OS, VS Code version, extension version;
- theme, locale, feature flags, and relevant settings;
- sanitized workflow JSON, schemas, payload shapes, screenshots, logs, or videos.

Do not store raw secrets, tenant IDs, subscription IDs, connection strings, tokens, personal data, or customer payloads.

## Choose the Repro Surface

| Customer symptom | Repro method |
|------------------|--------------|
| Pure logic or serializer issue | Unit test or focused integration test |
| Component rendering/state issue | React/component unit test |
| Standalone or portal-like browser flow | Playwright E2E under `/e2e` |
| VS Code command, webview, workspace, designer, debug/run, or overview flow | VS Code ExTester through `run-e2e.js` |
| CI-only behavior | `ci-sentinel` log/artifact diagnosis plus targeted repro |
| External connector/live ARM-only behavior | Ask for explicit user guidance before live repro |

## Reproduction Workflow

1. Summarize the issue in customer-safe terms.
2. Sanitize artifacts and create the smallest fixture that preserves the bug.
3. Reconstruct environment settings needed for the symptom.
4. Attempt the cheapest reliable repro first.
5. Escalate to Playwright or VS Code ExTester when the issue is a user flow, timing issue, host integration problem, or webview behavior.
6. Record exact steps, expected/actual behavior, screenshots/log references, and confidence.
7. If reproduced, identify likely code owner via `.squad/routing.md`.
8. Ask `test` and `vscode-test-specialist` for regression coverage strategy.
9. After the fix, rerun the repro path and add stable regression coverage.
10. Ask `session-knowledge-curator` to record durable sanitized learnings.

## E2E Framework Guidance

- Use Playwright for browser-hosted customer flows.
- Use VS Code ExTester only through `apps/vs-code-designer/src/test/ui/run-e2e.js`.
- Read `apps/vs-code-designer/src/test/ui/SKILL.md` before VS Code E2E reproduction.
- Reuse existing helpers and fixtures before adding raw selectors.
- Prefer deterministic mock-backed fixtures. Label live-service steps separately from commit-worthy tests.

## Repro Report Template

```text
Issue:
Surface:
Environment:
Sanitized artifacts:
Repro method:
Steps:
Expected:
Actual:
Reproduced: yes | no | partial | blocked
Evidence:
Likely owner:
Regression recommendation:
Privacy notes:
```
