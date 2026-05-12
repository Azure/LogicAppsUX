# PR Lifecycle Playbook

Use this playbook when the user asks to address PR comments, implement reviewer feedback, push changes, monitor CI, or iterate on failed checks. For end-to-end ownership, start with `chief-engineer`; it coordinates this playbook and delegates to the lifecycle/domain agents.

## Agent Roles

| Phase | Lead agent | Supporting agents |
|-------|------------|-------------------|
| Central ownership | chief-engineer | pr-orchestrator, plan-auditor |
| Knowledge preload | session-knowledge-curator | chief-engineer |
| PR discovery | pr-orchestrator | pr-comment-triage |
| Comment/task planning | pr-comment-triage | plan-auditor, domain agents |
| Plan critique | senior-swe-planner | review-critic, pr-orchestrator |
| Design risk critique | senior-swe-critic | review-critic, domain agents |
| Test strategy | test | vscode-test-specialist |
| Implementation | routed domain agent | test |
| Local validation | routed domain agent | test, plan-auditor |
| Implemented diff review | senior-swe-reviewer | plan-auditor, routed domain agent |
| Commit/push | ci-sentinel | pr-orchestrator |
| CI monitoring | ci-sentinel | test, routed domain agent |
| PR body/summary | release-scribe | pr-comment-triage, ci-sentinel |

## 1. Discover PR Context

If `chief-engineer` is the entry point, first ask `session-knowledge-curator` to load relevant prior learnings for the PR area, changed files, CI pattern, or reviewer feedback pattern.

The orchestrator gathers:

- current branch and git status;
- PR number and URL;
- PR body, labels, head SHA, merge state;
- changed files;
- unresolved review threads;
- latest checks.

Preferred commands:

```bash
gh pr view <number> --repo <owner>/<repo> --json body,labels,comments,reviews,latestReviews,reviewDecision,mergeStateStatus,headRefOid
gh pr checks <number> --repo <owner>/<repo> --json name,state,startedAt,completedAt,link
```

Use GraphQL review threads when inline comments matter:

```bash
gh api graphql -f owner=<owner> -f name=<repo> -F number=<number> -f query='query($owner:String!, $name:String!, $number:Int!) { repository(owner:$owner, name:$name) { pullRequest(number:$number) { reviewThreads(first:100) { nodes { isResolved path line comments(first:20) { nodes { author { login } body createdAt url } } } } } } }'
```

## 2. Route Work

Use `.squad/routing.md` for file ownership.

- If files are in `apps/vs-code-designer/`, `apps/vs-code-react/`, or `libs/vscode-extension/`, route implementation to `vscode`.
- If work is only tests, route to `test`.
- If feature code and tests both change, route feature code to the owning domain agent and tests to `test`.
- If the task is PR process, plan audit, CI monitoring, or summary writing, route to lifecycle agents.

## 3. Plan and Track

The orchestrator creates or refreshes `plan.md` and SQL todos.

Plan requirements:

- problem statement;
- current evidence;
- proposed approach;
- file list;
- validation commands;
- risks or assumptions.

SQL todos should be granular and dependency-aware:

- triage comments;
- implement feature fix;
- add/update tests;
- validate locally;
- update PR body;
- commit/push;
- monitor CI;
- fix CI failures.

The plan-auditor checks that `plan.md`, SQL todos, git diff, and validation evidence stay aligned.

Ask `test` for a coverage strategy before implementation when the PR comments, plan, or changed files require unit or E2E tests. For VS Code extension UI E2E work, route focused details to `vscode-test-specialist` and `playbooks/vscode-testing.md`.

## 4. Review Before Implementation

Use the senior SWE review board before implementation when:

- 3+ files are expected to change;
- behavior changes;
- E2E or CI infrastructure is involved;
- code touches multiple agents' domains;
- the user requests another model for review.

Checkpoint requirements:

- `senior-swe-planner` reviews the plan before implementation.
- `senior-swe-critic` critiques design and risk before risky edits.
- `review-critic` remains available for an additional independent critique when needed.

The critique should answer:

- What could fail?
- What edge cases are missing?
- Are tests proving the actual behavior?
- Is there a simpler or safer approach?
- What should be changed before coding?

## 5. Implement

The domain agent implements the smallest complete fix.

Rules:

- Respect existing code ownership and conventions.
- Keep test agent focused on tests and test infrastructure.
- Do not silently swallow errors.
- Preserve type safety.
- Update PR metadata if the implementation changes risk or test scope.

## 6. Validate Locally

Run focused validation based on changed files.

Common commands:

```bash
npx biome check --write <changed-files>
pnpm --filter vscode-designer test:extension-unit -- <test-patterns>
pnpm --filter vscode-react test:extension-unit -- <test-patterns>
cd apps/vs-code-designer && npx tsup --config tsup.e2e.test.config.ts
cd apps/vs-code-designer && E2E_MODE=<mode> node src/test/ui/run-e2e.js
```

For docs-only Squad changes, validate links and routing coherence; no build/test is required unless executable code changes.

## 6.5 Review Implemented Diff

Before pushing non-trivial work, ask `senior-swe-reviewer` to compare the implemented diff against:

- the plan;
- SQL todos;
- PR comments;
- validation evidence;
- relevant `.squad/knowledge/` entries.

Use `senior-swe-adjudicator` if senior findings conflict.

If tests were part of the plan, ask `test` for a coverage verdict that names the unit tests, E2E phase or `E2E_MODE`, and any intentional gaps.

## 7. Commit and Push

Before commit:

- confirm `git status`;
- ensure only intended files are staged;
- include required co-author trailer:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

After push, do not stop. Hand off to `ci-sentinel`.

## 8. Monitor CI

The CI sentinel watches checks:

```bash
gh pr checks <number> --repo <owner>/<repo> --watch --interval 60
```

If checks fail:

1. Map failure to run/job URL.
2. Download logs:

   ```bash
   gh run view <run-id> --repo <owner>/<repo> --job <job-id> --log
   ```

3. Download artifacts/screenshots if relevant:

   ```bash
   gh run download <run-id> --repo <owner>/<repo> --name <artifact-name> --dir <dir>
   ```

4. Classify the failure:
   - actionable product/test failure;
   - coverage gap;
   - flaky E2E;
   - external infrastructure/secret/deploy issue;
   - PR already merged.
5. Create the next fix task and loop back to implementation.

## 9. Update PR and Summarize

The release-scribe updates:

- PR body;
- test plan;
- risk notes;
- per-comment resolution summary;
- final user-facing status.

Summaries should distinguish:

- resolved actionable comments;
- optional comments;
- stale comments;
- external/non-actionable CI failures;
- unmerged follow-up commits.

## Stop Conditions

Stop only when one of these is true:

- PR is merged.
- Relevant checks pass.
- Remaining failure is external/non-actionable and clearly documented.
- User input is required for a real product/scope decision.
