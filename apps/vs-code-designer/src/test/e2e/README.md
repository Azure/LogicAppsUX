# VS Code Extension E2E Tests (CLI-based)

This directory contains extension-host smoke tests for the Logic Apps VS Code extension using the official `@vscode/test-cli` framework.

## Overview

These tests follow the pattern from [helloworld-test-cli-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample) and run directly inside VS Code's extension host environment on latest stable VS Code. They intentionally start from an empty VS Code window with no folder or `.code-workspace` loaded, then cover activation, command registration, Create Workspace, and a focused generated-workspace designer/runtime lifecycle. Keep ExTester webview DOM scenarios in `src/test/ui/` for deeper designer and wizard UI coverage.

## Test Structure

```
src/test/e2e/
├── extension.test.ts       # Basic extension activation tests
├── commands.test.ts        # Command registration and execution tests
├── createWorkspace.test.ts # Latest-VS Code Create Workspace webview behavior, matrix, and artifact checks
├── workspaceLifecycle.test.ts # Generated workspace designer open + runtime execution smoke
├── runTest.ts              # Test runner entry point
└── integration/            # Legacy prototypes; not wired into the default CLI baseline
```

## Running Tests

Run these commands from the repository root unless a section says otherwise.

### Open latest stable VS Code and see extension activation
```powershell
pnpm run test:e2e-cli:open
```

Use this when you want to visually confirm the extension is loading and activating in a latest stable VS Code instance. The command builds the extension into `apps/vs-code-designer/dist`, downloads or reuses latest stable VS Code, installs extension dependencies into an isolated test profile, opens an empty VS Code window in a fresh profile for each run, and leaves the VS Code window running.

In the opened VS Code window, confirm no folder or workspace is loaded, then run **Developer: Show Running Extensions** and confirm **Azure Logic Apps (Standard)** is active and loaded from `apps/vs-code-designer/dist`. Run **Extensions: Show Installed Extensions** to confirm the manifest dependencies are installed in the isolated profile. You can also search the Command Palette for **Azure Logic Apps** commands, such as **Create new project...**. The window uses the same test environment variables as the automated smoke: `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`.

### Run the activation and command-registration smoke
```powershell
pnpm run test:e2e-cli
```

This is the default quick check for this suite. It builds the VS Code extension into `apps/vs-code-designer/dist`, builds the VS Code React webview bundle into `dist/vs-code-react`, compiles the CLI test files, launches latest stable VS Code without a startup folder/workspace, verifies the Logic Apps extension is loaded from the development `dist` folder, verifies its manifest dependencies are visible to VS Code, activates the extension, verifies core Logic Apps commands are registered, and opens the Create Workspace webview from the empty window.

The smoke prints explicit `[activation-smoke]` lines with the VS Code version, extension development path, dependency extension IDs and versions, and activation completion. It keeps the VS Code test window visible briefly before closing so the launch is observable during local runs. When the VS Code test window is visible, the smoke also writes the same lines to the **Logic Apps @vscode/test-cli Smoke** output channel.

The smoke also scans VS Code output for setup warnings that indicate an invalid extension-host baseline. `DialogService: refused to show dialog` and any guarded `showInformationMessage` / `showWarningMessage` / `showErrorMessage` call fail the run instead of being ignored.

Screenshots are saved under `apps/vs-code-designer/.vscode-test/screenshots/cli/` on Windows.

The activation/command-only smoke alias skips the Create Workspace webview check:

```powershell
pnpm run test:e2e-cli:smoke
```

### Run Create Workspace checks
```powershell
pnpm run test:e2e-cli:create-workspace
```

This launches latest stable VS Code without a startup folder/workspace, asserts the window is still empty before the command runs, executes `azureLogicAppsStandard.createWorkspace`, verifies VS Code opens a `mainThreadWebview-CreateWorkspace` tab titled **Create workspace**, and drives the real rendered webview through Chrome DevTools Protocol. The default target mirrors the high-value ExTester Create Workspace validation and core artifact categories for:

- workspace parent folder path validation and Standard required-field progression gating;
- workspace, logic app, and workflow name format validation, including reserved workflow names;
- Standard workflow type selection, review-step echoing, and final Next-button enablement;
- custom-code folder, namespace, function name, and .NET version gating;
- rules-engine folder, namespace, and function name gating;
- initial-render/content assertions, including available workflow type options;
- actual workspace creation for core Standard, custom-code, and rules-engine projects.

It captures screenshots for representative initial, valid-form, review, scrolled form, and created-workspace states. After clicking **Create workspace**, it verifies durable disk artifacts such as the `.code-workspace` file, generated logic app folder, workflow JSON, function project files, rules-engine artifacts, and the stable essentials in generated `.vscode/settings.json`, `extensions.json`, `tasks.json`, and `launch.json`. These checks intentionally assert durable contract-level details (extension recommendations, Logic Apps local-project settings, debug configuration type/name/request, and task labels/dependency shape) rather than byte-for-byte layout.

