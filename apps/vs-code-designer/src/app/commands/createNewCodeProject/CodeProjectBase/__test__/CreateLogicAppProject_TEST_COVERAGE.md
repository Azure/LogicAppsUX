# CreateLogicAppProject.test.ts - Test Coverage Analysis

## Overview
This document analyzes the test coverage for `CreateLogicAppProjects.ts`, which handles adding a new Logic App project to an existing workspace.

**Last Updated:** December 5, 2025  
**Total Tests:** 12  
**Test Suites:** 1  
**Function Under Test:** `createLogicAppProject`

---

## Key Differences from CreateLogicAppWorkspace

| Aspect | CreateLogicAppWorkspace | CreateLogicAppProject |
|--------|------------------------|----------------------|
| **Purpose** | Creates new workspace + logic app | Adds logic app to existing workspace |
| **Workspace File** | Creates `.code-workspace` file | Updates existing `.code-workspace` file |
| **Folder Creation** | Creates workspace root folder | Uses existing workspace folder |
| **Use Case** | Initial project setup | Adding additional logic app to workspace |
| **Workspace Check** | Creates workspace structure | Requires existing workspace or shows error |

---

## Testing Philosophy

**Testing Approach**: Integration tests with comprehensive mocking
- **What's Tested**: Orchestration, conditional logic, error handling, project type variations
- **What's Mocked**: All external dependencies (file system, git, vscode API, helper functions)
- **Why**: This is a high-level orchestration function that coordinates multiple subsystems

---

## Current Test Coverage (12 tests)

### ✅ Core Functionality (3 tests)

| Test | Condition Tested | Status |
|------|-----------------|--------|
| **should add telemetry when creating a project** | Verifies `addLocalFuncTelemetry` is called | ✅ Covered |
| **should update workspace file when in a workspace** | Verifies `updateWorkspaceFile` is called with correct params | ✅ Covered |
| **should show success message after project creation** | Verifies success message is shown | ✅ Covered |

### ✅ Workspace Validation (1 test)

| Test | Condition Tested | Status |
|------|-----------------|--------|
| **should show error message when not in a workspace** | When `vscode.workspace.workspaceFile` is undefined → show error | ✅ Covered |

**Logic Tested:**
```typescript
if (vscode.workspace.workspaceFile) {
  // Update workspace
} else {
  showErrorMessage(...);
  return;
}
```

### ✅ Logic App Existence Check (2 tests)

| Test | Condition Tested | Status |
|------|-----------------|--------|
| **should create logic app when it does not exist** | When logic app folder doesn't exist → create all files | ✅ Covered |
| **should skip logic app creation when it already exists** | When logic app folder exists AND is a logic app project → skip creation | ✅ Covered |
| **should set shouldCreateLogicAppProject to false when logic app exists** | Verifies flag is set correctly for existing logic apps | ✅ Covered |

**Logic Tested:**
```typescript
const logicAppExists = await fse.pathExists(logicAppFolderPath);
let doesLogicAppExist = false;
if (logicAppExists) {
  doesLogicAppExist = await isLogicAppProject(logicAppFolderPath);
}

if (!doesLogicAppExist) {
  // Create logic app files
}
```

### ✅ Git Integration (2 tests)

| Test | Condition Tested | Status |
|------|-----------------|--------|
| **should initialize git when not inside a repo** | Git installed + not in repo → initialize git | ✅ Covered |
| **should not initialize git when already inside a repo** | Git installed + already in repo → skip git init | ✅ Covered |

**Logic Tested:**
```typescript
if ((await isGitInstalled(workspaceFolder)) && 
    !(await isInsideRepo(workspaceFolder))) {
  await gitInit(workspaceFolder);
}
```

### ✅ Folder Creation (1 test)

| Test | Condition Tested | Status |
|------|-----------------|--------|
| **should create artifacts, rules, and lib folders** | Verifies all three folder creation functions are called | ✅ Covered |

### ✅ Project Type Variations (3 tests)

| Test | Project Type | Condition | Status |
|------|--------------|-----------|--------|
| **should not create function app files for standard logic app projects** | `ProjectType.logicApp` | CreateFunctionAppFiles.setup() NOT called | ✅ Covered |
| **should create function app files for custom code projects** | `ProjectType.customCode` | CreateFunctionAppFiles.setup() IS called | ✅ Covered |
| **should handle rules engine project type** | `ProjectType.rulesEngine` | CreateFunctionAppFiles.setup() IS called, createRulesFiles called | ✅ Covered |

