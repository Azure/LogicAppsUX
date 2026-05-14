# CI Patterns

Curated CI, E2E, and workflow-failure learnings. Add entries through `session-knowledge-curator`.

## Current Patterns

### Monitor after push and iterate

- Learning: For PR lifecycle work, the agent should not stop after pushing. `ci-sentinel` should monitor checks, inspect logs/artifacts, classify failures, route actionable fixes, validate, push, and continue the loop.
- Why it matters: CI failures often surface only after remote checks, especially E2E flakiness and environment-specific issues.
- Source: Current session PR lifecycle workflow.
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`, `test`.
- Status: verified.

### VS Code E2E fixes need suite-aware validation

- Learning: VS Code E2E test changes should follow the `run-e2e.js` suite structure and validate with the relevant `E2E_MODE` plus `npx tsup --config tsup.e2e.test.config.ts`.
- Why it matters: Tests can compile but still fail when not wired into the phase runner or when suite state assumptions differ.
- Source: Current session E2E failure investigation.
- Applies to: `vscode`, `test`, `ci-sentinel`, `senior-swe-critic`.
- Status: verified.

### Rebuild PR branches from current main when stale commits leak into a PR

- Learning: If a PR unexpectedly contains previous commits, compare branch ancestry against current main and rebuild or rebase the branch so the PR carries only the intended delta.
- Why it matters: Sibling-repo CI setup fixes required rebuilding PR branches from current `main` to remove already-merged pnpm migration commits before force-pushing the corrected PR.
- Source: Related-repo migration PRs.
- Applies to: `ci-sentinel`, `pr-orchestrator`, `chief-engineer`.
- Status: verified.

### Pipeline setup must account for release-tag vintage

- Learning: Release pipelines can run the current setup template against older release tags, so setup scripts should detect whether the checked-out tag is pnpm-era or npm-era before choosing install commands.
- Why it matters: A related-repo PR fixed older tags like v1.6.0 by falling back to npm install while preserving the authenticated pnpm path for newer tags.
- Source: Related-repo migration PR.
- Applies to: `ci-sentinel`, `test`, `chief-engineer`.
- Status: verified.

### Preserve authenticated registry setup when migrating to pnpm

- Learning: Moving a CI pipeline from npm to pnpm does not remove the need for Azure Artifacts/npm authentication when the pipeline still depends on authenticated feeds or CI npm config.
- Why it matters: A related-repo PR restored Azure DevOps pnpm authentication after the initial pnpm migration.
- Source: Related-repo migration PRs.
- Applies to: `ci-sentinel`, `test`, `chief-engineer`.
- Status: verified.

### Debug E2E failures need diagnostics before retries

- Learning: VS Code debug/runtime E2E failures should collect visible workbench text, terminal state, and Azure Logic Apps output logs before adding sleeps or retries.
- Why it matters: The Azurite investigation only became actionable after logs showed design-time startup, the Logic Apps debug configuration, and the exact point where Azurite readiness failed.
- Source: Azurite auto-start debug regression session; `apps/vs-code-designer/src/test/ui/azuriteAutostartFailureAssert.test.ts`.
- Applies to: `vscode-test-specialist`, `test`, `ci-sentinel`.
- Status: verified.
