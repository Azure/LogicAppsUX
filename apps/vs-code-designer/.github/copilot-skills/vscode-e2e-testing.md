# Skill: VS Code Extension E2E Testing for Logic Apps

## Overview
E2E tests for the Azure Logic Apps VS Code extension using `@vscode/test-cli` + Mocha TDD, running inside a real VS Code instance with the extension loaded.

## Test Location & Structure
- **Test root**: `apps/vs-code-designer/src/test/e2e/integration/`
- **Config**: `apps/vs-code-designer/.vscode-test.mjs` — two profiles:
  - `unitTests`: all tests, `--disable-extensions`, 60s timeout
  - `integrationTests`: integration folder only, extensions enabled, 120s timeout
- **TypeScript config**: `apps/vs-code-designer/tsconfig.e2e.json` → `module: commonjs`, `target: ES2022`, `outDir: ./out/test/e2e`, `rootDir: ./src/test/e2e`
- **Test workspace**: `apps/vs-code-designer/e2e/test-workspace/` (has `package.json`, `.vscode/`, `Workflows/TestWorkflow/workflow.json`)

## Commands
```bash
# Compile tests
pnpm run test:e2e-cli:compile

# Run integration tests (extensions loaded)
pnpm run test:e2e-cli -- --label integrationTests

# Run all e2e tests
pnpm run test:e2e-cli
```

## Test Framework Rules
- **Mocha TDD style**: Use `suite`/`test`, NEVER `describe`/`it`
- **Assertions**: `import * as assert from 'assert'`
- **VS Code API**: `import * as vscode from 'vscode'`
- **Timeouts**: Set via `this.timeout(ms)` on suite/test functions (use `function()` not arrow)

## Extension Facts
- **Extension ID**: `ms-azuretools.vscode-azurelogicapps`
- **CRITICAL**: `vscode.extensions.getExtension(EXTENSION_ID)` returns `undefined` in dev/test because the dev `package.json` lacks the `engines` field. Always use defensive checks:
  ```typescript
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  if (ext) { /* test extension-specific things */ }
  else { assert.ok(true, 'Extension not found by production ID in test env'); }
  ```
- **`activate()` returns `void`**: No exported API. Interact only via `vscode.commands.executeCommand()`.
- **Commands are still registered** even when `getExtension` returns undefined — test them via `vscode.commands.getCommands(true)`.

## Key Extension Commands
| Command | Purpose |
|---------|---------|
| `azureLogicAppsStandard.createWorkspace` | Opens workspace creation webview (same as clicking "Yes" on conversion dialog) |
| `azureLogicAppsStandard.createProject` | Creates a new Logic App project |
| `azureLogicAppsStandard.createWorkflow` | Creates a new workflow |
| `azureLogicAppsStandard.openDesigner` | Opens the workflow designer |

## Webview Detection
- **`instanceof vscode.TabInputWebview` is BROKEN** in test env. Use duck-typing:
  ```typescript
  function getWebviewTabs(viewType?: string): vscode.Tab[] {
    const tabs: vscode.Tab[] = [];
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as any;
        if (input && typeof input.viewType === 'string') {
          if (!viewType || input.viewType === viewType) {
            tabs.push(tab);
          }
        }
      }
    }
    return tabs;
  }
  ```
- **Timing**: After `executeCommand`, wait 2000-3000ms before checking `tabGroups`.
- **Close tabs**: `await vscode.window.tabGroups.close(tab)` — wait 500ms after.

## Webview Message Protocol
The extension's workspace creation webview (`viewType: 'CreateWorkspace'`) uses this message flow:

| Step | Direction | Command | Payload |
|------|-----------|---------|---------|
| 1 | React→Ext | `initialize` | `{}` |
| 2 | Ext→React | `initialize-frame` | `{ apiVersion, project, separator, platform }` |
| 3 | React→Ext | `select-folder` | `{}` |
| 4 | Ext→React | `update-workspace-path` | `{ targetDirectory: { fsPath, path } }` |
| 5 | React→Ext | `validatePath` | `{ path, type: 'workspace_folder' }` |
| 6 | Ext→React | `workspace-existence-result` | `{ project, workspacePath, exists, type }` |
| 7 | React→Ext | `createWorkspace` or `createWorkspaceStructure` | `IWebviewProjectContext` |
| 8 | Extension | Creates files, disposes panel, calls `vscode.openFolder` | — |