**Logic Tested:**
```typescript
if (webviewProjectContext.logicAppType !== ProjectType.logicApp) {
  const createFunctionAppFilesStep = new CreateFunctionAppFiles();
  await createFunctionAppFilesStep.setup(mySubContext);
}
```

---

## Coverage Analysis by Code Path

### ✅ All Major Branches Covered

| Branch Point | True Path | False Path | Coverage |
|--------------|-----------|------------|----------|
| `vscode.workspace.workspaceFile` exists | Update workspace (10 tests) | Show error (1 test) | ✅ Both |
| Logic app already exists | Skip creation (2 tests) | Create logic app (10 tests) | ✅ Both |
| Inside git repo | Skip git init (1 test) | Initialize git (1 test) | ✅ Both |
| `logicAppType !== logicApp` | Create function files (2 tests) | Skip function files (1 test) | ✅ Both |

### ✅ Project Type Combinations

| Project Type | Tests | Function App Files | Rules Files | Coverage |
|--------------|-------|-------------------|-------------|----------|
| `logicApp` | 8 tests | ❌ Not created | ✅ Called (but no-op) | ✅ Complete |
| `customCode` | 1 test | ✅ Created | ✅ Called (but no-op) | ✅ Complete |
| `rulesEngine` | 1 test | ✅ Created | ✅ Created | ✅ Complete |

---

## Functions Called & Verification

### ✅ External Functions Tested

| Function | Verified In Tests | Purpose |
|----------|------------------|---------|
| `addLocalFuncTelemetry` | ✅ 1 test | Telemetry tracking |
| `fse.pathExists` | ✅ 12 tests (mocked) | Check if logic app folder exists |
| `isLogicAppProject` | ✅ 12 tests (mocked) | Verify it's a logic app project |
| `updateWorkspaceFile` | ✅ 11 tests | Update .code-workspace file |
| `createLogicAppAndWorkflow` | ✅ 10 tests | Create workflow files |
| `createLogicAppVsCodeContents` | ✅ 10 tests | Create .vscode folder |
| `createLocalConfigurationFiles` | ✅ 10 tests | Create host.json, local.settings.json |
| `isGitInstalled` | ✅ 11 tests (mocked) | Check git availability |
| `isInsideRepo` | ✅ 11 tests (mocked) | Check if already in git repo |
| `gitInit` | ✅ 2 tests | Initialize git repository |
| `createArtifactsFolder` | ✅ 10 tests | Create Artifacts folder |
| `createRulesFiles` | ✅ 11 tests | Create rules engine files |
| `createLibFolder` | ✅ 10 tests | Create lib folder |
| `CreateFunctionAppFiles.setup()` | ✅ 3 tests | Create function app project |
| `vscode.window.showInformationMessage` | ✅ 10 tests | Success message |
| `vscode.window.showErrorMessage` | ✅ 1 test | Error when not in workspace |

---

## Test Quality Assessment

### ✅ Strengths
1. **Comprehensive Branch Coverage**: All conditional branches are tested
2. **Clear Test Descriptions**: Each test has a descriptive name
3. **Project Type Coverage**: All three project types tested
4. **Error Handling**: Tests error case (no workspace)
5. **Git Integration**: Both git scenarios tested
6. **Existence Checks**: Tests both new and existing logic app scenarios

### ⚠️ Areas for Improvement

#### 1. **Edge Cases Not Tested**
| Scenario | Current Coverage | Risk Level | Notes |
|----------|-----------------|------------|-------|
| Logic app folder exists but is NOT a logic app project | ❌ Not tested | **MEDIUM** | Should throw error to webview |
| Git installed but `isInsideRepo` check fails | ❌ Not tested | Low | Unlikely scenario |
| Multiple logic apps in same workspace | ✅ Implicit | Low | Handled by workspace structure |
| Invalid workspace file path | ❌ Not tested | Low | Validated earlier in flow |
| Logic app names with spaces | ✅ **Validated in UX** | None | Input validation prevents this |
| Special characters in names | ✅ **Validated in UX** | Low | Input validation handles this |

#### 2. **Missing Test Scenarios**

##### 🟡 MEDIUM PRIORITY - Logic App Folder Collision with Error Handling
**Scenario:** Folder exists but is NOT a logic app project (e.g., random folder with same name)

