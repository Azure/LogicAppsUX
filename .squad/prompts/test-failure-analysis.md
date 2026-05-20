# Prompt: Test Failure Analysis

Use this prompt for unit, E2E, or CI test failures.

```text
Use .squad/agents/test, and use .squad/agents/vscode-test-specialist for VS Code extension or ExTester failures.

Analyze the failure output, classify the root cause, identify whether the issue is product code, test code, fixture/setup, CI environment, or known flakiness, and propose the smallest reliable fix. For VS Code UI E2E failures, inspect run-e2e.js phase behavior and SKILL.md learnings before changing selectors or helpers.

Do not weaken assertions to hide a real bug. Provide the focused validation command that should pass after the fix.
```
