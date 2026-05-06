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
| `apps/Standalone/src/` | designer-core | Dev test harness |
| `e2e/` | test | Playwright E2E tests |
| `**/__test__/` | test | Unit test directories (advisory) |