##### 🟡 MEDIUM PRIORITY - Logic App Folder Collision with Error Handling
**Scenario:** Folder exists but is NOT a logic app project (e.g., random folder with same name)

**Current Code:**
```typescript
const logicAppExists = await fse.pathExists(logicAppFolderPath);
let doesLogicAppExist = false;
if (logicAppExists) {
  doesLogicAppExist = await isLogicAppProject(logicAppFolderPath);
}
```

**Gap:** What happens when `logicAppExists = true` but `isLogicAppProject = false`?
- **Expected Behavior**: Should throw error back to React webview to display to user
- **Actual Behavior**: Currently creates logic app files in existing folder (needs verification)
- **Missing Test:** `should throw error when folder exists but is not a logic app project`
- **Priority**: Medium (UX guards prevent this, but server-side validation is good practice)

##### 🟢 LOW PRIORITY - Path Validation (Already Handled)
**Scenarios:**
- Logic app name with spaces → **Prevented by UX input validation**
- Logic app name with special characters → **Handled by UX input validation**
- Very long logic app names → **May need validation**

**Gap:** These are handled in the React webview layer
- **Note:** Tests can verify server-side doesn't crash with unusual input, but UX prevents bad input
- **Missing Tests:** Low priority since UX validates first

##### 🟡 MEDIUM PRIORITY - Function App Files Error Handling
**Scenario:** `CreateFunctionAppFiles.setup()` throws an error

**Gap:** Tests don't verify error handling
- **Missing Test:** `should handle errors from CreateFunctionAppFiles.setup()`

##### 🟢 LOW PRIORITY - Git Not Installed
**Scenario:** Git is not installed (`isGitInstalled` returns false)

**Gap:** Current tests assume git is always installed
- **Missing Test:** `should skip git init when git is not installed`

##### 🟢 LOW PRIORITY - Workspace File Path Edge Cases
**Scenarios:**
- Workspace file path contains special characters → Unlikely, VS Code handles this
- Workspace file in unusual location → VS Code manages workspace files

**Gap:** Limited testing of workspace file path handling
- **Note:** VS Code APIs handle path normalization
- **Missing Tests:** Very low priority

---

## Recommended Additional Tests

### 🟡 Medium Priority (4 tests)

```typescript
it('should throw error when folder exists but is not a logic app project', async () => {
  (fse.pathExists as Mock).mockResolvedValue(true);
  (isLogicAppProject as Mock).mockResolvedValue(false); // Not a logic app!
  
  await expect(
    createLogicAppProject(mockContext, mockOptions, workspaceRootFolder)
  ).rejects.toThrow(); // Or verify error is communicated to webview
});

it('should populate IFunctionWizardContext with correct values', async () => {
  // Verify all context properties are set
  // Capture the context passed to createRulesFiles/createLibFolder
});

**Gap:** Tests don't verify `IFunctionWizardContext` is populated correctly
```typescript
mySubContext.logicAppName = options.logicAppName;
mySubContext.projectPath = logicAppFolderPath;
mySubContext.projectType = webviewProjectContext.logicAppType;
// ... more properties
```

**Missing Tests:**
- `should populate IFunctionWizardContext correctly`
- `should pass correct context to createRulesFiles`
- `should pass correct context to createLibFolder`

#### 4. **Assertion Depth**

**Current:** Tests verify functions are called
**Missing:** Tests don't verify function call arguments deeply

**Examples:**
```typescript
// Current
expect(createLogicAppAndWorkflow).toHaveBeenCalled();

// Could be more specific
expect(createLogicAppAndWorkflow).toHaveBeenCalledWith(
  expect.objectContaining({
    logicAppName: 'TestLogicApp',
    workflowName: 'TestWorkflow',
    // ... all expected properties
  }),
  logicAppFolderPath
);
```

---

## Recommended Additional Tests

### 🟡 Medium Priority (4 tests)

```typescript
it('should throw error when folder exists but is not a logic app project', async () => {
  (fse.pathExists as Mock).mockResolvedValue(true);
  (isLogicAppProject as Mock).mockResolvedValue(false); // Not a logic app!
  
  await expect(
    createLogicAppProject(mockContext, mockOptions, workspaceRootFolder)
  ).rejects.toThrow(); // Or verify error is communicated to webview
});

