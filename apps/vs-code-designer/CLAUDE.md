# VS Code Designer Extension

The VS Code extension host for Azure Logic Apps. This is the main extension that gets published to the VS Code marketplace.

## Purpose

- **VS Code extension entry point** - Activates and manages the extension lifecycle
- **Command registration** - Provides Logic Apps commands in VS Code
- **Webview hosting** - Launches React-based designer panels
- **Azure integration** - Connects to Azure services for workflow management
- **File system operations** - Handles local Logic Apps projects

## Commands

```bash
pnpm run build:extension         # Build extension
pnpm run vscode:designer:pack    # Package .vsix file
pnpm run test:extension-unit     # Run unit tests
pnpm run vscode:designer:e2e:ui  # E2E tests with UI
```

## Structure

```
/src
  /app           - Extension activation and commands
  /commands      - VS Code command implementations
  /designers     - Webview panel management
  /services      - Azure service implementations
  /utils         - Helper utilities
/dist            - Build output and packaged extension
```

## Key Components

### Extension Activation (`src/app/`)
- `extension.ts` - Main activation entry point
- Registers commands, tree views, and webview providers

### Command Handlers (`src/commands/`)
- Workflow CRUD operations
- Connection management
- Deployment commands
- Debug and run commands

### Designers (`src/designers/`)
- `DesignerPanel` - Main workflow designer webview
- `DataMapperPanel` - Data transformation webview
- Panel state management and messaging

### Azure Services
- ARM API clients for Logic Apps resources
- Storage account integration
- App Service deployment

## Webview Communication

Extension ↔ Webview messaging:
```typescript
// Extension sends to webview
panel.webview.postMessage({ type: 'WORKFLOW_LOADED', data: workflow })

// Webview sends to extension (via vscode-extension lib)
vscode.postMessage({ type: 'SAVE_WORKFLOW', data: workflow })
```

## Extension Packaging

The extension is packaged with dependencies:
1. Build: `pnpm run build:extension`
2. Copy files: Runs `extension-copy-svgs.js`
3. Install deps: `cd dist && npm install`
4. Package: `vsce package`

## Testing

### Unit Tests
```bash
pnpm run test:extension-unit
```

### E2E Tests (vscode-extension-tester)
```bash
pnpm run vscode:designer:e2e:ui      # With UI
pnpm run vscode:designer:e2e:headless # Headless
```

#### Phase 4.2 Designer Tests (2 tests, ~5 min)
The primary E2E tests are in `src/test/ui/designerActions.test.ts` (~2647 lines). They cover the complete workflow lifecycle:
- **Test 1 (Standard)**: Open designer → add Request trigger + Response action → save → debug → open overview → run trigger → verify all nodes succeeded
- **Test 2 (CustomCode)**: Open designer → add Compose action + fill inputs → save → debug → open overview → run trigger → verify Running → Succeeded transition → verify all nodes succeeded

Run Phase 4.2 only (requires workspaces from a prior Phase 4.1 run):
```bash
cd apps/vs-code-designer
npx tsup --config tsup.e2e.test.config.ts
$env:E2E_MODE = "designeronly"
node src/test/ui/run-e2e.js
```

Key files: `designerActions.test.ts`, `run-e2e.js`, `SKILL.md` (detailed learning document)

## Configuration

### `package.json` (Extension Manifest)
Defines:
- Commands and keybindings
- View containers and tree views
- Configuration settings
- Activation events

## Dependencies

- `@microsoft/vscode-extension-logic-apps` - Shared VS Code utilities
- `@microsoft/logic-apps-shared` - Common Logic Apps utilities
- Azure SDK packages for resource management
- VS Code extension APIs

## Development Tips

1. **Debugging**: Use VS Code's "Run Extension" launch config
2. **Reload**: Use "Developer: Reload Window" after changes
3. **Logs**: Check "Output" panel → "Azure Logic Apps"
4. **Webview DevTools**: Command Palette → "Open Webview Developer Tools"

## ExTester E2E Test Knowledge Base

**Full reference**: See `src/test/ui/SKILL.md` for the complete learning document (700+ lines).

### Phase Structure

Each test runs in its own fresh VS Code session to avoid workspace-switch contention:

