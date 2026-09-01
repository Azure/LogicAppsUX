# VS Code Extension E2E Tests (CLI-based)

This directory contains extension-host smoke tests for the Logic Apps VS Code extension using the official `@vscode/test-cli` framework.

## Overview

These tests follow the pattern from [helloworld-test-cli-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample) and run directly inside VS Code's extension host environment on latest stable VS Code. They intentionally start from an empty VS Code window with no folder or `.code-workspace` loaded, then cover activation, command registration, Create Workspace, focused generated-workspace designer/runtime lifecycle, bundle-to-NuGet debug/run lifecycle, and codeful modern-vs-legacy debug task behavior. Keep ExTester webview DOM scenarios in `src/test/ui/` for deeper designer and wizard UI coverage.

## Test Structure

```
src/test/e2e/
├── extension.test.ts       # Basic extension activation tests
├── commands.test.ts        # Command registration and execution tests
├── createWorkspace.test.ts # Latest-VS Code Create Workspace webview behavior, matrix, and artifact checks
├── workspaceLifecycle.test.ts # Generated workspace, NuGet conversion, and codeful debug-task lifecycle checks
├── runTest.ts              # Test runner entry point
└── integration/            # Legacy prototypes; not wired into the default CLI baseline
```

## Running Tests

Run these commands from the repository root unless a section says otherwise.

### How the commands are organized

The root `package.json` scripts forward to `apps/vs-code-designer/package.json`. Each script handles the build steps it needs before launching VS Code:

1. Build the extension into `apps/vs-code-designer/dist`.
2. Build the VS Code React webview bundle into `dist/vs-code-react`.
3. Compile the TypeScript test files with `tsconfig.e2e.json`.
4. Launch latest stable VS Code through `@vscode/test-cli` with an isolated test profile.

There are two kinds of CLI E2E entry points:

| Command type | Use it for | How it runs |
|---|---|---|
| Single-host labels | Activation, command registration, and focused Create Workspace webview/artifact checks. | One latest-stable VS Code host runs one `.vscode-test.mjs` label. |
| Lifecycle scripts | Generated-project debug/run, NuGet conversion debug/run, and codeful F5 task parity. | A package script creates real workspaces in one VS Code host, saves a manifest, then reopens each generated project in fresh VS Code hosts with the required startup resource and environment variables. |

When this README says "multi-host lifecycle flow", it means the script intentionally uses multiple short-lived VS Code windows so Create Workspace, project reopen, debug, and run assertions do not share stale extension-host state.

### Recommended local workflow

1. Compile the E2E tests when changing test code:
   ```powershell
   pnpm run test:e2e-cli:compile
   ```
2. Run the quick extension-host smoke:
   ```powershell
   pnpm run test:e2e-cli:smoke
   ```
3. Run the focused Create Workspace slice you changed, or the full Create Workspace CLI group:
   ```powershell
   pnpm run test:e2e-cli:create-workspace:behavior
   pnpm run test:e2e-cli:create-workspace:full
   ```
4. Run a lifecycle target only when you need runtime/debug coverage:
   ```powershell
   pnpm run test:e2e-cli:workspace-lifecycle
   pnpm run test:e2e-cli:nuget-conversion-lifecycle
   pnpm run test:e2e-cli:codeful-debug-tasks
   ```

If your terminal is already in `apps/vs-code-designer`, use the same script names there, for example `pnpm run test:e2e-cli:smoke`. The root scripts are just convenience forwarders.

### Open latest stable VS Code and see extension activation
```powershell
pnpm run test:e2e-cli:open
```

Use this when you want to visually confirm the extension is loading and activating in a latest stable VS Code instance. The command builds the extension into `apps/vs-code-designer/dist`, downloads or reuses latest stable VS Code, installs extension dependencies into an isolated test profile, opens an empty VS Code window in a fresh profile for each run, and leaves the VS Code window running.

### Author Azure-backed tests with a local signed-in profile

Use a dedicated test profile when authoring tests that need real Azure credentials. Do **not** point the harness at your daily VS Code profile because the test config writes test-specific settings, extension dependencies, Azurite paths, and runtime dependency paths.

