# Prompt: Session Learnings

Use this prompt to extract reusable knowledge from a previous session, PR, issue, branch, or the current session.

```text
Use .squad/agents/session-knowledge-curator and .squad/playbooks/session-knowledge-feed.md for <session-id | PR number | issue number | branch | current session>.

Gather available session artifacts, PR metadata, commits, CI outcomes, plans, checkpoints, and final summaries. Extract durable non-sensitive learnings, classify candidates, validate facts against source evidence when possible, update curated .squad/knowledge/ notes, and list any memory-worthy facts that should be stored persistently.

Do not store raw transcripts, secrets, temporary logs, personal data, or one-off task notes.
```
