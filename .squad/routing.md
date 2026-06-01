# Routing

File-path → agent routing table. Used to determine which agent(s) own a change.

## Rules

| Pattern | Agent | Priority |
|---------|-------|----------|
| `libs/designer/src/lib/core/**` | designer-core | primary |
| `libs/designer-v2/src/lib/core/**` | designer-core | primary |
| `libs/designer/src/lib/ui/**` | designer-ui | primary |
| `libs/designer-v2/src/lib/ui/**` | designer-ui | primary |
| `libs/designer-ui/src/**` | designer-ui | primary |
| `libs/logic-apps-shared/src/**` | shared-services | primary |
| `libs/data-mapper-v2/src/**` | data-mapper | primary |
| `libs/data-mapper/src/**` | data-mapper | primary |
| `libs/a2a-core/src/**` | data-mapper | secondary |
| `libs/chatbot/src/**` | data-mapper | secondary |
| `apps/iframe-app/src/**` | data-mapper | secondary |
| `apps/vs-code-designer/src/test/ui/**` | test | primary |
| `apps/vs-code-designer/src/test/ui/**` | vscode-test-specialist | advisory |
| `apps/vs-code-designer/src/test/ui/run-e2e.js` | vscode-test-specialist | primary |
| `apps/vs-code-designer/src/test/ui/*Helpers.ts` | vscode-test-specialist | primary |
| `apps/vs-code-designer/src/test/ui/workspaceManifest.ts` | vscode-test-specialist | primary |
| `apps/vs-code-designer/**/__test__/**` | test | primary |
| `apps/vs-code-react/**/__test__/**` | test | primary |
| `libs/vscode-extension/**/__test__/**` | test | primary |
| `libs/vscode-extension/src/**` | vscode | primary |
| `apps/vs-code-designer/**` | vscode | primary |
| `apps/vs-code-react/**` | vscode | primary |
| `apps/Standalone/src/**` | designer-core | primary |
| `e2e/**` | test | primary |
| `**/__test__/**` | test | advisory |
| `**/*.spec.*` | test | advisory |
| `.squad/agents/**` | chief-engineer | advisory |
| `.squad/playbooks/**` | chief-engineer | advisory |
| `.squad/prompts/**` | chief-engineer | advisory |
| `.squad/knowledge/**` | session-knowledge-curator | primary |

## Lifecycle Task Routing

| Task Pattern | Agent | Priority |
|--------------|-------|----------|
| Central orchestration, "own this end-to-end", multi-agent coordination | chief-engineer | primary |
| PR comment triage, unresolved review threads, bot validation comments | pr-comment-triage | primary |
| End-to-end PR workflow, multi-agent coordination, "implement the plan" | pr-orchestrator | primary |
| Plan progress audit, SQL todo audit, "what is left?" | plan-auditor | primary |
| Alternate-model review, plan critique, pre-push implementation critique | review-critic | advisory |
| Senior plan review, design critique, implemented-diff review, adjudication | senior-swe-planner / senior-swe-critic / senior-swe-reviewer / senior-swe-adjudicator | advisory |
| Push branch, monitor PR checks, inspect CI logs/artifacts, iterate failures | ci-sentinel | primary |
| PR body updates, reviewer response summaries, final status handoff | release-scribe | primary |
| Previous Copilot session learnings, memory-worthy facts, curated agent context | session-knowledge-curator | primary |
| VS Code extension unit tests, React webview unit tests, ExTester E2E tests, `run-e2e.js` phases | test / vscode-test-specialist | primary |
| Test strategy, coverage planning, test failure analysis | test | primary |
| Customer issue reproduction, support tickets, customer screenshots/logs, "try to repro" | customer-repro-tester | primary |
| Customer issue requires browser/standalone repro | customer-repro-tester / test | primary |
| Customer issue requires VS Code extension/webview repro | customer-repro-tester / vscode-test-specialist | primary |

## Cross-Cutting Spawn Rules

When a changeset touches files owned by multiple agents, spawn all relevant agents and follow these rules:

1. **Interface changes in shared-services** — If `libs/logic-apps-shared/src/designer-client-services/` changes, spawn shared-services (owns contract) + all consuming agents whose code breaks.
2. **State shape changes** — If a Redux slice in designer-core changes its exported types, spawn designer-core + designer-ui (consumes selectors) + test (update mocks).
3. **Theme/token changes** — If `libs/designer-ui/src/lib/tokens/` changes, spawn designer-ui + data-mapper (both consume tokens).
4. **VS Code webview ↔ extension** — If both `apps/vs-code-designer/` and `apps/vs-code-react/` change, a single vscode agent handles both (same domain).
5. **Test-only changes** — If only `__test__/` or `*.spec.*` files change, test agent runs solo. If test changes accompany feature code, test runs alongside the feature agent.
6. **Central lifecycle work** — When the user asks for end-to-end ownership, spawn chief-engineer first. Chief-engineer then coordinates lifecycle and domain agents.
7. **PR lifecycle work** — When the task includes comments, push, CI monitoring, or reviewer summaries, spawn pr-orchestrator plus the relevant lifecycle agent(s). Domain agents still own code changes.
8. **Senior review checkpoints** — For non-trivial work, chief-engineer invokes senior-swe-planner before implementation, senior-swe-critic before risky edits, and senior-swe-reviewer before push or final status.
9. **Knowledge refresh** — When prior sessions, learnings, or "make agents smarter" are requested, spawn session-knowledge-curator and update `.squad/knowledge/` with curated non-sensitive findings.
10. **CI failure iteration** — When CI fails, ci-sentinel diagnoses logs/artifacts, then routes the fix to the owning domain agent and test agent as needed.
11. **VS Code test work** — When work touches `apps/vs-code-designer/src/test/ui/**`, `run-e2e.js`, VS Code unit tests, or ExTester failures, spawn `test` plus `vscode-test-specialist`; include `vscode` as advisory when test infrastructure or product-extension behavior is affected.
12. **Coverage strategy** — When a plan claims new unit or E2E coverage, chief-engineer asks `test` for the strategy before implementation and for a coverage verdict before final summary.
13. **Customer issue reproduction** — When the user provides a customer issue, screenshot, log, workflow, support ticket, or asks to reproduce customer behavior, spawn `customer-repro-tester` first. Add `test` for regression strategy, `vscode-test-specialist` for VS Code ExTester repros, and the owning domain agent after reproduction identifies likely code ownership.
14. **Live-service repros** — If reproduction needs live Azure/ARM resources, customer tenants, credentials, or external connector services, route through `chief-engineer` for explicit user guidance before proceeding.

## Fallback

Files not matching any rule (root configs, CI, docs, build scripts) are handled by the requesting agent or escalated to the developer.
