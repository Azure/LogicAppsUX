# Prompt: Refresh Agent Context

Use this prompt to periodically make Squad agents smarter from accumulated Copilot sessions.

```text
Use .squad/agents/session-knowledge-curator and .squad/playbooks/session-knowledge-feed.md for <time range or topic>.

Search prior LogicAppsUX Copilot sessions when session history tools are available. Start with narrow session queries, then inspect only relevant session IDs. Summarize durable learnings for chief-engineer, ci-sentinel, plan-auditor, release-scribe, and the senior SWE review board.

Update curated .squad/knowledge/ files with source-backed, non-sensitive knowledge. Recommend store_memory entries only for concise repo-wide facts that are likely to remain useful.
```