Focused Create Workspace slices are available when you need broader parity without running the whole suite:

```powershell
pnpm run test:e2e-cli:create-workspace:behavior
pnpm run test:e2e-cli:create-workspace:core-matrix
pnpm run test:e2e-cli:create-workspace:preview-matrix
pnpm run test:e2e-cli:create-workspace:codeful
pnpm run test:e2e-cli:create-workspace:fixtures
pnpm run test:e2e-cli:create-workspace:full
```

The behavior target verifies initial render/content, Standard required-field progression, workflow type review/back preservation, and app-type cleanup. The core matrix covers Standard, custom-code, and rules-engine creation for Stateful/Stateless variants. The preview matrix covers Autonomous agents and Conversational agents across Standard/custom-code/rules-engine artifact generation, including deterministic workflow `kind`, Standard agent action/trigger shape, and custom-code/rules-engine starter function action names. Custom-code and rules-engine preview selections currently reuse their function/rules starter workflow templates; the stable preview distinction there is the generated workflow `kind`. The codeful target covers the current/modern codeful template plus the legacy-control `.csproj` target shape used by ExTester Phase 4.10: both cases create through the same `Logic app (codeful)` product radio, then the legacy-control case patches only the generated `.csproj` target hooks to `AfterTargets="Publish"` because latest stable VS Code exposes no separate legacy-control picker. Both cases verify `.csproj`, workflow `.cs`, `Program.cs`, `host.json`, `local.settings.json`, and stable codeful `.vscode` settings/tasks/launch essentials while asserting no codeless `workflow.json` is generated. ExTester remains the owner for legacy/modern codeful runtime-task semantics.

The fixtures target is a focused Create Workspace parity mode for the `@vscode/test-cli` harness. It creates the four downstream fixture shapes through the real wizard — Standard Stateful, Standard Stateless, CustomCode Stateful, and RulesEngine Stateful — and writes a downstream-compatible manifest to `%TEMP%\la-e2e-test\created-workspaces.json` (or `os.tmpdir()/la-e2e-test/created-workspaces.json` on non-Windows). The manifest shape intentionally matches `src/test/ui/workspaceManifest.ts` so consumers can read `wsDir`, `wsFilePath`, `appDir`, `wfDir`, `appType`, and `wfType` the same way they read ExTester fixtures. The mode preserves the generated workspace directories because the manifest points at absolute paths.

This CLI fixture mode does not replace or remove ExTester coverage. `run-e2e.js` downstream ExTester phases continue to treat `p41a-fixtures` as their canonical fixture owner; use this CLI target when you specifically need latest-stable `@vscode/test-cli` Create Workspace parity or a local manifest produced by the CLI harness.

The full Create Workspace script intentionally runs the focused labels in separate VS Code hosts instead of one very long webview session, which keeps dropdown/popover state isolated and matches the lifecycle suite's fresh-process pattern.

### CI coverage

`.github/workflows/vscode-e2e.yml` runs the focused Create Workspace labels in a dedicated `vscode-e2e-cli-create-workspace` matrix:

- `createWorkspaceBehavior`
- `createWorkspaceCoreMatrix`
- `createWorkspacePreviewMatrix`
- `createWorkspaceCodeful`

`createWorkspaceFixturesManifest` is intentionally a focused/manual fixture producer for now; ExTester `p41a-fixtures` remains the fixture-backed downstream owner in the `run-e2e.js` matrix.

This job is additive to the existing ExTester matrix; it does not replace `src/test/ui/` coverage. The generated workspace designer/runtime lifecycle remains manual for now because it exercises designer open, .NET build, Azurite/runtime startup, trigger execution, and Overview verification, making it substantially higher-cost and higher-flake than the focused Create Workspace parity checks.

### Run generated workspace designer/runtime lifecycle
```powershell
pnpm run test:e2e-cli:workspace-lifecycle
```

This launches latest stable VS Code from an empty window, creates Standard, custom-code, and rules-engine workspaces through the real Create Workspace webview, opens the generated folders in fresh test hosts, opens the local designer, and captures screenshots at the important creation/designer/debug/overview stages. The Standard lifecycle adds the built-in Request trigger and Response action through the designer UI, saves the workflow, starts the generated Logic Apps debug configuration, opens Overview, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

The custom-code and rules-engine lifecycles use the workflows generated by Create Workspace. Before debug, the test explicitly builds the sibling generated .NET function project with `dotnet build` so the runtime has `lib\custom\<functionName>\function.json` metadata even though the test host starts from only the Logic App folder. It then opens designer, saves, starts debug, opens Overview, waits for the Run trigger and callback URL to become ready, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

