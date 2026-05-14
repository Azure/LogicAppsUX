# Agent Improvements

Curated improvements to Squad routing, prompts, playbooks, and agent behavior. Add entries through `session-knowledge-curator`.

## Current Improvements

### Use a central orchestration prompt

- Improvement: Start complex work with `chief-engineer` instead of manually prompting each lifecycle agent.
- Why it matters: The central agent owns persistence across plan, implementation, validation, push, CI monitoring, and final summaries.
- Source: Current session user feedback.
- Applies to: `chief-engineer`.
- Status: verified.

### Add model-diverse review checkpoints

- Improvement: Require separate planning, critique, implemented-diff review, and optional adjudication checkpoints for non-trivial work.
- Why it matters: Different review perspectives catch missing plan items, design risks, flaky tests, and incomplete implementation before CI or reviewer feedback.
- Source: Current session user feedback.
- Applies to: `chief-engineer`, senior SWE review board agents.
- Status: verified.

### Consult relevant subagents before finalizing non-trivial plans

- Improvement: `chief-engineer` should consult `session-knowledge-curator` (prior learnings), `pr-comment-triage` (when PR comments are involved), `customer-repro-tester` (when starting from a customer issue), owning domain agents per `.squad/routing.md`, `test`/`vscode-test-specialist` (when tests or CI are in scope), and `senior-swe-planner` (plan critique) before plan finalization, and summarize their inputs in `plan.md`.
- Why it matters: Plans drafted without these inputs miss known patterns, test-strategy guardrails, or customer-context that lead to rework after implementation or CI. The chief-engineer prompt and `playbooks/central-agent.md` already describe this rule; capturing it here keeps the convention durable even if those playbooks are refactored.
- Source: `.squad/agents/chief-engineer/charter.md`; `.squad/playbooks/central-agent.md`.
- Applies to: `chief-engineer`, `pr-orchestrator`, `plan-auditor`.
- Status: verified.

### Use `/chronicle reindex` + `/chronicle improve` as a local candidate source

- Improvement: Add Copilot CLI `/chronicle reindex` followed by `/chronicle improve` (and optionally `/chronicle tips`) as an additional candidate source that feeds `session-knowledge-curator`. Use `.squad/prompts/chronicle-improve.md` to invoke the workflow.
- Why it matters: `/chronicle` reads local `~/.copilot/` session history and surfaces recurring friction or CLI/agent-config improvements that `session_store_sql` and PR-driven mining tend to miss. It does not replace the curator workflow — chronicle output is advisory only and must be classified, validated, and sensitivity-filtered through the existing curator pipeline before it lands in `.squad/`.
- Pattern:
  1. `/experimental on` (one-time).
  2. `/chronicle reindex` to refresh the local chronicle index.
  3. `/chronicle improve` to generate candidate recommendations.
  4. Pass the output through `.squad/prompts/chronicle-improve.md` so `session-knowledge-curator` classifies, validates, and persists durable learnings or rejects them.
- Source: `.squad/playbooks/chronicle-driven-improvement.md`; Copilot CLI v1.0.40 changelog entry ("Session history, file tracking, and the /chronicle command are now available to all users"); CLI command reference ("/chronicle <standup|tips|improve|reindex> ... Only available in experimental mode").
- Applies to: `chief-engineer`, `session-knowledge-curator`, `pr-orchestrator`, `plan-auditor`.
- Status: verified.