For a new local auth profile, open the durable Azure-auth test profile:

```powershell
pnpm run test:e2e-cli:open:azure
```

In the opened Extension Development Host:

1. Sign in through the Accounts menu or the Azure Resources view.
2. Confirm the Azure Resources view shows your subscriptions/resources.
3. Close the Extension Development Host normally so VS Code can flush profile and secret-storage state.
4. Reopen with the same command above to verify the sign-in persisted.

Some VS Code builds can show an MSAL account in the Microsoft Authentication log but still return no cached session for the exact Logic Apps Azure scope. The MSN Weather lifecycle therefore uses Azure CLI as a test-only token fallback when `az account get-access-token` is available. Keep the signed-in profile anyway because the local authoring flow still uses the VS Code Azure extensions and profile settings.

To explicitly warm the scoped VS Code Microsoft authentication session in the same durable profile, run:

```powershell
pnpm run test:e2e-cli:warm-azure-auth
```

Follow the browser/VS Code sign-in prompts in the opened Extension Development Host, wait for the **Azure auth warm-up completed** notification, then close the window normally so VS Code can flush profile and secret-storage state. If you need a specific tenant, set `$env:LA_E2E_CLI_AUTH_WARMUP_TENANT_ID = '<tenant-id>'` first. If the session still does not persist, make sure `az account show` succeeds in the same shell before running Azure-backed tests.

When you run a local Azure-backed test, reuse the exact same profile path:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = "$PWD\apps\vs-code-designer\.vscode-test\local-azure-auth\user-data"
pnpm run test:e2e-cli --label <yourLabel>
```

`@vscode/test-cli` can only run extension tests when no other VS Code instance is open. If the test fails with `Running extension tests from the command line is currently only supported if no other instance of Code is running`, close all VS Code windows and rerun the same command.

If you already signed in through a one-off visible profile, reuse that exact profile path instead:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = 'apps\vs-code-designer\.vscode-test\visible\<run-folder>\user-data'
pnpm run test:e2e-cli:open
```

Use the same `LA_E2E_CLI_USER_DATA_DIR` value when running the local Azure-backed test. Prefer an explicit `LA_E2E_CLI_USER_DATA_DIR` for Azure-authored local work so the opened sign-in window and the later test process use the same VS Code profile folder.

In the opened VS Code window, confirm no folder or workspace is loaded, then run **Developer: Show Running Extensions** and confirm **Azure Logic Apps (Standard)** is active and loaded from `apps/vs-code-designer/dist`. Run **Extensions: Show Installed Extensions** to confirm the manifest dependencies are installed in the isolated profile. You can also search the Command Palette for **Azure Logic Apps** commands, such as **Create new project...**. The window uses the same test environment variables as the automated smoke: `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`.

### Run the activation and command-registration smoke
```powershell
pnpm run test:e2e-cli
```

This is the default quick check for this suite. It builds the VS Code extension into `apps/vs-code-designer/dist`, builds the VS Code React webview bundle into `dist/vs-code-react`, compiles the CLI test files, launches latest stable VS Code without a startup folder/workspace, verifies the Logic Apps extension is loaded from the development `dist` folder, verifies its manifest dependencies are visible to VS Code, activates the extension, verifies core Logic Apps commands are registered, and opens the Create Workspace webview from the empty window.

The smoke prints explicit `[activation-smoke]` lines with the VS Code version, extension development path, dependency extension IDs and versions, and activation completion. It keeps the VS Code test window visible briefly before closing so the launch is observable during local runs. When the VS Code test window is visible, the smoke also writes the same lines to the **Logic Apps @vscode/test-cli Smoke** output channel.

The smoke also scans VS Code output for setup warnings that indicate an invalid extension-host baseline. `DialogService: refused to show dialog` and guarded `showInformationMessage` / `showWarningMessage` / `showErrorMessage` calls fail the run instead of being ignored, except for the known VS Code debug notification that can be emitted when the `func: host start` prelaunch task logs errors while the lifecycle test still proves the host and workflow run successfully. Expected modal confirmations in lifecycle tests are answered by the test-only dialog guard in `dialogGuard.ts`; product command code still calls the normal VS Code/azext-utils dialog APIs.

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

