# Prompt: Customer Regression Test

Use this prompt after a customer issue has been reproduced.

```text
Use .squad/agents/customer-repro-tester, .squad/agents/test, and .squad/playbooks/customer-repro.md.

Convert this confirmed customer repro into stable regression coverage. Prefer focused unit or React tests for narrowed logic and add Playwright or VS Code ExTester coverage only when the customer-visible flow requires it. For VS Code E2E, use run-e2e.js and SKILL.md; for browser flows, use the existing Playwright E2E framework.

Keep fixtures sanitized and document any live-service-only steps separately from commit-worthy tests.
```
