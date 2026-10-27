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

### VS Code CLI outcomes must be classified by gate

- Learning: Distinguish build/bootstrap failure, native test failure, native pass with terminal/cleanup rejection, ordered-evidence staging rejection, and final publication/rollup failure. Overall job status alone is not the native verdict.
- Why it matters: A suite can pass its JSON/JUnit body and cleanup while the job correctly fails because a required manifest checkpoint was not accepted; conversely, a preflight failure can skip every native lane.
- Pattern: inspect native JSON/JUnit, phase and terminal receipts, cleanup ledgers, `ORDERED_EVIDENCE_VALIDATION.json`, and the staged evidence report before assigning ownership.
- Source: Source-bound VS Code CLI ADO investigations and `docs/testing/vscode-cli-authoring.md`.
- Applies to: `ci-sentinel`, `vscode-test-specialist`, `test`, `release-scribe`.
- Status: verified.

### Preserve actionable stacks through suite-prefixed logs

- Learning: Diagnostic serialization should retain `Error.stack`. Summarizers should remove one or more `[suite]` prefixes only for classifying error headers and contiguous `at ...` frames, while preserving the original prefixed lines in failure excerpts.
- Why it matters: Reducing errors to `String(error)` or requiring unprefixed stack frames hides the call site that distinguishes wrapper setup failures from native test failures.
- Source: `e2e-cli-diagnostics.js`, `summarize-e2e-cli-results.js`, and their regression controls.
- Applies to: `ci-sentinel`, `vscode-test-specialist`.
- Status: verified.

### Targeted native proof must be followed by the canonical matrix

- Learning: First prove affected suites on isolated Linux and Windows consumers bound to an immutable full SHA. After focused success, run the complete canonical inventory; a diagnostic selection never satisfies the protected full rollup.
- Why it matters: Targeted runs shorten iteration but do not exercise unrelated suites, shared build gates, or complete rollup inventory.
- Pattern: record the admitted source SHA, inspect downloaded artifacts rather than only job status, then queue the full non-diagnostic aliases against that SHA or a newer explicitly recorded SHA containing the fix.
- Source: `.config/README.md` E2E branch-driven validation contract.
- Applies to: `chief-engineer`, `ci-sentinel`, `vscode-test-specialist`, `test`.
- Status: verified workflow.

### Full VS Code CLI rollup topology must equal the suite registry

- Learning: Treat `SUITE_REGISTRY.platforms` as the inventory source. The `linux`/`windows` aliases, ADO jobs, protected dependencies, result variables, artifact downloads, and validation records must be promoted atomically and compared as exact sets.
- Why it matters: A green rollup can otherwise cover only a historical subset while appearing to represent the full suite.
- Pattern: derive aliases from the registry; contract-test 11 Linux plus 12 Windows lanes; require strict terminal validation for every lifecycle family; provision and print Node 22 inside the rollup job before any Node validator runs.
- Source: `apps/vs-code-designer/scripts/e2e-cli-batch.js`, `pipeline-contract.unit.test.js`, `.config/vscode-e2e-cli.1es.yml`.
- Applies to: `chief-engineer`, `ci-sentinel`, `vscode-test-specialist`, `test`.
- Status: source/control verified; native 23-lane ADO proof required after changes.

### Keep native-body and cleanup verdicts separate

- Learning: A passing native JSON/JUnit body followed by retained-process or path-cleanup rejection is an infrastructure finalization failure, not a feature regression.
- Why it matters: Collapsing the verdicts causes interaction code to be changed even when the real failure is Windows `EBUSY`/`EPERM`, unverified process closure, or artifact staging.
- Pattern: report both verdicts; use one bounded cleanup owner with an absolute deadline and explicit path-absence verification; preserve owned workspaces when diagnostics or ordinary Code closure is unconfirmed.
- Source: `e2e-cli-path-cleanup.js`, `run-e2e-cli.js`, and `docs/testing/vscode-cli-authoring.md`.
- Applies to: `ci-sentinel`, `vscode-test-specialist`, `test`.
- Status: verified by focused controls.

## Triggers → use this file

- GitHub Actions failure triage, branch protection, required checks
- Workflow shard matrices, `workflow_dispatch:` fallbacks, path-filter coalescing
- pnpm/npm authentication, registry setup, sibling-repo CI migrations
- PR coverage gate (`pr-coverage.yml`), `COVERED_PACKAGES`, `files_ignore`
- Parallel-worktree merge strategies, stacked PRs across forks

## Parallel-worktree merge strategy (PR #9164)

- Learning: When a PR is being worked in multiple parallel worktrees / tracks (e.g. R1–R9 reliability fixes), use **one commit per track**, then merge tracks back to the integration branch with `--no-ff`, sequentially, in dependency order. This keeps `git log --first-parent` readable and lets `git revert -m 1` undo a whole track if a regression is found.
- Pattern: cut a worktree per track (`git new <branch>`), keep each track's commits focused, merge each track back with `git merge --no-ff <track>` in the order the tracks depend on each other.
- Source: PR #9164 reliability arc (Tracks 1–3 conversionYes + runtime + diagnostics).
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`.
- Status: verified.

### Collapsing stacked PRs into an integration PR

- Learning: For fork-to-upstream stacked PRs that all target `main`, collapse by fetching each PR head, starting from a clean integration-branch worktree, tagging the pre-collapse head, and merging each PR with `--no-ff` in the intended order. Verify every side PR head is an ancestor of the collapsed head before pushing.
- Why it matters: GitHub cannot model fork PRs based on another fork branch, so side PR labels/checks may look stale even when the work is intentionally superseded by an integration PR. PR #9164 safely collapsed #9175/#9178/#9179/#9180/#9181 this way while preserving readable first-parent history.
- Source: Azure/LogicAppsUX#9164 collapsed head `4b68281a122cae99c323430c588277f0e5cbefdd`; final status comment `#issuecomment-4489982690`.
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`, `release-scribe`.
- Status: verified.

### Validate on the collapsed PR head, not only on child PR heads

- Learning: A green child PR (for example #9181) is evidence to start a collapse, but the integration PR must get fresh green checks on the collapsed head before it is declared merge-ready.
- Why it matters: #9181 had strict green VS Code E2E, but #9164 still needed fresh post-collapse `validate-pr`, build, coverage, Playwright, Chat E2E, and VS Code E2E checks on head `4b68281a`.
- Source: Azure/LogicAppsUX#9164 post-collapse runs `26108941288`, `26108941164`, and `26111149301`.
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`, `release-scribe`.
- Status: verified.