The behavior target verifies initial render/content, Standard required-field progression, every field-level invalid-value validation message for Standard/custom-code/rules-engine fields, workflow type review/back preservation, and app-type cleanup. During field validation it logs `[create-workspace-validation]` lines and scrolls the active field into view before asserting the expected message. It also saves focused CDP screenshots named `create-workspace-validation-*` unless `LA_E2E_CLI_CAPTURE_FIELD_VALIDATION_SCREENSHOTS=0` is set. The core matrix covers Standard, custom-code, and rules-engine creation for Stateful/Stateless variants. The preview matrix covers Autonomous agents and Conversational agents across Standard/custom-code/rules-engine artifact generation, including deterministic workflow `kind`, Standard agent action/trigger shape, and custom-code/rules-engine starter function action names. Custom-code and rules-engine preview selections currently reuse their function/rules starter workflow templates; the stable preview distinction there is the generated workflow `kind`. The codeful target covers the current/modern codeful template plus the legacy-control `.csproj` target shape used by ExTester Phase 4.10: both cases create through the same `Logic app (codeful)` product radio, then the legacy-control case patches only the generated `.csproj` target hooks to `AfterTargets="Publish"` because latest stable VS Code exposes no separate legacy-control picker. Both cases verify `.csproj`, workflow `.cs`, `Program.cs`, `host.json`, `local.settings.json`, and stable codeful `.vscode` settings/tasks/launch essentials while asserting no codeless `workflow.json` is generated. ExTester remains the owner for legacy/modern codeful runtime-task semantics.

The fixtures target is a focused Create Workspace parity mode for the `@vscode/test-cli` harness. It creates the four downstream fixture shapes through the real wizard — Standard Stateful, Standard Stateless, CustomCode Stateful, and RulesEngine Stateful — and writes a downstream-compatible manifest to `%TEMP%\la-e2e-test\created-workspaces.json` (or `os.tmpdir()/la-e2e-test/created-workspaces.json` on non-Windows). The manifest shape intentionally matches `src/test/ui/workspaceManifest.ts` so consumers can read `wsDir`, `wsFilePath`, `appDir`, `wfDir`, `appType`, and `wfType` the same way they read ExTester fixtures. The mode preserves the generated workspace directories because the manifest points at absolute paths.

This CLI fixture mode does not replace or remove ExTester coverage. `run-e2e.js` downstream ExTester phases continue to treat `p41a-fixtures` as their canonical fixture owner; use this CLI target when you specifically need latest-stable `@vscode/test-cli` Create Workspace parity or a local manifest produced by the CLI harness.

The full Create Workspace script builds once, then runs the focused labels in separate VS Code hosts instead of one very long webview session. This keeps dropdown/popover state isolated without repeating the extension/webview/test compile step for every slice. The wrapper suppresses known non-test VS Code host noise, such as AgentHost token probes, TextMate worker import chatter, and C# Dev Kit background solution-open errors from generated projects. Set `LA_E2E_CLI_SHOW_VSCODE_NOISE=1` to show the raw host output when debugging VS Code itself.

### CI coverage

`.github/workflows/vscode-e2e.yml` runs the focused Create Workspace labels in a dedicated `vscode-e2e-cli-create-workspace` matrix:

- `createWorkspaceBehavior`
- `createWorkspaceCoreMatrix`
- `createWorkspacePreviewMatrix`
- `createWorkspaceCodeful`

`createWorkspaceFixturesManifest` is intentionally a focused/manual fixture producer for now; ExTester `p41a-fixtures` remains the fixture-backed downstream owner in the `run-e2e.js` matrix.

This job is additive to the existing ExTester matrix; it does not replace `src/test/ui/` coverage. The generated workspace designer/runtime lifecycle, NuGet conversion lifecycle, and codeful debug task parity targets remain focused/manual for now because they exercise designer open, .NET build, Azurite/runtime startup, trigger execution, conversion, or long-running task chains, making them substantially higher-cost and higher-flake than the focused Create Workspace parity checks.