This smoke proves the latest-VS Code extension host can load generated projects, hydrate designer webviews, start the product-managed Azurite/runtime path, and execute saved workflows. It deliberately keeps the broader webview DOM authoring flows in ExTester.

To keep that Create Workspace window visible longer while debugging locally:

```powershell
pnpm run test:e2e-cli:show-create-workspace
```

That runs the same Create Workspace smoke and keeps VS Code open for 60 seconds before the test host exits.

### Run tests with a specific label
```powershell
pnpm run test:e2e-cli --label unitTests
pnpm run test:e2e-cli --label createWorkspace
pnpm run test:e2e-cli --label createWorkspaceBehavior
pnpm run test:e2e-cli --label createWorkspaceCoreMatrix
pnpm run test:e2e-cli --label createWorkspacePreviewMatrix
pnpm run test:e2e-cli --label createWorkspaceCodeful
pnpm run test:e2e-cli --label createWorkspaceFixturesManifest
pnpm run test:e2e-cli --label workspaceLifecycle
```

### Compile tests only (without running)
```powershell
pnpm run test:e2e-cli:compile
```

### Package-local commands

If your terminal is already in `apps/vs-code-designer`, run the same scripts without the root forwarding:

```powershell
pnpm run test:e2e-cli:smoke
pnpm run test:e2e-cli:create-workspace
pnpm run test:e2e-cli:create-workspace:behavior
pnpm run test:e2e-cli:create-workspace:core-matrix
pnpm run test:e2e-cli:create-workspace:preview-matrix
pnpm run test:e2e-cli:create-workspace:codeful
pnpm run test:e2e-cli:create-workspace:fixtures
pnpm run test:e2e-cli:create-workspace:full
pnpm run test:e2e-cli:workspace-lifecycle
pnpm run test:e2e-cli:show-create-workspace
pnpm run test:e2e-cli:open
pnpm run test:e2e-cli --label unitTests
pnpm run test:e2e-cli --label createWorkspace
pnpm run test:e2e-cli:compile
```

## Configuration

The test configuration is in [.vscode-test.mjs](../../.vscode-test.mjs):

- **unitTests**: extension activation and command-registration smoke tests
- **createWorkspace**: default Create Workspace validation plus core creation smoke
- **createWorkspaceBehavior**: initial render/content, review/back, and app-type cleanup checks
- **createWorkspaceCoreMatrix**: Standard/custom-code/rules-engine Stateful and Stateless artifact creation
- **createWorkspacePreviewMatrix**: Autonomous agents and Conversational agents artifact creation across app types
- **createWorkspaceCodeful**: current/modern and legacy-control codeful artifact creation
- **createWorkspaceFixturesManifest**: creates Standard Stateful, Standard Stateless, CustomCode Stateful, and RulesEngine Stateful fixtures and writes the ExTester-compatible `created-workspaces.json` manifest
- **workspaceLifecycle**: generated-workspace designer open and runtime execution smoke for Standard, custom-code, and rules-engine projects

The config builds from `dist/`, sets `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`, lets `@vscode/test-cli` install extension dependencies into its managed test profile, does not pass a startup workspace folder, and uses an isolated user-data directory. On non-Windows agents it uses a short temp user-data path to avoid Unix socket path-length issues.

The legacy files under `src/test/e2e/integration/` are not part of this baseline. Some of them open designer webviews or exercise workspace-conversion UI without the ExTester harness, which can produce errors such as missing `dist/vs-code-react/index.html` or refused dialogs in extension-host tests.

## Test Development

### Using VS Code Extension Test Runner

1. Install the [VS Code Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner) extension
2. Open the Test Explorer view
3. Run individual tests or test suites from the UI

### Writing New Tests

Tests use Mocha's BDD interface (`suite`, `test`) with Node.js assertions:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
  test('My test case', async () => {
    // Access VS Code API
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.length > 0);
  });
});
```

## Startup Workspace

These CLI tests intentionally start with no folder and no `.code-workspace` loaded. Do not add `e2e/test-workspace` or another prebuilt project as the default startup resource for this baseline; the first project/workspace entry point under test is the Create Workspace command.

## Differences from vscode-extension-tester

The existing `src/test/ui/` tests use `vscode-extension-tester` which:
- Uses Selenium WebDriver to control VS Code UI
- Good for visual/UI testing
- Slower but more comprehensive UI interaction

These CLI-based tests:
- Run directly in VS Code's extension host
- Faster execution
- Better for API-level testing
- Easier to debug
- Provide focused Chrome DevTools Protocol coverage for Create Workspace, designer, and Overview smoke paths
- Do not replace ExTester; keep ExTester for full designer and wizard DOM flows