### VS Code E2E build artifacts should be produced once

- Learning: Keep `setup-extension-build` as a shared serial job that installs/builds/compiles once, uploads the extension and compiled E2E artifacts, and lets matrix shards download those artifacts instead of rebuilding.
- Why it matters: PR #9178 removed duplicated setup work from each shard, making the scenario matrix faster and less variable.
- Source: Azure/LogicAppsUX#9178 and #9164 collapsed `.github/workflows/vscode-e2e.yml`.
- Applies to: `ci-sentinel`, `vscode-test-specialist`, `test`.
- Status: verified.

### Turbo cache keys must be content-based

- Learning: Do not key `.turbo` cache only by `${{ github.sha }}`. Use a content hash over relevant app/lib sources, the lockfile, and `turbo.json`, with restore keys.
- Why it matters: SHA-only keys guarantee cache misses on every push, hiding the intended CI speedup.
- Source: Azure/LogicAppsUX#9178; #9164 collapsed `.github/workflows/vscode-e2e.yml`.
- Applies to: `ci-sentinel`, `chief-engineer`.
- Status: verified.

## Worktree creation: `git new` for fresh branches off main, raw `git worktree add` off feature branches

- Learning: The `git new <branch>` repo alias creates a worktree at `../<branch>` off `origin/main` with `.github` / `.squad` overlay + skip-worktree. **It always branches off main.** When a new branch needs to be cut off a *feature* branch (e.g. stacking a follow-up on top of an in-flight PR branch), `git new` is wrong — use raw `git worktree add -b <new-branch> ../<dir> <base-ref>`.
- Why it matters: PR #9164 worktrees that should have been off `e2e-optimizations` got accidentally rebased to `main` when `git new` was used reflexively, causing the new branch to lose the parent PR's commits.
- Pattern (cheat sheet):
  - New work off main: `git new <branch>` (alias).
  - Stacked work off a feature branch: `git worktree add -b <new-branch> ../<dir> <base-ref>` (raw), then manually overlay `.github` and `.squad` with `git checkout origin/main -- .github .squad` + `git update-index --skip-worktree`.
- Source: Repo `git config alias.new`; PR #9164 worktree mishaps.
- Applies to: `chief-engineer`, `pr-orchestrator`, `ci-sentinel`, every agent that runs `git`.
- Status: verified.

## Stacked PRs from forks targeting upstream are not possible

- Learning: A PR opened from a fork (e.g. `lambrianmsft/LogicAppsUX:branch-B`) cannot use `--base branch-A` against the upstream `Azure/LogicAppsUX` repo when `branch-A` lives on the **fork**. GitHub does not allow cross-repo base selection for fork → upstream PRs. The follow-up branch must wait until the parent PR merges into `Azure/LogicAppsUX:main` and then re-target `main`.
- Workaround: keep the follow-up branch local/draft; once the parent PR merges, rebase the follow-up onto upstream `main` and open the PR with `--base main`.
- Source: PR #9164 follow-up branch sequencing.
- Applies to: `pr-orchestrator`, `chief-engineer`, `release-scribe`.
- Status: verified.

## PR coverage gate: `pr-coverage.yml` requires ≥80% whole-file line coverage on changed sources

- Learning: `.github/workflows/pr-coverage.yml` enforces ≥80% whole-file line coverage for changed non-test TypeScript source files in `COVERED_PACKAGES` (line 219), which includes `apps/vs-code-designer` and `apps/vs-code-react`. The workflow has a `files_ignore:` list (line 66) with pre-existing exclusions (e.g. `getAuthorizationToken.ts`, `startStreamingLogs.ts`).
- Extension-only files (those importing `vscode` or `@microsoft/vscode-azext-*` at module load) cannot be unit-tested in vitest's node environment without prohibitive mocking. Add such files to `files_ignore:` with an inline justification matching the existing pattern. **Do not** weaken the coverage threshold.
- Pure-function helpers (e.g. `apps/vs-code-designer/src/app/utils/codeless/funcHostTaskEnv.ts`) **can** be vitest-tested — keep them factored out of VS Code-API-bound modules so they stay testable. This is what unlocked the platform-keyed PATH fix in PR #9164 commit `b1b094abd`.
- Source: `.github/workflows/pr-coverage.yml:66` (`files_ignore`), `:219` (`COVERED_PACKAGES`), `:244` (per-package loop); PR #9164 `funcHostTaskEnv.spec.ts` coverage.
- Applies to: `vscode`, `test`, `vscode-test-specialist`, `senior-swe-reviewer`, `ci-sentinel`, `shared-services`.
- Status: verified.
