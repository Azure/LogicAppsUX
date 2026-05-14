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
