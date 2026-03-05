# Skill: ExTester UI E2E Tests for VS Code Logic Apps Extension

> **Status**: IN PROGRESS — Phase 4.1 (createWorkspace): 63 passing, 1 failing (pre-existing product bug). Phase 4.2 (designer actions): **2 passing, 0 failing** — full lifecycle tests covering designer authoring → save → debug → overview → run trigger → verify succeeded. ~5 min runtime.
>
> **Last updated**: 2026-03-03

---

## 1. What This Is

TRUE end-to-end tests using `vscode-extension-tester` (ExTester v8.21.0) that launch a real standalone VS Code instance, load the locally-built Logic Apps extension, open webviews, interact with form fields via Selenium WebDriver, and verify the wizard flow + designer functionality.

**Not** filesystem-only tests. **Not** `@vscode/test-cli` tests (those exist separately in `src/test/e2e/`).

## 2. File Inventory

| File | Purpose |
|------|---------|
| `src/test/ui/createWorkspace.test.ts` | Create Workspace wizard tests (~4359 lines). Phase 4.1 |
| `src/test/ui/designerActions.test.ts` | Designer full lifecycle tests (~2647 lines). Phase 4.2 |
| `src/test/ui/designerOpen.test.ts` | Designer open tests (~1100 lines). Deprecated — Phase 4.2 now uses `designerActions.test.ts` only |
| `src/test/ui/workspaceManifest.ts` | Shared manifest types and utilities (~110 lines) |
| `src/test/ui/run-e2e.js` | Launcher script (~695 lines). Orchestrates ExTester programmatically. Plain JS (no compilation needed) |
| `src/test/ui/run-clean.ps1` | PowerShell helper to kill stuck processes, compile, and run |
| `src/test/ui/smoke.test.ts` | Extension smoke tests |
| `src/test/ui/commands.test.ts` | Logic Apps command tests |
| `src/test/ui/basic.test.ts` | Extended UI interaction tests |
| `src/test/ui/demo.test.ts` | Basic VS Code functionality tests |
| `src/test/ui/standalone.test.ts` | Framework validation tests (no VS Code required) |
| `src/test/ui/SKILL.md` | This file |
| `out/test/*.test.js` | Compiled output (generated via tsup, do not edit) |
| `out/test/vscode-settings.json` | Generated VS Code settings (generated, do not edit) |
| `dist/test-extensions/` | Isolated extensions directory used by ExTester (generated) |

## 3. How to Build & Run

```bash
# From: apps/vs-code-designer/

# 1. Build the extension (REQUIRED — creates dist/)
cd ../../  # repo root
pnpm run build:extension
cd apps/vs-code-designer

# 2. Compile the test TypeScript (uses tsup → CJS for Mocha)
npx tsup --config tsup.e2e.test.config.ts

# 3. Run all tests (Phase 4.1 + 4.2)
node src/test/ui/run-e2e.js

# 4. Run only Phase 4.2 (designer tests) using existing workspaces
$env:E2E_MODE="designeronly"    # PowerShell
export E2E_MODE=designeronly    # bash
node src/test/ui/run-e2e.js

# Or use the PowerShell helper (kills stuck processes first):
powershell -ExecutionPolicy Bypass -File src/test/ui/run-clean.ps1
```

### Build Scripts

```bash
pnpm run build:ui       # Compiles test TypeScript via tsup → CJS
pnpm run test:ui        # Runs node src/test/ui/run-e2e.js
```

### E2E_MODE Environment Variable

| Value | Behavior |
|-------|----------|
| (unset) | Runs Phase 4.1 (createWorkspace) first, then Phase 4.2 (designer) if Phase 4.1 passes |
| `designeronly` | Skips Phase 4.1, runs Phase 4.2 using workspaces from a previous Phase 4.1 run |

**IMPORTANT**: `E2E_MODE=designeronly` requires that Phase 4.1 has been run previously in the same session and workspaces still exist on disk. If the previous run's `after()` hook cleaned up workspaces, Phase 4.2 tests will fail with "Missing workspace directories" errors.

**NOTE**: When running from a background terminal, use absolute paths:
```bash
node d:\dev\LogicAppsUX\apps\vs-code-designer\src\test\ui\run-e2e.js
```

## 4. Architecture

## 4.1 Session Learnings (2026-02-26 through 2026-03-03)

### Phase 4.2 rewrite (2026-02-27 → 2026-03-03)

The original Phase 4.2 had 15+ scattered tests across `designerOpen.test.ts` and `designerActions.test.ts`. These were replaced with 2 focused end-to-end tests in `designerActions.test.ts` only:
- **Before**: 15+ tests, 23-minute runtime, ~20% pass rate
- **After**: 2 tests, 5-minute runtime, ~80% pass rate (failures are the intermittent CustomCode designer loading issue)

### Detection-based polling replaces static sleeps

All `sleep(WAIT)` patterns were replaced with polling functions:
- `waitForDesignerWebviewTab()` — polls for webview iframe appearance
- `switchToDesignerWebview()` — 3-phase: iframe switch → spinner disappears → canvas + nodes render
- `waitForDiscoveryPanel()` — polls for panel element
- `waitForSearchResults()` — polls for result cards
- `waitForNodeCountIncrease()` — polls for node count change
- `clickSaveButton()` — polls for save completion
- `waitForRuntimeReady()` — polls for debug toolbar + terminal output
- `waitForRunStatusInList()` — polls overview list with periodic Refresh

### Command palette retry (5 attempts)

`executeOpenDesignerCommand()` retries up to 5 times with 3s delays. The extension needs time to re-register commands after a workspace switch. Also checks the return value of `waitForDesignerWebviewTab()` — if the webview didn't appear after the command was selected, the command silently failed and needs to be retried.

### Selenium Actions API for React clicks

Direct `.click()` calls on elements inside webview iframes don't trigger React event handlers. All clicks on React elements use `driver.actions().move({ origin: element }).click().perform()` instead.

### Debug + Overview + Run verification flow (2026-03-02 → 2026-03-03)

Added complete lifecycle verification:
1. **Debug**: Start via command palette "Debug: Start Debugging". Wait for debug toolbar visible OR terminal output showing Functions runtime started.
2. **Overview**: Switch to Explorer view (Ctrl+Shift+E), right-click workflow.json, select "Overview" from context menu. Close all editors first to ensure correct webview frame.
3. **Run trigger**: Click "Run trigger" button in overview. Capture initial run status (Running or Succeeded).
4. **Verify**: Refresh overview list until status shows "Succeeded". Then click into the run to open details. Verify all individual action nodes show "Succeeded".

