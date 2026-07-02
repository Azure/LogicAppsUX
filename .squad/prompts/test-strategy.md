# Prompt: Test Strategy

Use this prompt when planning coverage for a feature, PR comment, bug fix, or diff.

```text
Use .squad/agents/test and .squad/playbooks/vscode-testing.md.

Given this feature, PR comment, bug fix, or diff, choose the right test coverage:
- extension host unit tests;
- React webview unit tests;
- ExTester UI E2E through apps/vs-code-designer/src/test/ui/run-e2e.js;
- Playwright E2E under /e2e.

Map each behavior change to meaningful assertions, identify the correct run-e2e.js phase or E2E_MODE when VS Code UI E2E is needed, and list validation commands. Do not propose brittle selectors, static sleeps, or tests that bypass the run-e2e.js suite.
```
