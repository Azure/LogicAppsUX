# Skill: ExTester UI E2E Tests for VS Code Logic Apps Extension

> **Status**: IN PROGRESS — Phase 4.1 (createWorkspace): 63 passing, 1 failing (pre-existing product bug). Phase 4.2 (designer): mixed results depending on workspace freshness; `designerActions` strict interaction suite is currently green (11 passing) in actions-only runs.
>
> **Last updated**: 2026-02-26

---

## 1. What This Is

TRUE end-to-end tests using `vscode-extension-tester` (ExTester v8.21.0) that launch a real standalone VS Code instance, load the locally-built Logic Apps extension, open webviews, interact with form fields via Selenium WebDriver, and verify the wizard flow + designer functionality.

**Not** filesystem-only tests. **Not** `@vscode/test-cli` tests (those exist separately in `src/test/e2e/`).

## 2. File Inventory

| File | Purpose |
|------|---------|
| `src/test/ui/createWorkspace.test.ts` | Create Workspace wizard tests (~4359 lines). Phase 4.1 |
| `src/test/ui/designerOpen.test.ts` | Designer open tests (~1100 lines). Opens designer for each workspace type. Phase 4.2 |
| `src/test/ui/designerActions.test.ts` | Designer action tests (~1585 lines). Tests add trigger/action flows. Phase 4.2 |
| `src/test/ui/workspaceManifest.ts` | Shared manifest types and utilities (~110 lines) |
| `src/test/ui/run-e2e.js` | Launcher script (~656 lines). Orchestrates ExTester programmatically. Plain JS (no compilation needed) |
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

## 4.1 Session Learnings (2026-02-26)

### Phase semantics (important)

- **Phase 4.2** (`designerOpen.test.ts` + `designerActions.test.ts`) is the phase that validates real trigger/action authoring behavior.
- **Phase 4.3** (`demo.test.ts`, `smoke.test.ts`, `standalone.test.ts`) is generic smoke/demo coverage and does **not** validate discovery-panel action/trigger insertion.

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

### Issue: Command palette fails to open in designer tests (ACTIVE)
**Symptom**: `Waiting for element to be located By(css selector, .quick-input-widget) Wait timed out after 5xxxms` — affects all tests that call `executeOpenDesignerCommand()`.
**Cause**: `workbench.openCommandPrompt()` (ExTester API) intermittently fails to open the command palette. All 3 retry attempts time out after 5s each. The command availability tests (which use the same approach) eventually succeed but take ~57s.
**Impact**: All designer open and designer action tests fail because they can't execute the "Open Designer" command.
**Diagnosis**: This may be a timing issue — the extension or VS Code may not be fully ready to accept keyboard shortcuts after workspace switching. The `openWorkspaceFileInSession()` function waits 8s+5s but this may not be enough after multiple workspace switches in the same session.
**Potential fixes**:
  1. Increase timeout in `workbench.openCommandPrompt()` wait (currently ~5s per attempt)
  2. Use `VSBrowser.instance.driver.actions().keyDown(Key.F1).keyUp(Key.F1)` instead of ExTester's `openCommandPrompt()`
  3. Use `workbench.executeCommand('workbench.action.showCommands')` via `vscode.commands.executeCommand` API
  4. Add a longer stabilization wait after workspace switching
  5. Use `vscode.commands.executeCommand('azureLogicAppsStandard.openDesigner')` directly instead of command palette (requires webview extension API access)

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
| `EXTENSION_READY_TIMEOUT_MS` | 60s | Poll until extension activates and registers commands |
| `WEBVIEW_OPEN_WAIT_MS` | 10s | Wait for webview tab to appear after command |
| `SWITCH_FRAME_TIMEOUT_MS` | 30s | Wait for webview iframe to be switchable |
| `ELEMENT_RENDER_WAIT_MS` | 5s | Wait for React to render form elements |
| `SUITE_TIMEOUT_MS` | 180s | Overall Mocha suite timeout |
| `TEST_TIMEOUT_MS` | 60s | Per-test timeout |
| `LONG_TEST_TIMEOUT_MS` | 90s | Full wizard flow tests |

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

### Phase 4.2 — Designer Tests (5 passing, 20 failing)

Runtime: ~8 minutes

