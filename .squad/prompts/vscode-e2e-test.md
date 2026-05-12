# Prompt: VS Code E2E Test

Use this prompt to add or fix VS Code ExTester UI E2E coverage.

```text
Use .squad/agents/vscode-test-specialist and .squad/playbooks/vscode-testing.md.

Read apps/vs-code-designer/src/test/ui/SKILL.md and inspect apps/vs-code-designer/src/test/ui/run-e2e.js before editing tests. Add or fix the ExTester E2E test in the correct phase, reuse existing helpers, use Selenium Actions API for React webview clicks, prefer detection-based polling, and validate with Biome, tsup, and the targeted E2E_MODE.

If the failure came from CI, coordinate with ci-sentinel to inspect logs/artifacts and record durable learnings through session-knowledge-curator.
```
