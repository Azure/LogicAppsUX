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

## Extract selected actions (local only)

Open `/v2?extraction=true&local=ExtractSelection.json` on the running development server. The **Extract Selection** fixture uses a Standard workflow. Ctrl-click (Cmd-click on macOS) **Build message** and **Build result**, then right-click either selected action and choose **Extract to new workflow**. Two selected actions retain their side-by-side details. Selecting **Read customer** as well opens the larger multi-select panel, where **Extract** sits alongside Cut, Copy, Group, and Delete.

The compact, single-column dialog places the workflow name above a 320px-high, pan/zoom-only child workflow preview. The preview has a 1px border, 4px corners, and a muted floating label. Input/output bindings appear in a collapsed section below the preview, omitted when there are no bindings. The preview uses the reusable `WorkflowPreview` component from `@microsoft/designer-ui` and shares the V2 designer's card styling, with its own React Flow viewport and no action/edge editing or shared designer state. Confirmation saves the child and rewritten source together in browser storage, replacing the selected actions with a workflow invocation. The child uses Request/Response actions, and the completion link opens its editable workflow. Both saved documents and their dynamic-content schemas survive reload.

Binding names identify their source action or trigger, such as `input_Read_customer`, `output_Build_result`, or `input_Request`. Spaces and punctuation become underscores, and numeric suffixes distinguish colliding names. Repeated references to the same data root share a binding. This naming applies to new extractions; existing saved workflows keep their original bindings.

The initial workflow name is the first available choice among `Extracted_workflow`, `Extracted_workflow_1`, `Extracted_workflow_2`, and so on, checking existing names case-insensitively. Manually entered names and names at save time still undergo collision validation. Empty input/output sections are hidden independently; nonempty sections show only the original expression and its replacement, where the binding name is already visible.

Extraction is action-type independent: data operations, HTTP, connector actions, and other ordinary action definitions keep their settings and metadata. Entire selected control-flow containers move with their nested actions. The preview uses the selected actions' existing connector icons and colors; containers appear as single cards. Referenced workflow parameters, connection references, and static results are carried into the child without resolving app-setting expressions or creating new connections. Connector metadata must be available to the local designer before saving.

Open `/v2?extraction=true&local=ExtractActions.json` for a mixed-action example: Initialize variable, Parse JSON, Filter array, HTTP, and a downstream consumer. Extract **Filter array** and **HTTP** to see incoming variable and Parse JSON bindings, distinct `body()`/`outputs()` return values, and preserved chunking/retry settings. Selecting the first four actions instead keeps the variable declaration inside the child.

Eligibility is based on dependencies, not a built-in action allowlist. Selections must still form a connected top-level linear region with success-only boundaries. Shared variable writes, escaping variable declarations, partial nested selections, ambiguous loop/conditional output values, secure/binary data transport, and opaque execution-context references are rejected with specific explanations. Existing Response and Terminate actions cannot move because that would change the caller they respond to or the workflow they stop. A child always gets its own generated Request and Response. Schemas are inferred where known; unknown output shapes remain untyped rather than being guessed.

This opt-in is unavailable for Consumption workflows. Storage is local to the browser origin: nothing is deployed, published, or run in Azure, and cloud invocation semantics are not established by this prototype. Use synthetic data only; literal credentials and secure parameter values cannot be persisted. Managed identity and unresolved credential references are preserved. Undo/Redo changes the current source editor without deleting the saved child or rolling back browser storage.

Browser regression coverage is in `e2e/designer/extractSelection.spec.ts`.

## Development model

`src/App.tsx` owns route registration and lazy-loads each experience with its Redux store. `src/designer/app/DesignerShell` configures the designer host and its environment-specific services. Changes to workspace libraries are picked up by Vite during local development.

Use browser DevTools together with Redux DevTools and React Query DevTools to inspect state and service requests. Playwright tests that exercise this host live under the repository-level `e2e` directory.
