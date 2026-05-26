# Central Agent Playbook

Use this playbook when the user wants one agent to own a task end-to-end instead of manually prompting each subagent.

## Entry Point

Start with `chief-engineer`.

Example prompt:

```text
Use .squad/agents/chief-engineer and own this task end-to-end.
Coordinate planning, senior SWE review, implementation routing, validation, push, CI monitoring, and final summary.
```

## Operating Loop

1. **Classify the request**
   - PR lifecycle;
   - implementation;
   - CI failure;
   - customer issue reproduction;
   - plan audit;
   - review board;
   - knowledge refresh.
2. **Load context**
   - read `.squad/team.md`;
   - read `.squad/routing.md`;
   - read relevant playbooks;
   - ask `session-knowledge-curator` for prior learnings when relevant.
3. **Plan**
   - consult relevant subagents before drafting the plan;
   - include the consulted subagents and their key inputs in the plan;
   - create or refresh `plan.md`;
   - mirror tasks into SQL todos;
   - identify owners and validation commands.
   - ask `test` for a coverage strategy when behavior, tests, or CI are in scope.
   - ask `customer-repro-tester` for a repro plan when the request starts from a customer issue or support report.
4. **Review**
   - use `senior-swe-planner` before implementation;
   - use `senior-swe-critic` before risky edits;
   - use `senior-swe-reviewer` before push or final status;
   - use `senior-swe-adjudicator` for conflicts.
5. **Implement**
   - route code to domain agents by `.squad/routing.md`;
   - route tests to `test`;
   - route VS Code unit and ExTester E2E work to `vscode-test-specialist` when focused expertise is needed;
   - route customer issue reproduction to `customer-repro-tester` before assigning product fixes;
   - route PR process work to lifecycle agents.
6. **Validate**
   - run focused commands based on changed files;
   - for VS Code E2E changes, follow `playbooks/vscode-testing.md`;
   - update plan/todos with evidence.
7. **Push and monitor**
   - hand off to `ci-sentinel`;
   - keep iterating on actionable failures.
8. **Summarize**
   - use `release-scribe` for PR body and reviewer-facing status.

## Default Stop Conditions

Stop only when:

- the requested outcome is complete and validated;
- PR checks pass or the PR is merged;
- a blocker requires a real user decision;
- the remaining failure is external/non-actionable and documented.

## Escalation Rules

- Ask the user when scope, product behavior, credentials, or destructive actions are required.
- Ask the user before live Azure/ARM/customer-tenant reproduction or when customer artifacts are not sanitized.
- Use `senior-swe-adjudicator` when model-diverse reviewers disagree.
- Update `.squad/decisions.md` for cross-agent decisions that future agents need to remember.

## Planning Consultation Matrix

Before drafting a non-trivial plan, `chief-engineer` consults:

| Need | Consult |
|------|---------|
| Prior work or similar failures | `session-knowledge-curator` |
| PR comments or bot feedback | `pr-comment-triage` |
| Customer issue reproduction | `customer-repro-tester` |
| Implementation scope | Owning domain agent(s) from `.squad/routing.md` |
| Test strategy or E2E coverage | `test` or `vscode-test-specialist` |
| CI failure diagnosis | `ci-sentinel` |
| Reviewer-facing communication | `release-scribe` |
| Plan critique | `senior-swe-planner` |

If a separate subagent cannot be launched, read that agent's `.squad/agents/<name>/charter.md` and relevant playbook, apply the workflow directly, and record that in the plan.