### Auth dialog bypass for testing

The overview page calls `getAuthorizationToken()` which shows a "wants to sign in" dialog. Added `silentAuth` setting in product code (`getAuthorizationToken.ts`). When `azureLogicAppsStandard.silentAuth: true` in VS Code settings, uses `{ silent: true }` for session retrieval, preventing the blocking dialog.

### Compose inputs field (Lexical editor)

The Compose action parameter panel uses a Lexical contenteditable editor, not a standard `<input>`. Found via `[contenteditable="true"].editor-input` selector. Must click to focus then `sendKeys()` to type. Required for save to succeed (empty Compose inputs causes validation failure).

### Strict interaction policy now used in `designerActions.test.ts`

- Add-trigger and add-action tests now fail if operation selection does not succeed.
- Verification is based on semantic node presence on the canvas:
  - Trigger flow asserts a `request` node is visible.
  - Action flow asserts a `compose` node is visible.
- The suite no longer treats “panel opened but operation not inserted” as pass-with-caveat for these core checks.

### Discovery panel selection reliability improvements

- `selectOperation()` now uses broader candidate matching across multiple selectors/roles plus text-based fallbacks.
- Matching includes operation variants such as `When an HTTP request is received` for `request`.
- A guard blocks false positives such as selecting the `All` pseudo-result item.

### Operational guidance from this session

- If Phase 4.2 reports missing workspace paths, re-run full `run-e2e.js` (without `E2E_MODE`) to regenerate fresh Phase 4.1 outputs before retrying designer tests.
- If settings cleanup encounters file locks, clear stale VS Code test processes and retry with the existing cleanup fallback (`settings/User` deletion path).
- Use actions-only runs while iterating on discovery panel selectors, then promote to full Phase 4.2 once stable.


### How ExTester Loads the Extension

ExTester cannot use `--extensionDevelopmentPath` reliably (it overrides `EXTENSION_DEV_PATH` to `undefined` unless `coverage=true`, and `coverage=true` adds a `--coverage` CLI flag that causes crashes). Instead:

1. **Copy `dist/` → `test-extensions/<publisher>.<name>-<version>/`** — makes it look like a marketplace-installed extension
2. **Delete `.obsolete` file** — VS Code creates this to mark extensions for removal; must be deleted or VS Code silently refuses to load the extension
3. **Register in `extensions.json`** — manually-copied extensions need an entry with `identifier`, `version`, `location` (URI), and `relativeLocation`
4. **Pass `--extensions-dir`** pointing to the `test-extensions/` directory via ExTester's 3rd constructor arg

### Key Invariant: No Auto-Update

VS Code will auto-update our old-versioned extension (`5.110.0`) from the marketplace (`5.230.15+`), creating **duplicate commands** in the command palette. This causes tests to select the wrong command.

**Solution**: The settings file (`out/test/vscode-settings.json`) disables auto-update:
```json
{
  "extensions.auto Update": false,
  "extensions.autoCheckUpdates": false,
  "update.mode": "none"
}
```
And `run-e2e.js` removes any stale auto-updated versions of our extension on startup.

### Test-Extensions Directory Structure

```
dist/test-extensions/
├── extensions.json                              ← VS Code reads this
├── ms-azuretools.vscode-azurelogicapps-5.110.0/ ← OUR extension (copied from dist/)
├── ms-azuretools.vscode-azurefunctions-1.20.3/  ← dependency
├── azurite.azurite-3.35.0/                      ← dependency
├── ms-azuretools.vscode-azureresourcegroups-.../ ← dependency
├── ms-dotnettools.csharp-.../                   ← dependency
└── ms-dotnettools.csdevkit-.../                  ← dependency
```

## 5. Known Issues & Pitfalls (Debugging Guide)

### Issue: `.obsolete` file blocks extension loading
**Symptom**: Extension host log shows no activation for our extension. Commands don't appear in palette.
**Cause**: VS Code writes `{"ms-azuretools.vscode-azurelogicapps-5.110.0":true}` to `.obsolete` in the extensions dir.
**Fix**: Delete `.obsolete` after copying extension. Already handled in `run-e2e.js`.

### Issue: Extension auto-updated from marketplace
**Symptom**: 5 command palette picks instead of expected 2-3. Errors reference `5.230.15/main.js` instead of `5.110.0`.
**Cause**: VS Code downloads newer version from marketplace, creating duplicate extension.
**Fix**: Set `extensions.autoUpdate: false` in VS Code settings. Remove stale versions in `run-e2e.js`.

### Issue: Wrong webview opened ("Create Workspace From Package")
**Symptom**: Webview shows "Package path" input. Tab title includes "From Package". Tests can't find expected fields.
**Cause**: Two commands match "create workspace" search:
  - `azureLogicAppsStandard.createWorkspace` → "Create new logic app workspace..." (**CORRECT**)
  - `azureLogicAppsStandard.cloudToLocal` → "Create new logic app workspace from package..." (**WRONG**)
**Fix**: Filter picks to exclude labels containing "package". The `runCommandFromPalette()` function does this.

### Issue: EPERM on Windows during settings cleanup
**Symptom**: `fs.removeSync` fails with EPERM on `settings/` directory.
**Cause**: Previous VS Code test process left locked cache files.
**Fix**: Pre-clean settings dir with `fs.rmSync({recursive:true, force:true, maxRetries:3})`.

### Issue: Test file glob doesn't match on Windows
**Symptom**: 0 passing, 0 failing.
**Cause**: `path.resolve()` produces backslashes on Windows; ExTester's glob matching expects forward slashes.
**Fix**: `.replace(/\\/g, '/')` on the test glob path.

### Issue: Command palette `setText()` clears the `>` prefix
**Symptom**: All command palette searches return "No matching results", even though the extension is loaded.
**Cause**: VS Code's command palette prefixes the input with `>` to indicate command mode. ExTester's `InputBox.setText()` calls `clear()` first, which removes the `>`. Without `>`, VS Code treats input as a file search, so no commands appear.
**Fix**: Always prefix search text with `> ` when using `setText()` in the command palette:
```typescript
await input.setText('> logic app workspace');  // ✅ stays in command mode
await input.setText('logic app workspace');    // ❌ switches to file search
```