Each matrix row is a separate GitHub Actions check named `vscode-e2e-cli-create-workspace (<label>)`. The test process exit code controls the check result, so a failing assertion fails only that label row while the other labels continue because the matrix uses `fail-fast: false`.

Result artifacts and summaries are intentionally structured so users do not need to read the raw log first:

- Each label writes a GitHub Actions step summary with outcome, Mocha pass/fail/pending counts, pass rate, structured-result artifact name, log artifact name, and screenshot artifact name.
- Each label uploads `vscode-e2e-cli-test-results-<label>` containing `<label>.json`, `<label>.junit.xml`, and `<label>.summary.md`.
- Each label uploads raw logs as `vscode-e2e-cli-log-<label>`.
- Each label uploads screenshots as `vscode-e2e-cli-screenshots-<label>` with 30-day retention.
- A follow-up `vscode-e2e-cli-create-workspace-report` job downloads all label result artifacts and writes an aggregate GitHub Actions dashboard with total passing, failing, pending, failed labels, and pass rate across the whole Create Workspace CLI matrix.
- The aggregate report uploads `vscode-e2e-cli-test-results-summary`, which contains aggregate JSON, aggregate JUnit XML, a Markdown dashboard, and `vscode-e2e-cli-create-workspace-trend.jsonl` for pass-rate ingestion across workflow runs.

On failure, the per-label summary includes a short failure excerpt and points to both the structured result artifact and screenshot artifact. Use the uploaded log only when you need the complete stack trace or full VS Code host output.

### Run generated workspace designer/runtime lifecycle
```powershell
pnpm run test:e2e-cli:workspace-lifecycle
```

This launches latest stable VS Code from an empty window, creates Standard, custom-code, and rules-engine workspaces through the real Create Workspace webview, opens the generated folders in fresh test hosts, opens the local designer, and captures screenshots at the important creation/designer/debug/overview stages. The Standard lifecycle adds the built-in Request trigger and Response action through the designer UI, saves the workflow, starts the generated Logic Apps debug configuration, opens Overview, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

The custom-code and rules-engine lifecycles use the workflows generated by Create Workspace. Before debug, the test explicitly builds the sibling generated .NET function project with `dotnet build` so the runtime has `lib\custom\<functionName>\function.json` metadata even though the test host starts from only the Logic App folder. It then opens designer, saves, starts debug, opens Overview, waits for the Run trigger and callback URL to become ready, clicks **Run trigger**, and verifies the latest run reaches `Succeeded`.

This smoke proves the latest-VS Code extension host can load generated projects, hydrate designer webviews, start the product-managed Azurite/runtime path, and execute saved workflows. It deliberately keeps the broader webview DOM authoring flows in ExTester.

### Run local Azure-backed MSN Weather designer lifecycle
```powershell
pnpm run test:e2e-cli:msn-weather-lifecycle
```

This local-only target reuses the signed-in test profile described above, creates a Standard Stateful workspace through the real Create Workspace webview, opens the designer with **Use connectors from Azure**, authors **Request → Get current weather → Response** through the designer UI, sets the MSN Weather Location parameter to `98058`, saves the workflow, starts debug, opens Overview, clicks **Run trigger**, opens the new succeeded run row, and inspects the Response action output through the runtime management API to prove it returns the full MSN Weather action body.

Use the following repeatable setup for a new developer machine or a new test profile:

1. Sign in with Azure CLI and choose the subscription the test should use.
   ```powershell
   az login
   az account set --subscription '<subscription-id-or-name>'
   az account show
   ```
2. Close all VS Code windows. `@vscode/test-cli` cannot launch extension tests while another Code instance is running.
3. Open the durable Azure-auth test profile, sign in through VS Code, verify the Azure Resources view can see the target subscription, then close the Extension Development Host normally.
   ```powershell
   pnpm run test:e2e-cli:open:azure
   ```
   The durable profile is `apps\vs-code-designer\.vscode-test\local-azure-auth\user-data`. Do not reuse your daily VS Code profile.
