# Squad AI — LogicAppsUX

Squad is a multi-agent coordination layer for this monorepo. It routes tasks to specialized agents based on file paths and domain ownership, preventing conflicts and keeping each agent focused.

## How It Works

1. A task arrives (PR, issue, or prompt).
2. **chief-engineer** acts as the default central entry point for complex or lifecycle work.
3. **[routing.md](routing.md)** maps changed file paths to the owning agent(s).
4. Each agent reads its charter (`.squad/agents/<name>/charter.md`) for scope, boundaries, and knowledge references.
5. Cross-cutting changes spawn multiple agents; they coordinate via **[decisions.md](decisions.md)**.

## Key Files

| File | Purpose |
|------|---------|
| [config.json](config.json) | Squad version and platform settings |
| [team.md](team.md) | Team roster, stack, directory ownership |
| [routing.md](routing.md) | File-path → agent routing table |
| [decisions.md](decisions.md) | Cross-agent decision log |
| `agents/<name>/charter.md` | Per-agent identity, scope, boundaries |
| [playbooks/central-agent.md](playbooks/central-agent.md) | Single-entry orchestration workflow |
| [playbooks/pr-lifecycle.md](playbooks/pr-lifecycle.md) | Reusable PR comment → implementation → CI iteration workflow |
| [playbooks/senior-swe-review-board.md](playbooks/senior-swe-review-board.md) | Model-diverse senior review checkpoints |
| [playbooks/session-knowledge-feed.md](playbooks/session-knowledge-feed.md) | Cross-session learning extraction workflow |
| [playbooks/vscode-testing.md](playbooks/vscode-testing.md) | VS Code unit and ExTester E2E testing workflow |
| [playbooks/customer-repro.md](playbooks/customer-repro.md) | Customer-facing issue reproduction workflow |
| [knowledge/README.md](knowledge/README.md) | Curated reusable learnings for future agents |
| `prompts/<name>.md` | Launch prompts for common orchestration workflows |

## Quick Start

- **Want one agent to own the task?** Start with `chief-engineer` and `playbooks/central-agent.md`.
- **Adding a feature?** Check `routing.md` to find the owning agent, then read its charter.
- **Cross-cutting change?** The routing table tells you which agents to spawn. They'll coordinate via `decisions.md`.
- **Addressing PR comments or CI failures?** Start with `chief-engineer`, then follow `playbooks/pr-lifecycle.md`.
- **Need senior review with multiple model slots?** Use `playbooks/senior-swe-review-board.md`.
- **Need to know what is left?** Spawn `plan-auditor` to compare `plan.md`, SQL todos, git state, and validation evidence.
- **Need VS Code unit or E2E coverage?** Spawn `test` or `vscode-test-specialist`, then follow `playbooks/vscode-testing.md`.
- **Need to reproduce a customer issue?** Spawn `customer-repro-tester`, then follow `playbooks/customer-repro.md`.
- **Want to reuse prior Copilot session learnings?** Use `session-knowledge-curator` and `playbooks/session-knowledge-feed.md`.
- **New agent needed?** Create `agents/<name>/charter.md` following existing charters as templates, then add routes in `routing.md` and an entry in `team.md`.

## Lifecycle Agents

Domain agents own code by path. Lifecycle agents own the PR process around that code:

| Agent | Use When |
|-------|----------|
| `chief-engineer` | You want one central agent to own planning, routing, review, validation, CI, and final summary |
| `pr-orchestrator` | A task needs planning, implementation sequencing, validation, push, and CI iteration |
| `pr-comment-triage` | PR review comments or bot validation comments need to become actionable tasks |
| `plan-auditor` | You need to know which plan items are complete, stale, blocked, or still pending |
| `review-critic` | You want an independent/alternate-model critique of a plan or diff |
| `ci-sentinel` | A branch needs pushing, PR checks need monitoring, or CI failures need diagnosis |
| `release-scribe` | PR body, reviewer summaries, or final status updates need to be written |
| `session-knowledge-curator` | Previous sessions, PRs, or CI runs need to be mined for reusable learnings |
| `vscode-test-specialist` | VS Code extension unit tests or ExTester UI E2E tests need focused expertise |
| `customer-repro-tester` | Customer-facing issues need safe reproduction, evidence, and regression recommendations |

## Senior SWE Review Board

Use the review board for non-trivial plans, risky design choices, implemented-diff review, or conflicting findings.

| Agent | Checkpoint |
|-------|------------|
| `senior-swe-planner` | Reviews the plan before implementation |
| `senior-swe-critic` | Critiques design, edge cases, tests, and CI risk before risky edits |
| `senior-swe-reviewer` | Reviews the implemented diff against the plan and evidence |
| `senior-swe-adjudicator` | Resolves conflicting findings when needed |

## Launch Prompts

Reusable prompts live in `prompts/`:

- `chief-engineer.md` — central orchestration;
- `pr-lifecycle.md` — PR comments, implementation, validation, push, and CI loop;
- `ci-fix-loop.md` — targeted CI failure diagnosis and iteration;
- `review-board.md` — model-diverse senior review;
- `session-learnings.md` — extract learnings from a session, PR, issue, branch, or current work;
- `refresh-agent-context.md` — periodically refresh agent context from prior sessions;
- `test-strategy.md` — choose the right unit/E2E coverage for a change;
- `vscode-e2e-test.md` — add or fix VS Code ExTester UI E2E tests;
- `test-failure-analysis.md` — diagnose unit, E2E, or CI test failures;
- `customer-repro.md` — reproduce customer-facing issues safely;
- `customer-regression-test.md` — convert confirmed repros into stable regression tests.
