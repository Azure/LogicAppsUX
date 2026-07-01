# Knowledge Index — Triggers → Files

Read this first on **every** task. Open any file whose triggers match the task domain.

## Triggers → Files

| If the task involves… | Read these |
|---|---|
| **Opening or updating ANY pull request body** | **`.github/pull_request_template.md` (lowercase filename — exists at repo root in `.github/`, do NOT improvise sections, do NOT skip)** **+** [review-patterns.md](review-patterns.md) ("PR body must conform…") |
| `git`, worktrees, branches, repo setup, syncing agents | [session-learnings.md](session-learnings.md) **+ run `git config --get-regexp '^alias\.'`** (custom aliases: `git new <branch>`, `git agents`, `git sync-agents`, `git unhide-agents`, `git ap`) **+** [ci-patterns.md](ci-patterns.md) (worktree off-main vs off-feature, stacked PRs from forks) |
| Pull request lifecycle, pushing, CI checks, failing workflows, retries | [ci-patterns.md](ci-patterns.md) |
| PR comments, reviewer feedback, addressing review threads | [review-patterns.md](review-patterns.md) |
| `AI PR Validation` bot failures, `needs-pr-update` label | [review-patterns.md](review-patterns.md) ("PR body must conform to .github/pull_request_template.md…") **+** `.github/pull_request_template.md` |
| Squad routing, agent prompts, playbooks, charters | [agent-improvements.md](agent-improvements.md) |
| VS Code extension E2E (ExTester), `run-e2e.js`, designer/run/debug tests | [vscode-e2e-testing.md](vscode-e2e-testing.md) **+** `apps/vs-code-designer/src/test/ui/SKILL.md` |
| Functions runtime readiness, `:7071` probes, `listCallbackUrl`, `waitForRuntimeReady`, "runtime not ready" flakes | [runtime-readiness-probes.md](runtime-readiness-probes.md) |
| `func: host start` task env, `InlineCodeDependencyGeneratorFailure`, PATH propagation, `languageWorkers__node__defaultExecutablePath` | [vscode-task-env-propagation.md](vscode-task-env-propagation.md) |
| Unit tests, Vitest, coverage strategy, mocking | [unit-testing.md](unit-testing.md) |
| PR coverage gate (`pr-coverage.yml`), `COVERED_PACKAGES`, `files_ignore` justification | [ci-patterns.md](ci-patterns.md) ("PR coverage gate") |
| Customer-reported issues, repro environments, sanitized artifacts | [customer-repro.md](customer-repro.md) |
| Any non-trivial change | the relevant file(s) above **plus** `.squad/team.md`, `.squad/routing.md`, the owning package's `docs/ai-setup/packages/<name>.md`, and the relevant `libs/<lib>/src/graphify-out/GRAPH_REPORT.md` |

## Hard Rules

1. **Before opening or editing any PR body**, read `.github/pull_request_template.md` (lowercase filename) at the repo root and use its exact section structure. Do NOT improvise. The fork and the `Azure/LogicAppsUX` upstream both ship the same template.
2. **Never run a raw `git` command before checking aliases.** Repo-specific aliases (e.g., `git new` for worktrees) encode conventions that raw git won't enforce.
3. **Never skip this index because a task "looks trivial."** Trivial-looking tasks (worktree creation, single test runs, one-line scripts) are where repo conventions get missed.
4. **When a knowledge file disagrees with a generic best practice, the knowledge file wins** — it reflects repo-specific evidence.

## Maintenance

- Add a new row when a new `.squad/knowledge/*.md` file is created.
- Add a new row when a recurring task domain doesn't yet have triggers listed.
- Curated by `session-knowledge-curator` via `.squad/playbooks/session-knowledge-feed.md`.
