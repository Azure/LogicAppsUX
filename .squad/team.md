# Team — LogicAppsUX

## Project

**LogicAppsUX** — Azure Logic Apps UX monorepo. Powers the visual workflow designer across Azure Portal, VS Code, Power Automate, and standalone environments.

## Stack

TypeScript · React 18 · Redux Toolkit · Fluent UI v8/v9 · ReactFlow (XY Flow) · Monaco Editor · Vite · tsup · Vitest · Playwright · PNPM workspaces · Turborepo

## Agents

| Agent | Role | Charter |
|-------|------|---------|
| **designer-core** | State & Logic Specialist | [charter](agents/designer-core/charter.md) |
| **designer-ui** | UI & Interaction Specialist | [charter](agents/designer-ui/charter.md) |
| **shared-services** | Foundation & Services Specialist | [charter](agents/shared-services/charter.md) |
| **data-mapper** | Data Mapper Specialist | [charter](agents/data-mapper/charter.md) |
| **vscode** | VS Code Extension Specialist | [charter](agents/vscode/charter.md) |
| **test** | Test Specialist | [charter](agents/test/charter.md) |
| **vscode-test-specialist** | VS Code Unit and ExTester E2E Specialist | [charter](agents/vscode-test-specialist/charter.md) |
| **customer-repro-tester** | Customer-Facing Issue Reproduction Specialist | [charter](agents/customer-repro-tester/charter.md) |
| **chief-engineer** | Central User-Facing Orchestrator | [charter](agents/chief-engineer/charter.md) |
| **pr-orchestrator** | End-to-End PR Lifecycle Coordinator | [charter](agents/pr-orchestrator/charter.md) |
| **pr-comment-triage** | PR Review Feedback Analyst | [charter](agents/pr-comment-triage/charter.md) |
| **plan-auditor** | Plan and Progress Auditor | [charter](agents/plan-auditor/charter.md) |
| **review-critic** | Independent Design and Implementation Reviewer | [charter](agents/review-critic/charter.md) |
| **ci-sentinel** | GitHub CI Monitor and Failure Iterator | [charter](agents/ci-sentinel/charter.md) |
| **release-scribe** | PR Body and Reviewer-Facing Summary Writer | [charter](agents/release-scribe/charter.md) |
| **senior-swe-planner** | Model-Diverse Pre-Implementation Plan Reviewer | [charter](agents/senior-swe-planner/charter.md) |
| **senior-swe-critic** | Model-Diverse Design and Risk Critic | [charter](agents/senior-swe-critic/charter.md) |
| **senior-swe-reviewer** | Model-Diverse Implemented-Plan and Diff Reviewer | [charter](agents/senior-swe-reviewer/charter.md) |
| **senior-swe-adjudicator** | Model-Diverse Review Conflict Resolver | [charter](agents/senior-swe-adjudicator/charter.md) |
| **session-knowledge-curator** | Cross-Session Learning Extractor and Curator | [charter](agents/session-knowledge-curator/charter.md) |

## Key Directories

| Path | Primary Agent | Notes |
|------|--------------|-------|
| `libs/designer/src/lib/core/` | designer-core | Redux state, actions, parsers, serializer |
| `libs/designer-v2/src/lib/core/` | designer-core | Next-gen designer state & logic |
| `libs/designer/src/lib/ui/` | designer-ui | Panels, settings, monitoring |
| `libs/designer-v2/src/lib/ui/` | designer-ui | Next-gen designer UI components |
| `libs/designer-ui/src/` | designer-ui | Stateless shared UI components |
| `libs/logic-apps-shared/src/` | shared-services | Service interfaces, types, utils |
| `libs/data-mapper-v2/src/` | data-mapper | Current data mapper |
| `libs/data-mapper/src/` | data-mapper | Legacy data mapper |
| `libs/a2a-core/src/` | data-mapper | A2A protocol SDK (secondary) |
| `libs/chatbot/src/` | data-mapper | Chatbot integration (secondary) |
| `apps/iframe-app/src/` | data-mapper | Chat iframe app (secondary) |
| `libs/vscode-extension/src/` | vscode | Extension shared utilities |
| `apps/vs-code-designer/` | vscode | Extension host |
| `apps/vs-code-react/` | vscode | Extension webviews |
| `apps/vs-code-designer/src/test/ui/` | test | VS Code ExTester UI E2E tests; `vscode-test-specialist` for focused ownership |
| `apps/Standalone/src/` | designer-core | Dev test harness |
| `e2e/` | test | Playwright E2E tests |
| `**/__test__/` | test | Unit test directories (advisory) |

## Lifecycle Ownership

| Work type | Primary Agent | Notes |
|-----------|---------------|-------|
| Central task ownership and subagent orchestration | chief-engineer | Default entry point for complex work |
| PR comment triage and reviewer thread summaries | pr-comment-triage | Uses `gh` and GraphQL review threads |
| End-to-end PR execution | pr-orchestrator | Coordinates domain agents, plan, validation, push, and CI loops |
| Plan/todo progress audits | plan-auditor | Keeps `plan.md`, SQL todos, git state, and validation evidence aligned |
| Independent plan/diff critique | review-critic | Use before non-trivial implementation or risky pushes |
| Push and CI failure iteration | ci-sentinel | Watches checks, reads logs/artifacts, creates follow-up fix tasks |
| PR body updates and final summaries | release-scribe | Maintains reviewer-facing status, test plan, and comment resolution text |
| Test strategy and coverage review | test | Chooses unit/E2E coverage, validates test quality, and reviews coverage gaps |
| VS Code unit and ExTester E2E tests | vscode-test-specialist | Reads `SKILL.md`, follows `run-e2e.js`, and validates with targeted E2E modes |
| Customer-facing issue reproduction | customer-repro-tester | Sanitizes artifacts, reconstructs environments, chooses repro method, and recommends regression tests |
| Senior plan review | senior-swe-planner | Use strongest long-context planning model available |
| Senior design/risk critique | senior-swe-critic | Use a different strong reasoning model or model family when available |
| Senior implemented-diff review | senior-swe-reviewer | Use a code-focused model when available |
| Senior finding adjudication | senior-swe-adjudicator | Use only when review findings conflict |
| Cross-session learning extraction | session-knowledge-curator | Updates curated `.squad/knowledge/` files and recommends durable memory facts |