4. Warm the exact Microsoft Authentication scope used by Logic Apps designer connector calls, wait for the **Azure auth warm-up completed** notification, then close the Extension Development Host normally.
   ```powershell
   pnpm run test:e2e-cli:warm-azure-auth
   ```
5. Configure the Azure connector target. The wrapper auto-detects the current Azure CLI subscription/tenant and defaults the managed API location to `westus`, but it still needs a resource group. Set it once as an Azure CLI default, or preseed the environment variable in the shell that will run the test. Use a managed API location where `Microsoft.Web/locations/managedApis/msnweather` is available; `westus` is the recommended local default. `australiacentral` is not currently valid for this managed connector catalog call.
   ```powershell
   az configure --defaults group='<resource-group-name>'

   # Optional explicit overrides:
   $account = az account show | ConvertFrom-Json
   $env:LA_E2E_CLI_AZURE_SUBSCRIPTION_ID = $account.id
   $env:LA_E2E_CLI_AZURE_TENANT_ID = $account.tenantId
   $env:LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME = '<resource-group-name>'
   $env:LA_E2E_CLI_AZURE_LOCATION_NAME = 'westus'
   ```
6. Run the lifecycle. Add `-- --visible-delay-ms 15000` when you want time to watch each short-lived Extension Development Host before it exits.
   ```powershell
   pnpm run test:e2e-cli:msn-weather-lifecycle
   pnpm run test:e2e-cli:msn-weather-lifecycle -- --visible-delay-ms 15000
   ```

The wrapper automatically injects an Azure CLI ARM token into the extension host under `VSCODE_RUNNING_TESTS` if the scoped VS Code session is not available. That means the VS Code title bar can still show **Sign in** while the test has a valid ARM token for connector discovery. Set `LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK=1` to debug pure VS Code auth persistence, or set `LA_E2E_CLI_AZURE_ACCESS_TOKEN` yourself to provide a token explicitly.

If you signed in through a one-off visible profile instead of the durable Azure-auth profile, set `LA_E2E_CLI_USER_DATA_DIR` to that exact `user-data` folder before running the lifecycle:

```powershell
$env:LA_E2E_CLI_USER_DATA_DIR = 'apps\vs-code-designer\.vscode-test\visible\<run-folder>\user-data'
pnpm run test:e2e-cli:msn-weather-lifecycle
```

Use this target when authoring Azure-backed designer tests locally. It is intentionally not part of the default CI matrix because it depends on cached Azure credentials, a real subscription/resource group/location, and managed connector availability. `LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL` is optional when your profile needs a non-public Azure cloud.

### Run NuGet conversion debug/run lifecycle
```powershell
pnpm run test:e2e-cli:nuget-conversion-lifecycle
```

This focused parity target creates a Standard Stateful workspace through the Create Workspace webview, reopens the generated Logic App folder in a fresh latest-stable VS Code host, seeds a deterministic built-in Request trigger + Response action workflow, starts the bundle-based debug configuration, runs the workflow through Overview, and verifies run history plus action success. It then converts the same project through `azureLogicAppsStandard.switchToDotnetProject`, confirms the regenerated NuGet `.csproj`, `.vscode/tasks.json`, `.vscode/launch.json`, `.vscode/settings.json`, and `.vscode/extensions.json` contracts, starts the post-conversion debug session without harness port cleanup, and proves the workflow runs successfully again. The post-conversion proof is run-id specific: the test records the pre-click latest run, waits for a new run id after clicking **Run trigger**, requires the Overview run-history row for that new id to reach `Succeeded`, and then verifies the same new run through the runtime API and action history.

This is the CLI counterpart for the issue #7040-style NuGet lifecycle. ExTester still owns the Selenium command-palette/UI path, but this latest-stable baseline now owns the extension-host runtime contract.

### Run codeful modern-vs-legacy debug task parity
```powershell
pnpm run test:e2e-cli:codeful-debug-tasks
```

This focused parity target creates codeful workspaces through the real Create Workspace webview. The modern case uses the current generated `.csproj` target hooks. The legacy-control case patches only the generated `.csproj` `CopyToCodefulFolder` and `ReplaceLanguageNetCore` hooks to `AfterTargets="Publish"`, matching the ExTester Phase 4.10 negative-control shape.