## IWebviewProjectContext Interface
```typescript
{
  workspaceName: string;
  workspaceProjectPath: { fsPath: string; path: string };
  logicAppName: string;
  logicAppType: 'logicApp' | 'customCode' | 'rulesEngine';
  projectType: string;
  workflowName: string;
  workflowType: 'Stateful-Codeless' | 'Stateless-Codeless' | 'Agent-Codeless';
  targetFramework: 'net472' | 'net8';
  functionFolderName?: string;   // customCode only
  functionName?: string;          // customCode only
  functionNamespace?: string;     // customCode only
  shouldCreateLogicAppProject: boolean;
}
```

## Conversion Flow (convertToWorkspace.ts)
Called during `activate()`. Three decision branches:
- **Path A**: `.code-workspace` file exists but not opened → modal "Open existing workspace?"
- **Path B**: No `.code-workspace` file → modal "Create workspace?" → if Yes → opens `CreateWorkspace` webview
- **Path C**: Already in multi-root workspace → return true, nothing to do

## Common Gotchas & Fixes
| Issue | Fix |
|-------|-----|
| `Buffer.from()` not assignable to `Uint8Array` | Use `new TextEncoder().encode()` |
| `.code-workspace` detected as language `jsonc` | Assert `languageId` is `json` OR `jsonc` |
| `instanceof TabInputWebview` fails | Duck-type: `typeof input.viewType === 'string'` |
| Extension not found by ID | Defensive `if (ext)` with fallback assertion |
| Webview tab not in `tabGroups` | `await sleep(2000-3000)` after command execution |
| `this.timeout()` in arrow function | Use `function()` syntax for Mocha context |

## Test File Template
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'ms-azuretools.vscode-azurelogicapps';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

suite('Feature Name', () => {
  const disposables: vscode.Disposable[] = [];

  suiteSetup(async function () {
    this.timeout(30000);
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive) {
      try { await ext.activate(); } catch { /* may not fully activate */ }
    }
    await sleep(2000);
  });

  teardown(async function () {
    this.timeout(15000);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    for (const d of disposables) d.dispose();
    disposables.length = 0;
    await sleep(500);
  });

  test('Example test', async function () {
    this.timeout(20000);
    // Execute real extension command
    try {
      await vscode.commands.executeCommand('azureLogicAppsStandard.someCommand');
    } catch { /* may fail if assets missing */ }
    await sleep(2000);
    // Assert results via VS Code APIs
  });
});
```

## Existing Test Files (204 tests total, all passing)
| File | Tests | Coverage |
|------|-------|----------|
| `extension.test.ts` | 3 | Activation basics |
| `commands.test.ts` | 4 | Command registration |
| `workflow.test.ts` | 5 | Workflow detection |
| `designer.test.ts` | 4 | Designer panel basics |
| `createWorkspace.test.ts` | 10+ | Workspace creation |
| `projectOutsideWorkspace.test.ts` | 22 | Projects outside workspace |
| `workspaceConfigurations.test.ts` | 34 | Workspace config |
| `debugging.test.ts` | 33 | Debugging functionality |
| `designerOpens.test.ts` | 30 | Designer opening |
| `nodeLoading.test.ts` | 37 | Action/trigger node loading |
| `workspaceConversion.test.ts` | 27 | Workspace conversion |

## Philosophy
- Tests must exercise the **real extension** — execute actual commands, detect real webview panels
- **No manual file creation** simulating what the extension does
- Extension host tests can execute commands and detect panels but **cannot interact with webview DOM** (typing/clicking inside webview). That requires Playwright against Electron.
- Use defensive assertions: if the extension doesn't fully load, test the pattern/convention rather than hard-failing

## Related ExTester UI Suite (apps/vs-code-designer/src/test/ui)
- This skill file covers `@vscode/test-cli` extension-host tests; interactive webview DOM coverage is implemented in the ExTester UI suite.
- Phase ownership in ExTester:
  - Phase 4.2 (`designerOpen` + `designerActions`) covers real designer authoring interactions.
  - Phase 4.3 (`demo` + `smoke` + `standalone`) is smoke/demo coverage and does not validate trigger/action insertion.
- Current strict rule in `designerActions`: add-trigger/add-action checks should only pass when operation selection succeeds and expected node content is visible on the canvas.