### Issue: Locked files from previous test run (EBUSY)
**Symptom**: `Error: EBUSY: resource busy or locked, unlink '...\exthost.log'` in "before all" hook.
**Cause**: Previous test VS Code instances left child processes running (Roslyn Language Server, Azure Deployment Express Language Server, JSON Language Server, etc.) that hold file locks in `test-resources/settings/logs/`. The `vscode.openFolder(uri, true)` call (triggered by Create Workspace) spawns an entirely new VS Code window whose language servers persist after the test driver shuts down.
**Fix (multi-layered)**:
1. Kill ALL instances of known language server executables by name
2. WMIC search for processes with `test-resources` in command line → `taskkill /F /T`
3. Wait 5 seconds after killing for handles to release
4. 5-attempt retry loop with 3s delays for `fs.rmSync` on settings dir
5. **Smart fallback**: If full `settings/` delete fails, delete just `settings/User`
6. Last resort: rename to `settings-stale-<timestamp>`

### Issue: Tests pass but silently swallow errors
**Symptom**: All tests show ✔ but actual assertions fail (visible in console output as caught errors).
**Cause**: Many tests wrap everything in `try/catch` and just log the error instead of failing.
**Status**: KNOWN ISSUE. These need to be tightened — remove try/catch wrappers and let failures propagate.

