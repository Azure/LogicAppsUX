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

## Development model

`src/App.tsx` owns route registration and lazy-loads each experience with its Redux store. `src/designer/app/DesignerShell` configures the designer host and its environment-specific services. Changes to workspace libraries are picked up by Vite during local development.

Use browser DevTools together with Redux DevTools and React Query DevTools to inspect state and service requests. Playwright tests that exercise this host live under the repository-level `e2e` directory.
