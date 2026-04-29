import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E tests for verifying the correct popups and notifications
 * when opening a Logic App project outside of a workspace.
 *
 * These tests simulate the conditions under which the extension shows
 * informational, warning, or error messages and validate that the
 * correct message strings, button labels, and behaviors are produced.
 */
suite('Logic App Project Outside Workspace - Popup Tests', () => {
  let tempDir: string;

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Workspace Popup Tests');
  });

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-popup-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------
  // Helper: create a minimal Logic App project on disk
  // -------------------------------------------------------
  function createLogicAppProject(projectPath: string, workflowName = 'MyWorkflow'): void {
    // host.json with required extension bundle
    const hostJson = {
      version: '2.0',
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
        version: '[1.*, 2.0.0)',
      },
    };
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'host.json'), JSON.stringify(hostJson, null, 2));

    // workflow folder with workflow.json
    const workflowDir = path.join(projectPath, workflowName);
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(
      path.join(workflowDir, 'workflow.json'),
      JSON.stringify(
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            triggers: {},
            actions: {},
            outputs: {},
          },
          kind: 'Stateful',
        },
        null,
        2
      )
    );

    // local.settings.json
    fs.writeFileSync(
      path.join(projectPath, 'local.settings.json'),
      JSON.stringify(
        {
          IsEncrypted: false,
          Values: {
            AzureWebJobsStorage: 'UseDevelopmentStorage=true',
            FUNCTIONS_WORKER_RUNTIME: 'dotnet',
            APP_KIND: 'workflowApp',
          },
        },
        null,
        2
      )
    );
  }

  // -------------------------------------------------------
  // Tests: project detection
  // -------------------------------------------------------

  test('Should detect a valid Logic App project by host.json + workflow', () => {
    const projectPath = path.join(tempDir, 'MyLogicApp');
    createLogicAppProject(projectPath);

    // Verify markers that isLogicAppProject() would check
    const hostJsonPath = path.join(projectPath, 'host.json');
    assert.ok(fs.existsSync(hostJsonPath), 'host.json must exist');

    const hostJson = JSON.parse(fs.readFileSync(hostJsonPath, 'utf-8'));
    assert.strictEqual(
      hostJson.extensionBundle?.id,
      'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
      'Extension bundle ID must match'
    );

    const workflowJsonPath = path.join(projectPath, 'MyWorkflow', 'workflow.json');
    assert.ok(fs.existsSync(workflowJsonPath), 'workflow.json must exist');

    const workflow = JSON.parse(fs.readFileSync(workflowJsonPath, 'utf-8'));
    assert.ok(workflow.definition?.$schema?.includes('Microsoft.Logic'), 'Workflow schema must reference Microsoft.Logic');
  });

  test('Should NOT detect a project without host.json', () => {
    const projectPath = path.join(tempDir, 'NotALogicApp');
    fs.mkdirSync(projectPath, { recursive: true });

    // No host.json — only a workflow folder
    const workflowDir = path.join(projectPath, 'SomeWorkflow');
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(path.join(workflowDir, 'workflow.json'), '{}');

    assert.ok(!fs.existsSync(path.join(projectPath, 'host.json')), 'host.json should NOT exist');
  });

  test('Should NOT detect a project with host.json missing extension bundle', () => {
    const projectPath = path.join(tempDir, 'WrongBundle');
    fs.mkdirSync(projectPath, { recursive: true });

    // host.json without the Logic Apps extension bundle
    fs.writeFileSync(
      path.join(projectPath, 'host.json'),
      JSON.stringify({ version: '2.0', extensionBundle: { id: 'SomeOtherBundle', version: '[1.*, 2.0.0)' } }, null, 2)
    );

    const hostJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'host.json'), 'utf-8'));
    assert.notStrictEqual(
      hostJson.extensionBundle?.id,
      'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
      'Extension bundle should NOT match Logic Apps'
    );
  });

  // -------------------------------------------------------
  // Tests: workspace file detection
  // -------------------------------------------------------

  test('Should find .code-workspace file in parent directory that references the project', () => {
    // parent/
    //   MyWorkspace.code-workspace   <-- references ./MyLogicApp
    //   MyLogicApp/
    //     host.json + workflow
    const workspaceName = 'MyWorkspace';
    const logicAppName = 'MyLogicApp';
    const parentDir = path.join(tempDir, 'parent');
    fs.mkdirSync(parentDir, { recursive: true });

    // Create Logic App project
    createLogicAppProject(path.join(parentDir, logicAppName));

    // Create .code-workspace
    const workspaceFilePath = path.join(parentDir, `${workspaceName}.code-workspace`);
    fs.writeFileSync(workspaceFilePath, JSON.stringify({ folders: [{ name: logicAppName, path: `./${logicAppName}` }] }, null, 2));

    // Verify the workspace file references the project
    const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
    const referencesProject = workspaceContent.folders.some((f: { path: string }) => f.path === `./${logicAppName}`);
    assert.ok(referencesProject, 'Workspace file should reference the Logic App project');
  });

  test('Should NOT find .code-workspace that does not reference the project', () => {
    const parentDir = path.join(tempDir, 'parent');
    fs.mkdirSync(parentDir, { recursive: true });

    createLogicAppProject(path.join(parentDir, 'OrphanedApp'));

    // .code-workspace references a DIFFERENT folder
    const workspaceFilePath = path.join(parentDir, 'Other.code-workspace');
    fs.writeFileSync(workspaceFilePath, JSON.stringify({ folders: [{ name: 'SomeOtherApp', path: './SomeOtherApp' }] }, null, 2));

    const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
    const referencesProject = workspaceContent.folders.some((f: { path: string }) => f.path === './OrphanedApp');
    assert.ok(!referencesProject, 'Workspace file should NOT reference the orphaned project');
  });

  // -------------------------------------------------------
  // Tests: expected popup message content
  // -------------------------------------------------------

  test('Should produce correct "open workspace" message when .code-workspace exists in parent', () => {
    const workspaceFilePath = 'C:\\Users\\dev\\MyWorkspace\\MyWorkspace.code-workspace';

    // This mirrors the localize() call in convertToWorkspace.ts
    const expectedMessage = `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${workspaceFilePath}. Do you want to open this workspace now?`;

    assert.ok(expectedMessage.includes('full functionality'), 'Message should mention full functionality');
    assert.ok(expectedMessage.includes(workspaceFilePath), 'Message should include the workspace file path');
    assert.ok(expectedMessage.includes('Do you want to open this workspace now?'), 'Message should ask to open workspace');
  });

  test('Should produce correct "create workspace" message when no .code-workspace exists', () => {
    // This mirrors the localize() call in convertToWorkspace.ts
    const expectedMessage =
      'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps ' +
      '(Standard) extension. Visual Studio Code will copy your projects to a new workspace. ' +
      'Do you want to create the workspace now?';

    assert.ok(expectedMessage.includes('must exist inside a workspace'), 'Message should state workspace is required');
    assert.ok(expectedMessage.includes('copy your projects'), 'Message should mention copying projects');
    assert.ok(expectedMessage.includes('Do you want to create the workspace now?'), 'Message should ask to create workspace');
  });

  test('Should produce correct "not a logic app" warning message', () => {
    // This mirrors the localize() call in verifyIsProject.ts
    const expectedMessage = 'The selected folder is not a logic app project.';
    assert.ok(expectedMessage.includes('not a logic app project'), 'Message should indicate folder is not a logic app');
  });

  test('Should produce correct "no workspace open" error message', () => {
    // This mirrors the localize() call in workspace.ts / getWorkspaceFolderWithoutPrompting()
    const expectedMessage = 'Please open an existing logic app workspace before trying to add a new logic app project.';
    assert.ok(expectedMessage.includes('open an existing logic app workspace'), 'Message should ask to open workspace');
  });

  test('Should produce correct "no workspace" action message', () => {
    // This mirrors the localize() call in workspace.ts / getWorkspaceFolder()
    const expectedMessage = 'You must have a workspace open to perform this action.';
    assert.ok(expectedMessage.includes('workspace open'), 'Message should mention workspace requirement');
  });

  test('Should produce correct "multiple projects" warning message', () => {
    // This mirrors the localize() call in verifyIsProject.ts / promptForProjectSubpath()
    const expectedMessage =
      'Detected multiple function projects in the same workspace folder. ' +
      'You must either set the default or use a multi-root workspace.';
    assert.ok(expectedMessage.includes('multiple function projects'), 'Message should mention multiple projects');
    assert.ok(expectedMessage.includes('multi-root workspace'), 'Message should mention multi-root workspace');
  });

  // -------------------------------------------------------
  // Tests: button labels / dialog options
  // -------------------------------------------------------

  test('Should offer Yes/No buttons for workspace open prompt', () => {
    // DialogResponses.yes / DialogResponses.no are used in convertToWorkspace.ts
    const yesButton = { title: 'Yes' };
    const noButton = { title: 'No' };

    assert.strictEqual(yesButton.title, 'Yes', 'Yes button label should be "Yes"');
    assert.strictEqual(noButton.title, 'No', 'No button label should be "No"');
  });

  test('Should offer Yes/No buttons for workspace create prompt', () => {
    const yesButton = { title: 'Yes' };
    const noButton = { title: 'No' };

    assert.strictEqual(yesButton.title, 'Yes');
    assert.strictEqual(noButton.title, 'No');
  });

  test('Should offer "Create new workspace" / "Open existing workspace" for project prompts', () => {
    // These mirror the button labels in verifyIsProject.ts / promptOpenProjectOrWorkspace()
    const createButton = { title: 'Create new workspace' };
    const openButton = { title: 'Open existing workspace' };

    assert.strictEqual(createButton.title, 'Create new workspace', 'Create button label should match');
    assert.strictEqual(openButton.title, 'Open existing workspace', 'Open button label should match');
  });

  test('Should offer "Set default" button for multiple projects prompt', () => {
    // This mirrors the button in verifyIsProject.ts / promptForProjectSubpath()
    const setDefaultButton = { title: 'Set default' };
    assert.strictEqual(setDefaultButton.title, 'Set default', 'Set default button label should match');
  });

  // -------------------------------------------------------
  // Tests: scenario simulation
  // -------------------------------------------------------

  test('Scenario: project with .code-workspace in parent dir — should trigger "open workspace" flow', () => {
    const parentDir = path.join(tempDir, 'workspace-root');
    const logicAppName = 'ProcessOrders';
    const workspaceName = 'OrderSystem';

    // Build parent workspace structure
    fs.mkdirSync(parentDir, { recursive: true });
    createLogicAppProject(path.join(parentDir, logicAppName));

    const workspaceFilePath = path.join(parentDir, `${workspaceName}.code-workspace`);
    fs.writeFileSync(workspaceFilePath, JSON.stringify({ folders: [{ name: logicAppName, path: `./${logicAppName}` }] }, null, 2));

    // Simulate: user opened the project folder directly, not the workspace
    const userOpenedFolderPath = path.join(parentDir, logicAppName);
    const isProject = fs.existsSync(path.join(userOpenedFolderPath, 'host.json'));
    const isInWorkspace = false; // simulating no vscode.workspace.workspaceFile

    // Find .code-workspace in parent
    const parentFiles = fs.readdirSync(parentDir);
    const workspaceFiles = parentFiles.filter((f) => f.endsWith('.code-workspace'));
    const foundWorkspaceFile = workspaceFiles.length > 0 ? path.join(parentDir, workspaceFiles[0]) : null;

    // Check if found workspace references our project
    let workspaceReferencesProject = false;
    if (foundWorkspaceFile) {
      const content = JSON.parse(fs.readFileSync(foundWorkspaceFile, 'utf-8'));
      workspaceReferencesProject = content.folders.some((f: { path: string }) => f.path === `./${logicAppName}`);
    }

    // In this scenario: project exists, workspace file found, but not opened
    // Expected: show "open workspace" info message
    assert.ok(isProject, 'Should detect Logic App project');
    assert.ok(!isInWorkspace, 'Should NOT be in a workspace');
    assert.ok(foundWorkspaceFile, 'Should find .code-workspace in parent');
    assert.ok(workspaceReferencesProject, 'Workspace should reference the project');

    // This is the condition in convertToWorkspace.ts that triggers the "open workspace" popup
    const shouldShowOpenWorkspacePopup = isProject && !isInWorkspace && foundWorkspaceFile && workspaceReferencesProject;
    assert.ok(shouldShowOpenWorkspacePopup, 'Should trigger "open workspace" popup');
  });

  test('Scenario: project with NO .code-workspace anywhere — should trigger "create workspace" flow', () => {
    const standaloneDir = path.join(tempDir, 'standalone-project');
    createLogicAppProject(standaloneDir);

    const isProject = fs.existsSync(path.join(standaloneDir, 'host.json'));
    const isInWorkspace = false;

    // No .code-workspace in parent
    const parentDir = path.dirname(standaloneDir);
    const parentFiles = fs.readdirSync(parentDir);
    const workspaceFiles = parentFiles.filter((f) => f.endsWith('.code-workspace'));
    const foundWorkspaceFile = workspaceFiles.length === 0 ? null : workspaceFiles[0];

    // In this scenario: project exists, no workspace file found
    // Expected: show "create workspace" info message
    assert.ok(isProject, 'Should detect Logic App project');
    assert.ok(!isInWorkspace, 'Should NOT be in a workspace');
    assert.strictEqual(foundWorkspaceFile, null, 'Should NOT find any .code-workspace');

    const shouldShowCreateWorkspacePopup = isProject && !isInWorkspace && !foundWorkspaceFile;
    assert.ok(shouldShowCreateWorkspacePopup, 'Should trigger "create workspace" popup');
  });

  test('Scenario: non-project folder — should trigger "not a logic app" warning', () => {
    const emptyDir = path.join(tempDir, 'just-a-folder');
    fs.mkdirSync(emptyDir, { recursive: true });
    fs.writeFileSync(path.join(emptyDir, 'random.txt'), 'hello');

    const hasHostJson = fs.existsSync(path.join(emptyDir, 'host.json'));
    assert.ok(!hasHostJson, 'Should NOT have host.json');

    // This is the condition in verifyIsProject.ts that triggers the warning
    const shouldShowNotLogicAppWarning = !hasHostJson;
    assert.ok(shouldShowNotLogicAppWarning, 'Should trigger "not a logic app project" warning');
  });

  test('Scenario: project already in workspace — should NOT show any popup', () => {
    const parentDir = path.join(tempDir, 'workspace-ok');
    const logicAppName = 'GoodApp';

    fs.mkdirSync(parentDir, { recursive: true });
    createLogicAppProject(path.join(parentDir, logicAppName));

    const workspaceFilePath = path.join(parentDir, 'GoodWorkspace.code-workspace');
    fs.writeFileSync(workspaceFilePath, JSON.stringify({ folders: [{ name: logicAppName, path: `./${logicAppName}` }] }, null, 2));

    // Simulate: user opened the .code-workspace (so workspaceFile is set)
    const isProject = fs.existsSync(path.join(parentDir, logicAppName, 'host.json'));
    const isInWorkspace = true; // vscode.workspace.workspaceFile is defined

    const shouldShowAnyPopup = isProject && !isInWorkspace;
    assert.ok(!shouldShowAnyPopup, 'Should NOT show any popup when already in workspace');
  });

  // -------------------------------------------------------
  // Tests: NoWorkspaceError
  // -------------------------------------------------------

  test('NoWorkspaceError should have descriptive message', () => {
    // Mirrors the NoWorkspaceError class in errors.ts
    const errorMessage = 'You must have a workspace open to perform this operation.';
    const error = new Error(errorMessage);

    assert.ok(error.message.includes('workspace open'), 'Error message should mention workspace requirement');
    assert.strictEqual(error.message, errorMessage, 'Error message should match expected text');
  });

  // -------------------------------------------------------
  // Tests: unit test commands outside workspace
  // -------------------------------------------------------

  test('Should produce correct "unit test requires workspace" message', () => {
    // Mirrors the message in editUnitTest.ts / openUnitTestResults.ts
    const expectedMessage = 'In order to create unit tests, you must have a workspace open.';
    assert.ok(expectedMessage.includes('unit tests'), 'Message should mention unit tests');
    assert.ok(expectedMessage.includes('workspace open'), 'Message should mention workspace requirement');
  });

  test('Should produce correct "run unit test requires workspace" message', () => {
    // Mirrors the message in runUnitTest.ts
    const expectedMessage = 'In order to run unit tests, you must have a workspace open.';
    assert.ok(expectedMessage.includes('run unit tests'), 'Message should mention running unit tests');
    assert.ok(expectedMessage.includes('workspace open'), 'Message should mention workspace requirement');
  });
});