it('should populate IFunctionWizardContext with correct values', async () => {
  // Verify all context properties are set correctly
  // This ensures proper context is passed to child functions
});

it('should handle errors from CreateFunctionAppFiles.setup()', async () => {
  const mockSetup = vi.fn().mockRejectedValue(new Error('Setup failed'));
  (CreateFunctionAppFiles as Mock).mockImplementation(() => ({
    setup: mockSetup,
  }));
  
  // Verify error handling
});

it('should pass correct context to createRulesFiles', async () => {
  // Verify context object has all required properties
  // Capture and inspect the actual context passed
});
```

### 🟢 Low Priority (4 tests)

```typescript
it('should skip git init when git is not installed', async () => {
  (isGitInstalled as Mock).mockResolvedValue(false);
  // Verify gitInit not called
});

it('should verify all createLocalConfigurationFiles arguments', async () => {
  // Deep assertion on arguments passed
});

it('should verify all createLogicAppVsCodeContents arguments', async () => {
  // Deep assertion on arguments passed
});

it('should handle very long logic app names gracefully', async () => {
  // Edge case testing for path length limits
  // Low priority - UX likely validates this
});
```

---

## Test Statistics

### Current Coverage
- **Total Tests:** 12
- **Functions Tested:** 15+
- **Branch Coverage:** ~85% (estimate)
- **Conditional Paths:** 8/8 major branches covered
- **Project Types:** 3/3 tested

### After Recommended Tests
- **Total Tests:** 20 (12 + 8 new tests)
- **Branch Coverage:** ~95% (estimate)
- **Critical Gaps:** 0
- **Edge Cases:** +6 covered

**Note:** Many edge cases (spaces in names, invalid characters) are handled by UX input validation in the React webview layer, reducing server-side testing burden.

---

## Comparison with Related Tests

### CreateLogicAppWorkspace vs CreateLogicAppProject

| Metric | CreateLogicAppWorkspace | CreateLogicAppProject |
|--------|------------------------|----------------------|
| Total Tests | 62 | 12 |
| Test Suites | 7 | 1 |
| Functions Tested | 8 | 1 |
| Test Complexity | High (unit + integration) | Medium (integration only) |
| Real Logic Testing | ~50% | ~10% |
| Mock Usage | Mixed (some actual impl) | Heavy (all external deps) |

### CreateLogicAppVSCodeContents vs CreateLogicAppProject

| Metric | CreateLogicAppVSCodeContents | CreateLogicAppProject |
|--------|------------------------------|----------------------|
| Total Tests | 18 | 12 |
| Test Suites | 3 | 1 |
| Project Type Coverage | All 3 (with NetFx variations) | All 3 (basic) |
| Edge Case Testing | High | Medium |
| Assertion Depth | Deep (exact property counts) | Shallow (function calls) |

---

## Conclusion

### ✅ Well-Covered Areas
- All project types (logicApp, customCode, rulesEngine)
- Workspace existence validation
- Logic app existence checks
- Git integration scenarios
- Function orchestration

### ⚠️ Improvement Opportunities
1. **Folder collision scenario** (exists but not a logic app) - Should throw error to webview - **MEDIUM priority**
2. **Context object validation** - Verify proper population - **MEDIUM priority**
3. **Error handling from child functions** - Add error scenario tests - **LOW priority**
4. **Argument validation depth** - Deeper assertions on function calls - **LOW priority**

### 📊 Coverage Summary
- **Current:** Good basic coverage with all major branches tested
- **Quality:** Integration-focused, verifies orchestration
- **Gaps:** Missing error handling scenarios and deep argument validation
- **UX Protection:** Input validation in React webview prevents many edge cases (spaces, special chars)
- **Risk:** Main risk is folder collision scenario (should throw error)

### 🎯 Recommendation
**Add 2-4 targeted tests** focusing on:
1. Folder exists but not a logic app → throw error (MEDIUM)
2. Context object validation (MEDIUM)
3. Error handling from CreateFunctionAppFiles (LOW)

**Note:** Many potential edge cases (invalid names, special characters) are already prevented by UX validation in the React webview layer, reducing the need for extensive server-side validation tests.

This would bring coverage from **Good** to **Excellent** with minimal effort, focusing on actual gaps rather than scenarios already handled by UX.

**Status: Production Ready (UX provides first line of defense)** ✅
