# Prompt: Customer Repro

Use this prompt to reproduce customer-facing issues safely.

```text
Use .squad/agents/customer-repro-tester and .squad/playbooks/customer-repro.md.

Given this customer issue, reproduce it safely. Sanitize artifacts, identify the affected product surface, reconstruct the environment, choose the cheapest reliable repro method, and determine whether unit tests, Playwright E2E, VS Code ExTester through run-e2e.js, or live-service investigation is needed.

Produce a repro report with steps, expected/actual behavior, evidence, likely owner, regression coverage recommendation, and privacy notes. Do not store raw customer data, secrets, tenant IDs, subscription IDs, tokens, connection strings, or personal data.
```
