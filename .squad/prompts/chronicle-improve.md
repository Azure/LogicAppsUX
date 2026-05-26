# Prompt: Chronicle-Driven Improvement

Use this prompt **after** running `/chronicle reindex` followed by `/chronicle improve` (or `/chronicle tips`) in a Copilot CLI session with experimental mode enabled.

Paste the chronicle output into the prompt where indicated.

```text
Use .squad/agents/session-knowledge-curator with .squad/playbooks/chronicle-driven-improvement.md and .squad/playbooks/session-knowledge-feed.md.

Below is the raw output from `/chronicle improve` (and optionally `/chronicle tips`). Treat it as advisory candidate input only — not as durable facts.

For each candidate:
1. Classify it (durable repo fact / workflow improvement / CI-test pattern / review pattern / agent-behavior gap / ephemeral / sensitive).
2. Reject ephemeral or sensitive items and record why.
3. Validate durable candidates against current repo files, merged PRs, commits, or `session_store_sql` evidence.
4. Apply verified learnings to the right `.squad/knowledge/*.md` file, `.squad/agents/<name>/charter.md`, `.squad/routing.md`, or `.squad/playbooks/*` as appropriate.
5. Recommend `store_memory` entries only when the fact is short, durable, repo-wide, and non-sensitive.

Do not store raw chronicle transcripts, raw assistant responses, secrets, customer payloads, personal data, or unverified hypotheses.

Report:
- sources inspected (chronicle subcommands + session IDs referenced);
- durable learnings added (file + entry title);
- prompt/playbook improvements;
- memory-worthy facts;
- rejected/sensitive items and why;
- suggested next refresh scope.

--- BEGIN CHRONICLE OUTPUT ---
<paste /chronicle improve output here>
--- END CHRONICLE OUTPUT ---
```

## Quick checklist before invoking

- [ ] CLI version ≥ 1.0.40 (`/version` to check).
- [ ] Experimental mode on (`/experimental on`).
- [ ] `/chronicle reindex` completed without error.
- [ ] `/chronicle improve` output captured (copy from the timeline).
- [ ] You are in the LogicAppsUX repository root or a worktree so `.squad/` is in scope.
