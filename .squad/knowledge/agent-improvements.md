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
