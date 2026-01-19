/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { devContainerFolderName, devContainerFileName, tasksFileName, vscodeFolderName } from '../../../../constants';

// Unmock fs-extra to use real file operations for integration tests
vi.unmock('fs-extra');

// Import fs-extra after unmocking
import * as fse from 'fs-extra';
import { createLogicAppWorkspace } from '../../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createLogicAppProject } from '../../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { enableDevContainer } from '../enableDevContainer';

describe('enableDevContainer - Integration Tests', () => {
  let tempDir: string;
  let mockContext: IActionContext;
  let assetsCopied = false;

  beforeAll(async () => {
    // Copy assets from src/assets to enableDevContainer directory for testing
    const srcAssetsPath = path.resolve(__dirname, '..', '..', '..', '..', 'assets');
    const destAssetsPath = path.resolve(__dirname, '..', '..', 'createNewCodeProject', 'CodeProjectBase', 'assets');
    const destAssetsPath2 = path.resolve(__dirname, '..', 'assets');

    // Check if assets need to be copied
    if (await fse.pathExists(srcAssetsPath)) {
      await fse.copy(srcAssetsPath, destAssetsPath);
      await fse.copy(srcAssetsPath, destAssetsPath2);
      assetsCopied = true;
    }
  });

  afterAll(async () => {
    // Clean up copied assets
    const destAssetsPath = path.resolve(__dirname, '..', '..', 'createNewCodeProject', 'CodeProjectBase', 'assets');
    const destAssetsPath2 = path.resolve(__dirname, '..', 'assets');
    if (await fse.pathExists(destAssetsPath)) {
      await fse.remove(destAssetsPath);
    }
    if (await fse.pathExists(destAssetsPath2)) {
      await fse.remove(destAssetsPath2);
    }
  });

  beforeEach(async () => {
    // Create real temp directory
    const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
    tempDir = await fse.mkdtemp(path.join(tmpBase, 'enable-devcontainer-'));

    mockContext = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { issueProperties: {} },
      ui: {
        showQuickPick: vi.fn(),
        showOpenDialog: vi.fn(),
        onDidFinishPrompt: vi.fn(),
        showInputBox: vi.fn(),
        showWarningMessage: vi.fn(),
      },
      valuesToMask: [],
    } as any;

    // Mock ext.outputChannel
    const { ext } = await import('../../../../extensionVariables');
    ext.outputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
    } as any;

    // Mock vscode.window methods
    vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);
    vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
    vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

    // // Check if assets need to be copied
    // if ((await fse.pathExists(srcAssetsPath)) && !(await fse.pathExists(destAssetsPath))) {
    //   await fse.copy(srcAssetsPath, destAssetsPath);
    //   assetsCopied = true;
    // }
  });

  afterEach(async () => {
    if (tempDir) {
      await fse.remove(tempDir);
    }
  });

  /**
   * Helper function to create a Logic App workspace for testing
   */
  async function createTestWorkspace(workspaceName: string, logicAppName: string): Promise<string> {
    const workspaceRootFolder = path.join(tempDir, workspaceName);

    const options: IWebviewProjectContext = {
      workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
      workspaceName,
      logicAppName,
      workflowName: 'TestWorkflow',
      logicAppType: ProjectType.logicApp,
      targetFramework: 'net8',
    } as any;

    await createLogicAppWorkspace(mockContext, options, false);
    return workspaceRootFolder;
  }

  async function createTestWorkspaceWithDevContainer(workspaceName: string, logicAppName: string): Promise<string> {
    const workspaceRootFolder = path.join(tempDir, workspaceName);

    const options: IWebviewProjectContext = {
      workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
      workspaceName,
      logicAppName,
      workflowName: 'TestWorkflow',
      logicAppType: ProjectType.logicApp,
      targetFramework: 'net8',
      isDevContainerProject: true,
    } as any;

    await createLogicAppWorkspace(mockContext, options, false);
    return workspaceRootFolder;
  }

  describe('DevContainer Creation', () => {
    it('should create .devcontainer folder and devcontainer.json', async () => {
      const workspaceName = 'DevContainerTest';
      const logicAppName = 'TestLogicApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify .devcontainer folder was created
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      expect(await fse.pathExists(devContainerPath)).toBe(true);

      // Verify devcontainer.json was created
      const devContainerJsonPath = path.join(devContainerPath, devContainerFileName);
      expect(await fse.pathExists(devContainerJsonPath)).toBe(true);

      // Verify devcontainer.json has valid JSON
      const devContainerContent = await fse.readJSON(devContainerJsonPath);
      expect(devContainerContent).toBeDefined();
      expect(devContainerContent.name).toBeDefined();
      expect(devContainerContent.image).toBeDefined();

      // Verify .devcontainer was added to workspace file
      const workspaceContent = await fse.readJSON(workspaceFilePath);
      expect(workspaceContent.folders).toBeDefined();
      const devContainerFolder = workspaceContent.folders.find((folder: any) => folder.path === devContainerFolderName);
      expect(devContainerFolder).toBeDefined();
      expect(devContainerFolder.name).toBe(devContainerFolderName);
    });

    it('should create .devcontainer at workspace root level alongside .code-workspace file', async () => {
      const workspaceName = 'DevContainerLocation';
      const logicAppName = 'LocationApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);
      const logicAppPath = path.join(workspaceRootFolder, logicAppName);

      // Run enableDevContainer
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify .devcontainer is at workspace root (same level as .code-workspace file)
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(true);

      const devContainerFilePath = path.join(workspaceRootFolder, devContainerFolderName, devContainerFileName);
      const devContainerFileExists = await fse.pathExists(devContainerFilePath);
      expect(devContainerFileExists).toBe(true);

      // Verify .devcontainer is NOT inside the logic app folder
      const devContainerInLogicApp = path.join(logicAppPath, devContainerFolderName);
      const devContainerInLogicAppExists = await fse.pathExists(devContainerInLogicApp);
      expect(devContainerInLogicAppExists).toBe(false);

      // Verify the workspace root contains all three at the same level:
      // - .devcontainer/
      // - LogicAppName/
      // - WorkspaceName.code-workspace
      const workspaceRootContents = await fse.readdir(workspaceRootFolder);
      expect(workspaceRootContents).toContain(devContainerFolderName);
      expect(workspaceRootContents).toContain(logicAppName);
      expect(workspaceRootContents).toContain(`${workspaceName}.code-workspace`);

      // Verify .devcontainer is a directory
      const devContainerStats = await fse.stat(devContainerPath);
      expect(devContainerStats.isDirectory()).toBe(true);

      // Verify workspace file is a file (not a directory)
      const workspaceFileStats = await fse.stat(workspaceFilePath);
      expect(workspaceFileStats.isFile()).toBe(true);
    });

    it('should convert tasks.json to devcontainer-compatible version', async () => {
      const workspaceName = 'TasksConversion';
      const logicAppName = 'ConvertApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Verify original tasks.json exists
      const tasksJsonPath = path.join(workspaceRootFolder, logicAppName, vscodeFolderName, tasksFileName);
      expect(await fse.pathExists(tasksJsonPath)).toBe(true);

      // Read original tasks.json
      const originalTasks = await fse.readJSON(tasksJsonPath);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Read converted tasks.json
      const convertedTasks = await fse.readJSON(tasksJsonPath);

      // Verify tasks were converted
      expect(convertedTasks.tasks).toBeDefined();
      expect(convertedTasks.inputs).toBeDefined();

      // Verify devcontainer-specific configuration paths
      const funcHostStartTask = convertedTasks.tasks.find((task: any) => task.label === 'func: host start');
      expect(funcHostStartTask).toBeDefined();
      expect(funcHostStartTask.command).toContain('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');

      const generateDebugTask = convertedTasks.tasks.find((task: any) => task.label === 'generateDebugSymbols');
      expect(generateDebugTask).toBeDefined();
      expect(generateDebugTask.command).toContain('${config:azureLogicAppsStandard.dotnetBinaryPath}');

      // Verify options are removed (devcontainer manages PATH)
      convertedTasks.tasks.forEach((task: any) => {
        expect(task.options).toBeUndefined();
      });
    });

    it('should handle multiple Logic Apps in workspace', async () => {
      const workspaceName = 'MultiAppWorkspace';

      // Create first Logic App
      const logicApp1 = 'FirstApp';
      await createTestWorkspace(workspaceName, logicApp1);
      const workspaceRootFolder = path.join(tempDir, workspaceName);

      // Manually add second Logic App to the workspace
      const logicApp2 = 'SecondApp';
      const logicApp2Path = path.join(workspaceRootFolder, logicApp2);
      await fse.ensureDir(logicApp2Path);

      // Copy .vscode folder with tasks.json to second Logic App
      const vscodeSourcePath = path.join(workspaceRootFolder, logicApp1, vscodeFolderName);
      const vscodeDestPath = path.join(logicApp2Path, vscodeFolderName);
      await fse.copy(vscodeSourcePath, vscodeDestPath);

      // Update workspace file to include second Logic App
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);
      const workspaceContent = await fse.readJSON(workspaceFilePath);
      workspaceContent.folders.push({ path: logicApp2, name: logicApp2 });
      await fse.writeJSON(workspaceFilePath, workspaceContent, { spaces: 2 });

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify both Logic Apps have converted tasks.json
      const tasksJson1Path = path.join(workspaceRootFolder, logicApp1, vscodeFolderName, tasksFileName);
      const tasksJson2Path = path.join(workspaceRootFolder, logicApp2, vscodeFolderName, tasksFileName);

      expect(await fse.pathExists(tasksJson1Path)).toBe(true);
      expect(await fse.pathExists(tasksJson2Path)).toBe(true);

      const tasks1 = await fse.readJSON(tasksJson1Path);
      const tasks2 = await fse.readJSON(tasksJson2Path);

      // Both should have devcontainer-compatible paths
      expect(tasks1.tasks[1].command).toContain('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');
      expect(tasks2.tasks[1].command).toContain('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');

      // Verify options are removed from both Logic Apps (devcontainer manages PATH)
      tasks1.tasks.forEach((task: any) => {
        expect(task.options).toBeUndefined();
      });
      tasks2.tasks.forEach((task: any) => {
        expect(task.options).toBeUndefined();
      });

      // Verify telemetry shows 2 tasks were converted
      expect(mockContext.telemetry.properties.tasksConverted).toBe('2');
    });

    it('should warn when devcontainer already exists', async () => {
      const workspaceName = 'ExistingDevContainer';
      const logicAppName = 'ExistingApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Create .devcontainer folder manually
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      await fse.ensureDir(devContainerPath);
      await fse.writeJSON(path.join(devContainerPath, devContainerFileName), { name: 'existing' });

      // Mock vscode.window.showWarningMessage to simulate user canceling
      const showWarningMessageSpy = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify warning was shown
      expect(showWarningMessageSpy).toHaveBeenCalled();
      expect(showWarningMessageSpy.mock.calls[0][0]).toContain('already has a .devcontainer folder');

      // Verify result was Canceled
      expect(mockContext.telemetry.properties.result).toBe('Canceled');
    });

    it('should overwrite existing devcontainer when user confirms', async () => {
      const workspaceName = 'OverwriteDevContainer';
      const logicAppName = 'OverwriteApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Create .devcontainer folder manually with old content
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      await fse.ensureDir(devContainerPath);
      const oldDevContainerJsonPath = path.join(devContainerPath, devContainerFileName);
      await fse.writeJSON(oldDevContainerJsonPath, { name: 'old-config', version: '1.0' });

      // Mock vscode.window.showWarningMessage to simulate user choosing to overwrite
      vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Overwrite' as any);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify devcontainer.json was overwritten with new content
      const newDevContainerContent = await fse.readJSON(oldDevContainerJsonPath);
      expect(newDevContainerContent.name).not.toBe('old-config');
      expect(newDevContainerContent.image).toBeDefined();

      // Verify telemetry shows overwrite
      expect(mockContext.telemetry.properties.overwrite).toBe('true');
      expect(mockContext.telemetry.properties.result).toBe('Succeeded');
    });

    it('should handle workspace without workspace file', async () => {
      // Mock vscode.window.showErrorMessage
      const showErrorMessageSpy = vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

      // Run enableDevContainer without workspace file path (will use vscode.workspace.workspaceFile which is undefined in tests)
      await enableDevContainer(mockContext);

      // Verify error was shown
      expect(showErrorMessageSpy).toHaveBeenCalled();
      expect(showErrorMessageSpy.mock.calls[0][0]).toContain('No workspace is currently open');

      // Verify result
      expect(mockContext.telemetry.properties.result).toBe('NoWorkspace');
    });

    it('should verify devcontainer.json contains required properties', async () => {
      const workspaceName = 'DevContainerValidation';
      const logicAppName = 'ValidationApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Read devcontainer.json
      const devContainerJsonPath = path.join(workspaceRootFolder, devContainerFolderName, devContainerFileName);
      const devContainerContent = await fse.readJSON(devContainerJsonPath);

      // Verify required properties
      expect(devContainerContent.name).toBeDefined();
      expect(devContainerContent.image).toBeDefined();
      expect(devContainerContent.workspaceFolder).toBeDefined();
      expect(devContainerContent.customizations).toBeDefined();
      expect(devContainerContent.customizations.vscode).toBeDefined();
      expect(devContainerContent.customizations.vscode.extensions).toBeDefined();
      expect(devContainerContent.customizations.vscode.settings).toBeDefined();

      // Verify Logic Apps extension is included
      expect(devContainerContent.customizations.vscode.extensions).toContain('ms-azuretools.vscode-azurelogicapps');

      // Verify settings include required Logic Apps configurations
      const settings = devContainerContent.customizations.vscode.settings;
      expect(settings['azureLogicAppsStandard.dotnetBinaryPath']).toBe('dotnet');
      expect(settings['azureLogicAppsStandard.funcCoreToolsBinaryPath']).toBe('func');
    });

    it('should handle Logic App without tasks.json gracefully', async () => {
      const workspaceName = 'NoTasksWorkspace';
      const logicAppName = 'NoTasksApp';

      // Create a test workspace
      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Delete tasks.json
      const tasksJsonPath = path.join(workspaceRootFolder, logicAppName, vscodeFolderName, tasksFileName);
      await fse.remove(tasksJsonPath);

      // Run enableDevContainer with real workspace file path
      await enableDevContainer(mockContext, workspaceFilePath);

      // Verify command succeeded
      expect(mockContext.telemetry.properties.result).toBe('Succeeded');

      // Verify .devcontainer was still created
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      expect(await fse.pathExists(devContainerPath)).toBe(true);

      // Verify telemetry shows task was skipped
      expect(mockContext.telemetry.properties.tasksSkipped).toBe('1');
      expect(mockContext.telemetry.properties.tasksConverted).toBe('0');
    });
  });

  describe('Telemetry Tracking', () => {
    it('should track successful conversion in telemetry', async () => {
      const workspaceName = 'TelemetrySuccess';
      const logicAppName = 'TelemetryApp';

      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      await enableDevContainer(mockContext, workspaceFilePath);

      expect(mockContext.telemetry.properties.result).toBe('Succeeded');
      expect(mockContext.telemetry.properties.step).toBe('devcontainerAddedToWorkspace');
      expect(mockContext.telemetry.properties.tasksConverted).toBe('1');
    });

    it('should add .devcontainer folder to workspace file when creating devcontainer project', async () => {
      const workspaceName = 'DevContainerFromScratch';
      const logicAppName = 'DevContainerApp';
      const workspaceRootFolder = path.join(tempDir, workspaceName);

      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName,
        logicAppName,
        workflowName: 'TestWorkflow',
        logicAppType: ProjectType.logicApp,
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Read the workspace file
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);
      const workspaceContent = await fse.readJSON(workspaceFilePath);

      // Verify .devcontainer folder is in the workspace
      expect(workspaceContent.folders).toBeDefined();
      const devContainerFolder = workspaceContent.folders.find((folder: any) => folder.name === '.devcontainer');
      expect(devContainerFolder).toBeDefined();
      expect(devContainerFolder.path).toBe('.devcontainer');

      // Verify .devcontainer folder actually exists
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      expect(await fse.pathExists(devContainerPath)).toBe(true);
    });

    it('should track error in telemetry when template not found', async () => {
      const workspaceName = 'TelemetryError';
      const logicAppName = 'ErrorApp';

      const workspaceRootFolder = await createTestWorkspace(workspaceName, logicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Remove the assets folder to simulate missing template
      const destAssetsPath = path.resolve(__dirname, '..', 'assets');
      await fse.remove(destAssetsPath);

      try {
        await enableDevContainer(mockContext, workspaceFilePath);
        // Should have thrown an error
        expect.fail('Expected enableDevContainer to throw an error');
      } catch (error) {
        // Expected to throw
        expect(mockContext.telemetry.properties.result).toBe('Failed');
        expect(mockContext.telemetry.properties.error).toBeDefined();
      }
      const srcAssetsPath = path.resolve(__dirname, '..', '..', '..', '..', 'assets');
      // Check if assets need to be copied
      if (await fse.pathExists(srcAssetsPath)) {
        await fse.copy(srcAssetsPath, destAssetsPath);
      }
    });
  });

  describe('Adding Logic App to DevContainer Workspace', () => {
    it('should use devcontainer tasks.json template when workspace has devcontainer', async () => {
      const workspaceName = 'ExistingDevContainer';
      const firstLogicAppName = 'FirstApp';

      // Create initial workspace with devcontainer
      const workspaceRootFolder = await createTestWorkspaceWithDevContainer(workspaceName, firstLogicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);
      vi.mocked(vscode.workspace).workspaceFile = vscode.Uri.file(workspaceFilePath);
      // Add second logic app to the existing workspace
      const secondLogicAppName = 'SecondApp';
      const secondLogicAppPath = path.join(workspaceRootFolder, secondLogicAppName);

      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: workspaceRootFolder } as vscode.Uri,
        workspaceName,
        logicAppName: secondLogicAppName,
        workflowName: 'TestWorkflow',
        logicAppType: ProjectType.logicApp,
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppProject(mockContext, options, workspaceRootFolder);

      // Verify the second logic app's tasks.json uses devcontainer paths
      const tasksJsonPath = path.join(secondLogicAppPath, vscodeFolderName, tasksFileName);
      expect(await fse.pathExists(tasksJsonPath)).toBe(true);

      const tasksContent = await fse.readJSON(tasksJsonPath);

      // Verify devcontainer-specific paths
      const funcHostStartTask = tasksContent.tasks.find((task: any) => task.label === 'func: host start');
      expect(funcHostStartTask).toBeDefined();
      expect(funcHostStartTask.command).toContain('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');

      // Verify options are not present (devcontainer manages PATH)
      tasksContent.tasks.forEach((task: any) => {
        expect(task.options).toBeUndefined();
      });
    });

    it('should use regular tasks.json template when workspace has no devcontainer', async () => {
      const workspaceName = 'NoDevContainer';
      const firstLogicAppName = 'FirstApp';

      // Create initial workspace without devcontainer
      const workspaceRootFolder = await createTestWorkspace(workspaceName, firstLogicAppName);
      const workspaceFilePath = path.join(workspaceRootFolder, `${workspaceName}.code-workspace`);

      // Mock vscode.workspace.workspaceFile to simulate being in this workspace
      vi.mocked(vscode.workspace).workspaceFile = vscode.Uri.file(workspaceFilePath);

      // Add second logic app to the existing workspace
      const secondLogicAppName = 'SecondApp';
      const secondLogicAppPath = path.join(workspaceRootFolder, secondLogicAppName);

      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: workspaceRootFolder } as vscode.Uri,
        workspaceName,
        logicAppName: secondLogicAppName,
        workflowName: 'TestWorkflow',
        logicAppType: ProjectType.logicApp,
        targetFramework: 'net8',
        isDevContainerProject: false,
      } as any;

      await createLogicAppProject(mockContext, options, workspaceRootFolder);

      // Verify the second logic app's tasks.json uses regular paths with options
      const tasksJsonPath = path.join(secondLogicAppPath, vscodeFolderName, tasksFileName);
      expect(await fse.pathExists(tasksJsonPath)).toBe(true);

      const tasksContent = await fse.readJSON(tasksJsonPath);

      // Verify regular paths
      const funcHostStartTask = tasksContent.tasks.find((task: any) => task.label === 'func: host start');
      expect(funcHostStartTask).toBeDefined();
      expect(funcHostStartTask.command).toContain('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');

      // Verify options ARE present for non-devcontainer setup
      expect(funcHostStartTask.options).toBeDefined();
      expect(funcHostStartTask.options.env).toBeDefined();
      expect(funcHostStartTask.options.env.PATH).toBeDefined();
    });
  });
});
