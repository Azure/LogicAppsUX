# Customer Reproduction Knowledge

Curated durable learnings for safely reproducing customer-facing issues. Add entries through `session-knowledge-curator`.

## Current Learnings

### Sanitize before storing or testing

- Learning: Customer reports must be reduced to sanitized fixtures before they are committed or added to `.squad/knowledge/`.
- Why it matters: Workflow JSON, schemas, logs, screenshots, and run history can contain secrets, tenant IDs, subscription IDs, connection metadata, personal data, or raw payloads.
- Source: Customer repro tester plan.
- Applies to: `customer-repro-tester`, `test`, `vscode-test-specialist`, `session-knowledge-curator`.
- Status: verified.

### Use the cheapest reliable repro first

- Learning: Start with manual, unit, or component-level repros when they prove the issue, then escalate to Playwright or VS Code ExTester for host-specific user flows.
- Why it matters: This keeps regression coverage fast and stable while preserving E2E coverage for customer-visible flows that need it.
- Source: Customer repro tester plan.
- Applies to: `customer-repro-tester`, `test`, `chief-engineer`.
- Status: verified.

### VS Code customer issues may require ExTester

- Learning: Customer issues involving VS Code commands, webviews, workspace creation/conversion, designer lifecycle, debug/run, or overview flows often need VS Code ExTester access through `run-e2e.js`.
- Why it matters: Unit tests cannot reproduce extension host, command palette, iframe, or VS Code shell integration issues.
- Source: VS Code testing playbook and customer repro tester plan.
- Applies to: `customer-repro-tester`, `vscode-test-specialist`, `test`, `vscode`.
- Status: verified.

### Customer-like VS Code bugs often need host-specific repros

- Learning: Bugs such as convert-to-workspace duplicate Create clicks, fresh-window bundle resolution, dev-container custom-code startup, and Azure overview run-trigger regressions were only fully understood by reproducing the host-specific VS Code flow, not just the underlying utility logic.
- Why it matters: Customer reports involving workspace windows, command routing, overview webviews, and debug/run flows need `customer-repro-tester` to choose VS Code ExTester or manual VS Code repros before narrowing to unit tests.
- Source: Azure/LogicAppsUX#9080, #9148, #9149, and #9155.
- Applies to: `customer-repro-tester`, `vscode-test-specialist`, `test`, `vscode`.
- Status: verified.

### Overview regressions must preserve Azure and local behavior

- Learning: When reproducing overview or run-trigger customer issues, distinguish Azure-hosted workflows from local workflows and verify callback/routing data for both surfaces.
- Why it matters: Azure/LogicAppsUX#9149 fixed an overview page regression that triggered Azure-hosted Logic Apps incorrectly from VS Code.
- Source: Azure/LogicAppsUX#9149.
- Applies to: `customer-repro-tester`, `vscode`, `test`.
- Status: verified.
