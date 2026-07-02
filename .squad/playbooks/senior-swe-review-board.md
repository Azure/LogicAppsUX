# Senior SWE Review Board Playbook

Use this playbook when non-trivial work needs model-diverse planning, critique, or implemented-diff review.

## Review Board Agents

| Checkpoint | Agent | Preferred model slot |
|------------|-------|----------------------|
| Plan review | `senior-swe-planner` | Strongest long-context reasoning model |
| Design/risk critique | `senior-swe-critic` | Different strong reasoning model or model family |
| Implemented diff review | `senior-swe-reviewer` | Code-focused model where available |
| Conflict resolution | `senior-swe-adjudicator` | Strongest available model |

Model names are intentionally not hard-coded because model availability varies by CLI session.

## When Required

Use the board for:

- changes touching 3+ files;
- behavior changes;
- test/E2E/CI infrastructure changes;
- PR review comments with ambiguous fixes;
- repeated CI failures;
- security, data, auth, or service-contract changes;
- user requests for senior review or alternate models.

## Inputs to Provide

Give each reviewer:

- original user request;
- relevant plan section;
- changed files or expected files;
- PR comments or CI failure details;
- validation commands and results;
- test strategy or coverage verdict from `test` when available;
- relevant `.squad/knowledge/` entries;
- constraints and open questions.

## Workflow

1. Ask `senior-swe-planner` to review the plan.
2. Update the plan based on blocking findings.
3. Ask `senior-swe-critic` to critique the implementation approach before risky edits.
4. Implement and validate.
5. Ask `senior-swe-reviewer` to compare the actual diff against the plan and evidence.
6. If findings conflict, ask `senior-swe-adjudicator` to choose the safest path.
7. Record cross-agent decisions in `.squad/decisions.md` when they affect future work.

## Output Standard

Senior review findings should be:

- concrete and evidence-backed;
- scoped to correctness, reliability, tests, security, or CI risk;
- explicit about blocking vs non-blocking;
- free of style-only comments unless style causes a real failure.