Each variant is reopened from its generated `.code-workspace` in a fresh latest-stable VS Code host with runtime dependency validation and codeful design-time auto-start enabled. The test patches only the generated codeful source to a connector-free built-in Request/Response workflow so the F5 path validates task/runtime behavior instead of connector SDK surface drift, records VS Code task events during F5, requires the Functions host to report `Running`, and captures debug screenshots. Modern must run `clean` + `build` and start `func: host start` without running `clean release` or `publish`; legacy must run `clean`, `build`, `clean release`, `publish`, and start `func: host start`. Build/clean/publish exit codes must be 0. If a `workflow-designtime/local.settings.json` file is created in the latest-stable host, the test also asserts it uses `FUNCTIONS_WORKER_RUNTIME=node` and does not set `FUNCTIONS_INPROC_NET8_ENABLED`; the ExTester Phase 4.10 scenario remains the hard owner for the pre-F5 design-time auto-start side-effect.

To keep that Create Workspace window visible longer while debugging locally:

```powershell
pnpm run test:e2e-cli:show-create-workspace
```

That runs the same Create Workspace smoke and keeps VS Code open for 60 seconds before the test host exits.

### Run single-host tests with a specific label
```powershell
pnpm run test:e2e-cli --label unitTests
pnpm run test:e2e-cli --label createWorkspace
pnpm run test:e2e-cli --label createWorkspaceBehavior
pnpm run test:e2e-cli --label createWorkspaceCoreMatrix
pnpm run test:e2e-cli --label createWorkspacePreviewMatrix
pnpm run test:e2e-cli --label createWorkspaceCodeful
pnpm run test:e2e-cli --label createWorkspaceFixturesManifest
```

Use raw `--label` only for labels that can run in one VS Code host. Do not run `workspaceLifecycle`, `nugetConversionLifecycle`, or `codefulDebugTasks` directly with `--label` unless you are debugging `scripts/run-e2e-cli.js`; those labels require manifest and environment setup from their package scripts:

```powershell
pnpm run test:e2e-cli:workspace-lifecycle
pnpm run test:e2e-cli:nuget-conversion-lifecycle
pnpm run test:e2e-cli:codeful-debug-tasks
```

### Compile tests only (without running)
```powershell
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
- **nugetConversionLifecycle**: creates a Standard Stateful workspace, seeds a deterministic Request/Response workflow, proves bundle debug/run, converts the same project to NuGet, verifies regenerated NuGet `.csproj` and `.vscode` artifacts, then proves post-conversion debug/run without harness port cleanup
- **codefulDebugTasks**: creates modern and legacy-control codeful workspaces, reopens each in a fresh latest-stable host with design-time auto-start, records VS Code task events to verify modern skips `publish` while legacy still runs `clean release` + `publish`, and asserts the design-time Node-worker guard if latest stable creates design-time settings before F5

The config builds from `dist/`, sets `VSCODE_RUNNING_TESTS=1` and `DEBUGTELEMETRY=1`, lets `@vscode/test-cli` install extension dependencies into its managed test profile, does not pass a startup workspace folder, and uses an isolated user-data directory. Set `LA_E2E_CLI_USER_DATA_DIR` to reuse an explicit local profile, such as a profile where you signed in for Azure-backed test authoring. On non-Windows agents it uses a short temp user-data path to avoid Unix socket path-length issues. The CLI-only extension build externalizes `@microsoft/vscode-azext-utils` so the test harness can register expected dialog responses on azext action contexts without adding test guards to product command files.

The legacy files under `src/test/e2e/integration/` are not part of this baseline. Some of them open designer webviews or exercise workspace-conversion UI without the ExTester harness, which can produce errors such as missing `dist/vs-code-react/index.html` or refused dialogs in extension-host tests.

For a detailed traceability view from the ExTester Create Workspace behavior and fixture suites to these CLI labels, see [createWorkspaceParityMap.md](./createWorkspaceParityMap.md).

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