| Phase | Test File | What It Tests |
|---|---|---|
| 4.1 | createWorkspace.test.ts | Workspace creation wizard (12 types) |
| 4.2 | designerActions.test.ts | Standard + CustomCode designer lifecycle |
| 4.3 | inlineJavascript.test.ts | Execute JavaScript Code action (ADO #10109800) |
| 4.4 | statelessVariables.test.ts | Initialize Variable action (ADO #10109878) |
| 4.5 | designerViewExtended.test.ts | Parallel branches + run-after (ADO #10109401) |
| 4.6 | keyboardNavigation.test.ts | Ctrl+Up/Down navigation (ADO #10273324) |
| 4.7 | dataMapper.test.ts, demo, smoke, standalone | Data Mapper + generic tests |

### Shared Helper Modules

| Module | Purpose |
|---|---|
| `helpers.ts` | General utilities: sleep, screenshots, dialog dismissal, activity bar |
| `designerHelpers.ts` | Designer interaction: open designer, canvas ops, search, save |
| `runHelpers.ts` | Debug/run cycle: start debugging, overview page, run trigger, verify |
| `workspaceManifest.ts` | Workspace manifest types and I/O |

### Critical Rules for Writing New E2E Tests

1. **Close all editors before opening overview**: Call `result.webview.switchBack()` → `driver.switchTo().defaultContent()` → `new EditorView().closeAllEditors()` → `sleep(2000)` before starting debug. Otherwise `switchToOverviewWebview()` enters the designer iframe instead of the overview iframe.

2. **Use `findLastAddActionElement()` for second+ actions**: `findAddActionElement()` returns the first `+` button which inserts between trigger and first action. Use `findLastAddActionElement()` to append at the end of the flow.

3. **Stateless workflows don't persist run history**: Don't use Stateless workspaces for tests that verify runs in the overview page. Use Stateful.

4. **Parameter panels use contenteditable editors**: The designer doesn't use standard `<label>` + `<input>` pairs. Use `[contenteditable="true"].editor-input` selectors and index-based targeting. Click the node first with `openNodeSettingsPanel()` to ensure the panel is open.

5. **Each test needs its own phase**: Tests sharing a VS Code session fail due to lingering processes, webview iframes in DOM, and extension host instability after workspace switches.

6. **Use Selenium Actions API for React clicks**: `driver.actions().move({ origin: element }).click().perform()` — direct `.click()` doesn't trigger React event handlers in webview iframes.

7. **Command palette needs retries**: `executeOpenDesignerCommand()` retries 5 times because the extension needs time to re-register commands after workspace switching.

8. **Multiple webview iframes: use `switchToActiveDesignerFrame()`**: ExTester's `new WebView().switchToFrame()` always enters the FIRST iframe — wrong when multiple designers are open. Use raw Selenium `driver.switchTo().frame(element)` with polling to find the visible iframe.

9. **Designer tabs vs. file tabs — match on "(Workspace)"**: `activateDesignerTab()` must match tabs containing BOTH the workflow name AND "Workspace" to avoid clicking the `workflow.json` text editor tab instead of the designer panel.

10. **Right-click the correct `workflow.json`**: Use `VSBrowser.instance.openResources(absolutePath)` to reveal the file in Explorer first, then right-click the selected row.

11. **Only use built-in operations (Request, Response) for reliable tests**: Connector operations (Compose) may not appear if the design-time API hasn't loaded the catalog.

12. **Always run tests automatically after creating or modifying them**: After writing or editing any test file, immediately: lint (`npx biome check --write`), build (`npx tsup`), and run (`node src/test/ui/run-e2e.js`) — don't wait for the user to ask. Report pass/fail results with any failure details.

### Running Tests

```bash
cd apps/vs-code-designer
npx tsup --config tsup.e2e.test.config.ts   # Compile

# Run modes:
$env:E2E_MODE = "full"           # All phases (4.1-4.7)
$env:E2E_MODE = "createonly"     # Phase 4.1 only
$env:E2E_MODE = "designeronly"   # Phase 4.2 only
$env:E2E_MODE = "newtestsonly"   # Phases 4.3-4.6 only
node src/test/ui/run-e2e.js
```

### Mandatory: Lint and Format After Every Edit

**ALWAYS** run these commands after editing any file, before committing:

```bash
# From repo root:
npx biome check --write <files>   # Format + safe lint fixes (NEVER use --unsafe)
npx tsup --config tsup.e2e.test.config.ts  # Verify compilation
```

Do NOT use `--unsafe` with Biome. If Biome reports errors that require `--unsafe`, fix them manually instead.
Common Biome rules to follow when writing code:
- Use string literals (`'text'`) instead of template literals (`` `text` ``) when there are no interpolations
- Avoid unnecessary `catch` bindings — use `catch {` not `catch (e) {` when `e` is unused
- Keep imports organized and remove unused imports
- Always use block statements with braces — `if (x) { break; }` not `if (x) break;`
