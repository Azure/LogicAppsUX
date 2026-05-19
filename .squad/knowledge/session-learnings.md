# Session Learnings

Curated durable learnings extracted from Copilot sessions. Add entries through `session-knowledge-curator`.

## Entry Template

```text
### <short title>

- Learning:
- Why it matters:
- Source:
- Applies to:
- Status: verified | needs revalidation
```

## Current Learnings

### PR lifecycle needs an explicit owner

- Learning: Complex PR work should start with `chief-engineer`, which routes comment triage, planning, implementation, validation, push, CI monitoring, and summaries instead of relying on repeated user prompts.
- Why it matters: This prevents work from stopping after plan creation, local validation, or push.
- Source: Current session plan and PR lifecycle agent work.
- Applies to: `chief-engineer`, `pr-orchestrator`, `plan-auditor`, `ci-sentinel`, `release-scribe`.
- Status: verified.

### Session-to-PR audit should use multiple signals

- Learning: Session metadata may not include repository or PR refs, so `session-knowledge-curator` should combine session summaries, `session_refs`, turn snippets, touched files, branch names, and `gh pr view/list` metadata to determine whether a session produced a committed PR.
- Why it matters: Relying only on `sessions.repository` or `session_refs` missed LogicAppsUX PR sessions where repository fields were null and PR numbers appeared only in turns or GitHub metadata.
- Source: Recent session audit across accessible sessions and GitHub PR metadata for Azure/LogicAppsUX#9080, #9127, #9142, #9148, #9149, #9155.
- Applies to: `session-knowledge-curator`, `chief-engineer`, `release-scribe`.
- Status: verified.

### Non-PR sessions should still be classified

- Learning: Some sessions are planning/research only (e.g., integration analysis, feature research, context-resume sessions, or short/null sessions with no committed file changes) and should be classified explicitly instead of mined for PR learnings.
- Why it matters: Explicit non-PR classification prevents future knowledge refreshes from repeatedly re-inspecting the same sessions or treating research artifacts as committed behavior.
- Source: Recent `session_store_sql` session/file/turn audit.
- Applies to: `session-knowledge-curator`.
- Status: verified.

### Telemetry wrappers can hide terminal failures

- Learning: `callWithTelemetryAndErrorHandling` can swallow callback errors, so flows that must stop after a telemetry-wrapped failure should record failure state and surface a deterministic error after the wrapper returns.
- Why it matters: The Azurite auto-start regression continued into `AzureWebJobsStorage` validation after readiness failure because the telemetry wrapper reported the error but allowed later debug validation to run.
- Source: Azurite auto-start debug regression session; `apps/vs-code-designer/src/app/commands/pickFuncProcess.ts`; `apps/vs-code-designer/src/app/utils/startRuntimeApi.ts`.
- Applies to: `vscode`, `test`, `vscode-test-specialist`, `senior-swe-reviewer`.
- Status: verified.

### VS Code E2E optimization arc (#9164/#9175/#9178/#9179/#9180/#9181)

- Learning: The completed VS Code E2E optimization arc moved CI from broad grouped shards toward strict scenario-level fan-out, preserved `vscode-e2e-summary` as the single required rollup, added shared setup/build artifacts, split create-workspace fixture and behavior coverage, restored real keyboard-navigation assertions, added rulesEngine/custom-code/stateless/run-after/conversion/multi-designer coverage, and hardened runtime readiness, dependency install, and action-level run verification.
- Why it matters: Future agents should treat #9164 as the integrated source of truth for this stack, not the individually closed side PRs. The side PRs were intentionally closed as superseded only after #9164 contained their heads and all non-skipped checks were green.
- Source: Azure/LogicAppsUX#9164 collapsed head `4b68281a122cae99c323430c588277f0e5cbefdd`; strict VS Code E2E run `26108941288`; validate-pr run `26111149301`; final status comment `#issuecomment-4489982690`.
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`, `vscode-test-specialist`, `test`, `release-scribe`.
- Status: verified.

### Regression control for flaky E2E stabilization

- Learning: When strict CI exposes moving VS Code E2E failures, freeze broad helper/workflow edits, classify failures by scenario and failure class, and prefer one failure class per commit with senior review before push.
- Why it matters: The PR #9181 stabilization initially regressed in different ways because broad shared-helper changes made causality hard to prove. The successful path used CI ledgers, subagent review, focused fixes, local static validation, and remote CI iteration.
- Source: PR #9181 stabilization ledger in this session; Azure/LogicAppsUX#9181 green run `26081963896`; #9164 collapsed run `26108941288`.
- Applies to: `chief-engineer`, `ci-sentinel`, `vscode-test-specialist`, `test`, `senior-swe-reviewer`.
- Status: verified.
