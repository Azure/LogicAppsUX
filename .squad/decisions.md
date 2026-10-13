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

## D-002 — Ordered evidence is a standard for every registered VS Code CLI E2E suite

**Date**: 2026-10-13
**Status**: Accepted
**Owners**: vscode-test-specialist, chief-engineer
**Tags**: vscode, e2e, evidence, diagnostics, pipeline

### Decision

Every logical suite in `SUITE_REGISTRY` owns one versioned ordered-evidence
manifest spanning all of its phases and extension hosts. Producer-owned semantic
checkpoint plans define the required order. The shared screenshot metadata
boundary records outcomes, CI stages only manifest-referenced public files, and
the report renderer consumes only the staged manifest.

Dynamic checkpoint families must use stable semantic or ordinal IDs derived
from authoritative test data. Filesystem paths, path basenames, directory
enumeration, timestamps, and generated run IDs must not determine checkpoint
identity or order.

### Why

Renderer-owned catalogs and raw screenshot-tree staging duplicated semantic and
path interpretation across TypeScript, Node, and PowerShell. That design allowed
cross-platform separator differences to fail before native tests ran and made
each new report feature another suite-specific staging patch. A producer
manifest makes ordering an executable suite contract, preserves partial evidence
for failed runs, and creates a single security and integrity boundary for
published artifacts.

### Enforcement

- `run-e2e-cli.js` initializes the manifest for each registered suite invocation.
- `screenshot.ts` records accepted, failed, disabled, and diagnostic outcomes,
  fences mutations by invocation, and ignores explicitly disabled helper hosts.
- `stage-vscode-e2e-evidence.js` finalizes and allowlists referenced files.
- `vscode-e2e-evidence-report.js` validates and renders the manifest without
  directory scanning or checkpoint-plan construction.
- Pipeline contract and evidence unit tests reject raw screenshot-tree copying,
  unsafe references, integrity mismatches, and unstable multi-root identities.
- Native execution, terminal/cleanup acceptance, evidence staging, and protected
  rollup remain separate gates. Diagnostic selectors prove affected suites but
  never replace the complete canonical Linux/Windows inventory.
- Registered direct orchestration owns complete wrapper context and invalidates
  prior stable receipts before any setup operation that can fail; current
  Multi-root enforcement lives in `runDirectRegisteredSuite`.

---

(Add future decisions below this line as D-003, D-004, etc.)
