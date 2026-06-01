# Decisions

Cross-agent decisions that affect the team. Agents write decisions here; all agents read before starting work.

---

## D-001 — VS Code E2E tests must drive the Create Workspace wizard

**Date**: 2026-05-15
**Status**: Accepted
**Owners**: vscode-test-specialist, chief-engineer
**Tags**: vscode, e2e, testing, fixtures

### Decision

VS Code E2E tests MUST NOT synthesize Logic App fixtures on disk. They MUST drive the Create Workspace webview end-to-end to produce workspace files, identical to the real user flow.

### Scope

Applies to all files matching:

- `apps/vs-code-designer/src/test/ui/createWorkspace*.test.ts`
- Any `*.fixtures.test.ts` file that produces workspaces for downstream tests
- Any helper that materializes a workspace for an E2E test

### Why

The Create Workspace wizard is itself the contract being tested. Bypassing it with `fs.writeFile` or template rendering creates "fixtures that look like Logic Apps but weren't produced by the current wizard build" — masking real regressions in the wizard, scaffolder, dependency installer, or VS Code task generation.

### Permitted exceptions

- Tests that explicitly verify **conversion from legacy formats** (Phase 4.8b builds its own legacy fixture via Logic Apps Tools CLI, not via the wizard — this is allowed because the conversion test's purpose is verifying that path).
- Reading existing workspace files (`fs.readFileSync`) for assertion purposes.

### Enforcement

- Code review.
- (Future) CI lint guard fails build if `*.fixtures.test.ts` imports `fs.writeFile*`, `outputJson*`, or template-rendering helpers against workspace paths.

### History

Convention has been informally enforced since PR #8956 (Codeful workspace path migration, see `.squad/knowledge/vscode-e2e-testing.md:87-99`). Formally codified after PR #9164 follow-up planning surfaced its absence from `decisions.md`.

---

(Add future decisions below this line as D-002, D-003, etc.)
