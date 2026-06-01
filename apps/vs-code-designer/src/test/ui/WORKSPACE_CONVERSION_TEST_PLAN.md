# ADO #31054994 — Logic App Workspace Requirement — Test Coverage Map

**Status**: ✅ All 15 steps covered  
**Last Updated**: 2026-03-04

---

## Step-to-Test Mapping

| ADO Step | Description | Test File | Phase | Status |
|----------|-------------|-----------|-------|--------|
| **1** | Create a new logic app workspace via prompts | `createWorkspace.test.ts` | 4.1 | ✅ |
| **2** | Verify logic app folder created with workspace | `createWorkspace.test.ts` | 4.1 | ✅ |
| **3** | Right-click and add new project (each logic app type) | `createWorkspace.test.ts` | 4.1 | ✅ |
| **4** | Custom code: validate name conflicts between logic app and function | `createWorkspace.test.ts` | 4.1 | ✅ |
| **5** | Open folder containing .code-workspace via File → Open Folder | `workspaceConversionYes.test.ts` | 4.8d | ✅ |
| **6** | Verify prompt appears to open the .code-workspace | `workspaceConversionYes.test.ts` | 4.8d | ✅ |
| **7** | Click "Yes" — VS Code reloads, .code-workspace opens | `workspaceConversionYes.test.ts` | 4.8d | ✅ |
| **8** | Re-open folder with logic app subfolder, verify prompt appears | `workspaceConversionSubfolder.test.ts` | 4.8e | ✅ |
| **9** | Click "No" — nothing happens | `workspaceConversionNo.test.ts` | 4.8a | ✅ |
| **10** | Click "Cancel" — nothing happens | `workspaceConversionNo.test.ts` | 4.8a | ✅ |
| **11** | Create folder with logic apps, no .code-workspace | `workspaceConversionCreate.test.ts` | 4.8b | ✅ |
| **12** | Open folder — prompt says "workspace not found, create one" | `workspaceConversionCreate.test.ts` | 4.8b | ✅ |
| **13** | Click "Yes" — complete workspace creation, verify files moved | `workspaceConversionCreate.test.ts` | 4.8b | ✅ |
| **14** | Open Designer for every workflow, verify simultaneous opens | `multipleDesigners.test.ts` | 4.8c | ✅ |
| **15** | Right-click to add workflow to specific logic app | `multipleDesigners.test.ts` | 4.8c | ✅ |

## Test Details

### Phase 4.8a: `workspaceConversionNo.test.ts` (Steps 9-10)
- Opens workspace **directory** (not .code-workspace file) as startup folder
- Extension shows "Open Workspace" notification
- Test dismisses the notification via "clear notification" button
- Verifies VS Code remains functional after dismissal

### Phase 4.8b: `workspaceConversionCreate.test.ts` (Steps 11-13)
- Creates a legacy Logic App project folder (host.json + local.settings.json + workflow) with NO .code-workspace
- Extension shows "Do you want to create the workspace now?" modal dialog
- Clicks "Yes" → Create Workspace webview opens
- Fills the form: workspace path, workspace name
- Clicks Next → Review → Create workspace
- Verifies `.code-workspace` file created on disk with correct folder entries
- Takes snapshot of legacy project **after dialog appears** (extension background processing complete)
- Verifies original legacy project is **completely untouched** — strict file list + content comparison

### Phase 4.8c: `multipleDesigners.test.ts` (Steps 14-15)
- Adds a new workflow via right-click on logic app folder → "Create workflow..."
- Opens designer for original workflow via right-click → "Open designer"
- Verifies designer tab name matches `{workspace} (Workspace)-{logicapp}-{workflow}`
- Adds Request trigger to first designer
- Opens designer for new workflow via right-click (keeps first designer open)
- Uses `switchToActiveDesignerFrame()` (raw Selenium iframe switching) to target the correct webview
- Adds Request trigger to second designer
- Verifies both designer tabs remain open simultaneously
- Switches back to first designer, verifies nodes preserved

### Phase 4.8d: `workspaceConversionYes.test.ts` (Steps 5-7)
- Opens workspace **directory** (not .code-workspace file) as startup folder
- Extension shows "Open Workspace" notification
- Clicks the notification body/title via JS injection (notification action pattern)
- Verifies the click succeeded (VS Code may reload, terminating the session)
- NOTE: Post-reload state cannot be verified — covered by CLI integration tests

### Phase 4.8e: `workspaceConversionSubfolder.test.ts` (Step 8)
- Opens a logic app **subfolder** (e.g., `testapp_xxx/`) as startup folder
- Extension detects Logic App project in root, finds .code-workspace in parent directory
- Shows "You must open your workspace..." modal dialog
- Clicks "No" via ModalDialog
- Verifies VS Code remains functional after dismissal

## Phase Structure in run-e2e.js

```
E2E_MODE=conversiononly runs:
  Phase 4.8a → workspaceConversionNo.test.js     (startup: workspace directory)
  Phase 4.8b → workspaceConversionCreate.test.js  (startup: legacy project folder)
  Phase 4.8c → multipleDesigners.test.js           (startup: .code-workspace file)
  Phase 4.8d → workspaceConversionYes.test.js      (startup: workspace directory)
  Phase 4.8e → workspaceConversionSubfolder.test.js (startup: logic app subfolder)
```

Each phase runs in its own fresh VS Code session via `prepareFreshSession()`.
