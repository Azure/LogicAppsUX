# Session Knowledge Feed Playbook

Use this playbook to extract reusable learnings from previous Copilot sessions, PRs, branches, issues, or time ranges and feed them back into Squad agents.

## Entry Points

Example prompts:

```text
Use .squad/prompts/session-learnings.md for PR #9148.
Extract durable learnings, update curated Squad knowledge, and list any memory-worthy facts.
```

```text
Use .squad/prompts/refresh-agent-context.md for the last 30 days of LogicAppsUX Copilot sessions.
Summarize reusable learnings for chief-engineer, ci-sentinel, and the senior SWE review board.
```

## Sources

Prefer the least sensitive source that contains enough evidence:

- session summaries, plans, and checkpoints;
- `session_store_sql` history when available;
- PR comments, commits, checks, and workflow logs via `gh`;
- final user-facing summaries;
- changed files and validation commands;
- existing `.squad/knowledge/` entries.

Do not store raw transcripts, secrets, temporary logs, or private data in the repo.

## Extraction Workflow

1. Identify the requested source: session ID, PR number, branch, issue, time range, or current session.
2. Gather artifact metadata and summaries.
3. Extract candidate learnings.
4. Classify each candidate:
   - durable repo fact;
   - workflow improvement;
   - CI/test pattern;
   - review/comment pattern;
   - prompt/agent improvement;
   - ephemeral task note;
   - sensitive item;
   - stale or unverified item.
5. Validate durable candidates against repo files, PR evidence, commits, or successful command output when feasible.
6. Update curated `.squad/knowledge/` notes.
7. Recommend persistent memory entries only when facts are concise, durable, repo-wide, and non-sensitive.
8. Report rejected candidates and why they were not stored.

## Session History Query Pattern

When `session_store_sql` is available, use narrow queries with time filters and limits. Start from sessions, then inspect specific session IDs instead of scanning all turns.

Example intent:

```text
Find recent LogicAppsUX sessions about VS Code E2E failures, then summarize only durable learnings and cite source sessions.
```

## Output Standard

Return:

- sources inspected;
- learnings added to `.squad/knowledge/`;
- memory-worthy facts;
- stale or rejected candidates;
- follow-up agent/playbook updates;
- any remaining uncertainty.
