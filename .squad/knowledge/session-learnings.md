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
- Source: Session audit on 2026-05-11 across accessible sessions `c141c006`, `1fbf168e`, `ba0241d9`, `26e33dca`, `7e02be91`, and GitHub PR metadata for Azure/LogicAppsUX#9080, #9127, #9142, #9148, #9149, #9155 plus Azure/logicapps-migration-assistant#24, #27, #28.
- Applies to: `session-knowledge-curator`, `chief-engineer`, `release-scribe`.
- Status: verified.

### Accessible PR-producing sessions from April-May 2026

- Learning: The accessible session history contained 10 sessions. PR-producing sessions were:
  - `ba0241d9-e2d6-4b80-a121-ed42ede90c7f` -> Azure/LogicAppsUX#9080 and #9127.
  - `7e02be91-377b-4c11-93fe-5c78a9387d7f` -> Azure/logicapps-migration-assistant#24.
  - `26e33dca-dac6-40b2-8c94-57980df9731d` -> Azure/logicapps-migration-assistant#27 and #28.
  - `1fbf168e-34bd-47b1-8f10-1c29abbcc4b8` -> Azure/LogicAppsUX#9142 (open) plus related merged PRs #9149 and #9155.
  - `c141c006-9442-487a-94ad-604f2b333e68` -> Azure/LogicAppsUX#9148.
- Why it matters: These sessions are the highest-value sources for reusable learnings because they produced committed PR work or follow-up CI/review iterations.
- Source: `session_store_sql` session audit and `gh pr view/list` metadata on 2026-05-11.
- Applies to: `session-knowledge-curator`, `chief-engineer`, `pr-orchestrator`.
- Status: verified.

### Non-PR sessions should still be classified

- Learning: Some sessions were planning/research only and should be classified explicitly instead of mined for PR learnings: `c44ac770` analyzed MCP auth integration, `7bf2acb8` created connection-creation research, `9556d75c` resumed context without distinct PR evidence, and short/null sessions `62400b5a`/`c14524e8` had no PR evidence.
- Why it matters: Explicit non-PR classification prevents future knowledge refreshes from repeatedly re-inspecting the same sessions or treating research artifacts as committed behavior.
- Source: `session_store_sql` session/file/turn audit on 2026-05-11.
- Applies to: `session-knowledge-curator`.
- Status: verified.

### Telemetry wrappers can hide terminal failures

- Learning: `callWithTelemetryAndErrorHandling` can swallow callback errors, so flows that must stop after a telemetry-wrapped failure should record failure state and surface a deterministic error after the wrapper returns.
- Why it matters: The Azurite auto-start regression continued into `AzureWebJobsStorage` validation after readiness failure because the telemetry wrapper reported the error but allowed later debug validation to run.
- Source: Azurite auto-start debug regression session; `apps/vs-code-designer/src/app/commands/pickFuncProcess.ts`; `apps/vs-code-designer/src/app/utils/startRuntimeApi.ts`.
- Applies to: `vscode`, `test`, `vscode-test-specialist`, `senior-swe-reviewer`.
- Status: verified.
