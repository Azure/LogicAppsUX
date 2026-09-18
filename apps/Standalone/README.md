# Logic Apps UX Standalone

The Standalone app is the Vite development host for the Logic Apps designers, data mappers, template experiences, MCP tools, and VS Code webview previews. It provides a fast local shell for developing workspace libraries without loading them through Azure Portal or the VS Code extension host.

## Run locally

From the repository root:

```bash
pnpm install
pnpm --filter standalone dev
```

Open [http://localhost:4200](http://localhost:4200). Running `pnpm run start` from the repository root also starts the Standalone app as part of the workspace development tasks.

To develop against Azure Resource Manager, run `pnpm run start:arm` from the repository root. The command generates an ARM token before starting the development tasks.

For local-only PR deployments triggered by the `ephemeral` label, see [PR preview setup and lifecycle](EPHEMERAL.md).

## Commands

| Command | Run from | Description |
|---|---|---|
| `pnpm --filter standalone dev` | Repository root | Start the Vite development server |
| `pnpm --filter standalone build` | Repository root | Create a production build |
| `pnpm --filter standalone preview` | Repository root | Preview the production build |
| `pnpm --filter standalone lint` | Repository root | Lint the Standalone workspace |
| `pnpm --filter standalone e2e` | Repository root | Start the E2E-configured development server |
| `pnpm run test:e2e` | Repository root | Run Playwright end-to-end tests |
| `pnpm run test:e2e:ui` | Repository root | Open the Playwright test UI |

## Routes

| Route | Experience |
|---|---|
| `/` | Production designer development shell |
| `/v2` | Designer v2 development shell |
| `/datamapperv1` | Legacy data mapper |
| `/datamapperv2` | Current data mapper |
| `/templates` | Template gallery |
| `/configuretemplate` | Template configuration |
| `/mcp` | MCP experience |
| `/mcpserver` | MCP server experience |
| `/knowledge` | Knowledge hub |
| `/clonetostandard` | Clone-to-Standard experience |
| `/vscode/*` | VS Code webview previews |

Unknown routes fall back to the production designer development shell.

## Designer v2 keyboard navigation

In designer v2 (`/v2`), click a card on the canvas and use
**Ctrl/Cmd + Down** to select the next action or trigger, or **Ctrl/Cmd + Up**
to select the previous one. Selection follows the existing tab order, including
scope cards and nested actions, rather than recalculating graph connections.
Edges, add buttons, notes, and collapsed content are skipped.

Navigation stops at the first and last nodes. With no current selection, Down
starts at the first node and Up at the last. The selected card receives focus
and is brought into view, including off-screen cards. Selection uses the usual
operation-panel behavior and remains available in read-only and monitoring views.
The shortcuts also work while a non-editing control in the selected node's
details panel has focus, including the Close button focused after clicking a card.
They do not override typing in form fields or content-editable controls, or handle
keys from pinned panels, other designers, dialogs, or menus.

The operation details panel retains your selected tab when you click or navigate
to another node. If that node does not offer the tab, its first available tab is
shown instead; your preferred tab is restored on the next node that supports it.

The legacy designer (`/`) does not enable these shortcuts or retain the selected
details tab across node selections. Its existing keyboard and panel behavior is unchanged.

## Development model

`src/App.tsx` owns route registration and lazy-loads each experience with its Redux store. `src/designer/app/DesignerShell` configures the designer host and its environment-specific services. Changes to workspace libraries are picked up by Vite during local development.

Use browser DevTools together with Redux DevTools and React Query DevTools to inspect state and service requests. Playwright tests that exercise this host live under the repository-level `e2e` directory.