**Passing (5):**
| Suite | Test | Notes |
|-------|------|-------|
| Workspace Manifest | should load manifest from disk | Reads `created-workspaces.json` |
| Workspace Manifest | should have workspace directories | Verifies all workspace paths exist |
| Command Discovery | should have open designer command | Extension commands available |
| Command Discovery | should find Open Designer in palette | Command palette search works (~57s) |
| RulesEngine Files | should verify rules engine workspace files | File structure validation |

**Failing (20):**
- **Root cause 1 — Command palette unreliable (dominant):** `workbench.openCommandPrompt()` → `.quick-input-widget` selector times out after 5s × 3 attempts. Affects all tests that need to execute the "Open Designer" command via command palette.
- **Root cause 2 — Stale workspaces:** When re-running Phase 4.2 with `E2E_MODE=designeronly`, previous run's `after()` hook may have cleaned up workspaces.
- **Root cause 3 — Missing workflow.json:** CustomCode workspaces sometimes lack the `workflow.json` file in the expected path.

### Test Inventory (All Phases Combined: 68 passing, 21 failing)

**Phase 4.1 — createWorkspace.test.ts (63 pass, 1 fail)**

| Suite | # | Tests | Status |
|-------|---|-------|--------|
| VS Code Basic | 5 | VS Code title, activity bar, sidebar, editor, instance | ✅ |
| Smoke Tests | 5 | VS Code load, activity bar, command palette, search, explorer | ✅ |
| Simple Suite | 4 | Basic assertions (math, string, array, async) | ✅ |
| Create Workspace (non-destructive) | 6 | Command selection, form values, workflow types, step indicator, button states | ✅ |
| Create Workspace (destructive) | 48 | 12 workspace types × 4 tests each (creation, disk verify, workspace file, manifest) | 47 ✅, 1 ❌ |

**Phase 4.2 — designerOpen.test.ts + designerActions.test.ts (5 pass, 20 fail)**

| Suite | # | Tests | Status |
|-------|---|-------|--------|
| Workspace Manifest | 2 | Manifest load, workspace directories | ✅ |
| Command Discovery | 2 | Extension commands, palette search | ✅ |
| RulesEngine Files | 1 | Rules engine file structure | ✅ |
| Designer Open (all types) | ~10 | Open designer for each workspace type | ❌ (command palette timeout) |
| Designer Actions | ~10 | Add trigger/action to designer | ❌ (command palette timeout) |

## 11. What Needs Work (Prioritized)

### P0: Fix command palette reliability in designer tests
**Impact**: Blocks ALL 20 designer tests
**Problem**: `workbench.openCommandPrompt()` → `.quick-input-widget` times out after 5s × 3 retries. The ExTester API uses `By.css('.quick-input-widget')` which sometimes doesn't appear within the expected timeframe, especially after workspace switching.
**Potential solutions**:
1. Use `VSBrowser.instance.driver.actions().keyDown(Key.F1).keyUp(Key.F1)` directly instead of ExTester wrapper
2. Increase the individual attempt timeout beyond 5s (currently hardcoded in ExTester)
3. Use `vscode.commands.executeCommand('azureLogicAppsStandard.openDesigner')` directly via webdriver Execute Script (would require extension host API access from Selenium)
4. Add longer stabilization wait (10-15s) after workspace switching before attempting command palette
5. Consider bypassing command palette entirely — use ExTester's `executeCommand()` API or `workbench.executeCommand()` if available

### P0: Ensure fresh workspaces before Phase 4.2
**Impact**: Blocks workspace structure validation tests when run in isolation
**Problem**: `E2E_MODE=designeronly` assumes workspaces from Phase 4.1 still exist. The `after()` cleanup hook deletes them.
**Potential solutions**:
1. Move cleanup to a separate opt-in script instead of automatic `after()` hook
2. Only clean up on explicit flag (e.g., `E2E_CLEANUP=true`)
3. Skip cleanup when tests detect they'll be used by Phase 4.2

### P1: Fix namespace validation product bug
**Impact**: 1 test failure in Phase 4.1
**Problem**: In `createWorkspace.tsx` line ~271, `canProceed()` uses `nameValidation` regex for function namespace field. It should use `namespaceValidation` which allows dots. This causes dotted namespaces to pass field validation but silently disable the Next button.
**Workaround**: Tests use dot-free namespaces.

### P1: CustomCode workspace missing workflow.json
**Impact**: CustomCode designer tests fail at file verification step
**Problem**: `workflow.json` not found for CustomCode workspace types at the manifest-recorded path.
**Potential solutions**:
1. Verify manifest path recording logic in `createWorkspace.test.ts` matches actual disk layout
2. May need to handle different directory structures for CustomCode vs standard workspaces

