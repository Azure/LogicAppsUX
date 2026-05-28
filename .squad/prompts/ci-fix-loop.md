# Prompt: CI Fix Loop

Use this prompt when a PR or branch has failing CI.

```text
Use .squad/agents/chief-engineer, .squad/agents/ci-sentinel, and .squad/playbooks/pr-lifecycle.md for PR <number> or branch <branch>.

Inspect current checks with gh, map failures to workflow runs/jobs, download logs/artifacts when needed, classify failures, and route actionable fixes to the owning domain/test agents. Use session-knowledge-curator to load prior CI failure patterns before planning a fix.

Validate locally, commit, push, and continue monitoring until relevant checks pass, the PR merges, or the failure is proven external/non-actionable and documented.
```
