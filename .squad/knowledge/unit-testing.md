# Unit Testing Knowledge

Curated durable learnings for LogicAppsUX unit tests. Add entries through `session-knowledge-curator`.

## Current Learnings

### Keep unit tests close to changed behavior

- Learning: New logic should have focused unit tests near the changed package's existing `__test__` or `*.spec.*` patterns.
- Why it matters: Focused unit tests catch logic regressions faster than E2E tests and document intended behavior.
- Source: Repository testing conventions and `.squad/agents/test/charter.md`.
- Applies to: `test`, domain agents, `senior-swe-reviewer`.
- Status: verified.

### Reuse existing mocks and helpers

- Learning: Unit tests should reuse existing mock services, test state factories, and package helpers before introducing new fixtures.
- Why it matters: Shared mocks keep tests consistent with package conventions and reduce brittle setup.
- Source: Repository testing conventions and current test-agent charter.
- Applies to: `test`, domain agents.
- Status: verified.

### Pair unit and E2E coverage by behavior

- Learning: Use unit tests for focused logic and E2E tests for user-critical VS Code flows. Do not rely only on E2E for small logic branches.
- Why it matters: Unit tests provide fast diagnosis, while E2E tests prove integration and user-visible behavior.
- Source: Current session planning for test-agent coverage.
- Applies to: `test`, `chief-engineer`, `senior-swe-reviewer`.
- Status: verified.

### Conflict resolution must audit test coverage that was picked from either side

- Learning: After resolving merge conflicts in test files, audit whether important branch-specific coverage was accidentally dropped and re-add it in non-conflicting form.
- Why it matters: The codeful/private-preview session had to restore codeful workflow coverage after conflict resolution risked losing tests from one side of the merge.
- Source: Session `1fbf168e-34bd-47b1-8f10-1c29abbcc4b8`, Azure/LogicAppsUX#9142.
- Applies to: `test`, `vscode-test-specialist`, `senior-swe-reviewer`.
- Status: verified.

### Platform-specific binary paths need unit coverage

- Learning: VS Code utility fixes for Node, Functions Core Tools, and Dotnet binary paths should include non-Windows and Windows path coverage when the code branches by platform or install location.
- Why it matters: Azure/LogicAppsUX#9155 added non-Windows binary path coverage after PR review found startup path issues that Windows-only tests would miss.
- Source: Azure/LogicAppsUX#9155.
- Applies to: `test`, `vscode`, `vscode-test-specialist`.
- Status: verified.
