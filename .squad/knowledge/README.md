# Squad Knowledge

This directory stores curated, non-sensitive learnings that should help future Squad agents work better in LogicAppsUX.

It is not a transcript archive. Do not store raw Copilot conversations, secrets, temporary logs, personal data, or one-off task notes here.

## Files

| File | Purpose |
|------|---------|
| [INDEX.md](INDEX.md) | **Read first.** Triggers → knowledge files mapping and hard rules. |
| [session-learnings.md](session-learnings.md) | Durable learnings extracted from prior sessions |
| [ci-patterns.md](ci-patterns.md) | Reusable CI and E2E failure patterns |
| [review-patterns.md](review-patterns.md) | PR comment and reviewer feedback patterns |
| [agent-improvements.md](agent-improvements.md) | Improvements to Squad prompts, routing, and playbooks |
| [vscode-e2e-testing.md](vscode-e2e-testing.md) | VS Code ExTester UI E2E rules and pitfalls |
| [runtime-readiness-probes.md](runtime-readiness-probes.md) | 4-probe HTTP readiness chain for VS Code Functions runtime (PR #9164) |
| [vscode-task-env-propagation.md](vscode-task-env-propagation.md) | `func: host start` task env / PATH propagation across Windows / Linux / macOS (PR #9164) |
| [unit-testing.md](unit-testing.md) | Unit-test conventions and coverage patterns |
| [customer-repro.md](customer-repro.md) | Safe customer-facing issue reproduction patterns |

## Entry Standard

Each durable learning should include:

- the learning;
- why it matters;
- source evidence when available;
- which agent(s) should use it;
- whether it is verified or needs revalidation.

Use `session-knowledge-curator` and `playbooks/session-knowledge-feed.md` to add entries.

For chronicle-driven candidates, see `playbooks/chronicle-driven-improvement.md` and the one-shot prompt at `prompts/chronicle-improve.md`.