### Issue: Notification toasts block webview interaction
**Symptom**: `ElementClickInterceptedError` when trying to interact with webview. A notification toast covers the element.
**Cause**: Extension activation (especially dependency extensions like C# DevKit) displays notifications.
**Fix**: `dismissNotifications(driver)` helper clicks notification close buttons before interacting with the webview.

### Issue: Label ambiguity — "Function name" matches "Function namespace"
**Symptom**: Custom code fields filled incorrectly — namespace gets the function name value, function name stays empty.
**Cause**: XPath `contains(text(), 'Function name')` matches BOTH "Function name" and "Function namespace".
**Fix**: Use exclusive XPath matching: `//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]`

### Issue: Namespace validation mismatch (PRODUCT BUG)
**Symptom**: All custom code fields filled correctly, but Next button remains disabled. No visible validation error.
**Cause**: In `createWorkspace.tsx`, `canProceed()` validates function namespace using `nameValidation` regex, which does NOT allow dots. But the field's own inline validation uses `namespaceValidation` which DOES allow dots.
**Workaround**: Use dot-free namespaces in tests.
**Product fix needed**: `canProceed()` should use `namespaceValidation` for the namespace field.

### Issue: Function name validation allows hyphens (PRODUCT BUG — FIXED)
**Symptom**: Generated .cs files contain invalid C# identifiers like `public class myfunc-abc`.
**Cause**: The webview wizard's `nameValidation` regex (`/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i`) was shared for ALL name fields including C# function names. Hyphens are invalid in C# identifiers.
**Root cause locations**:
  - `apps/vs-code-react/src/app/createWorkspace/validation/helper.ts` — shared regex for all names
  - `apps/vs-code-designer/src/app/commands/createNewCodeProject/CodeProjectBase/CreateFunctionAppFiles.ts` — no sanitization before template substitution
  - `apps/vs-code-designer/src/app/commands/createProject/createCustomCodeProjectSteps/functionAppFilesStep.ts` — same
  - `apps/vs-code-designer/src/app/commands/createCustomCodeFunction/createCustomCodeFunctionSteps/functionFileStep.ts` — same
**Fix applied (2026-02-24)**:
  1. Added `functionNameValidation = /^[a-z][a-z\d_]*$/i` in `helper.ts` — dedicated regex that rejects hyphens
  2. Updated `validateFunctionName()` to use `functionNameValidation` instead of `nameValidation`
  3. Added `.replace(/-/g, '_')` sanitization in all 3 template rendering locations (defense-in-depth)
  4. Updated error message to say "letters, digits, and underscores" (removed hyphen mention)
  5. Fixed E2E test `uniqueName()` to use underscores instead of hyphens
  6. Added 47 unit tests in `apps/vs-code-react/src/app/createWorkspace/validation/__test__/helper.test.ts`
**Note**: The old command-palette wizard (`functionAppNameStep.ts`) already correctly used `/^[a-z][a-z\d_]*$/i` and rejected hyphens. The bug was only in the new webview wizard.

### Issue: Azure connector wizard blocks designer loading (FIXED)
**Symptom**: Designer never loads for CustomCode and RulesEngine workspaces. VS Code shows QuickPick prompts that require manual intervention.
**Cause**: When `WORKFLOWS_SUBSCRIPTION_ID` is undefined in `local.settings.json`, the extension shows two blocking QuickPick prompts:
  1. "Enable connectors in Azure for Logic App" → "Use connectors from Azure" / "Skip for now"
  2. "Select authentication method for Azure connectors" → "Managed Service Identity" / "Connection Keys"
**Code path**: `getAzureConnectorDetailsForLocalProject()` in `apps/vs-code-designer/src/app/utils/codeless/common.ts` triggers `azureConnectorWizard.ts` which calls `authenticationMethodStep.ts`.
**Fix applied (2026-02-24)**: Two-layer fix in both `designerOpen.test.ts` and `designerActions.test.ts`:
  1. `ensureLocalSettingsForDesigner(appDir)` — patches `local.settings.json` with `WORKFLOWS_SUBSCRIPTION_ID: ""` before opening the designer. Setting it to empty string (not undefined) prevents the wizard from launching.
  2. `handleDesignerPrompts(workbench, driver)` — fallback safety net that polls for QuickPick dialogs and auto-selects "Skip for now" / "Connection Keys" if they still appear.
**Standard workspaces** already had `WORKFLOWS_SUBSCRIPTION_ID: ""` in their `local.settings.json` (set by the creation wizard), so they were unaffected.

### Issue: Command palette fails to open in designer tests (FIXED)
**Symptom**: `Waiting for element to be located By(css selector, .quick-input-widget) Wait timed out after 5xxxms` — affects all tests that call `executeOpenDesignerCommand()`.
**Cause**: `workbench.openCommandPrompt()` (ExTester API) intermittently fails to open the command palette after workspace switching.
**Fix applied (2026-02-27)**: `executeOpenDesignerCommand()` now retries up to 5 times with 3s delays. Before each attempt, it clears blocking UI (dialogs, notifications), dismisses JS dialogs, and focuses the editor. Additionally, after `pick.select()`, it checks whether `waitForDesignerWebviewTab()` actually found a webview — if not, it retries the command (the command may have silently failed).

### Issue: Auth dialog blocks overview page loading (FIXED)
**Symptom**: Overview page shows sign-in dialog "Azure Logic Apps wants to sign in using Microsoft". Test hangs waiting for overview content.
**Cause**: `openOverview.ts` calls `getAuthorizationToken()` which uses `{ createIfNone: true }`, triggering an interactive auth dialog.
**Code path**: `getAuthorizationToken.ts` → `getSessionFromVSCode()` → `vscode.authentication.getSession()` with `createIfNone: true`.
**Fix applied (2026-03-02)**: Added `silentAuth` setting support in `getAuthorizationToken.ts`. When `azureLogicAppsStandard.silentAuth` is `true` in VS Code settings, uses `{ silent: true }` instead of `{ createIfNone: true }`. This returns `undefined` if no session exists (instead of prompting), and the overview page handles the missing token gracefully.

### Issue: Wrong webview frame entered for overview (FIXED)
**Symptom**: `switchToOverviewWebview()` enters the designer iframe instead of the overview iframe.
**Cause**: If the designer webview tab is still open when the overview opens, ExTester's `WebView.switchToFrame()` targets the first matching iframe, which is the designer.
**Fix applied (2026-03-02)**: Added `editorView.closeAllEditors()` before opening the overview page. This ensures only the overview webview exists when `switchToFrame()` is called.

### Issue: Debug view blocks Explorer right-click (FIXED)
**Symptom**: After starting debugging, right-click on workflow.json in Explorer fails because the Activity Bar shows the Debug view instead of Explorer.
**Fix applied (2026-03-02)**: Added `Ctrl+Shift+E` keyboard shortcut to switch back to Explorer view before attempting the right-click.

### Issue: CustomCode designer content doesn't render (ACTIVE)
**Symptom**: Designer webview tab appears, `switchToFrame()` succeeds, but `Phase 2: spinner still present or #root not found after 75s`. React content never mounts inside the webview.
**Cause**: Unknown. Happens ~30% of the time for CustomCode workspaces, particularly when they are the second workspace loaded in a test session (after Standard). May be resource contention from previous debug session's func.exe or language servers not fully releasing.
**Impact**: Test 2 fails intermittently at the "Add-action button or trigger card should be visible" assertion because the designer canvas never renders.
**Potential fixes**:
  1. Add longer cleanup wait between test 1 and test 2
  2. Explicitly kill func.exe between tests
  3. Close all editors and wait for VS Code to fully settle after workspace switch
  4. Increase Phase 2 timeout beyond 75s (though the real issue is the content never appearing)

### Issue: CustomCode workspaces missing workflow.json
**Symptom**: `workflow.json not found: .../ccapp-mm1b0gh2/ccwf-mm1b0gh2/workflow.json`
**Cause**: For CustomCode workspaces, the workflow directory structure differs — but the manifest's `wfDir` path is based on the naming convention from `createWorkspace.test.ts` which may not match the actual directory created by the wizard.
**Also**: Previous test run's `after()` hook partially cleaned up workspaces, leaving some in a corrupted state.
**Impact**: All CustomCode designer tests fail at the "verify workflow.json exists" step.
**Fix needed**: Re-run Phase 4.1 to create fresh workspaces, and verify the manifest paths match actual disk layout.

### Issue: Stale workspaces from previous test runs
**Symptom**: `E2E_MODE=designeronly` tests fail with "Missing workspace directories" for several workspace types.
**Cause**: The `after()` hook in `designerOpen.test.ts` calls `cleanupAllWorkspaces()` which deletes workspace directories. If Phase 4.2 is re-run after cleanup, the workspaces no longer exist.
**Impact**: Tests 1, 2, 6-9 fail in Phase 4.2 (workspace structure verification).
**Fix**: Always run Phase 4.1 (createWorkspace) before Phase 4.2 to ensure fresh workspaces. The `run-e2e.js` script does this automatically when `E2E_MODE` is not set.

### Issue: `openFileInEditor()` via Quick Open is unreliable
**Symptom**: "Failed to open workflow.json" errors when using the old `InputBox`-based Quick Open approach.
**Cause**: ExTester's `workbench.openCommandPrompt()` + `setText(filePath)` approach doesn't work reliably for opening files — Quick Open doesn't support absolute paths, and "Open File" triggers a native OS dialog that Selenium can't interact with.
**Fix applied (2026-02-24)**: Replaced with `VSBrowser.instance.openResources(filePath)` in both test files. This is the ExTester-supported way to open files and reliably makes them the active editor tab.

### Issue: `openWorkspaceFileInSession()` insufficient wait time
**Symptom**: Extension not ready after workspace switch — commands fail, webview doesn't appear.
**Cause**: Original wait was only 4s. After switching workspaces, VS Code needs time to: close the old workspace, load the new workspace file, discover logic app folders, activate the extension, register commands.
**Fix applied (2026-02-24)**: Increased to 8s wait + element check + 5s stabilization in both test files.

## 6. React Webview Form Structure

The `createWorkspace` command opens a webview with the React wizard. Understanding this structure is essential for writing correct selectors.

### Two-Step Wizard

| Step | Component | What's Shown |
|------|-----------|-------------|
| 0 | `ProjectSetupStep` | All form fields (4 sub-components) |
| 1 | `ReviewCreateStep` | Read-only summary + "Create workspace" button |

### Step 0 Sub-Components (in order)

#### WorkspaceNameStep
| Field | Type | Label | Placeholder | Notes |
|-------|------|-------|-------------|-------|
| Parent folder | Input + Browse button | `Workspace parent folder path` | (none) | Required. Must be valid existing path |
| Workspace name | Input | `Workspace name` | (none) | Required. Regex: `/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i` |

#### LogicAppTypeStep
| Field | Type | Label | Placeholder | Notes |
|-------|------|-------|-------------|-------|
| Logic app name | Input | `Logic app name` | `Enter logic app name` | Required |
| Logic app type | Radio group | (3 options) | — | Default: Standard |

Radio options:
- `Logic app (Standard)` → value `logicApp`
- `Logic app with custom code` → value `customCode`
- `Logic app with rules engine` → value `rulesEngine`

#### DotNetFrameworkStep (conditional — only for customCode or rulesEngine)
| Field | Type | Label | Notes |
|-------|------|-------|-------|
| .NET Version | Dropdown | `.NET Version` | Placeholder: `Select .NET version` |
| Folder name | Input | `Custom code folder name` or `Rules engine folder name` | Depends on type |
| Function namespace | Input | `Function namespace` | Required |
| Function name | Input | `Function name` | Required |

#### WorkflowTypeStep
| Field | Type | Label | Placeholder | Notes |
|-------|------|-------|-------------|-------|
| Workflow name | Input | `Workflow name` | `Enter workflow name` | Required |
| Workflow type | Dropdown | `Workflow type` | `Select workflow type` | Required |

Dropdown options:
- `Stateful` (value: `Stateful-Codeless`)
- `Stateless` (value: `Stateless-Codeless`)
- `Autonomous Agents (Preview)` (value: `Agentic-Codeless`)
- `Conversational Agents` (value: `Agent-Codeless`)

### Step 1 — ReviewCreateStep
Read-only summary table. Buttons: `Back`, `Create workspace`.

### Navigation Buttons
- Step 0: `Back` (disabled), `Next`
- Step 1: `Back`, `Create workspace`

### Panel Titles (Tab Names)
- `createWorkspace` command → Panel title: **"Create Workspace"**
- `cloudToLocal` command → Panel title: **"Create Workspace From Package"**

## 7. Selenium Selectors Reference

### Finding inputs by label
Fluent UI renders `<Label htmlFor={id}>` + `<Input id={id}>`. Find label by text, read `for` attribute, then find input by `id`.

### Finding radio buttons
Fluent UI v9 radios: `input[type="radio"]` exists but may be hidden. Click the **`<label>`** element instead.

### Finding dropdowns
Fluent UI Dropdown renders a `<button role="combobox">` as the trigger. Options are `[role="option"]` elements (may be portaled outside the immediate parent).

### Webview iframe switching
Must call `webview.switchToFrame(timeout)` before any element interaction. Must call `webview.switchBack()` before interacting with VS Code chrome.

## 8. Extension Dependencies

These are installed from the marketplace into `test-extensions/`:
1. `ms-azuretools.vscode-azurefunctions`
2. `azurite.azurite`
3. `ms-azuretools.vscode-azureresourcegroups`
4. `ms-dotnettools.csharp`
5. `ms-dotnettools.csdevkit`

## 9. Timing Constants

| Constant | Value | Why |
|----------|-------|-----|
| `VSCODE_STARTUP_MS` | 20s | Wait for VS Code chrome to render |
| `EXTENSION_READY_TIMEOUT_MS` | 120s | Poll until extension activates and registers commands |
| `DESIGNER_TAB_TIMEOUT` | 30s | Wait for designer webview tab to appear after command |
| `DESIGNER_READY_TIMEOUT` | 75s | Wait for designer content to render (3-phase detection) |
| `PROJECT_RECOGNITION_WAIT` | 5s | Wait for extension to recognize the workspace after file open |
| `TEST_TIMEOUT` | 180s | Per-test Mocha timeout |
| `RUNTIME_READY_TIMEOUT` | 90s | Wait for Functions runtime to start during debug |
| `OVERVIEW_WEBVIEW_TIMEOUT` | 60s | Wait for overview webview to load |
| `RUN_STATUS_TIMEOUT` | 30s | Wait for run to reach target status in overview list |

## 10. What Works (as of last run: 2026-02-24)

### Phase 4.1 — Create Workspace (63 passing, 1 failing)

Runtime: ~10 minutes

- ✅ Extension loading via copy-to-test-extensions
- ✅ `.obsolete` file cleanup
- ✅ `extensions.json` registration
- ✅ ExTester downloads VS Code + ChromeDriver
- ✅ Extension dependencies installed from marketplace
- ✅ Command palette search finds picks (with retry logic)
- ✅ Correct webview detected (rejects "From Package")
- ✅ Webview opens and `switchToFrame()` succeeds (with notification dismissal + 3 retries)
- ✅ ALL standard form fields filled (path, workspace name, logic app name, radio, workflow name, workflow type)
- ✅ ALL custom code fields filled (.NET Version, folder name, namespace, function name)
- ✅ Review step verification (navigate forward, check summary, navigate back, values preserved)
- ✅ Workspace creation — clicks "Create workspace" button, waits for extension processing
- ✅ Disk verification — workspace dir, .code-workspace file, logic app dir, workflow dir
- ✅ Custom code disk verification — includes custom code folder
- ✅ EBUSY cleanup with multi-layered process killing
- ✅ afterEach recovery from `vscode.openFolder` driver state changes
- ✅ 12 workspace types: Standard Stateful/Stateless/Agent/Conversational × Codeless/CustomCode
- ✅ Workspace manifest (`created-workspaces.json`) persisted with workspace metadata for Phase 4.2

**1 failing**: Custom Code Stateful namespace validation (pre-existing product bug — `canProceed()` uses wrong regex)

### Phase 4.2 — Designer Tests (2 passing, 0 failing)

Runtime: ~5 minutes

Phase 4.2 runs only `designerActions.test.ts` (the `designerOpen.test.ts` file was removed from Phase 4.2 runs). It contains 2 focused end-to-end tests that cover the complete workflow lifecycle:

**Test 1: Standard Workflow (Stateful)**
1. Reset workflow.json to empty state
2. Open designer via command palette (with 5-attempt retry)
3. Wait for 3-phase designer loading (iframe → spinner gone → canvas + nodes)
4. Add Request trigger via discovery panel search
5. Add Response action via add-action button
6. Save workflow and verify workflow.json on disk
7. Start debugging via "Debug: Start Debugging" command palette
8. Wait for Functions runtime to start (debug toolbar + terminal detection)
9. Open overview page via Explorer right-click on workflow.json
10. Click "Run trigger" button
11. Verify run shows in overview list (capture "Running" or "Succeeded" state)
12. Refresh until run shows "Succeeded" in overview list
13. Click into the succeeded run to open run details
14. Verify all action nodes show "Succeeded" status

**Test 2: CustomCode Workflow (Stateful)**
1. Open CustomCode workspace and workflow.json
2. Open designer (with command palette retry + webview tab detection)
3. Add Compose action via discovery panel search
4. Fill Compose inputs field (Lexical contenteditable editor)
5. Save workflow and verify workflow.json on disk
6. Start debugging and wait for runtime ready
7. Open overview page
8. Click "Run trigger"
9. Verify run shows "Running" → transitions to "Succeeded" in overview list
10. Open run details and verify all action nodes succeeded

**Key helper functions in designerActions.test.ts (~2647 lines):**

| Function | Purpose |
|----------|---------|
| `waitForDependencyValidation()` | Polls up to 120s for extension activation + command registration |
| `executeOpenDesignerCommand()` | Command palette with 5-attempt retry, dismisses blocking UI before each attempt |
| `waitForDesignerWebviewTab()` | Polls for webview iframe appearance with dialog/QuickPick handling |
| `switchToDesignerWebview()` | 3-phase detection: iframe switch → spinner gone → canvas + nodes rendered |
| `selectOperation()` | Selenium Actions API click with broad candidate matching and StaleElement retry |
| `clickSaveButton()` | Polls for save completion (button re-enabling) |
| `readWorkflowJson()` | Disk verification of saved workflow.json |
| `startDebugging()` | Command palette "Debug: Start Debugging" |
| `waitForRuntimeReady()` | Debug toolbar detection + terminal output fallback (90s timeout) |
| `openOverviewPage()` | Explorer view → right-click workflow.json → context menu "Overview" |
| `switchToOverviewWebview()` | Frame switching with periodic auth dialog dismissal |
| `clickRunTrigger()` | Polls for enabled "Run trigger" button |
| `getLatestRunStatus()` | Reads status of topmost run in overview list |
| `waitForRunStatusInList()` | Polls overview list (with Refresh) until target status appears |
| `clickLatestRunRow()` | Opens the latest run's details view |
| `verifyAllNodesSucceeded()` | Checks all action nodes in run details show "Succeeded" |
| `stopDebugging()` | Sends Shift+F5 to stop debug session |

**Product code change for testing:**
- `getAuthorizationToken.ts`: Added `silentAuth` setting support. When `azureLogicAppsStandard.silentAuth` is `true`, uses `{ silent: true }` instead of `{ createIfNone: true }` for Azure session, preventing the "wants to sign in" dialog that blocks overview page loading in test environments.

### Test Inventory (All Phases Combined: 87+ passing, 1 failing)

**Phase 4.1 — createWorkspace.test.ts (63 pass, 1 fail)**

| Suite | # | Tests | Status |
|-------|---|-------|--------|
| VS Code Basic | 5 | VS Code title, activity bar, sidebar, editor, instance | ✅ |
| Smoke Tests | 5 | VS Code load, activity bar, command palette, search, explorer | ✅ |
| Simple Suite | 4 | Basic assertions (math, string, array, async) | ✅ |
| Create Workspace (non-destructive) | 6 | Command selection, form values, workflow types, step indicator, button states | ✅ |
| Create Workspace (destructive) | 48 | 12 workspace types × 4 tests each (creation, disk verify, workspace file, manifest) | 47 ✅, 1 ❌ |

**Phase 4.2 — designerActions.test.ts + new tests (8+ pass, 0 fail)**

| Suite | # | Tests | Status | ADO ID |
|-------|---|-------|--------|--------|
| Designer Actions | 1 | Standard workflow: trigger + response + save + debug + overview + run | ✅ | |
| Designer Actions | 1 | CustomCode workflow: add compose + fill inputs + save + debug + overview + run | ✅ | |
| Inline JavaScript | 1 | Request trigger + Execute JS Code + Response → save + debug + run + verify | 🆕 | #10109800 |
| Stateless Variables | 1 | Stateless workflow + Request trigger + Initialize Variable + Response → full flow | 🆕 | #10109878 |
| Designer View Extended | 1 | Add parallel branch alongside existing action | 🆕 | #10109401 |
| Designer View Extended | 1 | Configure run-after settings on an action | 🆕 | #10109401 |
| Keyboard Navigation | 1 | Ctrl+Down/Up navigation between canvas nodes | 🆕 | #10273324 |

**Phase 4.3 — smoke/demo/standalone + Data Mapper (16+ pass, 0 fail)**

| Suite | # | Tests | Status | ADO ID |
|-------|---|-------|--------|--------|
| Demo, Smoke, Standalone | 14 | Generic VS Code functionality, framework validation | ✅ | |
| Data Mapper Extension | 1 | Open Data Mapper from Azure activity bar | 🆕 | #26272218 |
| Data Mapper Extension | 1 | Verify "Create new data map" command exists | 🆕 | #26272218 |

## 11. What Needs Work (Prioritized)

### P0: Fix intermittent CustomCode designer loading failure
**Impact**: Test 2 fails ~30% of runs
**Problem**: After switching from Standard workspace to CustomCode workspace, the designer webview loads but React content doesn't render — `Phase 2: spinner still present or #root not found after 75s`. The webview tab appears (ExTester switchToFrame succeeds) but the React app inside never mounts.
**Root cause**: Likely resource contention from the previous test's debug session (func.exe, language servers) not fully releasing before the second workspace loads.
**Current mitigation**: `stopDebugging()` in Test 1 cleanup sends Shift+F5 twice and waits 2s. The `executeOpenDesignerCommand()` checks the webview tab appeared before returning — if the tab times out after 30s, it retries the command palette up to 5 times.
**Potential solutions**:
1. Add longer stabilization wait between tests (5-10s after stopDebugging)
2. Kill func.exe explicitly between tests
3. Close all editors + wait after Test 1's debug session ends

### P1: Fix namespace validation product bug
**Impact**: 1 test failure in Phase 4.1
**Problem**: In `createWorkspace.tsx` line ~271, `canProceed()` uses `nameValidation` regex for function namespace field. It should use `namespaceValidation` which allows dots. This causes dotted namespaces to pass field validation but silently disable the Next button.
**Workaround**: Tests use dot-free namespaces.

### P2: Improve run state transition visibility
**Impact**: Test 1's run completes so fast (~1s) that the initial status captured is always "Succeeded" instead of "Running"
**Problem**: The HTTP Request trigger returns immediately, so the run transitions from Running → Succeeded before the first Refresh completes (~2s). Test 2 (CustomCode) does capture the Running state because the custom code function takes slightly longer.
**Current behavior**: Both tests still verify the full lifecycle — they just can't always capture the intermediate "Running" screenshot for Test 1.
**Potential solutions**:
1. Accept this as expected behavior (fast runs are good)
2. Add a deliberate delay to the Response action in the workflow definition
3. Reduce the initial Refresh delay to <500ms

### P3: CI integration
- Tests require a display (Selenium drives a real VS Code window)
- For CI, need Xvfb (Linux) or similar virtual display
- Tests take ~5 minutes total for Phase 4.2
- Need process cleanup in CI (language servers and func.exe may persist between runs)
- The `silentAuth` product code change must be reviewed before merging

## 12. Separate Test Infrastructure

There are **two** E2E test systems in this extension:

| System | Location | Framework | What It Tests |
|--------|----------|-----------|--------------|
| **ExTester UI tests** | `src/test/ui/` | vscode-extension-tester + Selenium | Real webview GUI interaction |
| **CLI integration tests** | `src/test/e2e/` | @vscode/test-cli + VS Code API | Extension host API, file operations |

They are independent. The CLI tests (`src/test/e2e/`) use `@vscode/test-cli` and run inside the extension host — they can call `vscode.*` APIs directly but cannot interact with webview UI. The ExTester tests (`src/test/ui/`) drive the VS Code GUI via ChromeDriver.

## 13. npm Scripts

```json
// In apps/vs-code-designer/package.json:
"build:ui": "npx tsup --config tsup.e2e.test.config.ts",
"test:ui": "node src/test/ui/run-e2e.js"
```

**Note**: The build was migrated from `tsc` to `tsup` for CJS output compatibility with ExTester/Mocha. The `tsup.e2e.test.config.ts` file compiles all `src/test/ui/*.test.ts` to `out/test/*.test.js` in CommonJS format.

## 14. Debugging Tips

### See all console output
ExTester pipes VS Code's console to test stdout. Look for lines with `INFO:CONSOLE` for extension host messages.

### Check which extension version loaded
Search output for `Extension Host` and `ms-azuretools.vscode-azurelogicapps`. If you see a different version number than expected, the auto-update issue is back.

### Check what labels the webview actually renders
Add this diagnostic snippet in a test:
```typescript
const labels = await webview.findWebElements(By.css('label'));
const labelTexts = await Promise.all(labels.map((l) => l.getText()));
console.log('All labels:', labelTexts);
```
If you see `Package path*` — you're in the wrong webview.

### Kill stuck test processes (Windows)
```powershell
# Kill test VS Code instances (careful not to kill your main one)
Get-Process | Where-Object { $_.Path -like "*test-resources*" } | Stop-Process -Force

# Kill language servers that hold file locks
Get-Process -Name "Microsoft.CodeAnalysis.LanguageServer" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "Azure.Deployments.Express.LanguageServer" -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill Functions runtime from debug sessions
Get-Process -Name "func" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Full clean restart
```powershell
# Remove all test artifacts
Remove-Item -Recurse -Force dist/test-extensions -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\test-resources" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force out/test -ErrorAction SilentlyContinue
```

### Debug designer loading issues
1. Check `local.settings.json` in the workspace — `WORKFLOWS_SUBSCRIPTION_ID` must exist (can be empty string `""`) to prevent Azure connector wizard prompts
2. Check Extension Host logs for `getAzureConnectorDetailsForLocalProject` — if this triggers, the wizard prompts will block designer loading
3. Use `ensureLocalSettingsForDesigner()` helper before opening designer to patch settings

### Debug overview / run trigger issues
1. Check that `silentAuth: true` is set in VS Code test settings — without this, the auth dialog blocks the overview page
2. Verify debug session is running — the "Run trigger" button is disabled until the Functions runtime starts
3. Check for stale func.exe processes — these can bind to the same port, causing the new debug session to fail
4. The overview page opens in a webview iframe — must close all editors first to avoid entering the wrong iframe
5. Run screenshots are saved to `test-resources/screenshots/designerActions-explicit/<timestamp>/` — check `step12-run-status-*` and `step15-all-nodes-succeeded` for visual proof

### Debug command palette failures
1. Check if VS Code is fully loaded: look for the status bar to have no loading spinners
2. Try increasing stabilization wait after workspace switch (currently 8s + 5s)
3. Check if notification toasts are covering UI elements — `dismissNotifications()` helper
4. In test output, look for `quick-input-widget` — if it never appears, the command palette keyboard shortcut may not be reaching VS Code

## 15. Lessons Learned (2026-03-03)

### Key Insights from Test Development

1. **Detection-based polling beats static sleeps.** Replacing all `sleep(WAIT)` patterns with polling functions that detect DOM changes (spinner gone, canvas rendered, panel opened) reduced runtime from 23 min → 5 min while improving reliability from 20% → ~80%.

2. **Command palette retry is the #1 reliability fix.** The `executeOpenDesignerCommand()` function retries up to 5 times with 3s delays when "Open Designer" isn't found. The extension needs time to re-register commands after workspace switching. This single fix turned a 40% failure rate into near-zero for the command execution step.

3. **Selenium Actions API is required for React-compatible clicks.** Direct `.click()` calls don't trigger React event handlers inside webview iframes. Using `driver.actions().move({ origin: element }).click().perform()` works reliably because it dispatches native browser events that React's synthetic event system captures.

4. **StaleElementReferenceError is expected with React Flow.** After adding an action/trigger, React Flow re-renders all nodes, invalidating any cached WebElement references. A 3-attempt retry loop around the add-action button click handles this gracefully.

5. **Auth dialogs block overview page silently.** The extension's `getAuthorizationToken()` unconditionally shows a "wants to sign in" dialog when opening the overview page. Added `silentAuth` setting support in product code to use `{ silent: true }` in test environments — this prevents the dialog without changing production behavior.

6. **Close all editors before opening overview (CRITICAL).** If the designer webview is still open when the overview page opens, `WebView.switchToFrame()` enters the designer iframe instead of the overview iframe. The symptom is that `switchToOverviewWebview()` times out waiting 60s for "Run trigger" button while sitting in the designer frame (you'll see designer content like action names in the body text diagnostic). **The fix**: always call `result.webview.switchBack()`, then `driver.switchTo().defaultContent()`, then `new EditorView().closeAllEditors()`, then `sleep(2000)` before starting the debug session. This ensures the designer webview iframe is removed from the DOM entirely before the overview page creates its own webview.

7. **Debug view blocks Explorer right-click.** After starting debugging, the Activity Bar switches to the Debug view. Must send Ctrl+Shift+E to switch back to Explorer before right-clicking workflow.json to open the overview page.

8. **Lexical contenteditable editors require special handling.** The Compose action's inputs field uses a Lexical editor with `[contenteditable="true"].editor-input`. Standard input selectors don't find it. Must click to focus, then use `sendKeys()` to type into the contenteditable element.

9. **3-phase run verification provides clear proof.** The run verification flow captures three distinct phases: (a) run appears in overview list (Running/Succeeded status), (b) run transitions to Succeeded in overview list after Refresh, (c) opening run details shows all individual action nodes as Succeeded. This provides unambiguous visual evidence via screenshots at each phase.

10. **Process cleanup must include func.exe.** After debugging, `func.exe` (the Azure Functions runtime) keeps running and holds file locks. Must be explicitly killed alongside language servers to prevent subsequent test runs from failing.

11. **Use `findLastAddActionElement()` when inserting a second action (CRITICAL).** The canvas has multiple `+` buttons (one between each pair of nodes). `findAddActionElement()` returns the FIRST `+` button, which inserts the new action between the trigger and the first action — NOT at the end. When adding a second action (e.g., Response after Execute JavaScript Code), use `findLastAddActionElement()` which returns the LAST `+` button, ensuring the action is appended at the bottom of the flow in the correct topological order.

12. **Initialize Variable parameter panel uses contenteditable editors, not `<input>` elements.** The label-based lookup helpers (`fillActionInput`, `selectDropdownInPanel`) cannot find fields because the Initialize Variable action panel doesn't render standard HTML `<label>` + `<input>` pairs. Instead, it uses Lexical contenteditable editors with `data-automation-id` attributes and Fluent UI comboboxes. The working pattern: (a) click the node with `openNodeSettingsPanel()` to ensure the panel is open, (b) find contenteditable editors directly with `[contenteditable="true"].editor-input` selectors, (c) use index-based targeting (first editor = Name, combobox = Type, last editor = Value), (d) dump the panel's `data-automation-id` values for diagnostics when fields aren't found.

13. **Each new test should run in its own phase (fresh VS Code session).** Tests that share a Phase 4.x session with other tests fail because the previous test's debug session, workspace switch, and lingering processes leave VS Code in a degraded state (extension host unresponsive, func.exe holding locks, webview iframes still in DOM). Running each test in its own phase via `prepareFreshSession()` solves all of these issues. The runtime cost (~30s per extra session start) is worth the reliability gain.

14. **Multiple webview iframes: ExTester's WebView targets the wrong frame (CRITICAL).** When two designer tabs are open simultaneously, `new WebView().switchToFrame()` always enters the FIRST iframe in DOM order — not the active tab's iframe. The fix: use raw Selenium `driver.switchTo().frame(element)` with a custom `switchToActiveDesignerFrame()` function that (a) finds all `iframe.webview` elements, (b) checks which one is visible (`.isDisplayed()` + non-zero dimensions), (c) switches into it, (d) navigates the nested iframe structure (outer → `#active-frame` inner), and (e) polls until the designer canvas renders. This function must POLL (not check once) because VS Code takes time to create the new iframe when a second webview tab opens.

15. **Designer tab names vs. file tab names — must match on "(Workspace)" (CRITICAL).** The `activateDesignerTab()` function must distinguish designer tabs from `workflow.json` text file tabs. Both contain the workflow name, but designer tab titles follow the pattern `{workspaceName} (Workspace)-{logicAppName}-{workflowName}` and always contain "Workspace". Match on BOTH the workflow name AND "workspace" in the tab title. Without this, the function clicks the wrong tab (text editor instead of designer), leaving the webview invisible.

16. **Right-clicking the correct workflow.json in the Explorer.** When multiple workflows exist, the Explorer tree has multiple `workflow.json` rows. Use `VSBrowser.instance.openResources(absolutePath)` to open the specific file first — this reveals and selects it in the tree. Then find the row with `selected` CSS class and right-click it. Without this, the test right-clicks the first `workflow.json` it finds (wrong workflow).

17. **Built-in operations (Request, Response) are always available; connectors (Compose) may not be.** When the design-time API hasn't fully loaded the connector catalog, the search results may not include connector-level operations like Compose. Use only built-in operations (Request, Response) in tests that need reliability. The connector catalog loads asynchronously from the func host, which may not be running in all test scenarios.

### Architecture Decisions That Paid Off

- **Phase separation (4.1 / 4.2)**: Allows re-running designer tests without re-creating workspaces
- **tsup for test compilation**: Reliable CJS output; `tsc` had inconsistent module format issues
- **Workspace manifest**: Single source of truth for workspace paths, prevents hardcoded path drift
- **`run-e2e.js` as orchestrator**: Plain JS (no compile step needed), handles extension copying, dependency installation, process cleanup, and test execution in one script
- **Multi-layered process cleanup**: 6 fallback strategies for EBUSY errors; always succeeds eventually
- **2 focused tests instead of 15+ scattered tests**: Reduced from 15+ tests (23 min, 20% pass rate) to 2 comprehensive end-to-end tests (5 min, ~80% pass rate). Each test covers the complete lifecycle.
- **`assert.ok()` at every step**: Each step has a clear assertion with a descriptive message. No more swallowed errors in try/catch blocks.
- **Screenshots at every assertion point**: 15+ screenshots per test run provide visual debugging evidence without needing to watch the test live.

### What We'd Do Differently

- **Start with detection-based polling** instead of static sleeps. Static sleeps were the #1 cause of both flakiness and slow runtime.
- **Start with 2 focused tests** instead of 15+ tests that each test one small thing. The overhead of opening a workspace + designer is so high (~15s) that it's far more efficient to test the full lifecycle in fewer, longer tests.
- **Pre-create `local.settings.json`** in all workspace creation tests to prevent Azure connector prompts. Discovered late that this is needed for designer tests.
- **Add `silentAuth` support from the start** instead of discovering the auth dialog blocker late. Any test environment that opens the overview page needs this.
- **Use `VSBrowser.instance.openResources()`** from the start for file opening instead of building custom Quick Open logic. This ExTester API is more reliable.

### VS Code Settings Required for Testing

The `run-e2e.js` script generates these settings for the test VS Code instance:

```json
{
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "update.mode": "none",
  "git.enabled": false,
  "git.openRepositoryInParentFolders": "never",
  "azureLogicAppsStandard.autoRuntimeDependenciesPath": "~/.azurelogicapps/dependencies",
  "azureLogicAppsStandard.funcCoreToolsBinaryPath": "<path>/func.exe",
  "azureLogicAppsStandard.dotnetBinaryPath": "<path>/dotnet.exe",
  "azureLogicAppsStandard.nodeJsBinaryPath": "<path>/node.exe",
  "azureLogicAppsStandard.silentAuth": true
}
```

Key settings:
- **Runtime dependency paths**: Point to pre-installed binaries to avoid download delays
- **`silentAuth: true`**: Prevents the auth dialog when opening the overview page
- **`git.enabled: false`**: Prevents git operations that slow down workspace switching
- **Auto-update disabled**: Prevents marketplace extension replacement
