# Prompt: PR Lifecycle

Use this prompt for PR comment fixes, validation, push, and CI monitoring.

```text
Use .squad/agents/chief-engineer and .squad/playbooks/pr-lifecycle.md for PR <number>.

Own the PR lifecycle end-to-end:
- discover PR context, review threads, changed files, and checks;
- ask session-knowledge-curator for relevant prior learnings;
- route comments to pr-comment-triage;
- maintain plan.md and SQL todos through plan-auditor;
- run senior SWE review-board checkpoints;
- route implementation to domain agents and tests to test;
- validate locally;
- commit with the required Copilot co-author trailer;
- push and let ci-sentinel monitor checks;
- iterate on actionable CI failures;
- have release-scribe update the PR body and final summaries.

Do not stop after push unless checks pass, the PR is merged, or the remaining blocker is external/non-actionable.
```
