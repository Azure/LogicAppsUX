# Chronicle-Driven Improvement Playbook

> **Runtime scope: GitHub Copilot CLI only.** `/chronicle`, `/experimental`, `~/.copilot/`, and `COPILOT_HOME` are features of the GitHub Copilot CLI. This playbook does not apply to other agent harnesses (Claude Code, Cursor, Cline, etc.); those harnesses have their own session-mining tools.

Use this playbook to harvest reusable learnings from Copilot CLI **session history** using the experimental `/chronicle` slash command, then feed the results back into Squad agents through `session-knowledge-curator`.

## What `/chronicle` is

`/chronicle <standup|tips|improve|reindex>` is an experimental Copilot CLI slash command that exposes session-history-driven analysis. It became generally available in CLI v1.0.40 (entry: "Session history, file tracking, and the /chronicle command are now available to all users"). It is gated behind `/experimental on`.

Subcommands used by this playbook:

| Subcommand | Purpose | When to run |
|------------|---------|-------------|
| `/chronicle reindex` | Rebuilds the local chronicle index from `~/.copilot/` session files so other chronicle commands see fresh data. | Before `improve`/`tips`/`standup`, after long sessions, after CLI upgrade, or after bulk session deletion. |
| `/chronicle improve` | Asks the agent to read recent session history and recommend concrete improvements to your setup (custom instructions, agent files, MCP/skills, repeated friction patterns). | After `reindex`, as the first step of a knowledge refresh. |
| `/chronicle tips` | Surfaces shorter tips/observations from recent sessions. | Use alongside `improve` for lighter-weight signal. |
| `/chronicle standup` | Summarizes recent work for daily standup. | Not part of agent improvement, but useful for session inventory before curation. |

Both commands run inside an interactive Copilot CLI session and produce model output in the timeline; they do not modify any repo files automatically. The Squad workflow takes that output as **advisory candidate input**, then `session-knowledge-curator` validates and persists durable learnings.

## When to run this playbook

- After a stretch of completed work (e.g., merged PRs, completed customer repros, CI iteration loops).
- When `chief-engineer` notices the same friction pattern occurring across sessions.
- On a regular cadence — e.g., after every 5-10 non-trivial sessions or before a big planned change.
- As an alternative or supplement to `session_store_sql` mining, especially when session metadata is sparse (null `repository`, missing `session_refs`).

## Prerequisites

1. Copilot CLI v1.0.40 or newer.
2. Experimental mode enabled: `/experimental on` (persists across sessions).
3. `~/.copilot/` accessible (default config dir; respects `COPILOT_HOME`).

## Workflow

1. **Enable experimental mode** (one-time):
   ```text
   /experimental on
   ```

2. **Refresh the chronicle index**:
   ```text
   /chronicle reindex
   ```
   Wait for completion before running `improve` so the analysis covers all current sessions.

3. **Generate improvement candidates**:
   ```text
   /chronicle improve
   ```
   The agent will produce recommendations. **Do not** apply them blindly.

4. **Optional supplementary signal**:
   ```text
   /chronicle tips
   ```

5. **Hand the output to `session-knowledge-curator`** by invoking the prompt at `.squad/prompts/chronicle-improve.md`. The curator:
   - reads the chronicle output;
   - classifies each candidate (durable repo fact / workflow improvement / CI-test pattern / review pattern / ephemeral / sensitive);
   - validates durable candidates against current repo files or PR evidence;
   - updates `.squad/knowledge/*.md` and proposes `store_memory` entries;
   - explicitly rejects ephemeral or sensitive items and records why.

6. **Wire actionable improvements into `.squad/`**:
   - Agent-behavior gaps → `.squad/agents/<agent>/charter.md`, `.squad/playbooks/*`.
   - Routing gaps → `.squad/routing.md`.
   - Test/CI guardrails → `.squad/knowledge/vscode-e2e-testing.md`, `.squad/knowledge/unit-testing.md`, `.squad/knowledge/ci-patterns.md`.
   - Reviewer/PR patterns → `.squad/knowledge/review-patterns.md`.
   - Durable repo-wide facts → `store_memory` (short, non-sensitive, repo-wide only).

## Sensitivity filter

Do **not** store any of the following from chronicle output:
- Raw session transcripts or verbatim assistant responses.
- Secrets, tokens, customer payloads, tenant/subscription IDs, personal data.
- One-off task notes ("for this PR…", "for now…").
- Unverified hypotheses presented as facts.

## Validation standard

A chronicle-derived candidate is only stored in `.squad/knowledge/` once it is:

1. **classified** (durable repo fact / workflow improvement / CI-test pattern / review pattern);
2. **verified** against at least one of: current repo file, merged PR, commit message, successful command output, or two independent sessions; and
3. **non-sensitive** per the filter above.

Mark `Status: needs revalidation` if the candidate is plausible but not yet verified.

## Cadence recommendation

| Trigger | Action |
|---------|--------|
| End of a non-trivial PR | `/chronicle reindex` + `/chronicle improve`, then run `session-knowledge-curator` |
| Every ~5-10 sessions | Same as above |
| After CLI upgrade | `/chronicle reindex` (index format may change) |
| New friction pattern | Targeted `/chronicle tips` + manual curator workflow |

## Output

`session-knowledge-curator` must report:

1. **Sources inspected** — sessions included, plus chronicle subcommands used.
2. **Durable learnings added** — file + entry title.
3. **Prompt/playbook improvements** — `.squad/playbooks/*`, `.squad/agents/*` edits.
4. **Memory-worthy facts** — proposed/stored `store_memory` entries.
5. **Rejected or sensitive items** — and why.
6. **Suggested next refresh scope** — when to re-run.
