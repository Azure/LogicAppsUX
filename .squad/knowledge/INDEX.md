# Knowledge Index — Triggers → Files

Read this first on **every** task. Open any file whose triggers match the task domain.

## Triggers → Files

| If the task involves… | Read these |
|---|---|
| `git`, worktrees, branches, repo setup, syncing agents | [session-learnings.md](session-learnings.md) **+ run `git config --get-regexp '^alias\.'`** (custom aliases: `git new <branch>`, `git agents`, `git sync-agents`, `git unhide-agents`, `git ap`) |
| Pull request lifecycle, pushing, CI checks, failing workflows, retries | [ci-patterns.md](ci-patterns.md) |
| PR comments, reviewer feedback, addressing review threads | [review-patterns.md](review-patterns.md) |
| Opening or updating a PR body, `AI PR Validation` bot failures, `needs-pr-update` label | [review-patterns.md](review-patterns.md) ("PR body must conform to .github/pull_request_template.md…") **+** `.github/pull_request_template.md` |
| Squad routing, agent prompts, playbooks, charters | [agent-improvements.md](agent-improvements.md) |
| VS Code extension E2E (ExTester), `run-e2e.js`, designer/run/debug tests | [vscode-e2e-testing.md](vscode-e2e-testing.md) **+** `apps/vs-code-designer/src/test/ui/SKILL.md` |
| Unit tests, Vitest, coverage strategy, mocking | [unit-testing.md](unit-testing.md) |
| Customer-reported issues, repro environments, sanitized artifacts | [customer-repro.md](customer-repro.md) |
| Any non-trivial change | the relevant file(s) above **plus** `.squad/team.md`, `.squad/routing.md`, the owning package's `docs/ai-setup/packages/<name>.md`, and the relevant `libs/<lib>/src/graphify-out/GRAPH_REPORT.md` |

## Hard Rules

1. **Never run a raw `git` command before checking aliases.** Repo-specific aliases (e.g., `git new` for worktrees) encode conventions that raw git won't enforce.
2. **Never skip this index because a task "looks trivial."** Trivial-looking tasks (worktree creation, single test runs, one-line scripts) are where repo conventions get missed.
3. **When a knowledge file disagrees with a generic best practice, the knowledge file wins** — it reflects repo-specific evidence.

## Maintenance

- Add a new row when a new `.squad/knowledge/*.md` file is created.
- Add a new row when a recurring task domain doesn't yet have triggers listed.
- Curated by `session-knowledge-curator` via `.squad/playbooks/session-knowledge-feed.md`.