### P2: Test reliability improvements
- Add `assertCorrectWebview()` calls in test `beforeEach` to catch wrong-webview issues early
- Add more granular review step value verification (currently checks summary section exists but doesn't assert specific values)
- Add negative test: verify error shown when invalid namespace/name entered
- Tighten `try/catch` wrappers — some tests silently swallow errors

### P3: CI integration
- Tests require a display (Selenium drives a real VS Code window)
- For CI, need Xvfb (Linux) or similar virtual display
- Tests take ~18 minutes total — consider parallelization for multiple suites
- Need process cleanup in CI (language servers may persist between runs)

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

### Debug command palette failures
1. Check if VS Code is fully loaded: look for the status bar to have no loading spinners
2. Try increasing stabilization wait after workspace switch (currently 8s + 5s)
3. Check if notification toasts are covering UI elements — `dismissNotifications()` helper
4. In test output, look for `quick-input-widget` — if it never appears, the command palette keyboard shortcut may not be reaching VS Code

## 15. Lessons Learned (2026-02-24)

### Key Insights from Test Development

1. **Workspace creation is reliable; designer interaction is not.** Phase 4.1 (workspace creation) achieves 98.4% pass rate (63/64). Phase 4.2 (designer open/actions) has only 20% pass rate (5/25). The bottleneck is the command palette interaction after workspace switching.

2. **ExTester's command palette API is the weakest link.** `workbench.openCommandPrompt()` uses `By.css('.quick-input-widget')` with a fixed timeout that can't be configured. When VS Code is busy (e.g., after loading a new workspace), the command palette simply won't open. This is a fundamental limitation of driving VS Code via Selenium.

3. **Azure connector prompts are a subtle blocker.** The extension's designer loading path checks for `WORKFLOWS_SUBSCRIPTION_ID` and launches a blocking wizard if undefined. Standard workspaces set this during creation, but test environments need explicit setup. The fix (empty string in `local.settings.json`) was non-obvious.

4. **Process cleanup is critical on Windows.** Language servers (Roslyn, Azure Deployment Express, JSON Language Server) persist after test VS Code instances close. They hold file locks on `test-resources/settings/logs/` entries. Without aggressive process killing + retry loops, subsequent test runs fail at startup.

5. **Workspace manifest pattern works well.** Persisting workspace metadata to `created-workspaces.json` in Phase 4.1, then reading it in Phase 4.2, decouples creation from consumption. This enables `E2E_MODE=designeronly` for faster iteration on designer tests.

6. **Webview iframe switching is fragile.** Must call `switchToFrame()` before any webview element interaction and `switchBack()` before VS Code chrome interaction. Forgetting either direction silently fails with confusing element-not-found errors.

7. **Hyphens in generated code are a class of bugs.** The `uniqueName()` function in tests and the webview validation regex both allowed hyphens, which are invalid in C# identifiers. Defense-in-depth was required: fix the regex AND sanitize at template rendering. The old wizard got this right; the new webview wizard didn't.

8. **Two test systems coexist.** `src/test/ui/` (ExTester, Selenium, GUI interaction) and `src/test/e2e/` (@vscode/test-cli, extension host API) serve different purposes. Neither replaces the other. ExTester for webview UI; @vscode/test-cli for programmatic extension API testing.

### Architecture Decisions That Paid Off

- **Phase separation (4.1 / 4.2)**: Allows re-running designer tests without re-creating workspaces
- **tsup for test compilation**: Reliable CJS output; `tsc` had inconsistent module format issues
- **Workspace manifest**: Single source of truth for workspace paths, prevents hardcoded path drift
- **`run-e2e.js` as orchestrator**: Plain JS (no compile step needed), handles extension copying, dependency installation, process cleanup, and test execution in one script
- **Multi-layered process cleanup**: 6 fallback strategies for EBUSY errors; always succeeds eventually

### What We'd Do Differently

- **Start with direct command execution** instead of command palette. Using `vscode.commands.executeCommand()` directly would avoid the command palette reliability issues entirely.
- **Pre-create `local.settings.json`** in all workspace creation tests to prevent Azure connector prompts. Discovered late that this is needed for designer tests.
- **Use `VSBrowser.instance.openResources()`** from the start for file opening instead of building custom Quick Open logic. This ExTester API is more reliable.
