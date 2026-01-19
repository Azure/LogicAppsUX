/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import { WorkflowType, devContainerFolderName, devContainerFileName } from '../../../../../constants';

// Unmock fs-extra to use real file operations for integration tests
vi.unmock('fs-extra');

// Import fs-extra after unmocking
import * as fse from 'fs-extra';
import * as CreateLogicAppWorkspaceModule from '../CreateLogicAppWorkspace';

const { createWorkspaceStructure, getHostContent, createLibFolder, createLogicAppAndWorkflow, createLogicAppWorkspace } =
  CreateLogicAppWorkspaceModule;

describe('createLogicAppWorkspace - Integration Tests', () => {
  let tempDir: string;
  let mockContext: IActionContext;
  let assetsCopied = false;

  // Helper functions to compute paths based on workspace/logic app names
  const getWorkspaceRootFolder = (workspaceName: string) => path.join(tempDir, workspaceName);
  const getLogicAppFolderPath = (workspaceName: string, logicAppName: string) => path.join(tempDir, workspaceName, logicAppName);
  const getWorkspaceFilePath = (workspaceName: string) => path.join(tempDir, workspaceName, `${workspaceName}.code-workspace`);

  beforeAll(async () => {
    // Copy assets from src/assets to CodeProjectBase/assets for testing
    const srcAssetsPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'assets');
    const destAssetsPath = path.resolve(__dirname, '..', 'assets');

    // Check if assets need to be copied
    if (await fse.pathExists(srcAssetsPath)) {
      await fse.copy(srcAssetsPath, destAssetsPath);
      assetsCopied = true;
    }
  });

  afterAll(async () => {
    // Clean up copied assets
    const destAssetsPath = path.resolve(__dirname, '..', 'assets');
    if (await fse.pathExists(destAssetsPath)) {
      await fse.remove(destAssetsPath);
    }
  });

  beforeEach(async () => {
    // Create real temp directory
    const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
    tempDir = await fse.mkdtemp(path.join(tmpBase, 'workspace-integration-'));

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
  });

  afterEach(async () => {
    if (tempDir) {
      await fse.remove(tempDir);
    }
  });

  describe('Workspace Structure Integration', () => {
    it('should create workspace file with correct structure for standard logic app', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'TestWorkspace',
        logicAppName: 'TestLogicApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      // Verify workspace file exists
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspaceFilePath);
      expect(workspaceExists).toBe(true);

      // Verify workspace file content
      const workspaceContent = await fse.readJSON(workspaceFilePath);
      expect(workspaceContent).toHaveProperty('folders');
      expect(workspaceContent.folders).toHaveLength(1);
      expect(workspaceContent.folders[0]).toEqual({
        name: 'TestLogicApp',
        path: './TestLogicApp',
      });
    });

    it('should create workspace file with function folder for custom code', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'CustomCodeWorkspace',
        logicAppName: 'CustomCodeApp',
        logicAppType: ProjectType.customCode,
        workflowName: 'CustomWorkflow',
        workflowType: 'Stateful',
        functionFolderName: 'CustomFunctions',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspaceFilePath);
      expect(workspaceExists).toBe(true);

      const workspaceContent = await fse.readJSON(workspaceFilePath);
      expect(workspaceContent.folders).toHaveLength(2);
      expect(workspaceContent.folders[0]).toEqual({
        name: 'CustomCodeApp',
        path: './CustomCodeApp',
      });
      expect(workspaceContent.folders[1]).toEqual({
        name: 'CustomFunctions',
        path: './CustomFunctions',
      });
    });

    it('should create workspace file with function folder for rules engine', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'RulesEngineWorkspace',
        logicAppName: 'RulesEngineApp',
        logicAppType: ProjectType.rulesEngine,
        workflowName: 'RulesWorkflow',
        workflowType: 'Stateful',
        functionFolderName: 'RulesFunctions',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspaceFilePath);
      expect(workspaceExists).toBe(true);

      const workspaceContent = await fse.readJSON(workspaceFilePath);
      expect(workspaceContent.folders).toHaveLength(2);
      expect(workspaceContent.folders[0].name).toBe('RulesEngineApp');
      expect(workspaceContent.folders[1].name).toBe('RulesFunctions');
    });

    it('should create workspace directory structure', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'DirectoryStructureWorkspace',
        logicAppName: 'DirectoryStructureApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'DirectoryWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      // Verify workspace root exists
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspaceRootFolder);
      expect(workspaceExists).toBe(true);

      // Verify it's a directory
      const stats = await fse.stat(workspaceRootFolder);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Logic App and Workflow Integration', () => {
    it('should create logic app folder and workflow with correct structure', async () => {
      const workspaceName = 'WorkflowTestWorkspace';
      const logicAppName = 'WorkflowTestApp';
      const workflowName = 'WorkflowTest';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: 'Stateful',
      };

      // Create parent directory
      await fse.ensureDir(workspaceRootFolder);

      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      // Verify logic app folder exists
      const logicAppExists = await fse.pathExists(logicAppFolderPath);
      expect(logicAppExists).toBe(true);

      // Verify workflow folder exists
      const workflowFolderPath = path.join(logicAppFolderPath, workflowName);
      const workflowFolderExists = await fse.pathExists(workflowFolderPath);
      expect(workflowFolderExists).toBe(true);

      // Verify workflow.json exists
      const workflowJsonPath = path.join(workflowFolderPath, 'workflow.json');
      const workflowJsonExists = await fse.pathExists(workflowJsonPath);
      expect(workflowJsonExists).toBe(true);

      // Verify workflow.json content
      const workflowContent = await fse.readJSON(workflowJsonPath);
      expect(workflowContent).toHaveProperty('definition');
      expect(workflowContent.definition).toHaveProperty('$schema');
      expect(workflowContent.definition.$schema).toContain('Microsoft.Logic');
      expect(workflowContent.definition).toHaveProperty('actions');
      expect(workflowContent.definition).toHaveProperty('triggers');
      expect(workflowContent.definition.actions).toEqual({});
      expect(workflowContent.definition.triggers).toEqual({});
    });

    it('should create stateful workflow with correct type', async () => {
      const workspaceName = 'StatefulWorkspace';
      const logicAppName = 'StatefulApp';
      const workflowName = 'StatefulWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: 'Stateful',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      expect(workflowContent.kind).toBe('Stateful');
    });

    it('should create stateless workflow with correct type', async () => {
      const workspaceName = 'StatelessWorkspace';
      const logicAppName = 'StatelessApp';
      const workflowName = 'StatelessWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateless,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      expect(workflowContent.kind).toBe('Stateless');
    });

    it('should create workflow with all required definition properties', async () => {
      const workspaceName = 'CompleteWorkspace';
      const logicAppName = 'CompleteApp';
      const workflowName = 'CompleteWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: 'Stateful',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Verify all required definition properties
      expect(workflowContent.definition).toHaveProperty('$schema');
      expect(workflowContent.definition).toHaveProperty('contentVersion');
      expect(workflowContent.definition).toHaveProperty('triggers');
      expect(workflowContent.definition).toHaveProperty('actions');
      expect(workflowContent.definition).toHaveProperty('outputs');
    });
  });

  describe('Host.json Integration', () => {
    it('should verify host.json structure from getHostContent', async () => {
      const hostContent = await getHostContent();

      // Verify exact structure
      expect(hostContent).toEqual({
        version: '2.0',
        logging: {
          applicationInsights: {
            samplingSettings: {
              isEnabled: true,
              excludedTypes: 'Request',
            },
          },
        },
        extensionBundle: {
          id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
          version: '[1.*, 2.0.0)',
        },
      });
    });

    it('should have correct version', async () => {
      const hostContent = await getHostContent();
      expect(hostContent.version).toBe('2.0');
    });

    it('should have application insights sampling enabled', async () => {
      const hostContent = await getHostContent();
      expect(hostContent.logging.applicationInsights.samplingSettings.isEnabled).toBe(true);
    });

    it('should exclude Request type from sampling', async () => {
      const hostContent = await getHostContent();
      expect(hostContent.logging.applicationInsights.samplingSettings.excludedTypes).toBe('Request');
    });

    it('should have workflows extension bundle', async () => {
      const hostContent = await getHostContent();
      expect(hostContent.extensionBundle.id).toBe('Microsoft.Azure.Functions.ExtensionBundle.Workflows');
      expect(hostContent.extensionBundle.version).toBe('[1.*, 2.0.0)');
    });
  });

  describe('Lib Folder Integration', () => {
    it('should create lib folder structure in logic app directory', async () => {
      const workspaceName = 'LibFolderWorkspace';
      const logicAppName = 'LibFolderApp';
      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);

      const mockContext: any = {
        projectPath: logicAppFolderPath,
      };

      await fse.ensureDir(logicAppFolderPath);
      await createLibFolder(mockContext);

      // Verify lib folder exists
      const libFolderPath = path.join(logicAppFolderPath, 'lib');
      const libExists = await fse.pathExists(libFolderPath);
      expect(libExists).toBe(true);

      // Verify builtinOperationSdks folder exists
      const builtinOpsPath = path.join(libFolderPath, 'builtinOperationSdks');
      const builtinOpsExists = await fse.pathExists(builtinOpsPath);
      expect(builtinOpsExists).toBe(true);

      // Verify JAR folder exists
      const jarPath = path.join(builtinOpsPath, 'JAR');
      const jarExists = await fse.pathExists(jarPath);
      expect(jarExists).toBe(true);

      // Verify net472 folder exists
      const net472Path = path.join(builtinOpsPath, 'net472');
      const net472Exists = await fse.pathExists(net472Path);
      expect(net472Exists).toBe(true);
    });

    it('should create nested directory structure recursively', async () => {
      const workspaceName = 'NestedLibWorkspace';
      const logicAppName = 'NestedLibApp';
      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);

      const mockContext: any = {
        projectPath: logicAppFolderPath,
      };

      await fse.ensureDir(logicAppFolderPath);
      await createLibFolder(mockContext);

      // Verify all levels of directory structure
      const libPath = path.join(logicAppFolderPath, 'lib');
      const builtinPath = path.join(libPath, 'builtinOperationSdks');
      const jarPath = path.join(builtinPath, 'JAR');
      const netPath = path.join(builtinPath, 'net472');

      const allExist = await Promise.all([
        fse.pathExists(libPath),
        fse.pathExists(builtinPath),
        fse.pathExists(jarPath),
        fse.pathExists(netPath),
      ]);

      expect(allExist.every((exists) => exists)).toBe(true);
    });

    it('should verify directory structure is correct', async () => {
      const workspaceName = 'VerifyLibWorkspace';
      const logicAppName = 'VerifyLibApp';
      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);

      const mockContext: any = {
        projectPath: logicAppFolderPath,
      };

      await fse.ensureDir(logicAppFolderPath);
      await createLibFolder(mockContext);

      // Read directory contents to verify structure
      const libContents = await fse.readdir(path.join(logicAppFolderPath, 'lib'));
      expect(libContents).toContain('builtinOperationSdks');

      const builtinContents = await fse.readdir(path.join(logicAppFolderPath, 'lib', 'builtinOperationSdks'));
      expect(builtinContents).toContain('JAR');
      expect(builtinContents).toContain('net472');
      expect(builtinContents).toHaveLength(2);
    });
  });

  describe('Full Workspace Creation Integration', () => {
    it('should create complete workspace for standard logic app', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'FullCompleteWorkspace',
        logicAppName: 'FullCompleteApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'FullCompleteWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify workspace file
      const workspacePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspacePath);
      expect(workspaceExists).toBe(true);

      const workspaceContent = await fse.readJSON(workspacePath);
      expect(workspaceContent.folders).toHaveLength(1);
      expect(workspaceContent.folders[0].name).toBe(options.logicAppName);

      // Verify logic app folder
      const logicAppPath = getLogicAppFolderPath(options.workspaceName, options.logicAppName);
      const logicAppExists = await fse.pathExists(logicAppPath);
      expect(logicAppExists).toBe(true);

      // Verify workflow
      const workflowPath = path.join(logicAppPath, options.workflowName, 'workflow.json');
      const workflowExists = await fse.pathExists(workflowPath);
      expect(workflowExists).toBe(true);

      // Verify lib folder
      const libPath = path.join(logicAppPath, 'lib', 'builtinOperationSdks');
      const libExists = await fse.pathExists(libPath);
      expect(libExists).toBe(true);
    });

    it('should create workspace with custom code project structure', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'FullCustomCodeWorkspace',
        logicAppName: 'FullCustomCodeApp',
        logicAppType: ProjectType.customCode,
        workflowName: 'FullCustomWorkflow',
        workflowType: 'Stateful',
        functionFolderName: 'MyFunctions',
        targetFramework: 'net8',
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify workspace file has both folders
      const workspacePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceContent = await fse.readJSON(workspacePath);
      expect(workspaceContent.folders).toHaveLength(2);
      expect(workspaceContent.folders[0].name).toBe(options.logicAppName);
      expect(workspaceContent.folders[1].name).toBe('MyFunctions');
    });

    it('should verify all directories are created for complete workspace', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'AllDirsWorkspace',
        logicAppName: 'AllDirsApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'AllDirsWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const logicAppPath = getLogicAppFolderPath(options.workspaceName, options.logicAppName);

      // List of all expected directories
      const expectedDirs = [
        workspaceRootFolder,
        logicAppPath,
        path.join(logicAppPath, options.workflowName),
        path.join(logicAppPath, 'lib'),
        path.join(logicAppPath, 'lib', 'builtinOperationSdks'),
        path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'JAR'),
        path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'net472'),
      ];

      for (const dir of expectedDirs) {
        const exists = await fse.pathExists(dir);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle workspace names with special characters', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'Test-Workspace_123',
        logicAppName: 'Test-LogicApp_456',
        logicAppType: ProjectType.logicApp,
        workflowName: 'Test-Workflow_789',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      const workspacePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspacePath);
      expect(workspaceExists).toBe(true);

      const workspaceContent = await fse.readJSON(workspacePath);
      expect(workspaceContent.folders[0].name).toBe('Test-LogicApp_456');
    });

    it('should create workspace with long names', async () => {
      const longName = 'VeryLongWorkspaceNameThatExceedsNormalLimitsButShouldStillWork';
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: longName,
        logicAppName: longName + 'LogicApp',
        logicAppType: ProjectType.logicApp,
        workflowName: longName + 'Workflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      const workspacePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceExists = await fse.pathExists(workspacePath);
      expect(workspaceExists).toBe(true);
    });

    it('should verify workspace file is valid JSON', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'ValidJsonWorkspace',
        logicAppName: 'ValidJsonApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'ValidJsonWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
      } as any;

      await createWorkspaceStructure(options);

      const workspacePath = getWorkspaceFilePath(options.workspaceName);

      // Should not throw when reading JSON
      const workspaceContent = await fse.readJSON(workspacePath);
      expect(workspaceContent).toBeDefined();
      expect(typeof workspaceContent).toBe('object');
    });

    it('should verify workflow.json is valid JSON with required fields', async () => {
      const workspaceName = 'ValidationWorkspace';
      const logicAppName = 'ValidationApp';
      const workflowName = 'ValidationWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: 'Stateful',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowPath);

      // Validate JSON structure
      expect(workflowContent).toBeDefined();
      expect(workflowContent).toHaveProperty('definition');
      expect(workflowContent).toHaveProperty('kind');

      // Validate definition has all required fields
      const definition = workflowContent.definition;
      expect(definition).toHaveProperty('$schema');
      expect(definition).toHaveProperty('contentVersion');
      // expect(definition).toHaveProperty('parameters');
      expect(definition).toHaveProperty('triggers');
      expect(definition).toHaveProperty('actions');
      expect(definition).toHaveProperty('outputs');

      // Validate types
      expect(typeof definition.$schema).toBe('string');
      expect(typeof definition.contentVersion).toBe('string');
      // expect(typeof definition.parameters).toBe('object');
      expect(typeof definition.triggers).toBe('object');
      expect(typeof definition.actions).toBe('object');
      expect(typeof definition.outputs).toBe('object');
    });
  });

  describe('Agent and Agentic Workflow Integration', () => {
    it('should create agentic workflow with correct kind and structure', async () => {
      const workspaceName = 'AgenticWorkspace';
      const logicAppName = 'AgenticApp';
      const workflowName = 'AgenticWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.agentic,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Agentic workflows should have Stateful kind
      expect(workflowContent.kind).toBe('Stateful');

      // Verify agentic workflow has Default_Agent action
      expect(workflowContent.definition.actions).toHaveProperty('Default_Agent');
      const agentAction = workflowContent.definition.actions.Default_Agent;
      expect(agentAction.type).toBe('Agent');
      expect(agentAction.inputs).toHaveProperty('parameters');
      expect(agentAction.inputs.parameters).toHaveProperty('deploymentId');
      expect(agentAction.inputs.parameters).toHaveProperty('messages');
      expect(agentAction.inputs.parameters).toHaveProperty('agentModelType');
      expect(agentAction.inputs.parameters.agentModelType).toBe('AzureOpenAI');

      // Verify model configurations
      expect(agentAction.inputs).toHaveProperty('modelConfigurations');
      expect(agentAction.inputs.modelConfigurations).toHaveProperty('model1');

      // Agentic workflows should have empty triggers and Default_Agent with empty runAfter
      expect(workflowContent.definition.triggers).toEqual({});
      expect(agentAction.runAfter).toEqual({});
    });

    it('should create agent workflow with correct kind and structure', async () => {
      const workspaceName = 'AgentWorkspace';
      const logicAppName = 'AgentApp';
      const workflowName = 'AgentWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.agent,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Agent workflows should have Agent kind
      expect(workflowContent.kind).toBe('Agent');

      // Verify agent workflow has chat session trigger
      expect(workflowContent.definition.triggers).toHaveProperty('When_a_new_chat_session_starts');
      const chatTrigger = workflowContent.definition.triggers.When_a_new_chat_session_starts;
      expect(chatTrigger.type).toBe('Request');
      expect(chatTrigger.kind).toBe('Agent');

      // Verify Default_Agent action exists and has runAfter pointing to trigger
      expect(workflowContent.definition.actions).toHaveProperty('Default_Agent');
      const agentAction = workflowContent.definition.actions.Default_Agent;
      expect(agentAction.type).toBe('Agent');
      expect(agentAction.runAfter).toHaveProperty('When_a_new_chat_session_starts');
      expect(agentAction.runAfter.When_a_new_chat_session_starts).toEqual(['Succeeded']);
    });

    it('should verify agentic workflow has agent model settings', async () => {
      const workspaceName = 'AgenticSettingsWorkspace';
      const logicAppName = 'AgenticSettingsApp';
      const workflowName = 'AgenticWithSettings';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.agentic,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, workflowName, 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      const agentAction = workflowContent.definition.actions.Default_Agent;
      expect(agentAction.inputs.parameters).toHaveProperty('agentModelSettings');
      expect(agentAction.inputs.parameters.agentModelSettings).toHaveProperty('agentHistoryReductionSettings');
      expect(agentAction.inputs.parameters.agentModelSettings.agentHistoryReductionSettings).toEqual({
        agentHistoryReductionType: 'maximumTokenCountReduction',
        maximumTokenCount: 128000,
      });
    });

    it('should verify agent workflow has tools property', async () => {
      const workspaceName = 'TestWorkspace';
      const logicAppName = 'TestLogicApp';
      const workflowName = 'AgentWithTools';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.agent,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'AgentWithTools', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      const agentAction = workflowContent.definition.actions.Default_Agent;
      expect(agentAction).toHaveProperty('tools');
      expect(agentAction).toHaveProperty('limit');
      expect(typeof agentAction.tools).toBe('object');
      expect(typeof agentAction.limit).toBe('object');
    });
  });

  describe('Workflow Content Varies by Project Type', () => {
    it('should create standard logic app workflow with empty actions and triggers', async () => {
      const workspaceName = 'TestWorkspace';
      const logicAppName = 'TestLogicApp';
      const workflowName = 'StandardWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateful,
        logicAppType: ProjectType.logicApp,
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'StandardWorkflow', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Standard logic app should have empty actions and triggers
      expect(workflowContent.definition.actions).toEqual({});
      expect(workflowContent.definition.triggers).toEqual({});
      expect(workflowContent.kind).toBe('Stateful');
    });

    it('should create custom code workflow with InvokeFunction action', async () => {
      const workspaceName = 'CustomCodeWorkspace';
      const logicAppName = 'CustomCodeApp';
      const workflowName = 'CustomCodeWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateful,
        logicAppType: ProjectType.customCode,
        functionName: 'MyCustomFunction',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'CustomCodeWorkflow', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Custom code should have InvokeFunction action
      expect(workflowContent.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
      const invokeAction = workflowContent.definition.actions.Call_a_local_function_in_this_logic_app;
      expect(invokeAction.type).toBe('InvokeFunction');
      expect(invokeAction.inputs).toHaveProperty('functionName');
      expect(invokeAction.inputs.functionName).toBe('MyCustomFunction');
      expect(invokeAction.inputs).toHaveProperty('parameters');
      expect(invokeAction.inputs.parameters).toHaveProperty('zipCode');
      expect(invokeAction.inputs.parameters).toHaveProperty('temperatureScale');

      // Should have Response action
      expect(workflowContent.definition.actions).toHaveProperty('Response');
      const responseAction = workflowContent.definition.actions.Response;
      expect(responseAction.type).toBe('Response');
      expect(responseAction.kind).toBe('http');
      expect(responseAction.runAfter).toHaveProperty('Call_a_local_function_in_this_logic_app');

      // Should have HTTP request trigger
      expect(workflowContent.definition.triggers).toHaveProperty('When_a_HTTP_request_is_received');
      const httpTrigger = workflowContent.definition.triggers.When_a_HTTP_request_is_received;
      expect(httpTrigger.type).toBe('Request');
      expect(httpTrigger.kind).toBe('Http');
    });

    it('should create rules engine workflow with rules function invocation', async () => {
      const workspaceName = 'RulesWorkspace';
      const logicAppName = 'RulesApp';
      const workflowName = 'RulesWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateful,
        logicAppType: ProjectType.rulesEngine,
        functionName: 'MyRulesFunction',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'RulesWorkflow', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Rules engine should have specific InvokeFunction action
      expect(workflowContent.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
      const rulesAction = workflowContent.definition.actions.Call_a_local_rules_function_in_this_logic_app;
      expect(rulesAction.type).toBe('InvokeFunction');
      expect(rulesAction.inputs).toHaveProperty('functionName');
      expect(rulesAction.inputs.functionName).toBe('MyRulesFunction');

      // Verify rules-specific parameters
      expect(rulesAction.inputs.parameters).toHaveProperty('ruleSetName');
      expect(rulesAction.inputs.parameters).toHaveProperty('documentType');
      expect(rulesAction.inputs.parameters).toHaveProperty('inputXml');
      expect(rulesAction.inputs.parameters).toHaveProperty('purchaseAmount');
      expect(rulesAction.inputs.parameters).toHaveProperty('zipCode');
      expect(rulesAction.inputs.parameters.ruleSetName).toBe('SampleRuleSet');

      // Should have Response action
      expect(workflowContent.definition.actions).toHaveProperty('Response');
      const responseAction = workflowContent.definition.actions.Response;
      expect(responseAction.runAfter).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');

      // Should have HTTP request trigger
      expect(workflowContent.definition.triggers).toHaveProperty('When_a_HTTP_request_is_received');
    });

    it('should verify custom code workflow parameters are correctly set', async () => {
      const workspaceName = 'CustomCodeWorkspace';
      const logicAppName = 'CustomApp';
      const workflowName = 'CustomWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateless,
        logicAppType: ProjectType.customCode,
        functionName: 'WeatherFunction',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'CustomWorkflow', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      // Verify workflow is stateless
      expect(workflowContent.kind).toBe('Stateless');

      // Verify function parameters match expected template
      const invokeAction = workflowContent.definition.actions.Call_a_local_function_in_this_logic_app;
      expect(invokeAction.inputs.parameters.zipCode).toBe(85396);
      expect(invokeAction.inputs.parameters.temperatureScale).toBe('Celsius');
    });

    it('should verify rules engine workflow has XML input parameter', async () => {
      const workspaceName = 'RulesEngineWorkspace';
      const logicAppName = 'RulesApp';
      const workflowName = 'XmlRulesWorkflow';

      const logicAppFolderPath = getLogicAppFolderPath(workspaceName, logicAppName);
      const workspaceRootFolder = getWorkspaceRootFolder(workspaceName);

      const mockContextIntegration: any = {
        logicAppName: logicAppName,
        projectPath: logicAppFolderPath,
        workflowName: workflowName,
        workflowType: WorkflowType.stateful,
        logicAppType: ProjectType.rulesEngine,
        functionName: 'RulesProcessor',
      };

      await fse.ensureDir(workspaceRootFolder);
      await createLogicAppAndWorkflow(mockContextIntegration, logicAppFolderPath);

      const workflowJsonPath = path.join(logicAppFolderPath, 'XmlRulesWorkflow', 'workflow.json');
      const workflowContent = await fse.readJSON(workflowJsonPath);

      const rulesAction = workflowContent.definition.actions.Call_a_local_rules_function_in_this_logic_app;
      const xmlInput = rulesAction.inputs.parameters.inputXml;

      // Verify XML content exists and contains expected schema
      expect(typeof xmlInput).toBe('string');
      expect(xmlInput).toContain('ns0:Root');
      expect(xmlInput).toContain('SchemaUser');
      expect(xmlInput).toContain('UserDetails');
      expect(xmlInput).toContain('Age');
      expect(xmlInput).toContain('Status');
    });
  });

  describe('DevContainer Workspace Creation', () => {
    it('should create .devcontainer folder at workspace root when isDevContainerProject is true', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'DevContainerWorkspace',
        logicAppName: 'DevContainerApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify .devcontainer folder exists at workspace root (same level as .code-workspace file)
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(true);

      // Verify devcontainer.json exists inside .devcontainer folder
      const devContainerJsonPath = path.join(devContainerPath, devContainerFileName);
      const devContainerJsonExists = await fse.pathExists(devContainerJsonPath);
      expect(devContainerJsonExists).toBe(true);

      // Verify devcontainer.json has required properties
      const devContainerContent = await fse.readJSON(devContainerJsonPath);
      expect(devContainerContent).toHaveProperty('name');
      expect(devContainerContent).toHaveProperty('image');
      expect(devContainerContent).toHaveProperty('customizations');
    });

    it('should add .devcontainer folder to workspace file when isDevContainerProject is true', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'DevContainerWorkspaceFile',
        logicAppName: 'DevContainerAppFile',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify workspace file includes .devcontainer folder
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceContent = await fse.readJSON(workspaceFilePath);

      expect(workspaceContent.folders).toHaveLength(2);

      // Find the .devcontainer folder entry
      const devContainerFolder = workspaceContent.folders.find((folder: any) => folder.path === devContainerFolderName);
      expect(devContainerFolder).toBeDefined();
      expect(devContainerFolder.name).toBe(devContainerFolderName);
      expect(devContainerFolder.path).toBe(devContainerFolderName);
    });

    it('should not create .devcontainer folder when isDevContainerProject is false', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'NonDevContainerWorkspace',
        logicAppName: 'NonDevContainerApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
        isDevContainerProject: false,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify .devcontainer folder does NOT exist
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(false);

      // Verify workspace file does NOT include .devcontainer folder
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceContent = await fse.readJSON(workspaceFilePath);

      expect(workspaceContent.folders).toHaveLength(1);
      expect(workspaceContent.folders[0].name).toBe('NonDevContainerApp');
    });

    it('should not create .devcontainer folder when isDevContainerProject is undefined', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'UndefinedDevContainerWorkspace',
        logicAppName: 'UndefinedDevContainerApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
        // isDevContainerProject not set (undefined)
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify .devcontainer folder does NOT exist
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(false);
    });

    it('should create .devcontainer at workspace root, not inside logic app folder', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'DevContainerLocationWorkspace',
        logicAppName: 'DevContainerLocationApp',
        logicAppType: ProjectType.logicApp,
        workflowName: 'TestWorkflow',
        workflowType: 'Stateful',
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const logicAppFolderPath = getLogicAppFolderPath(options.workspaceName, options.logicAppName);

      // Verify .devcontainer is at workspace root
      const devContainerAtRoot = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerAtRootExists = await fse.pathExists(devContainerAtRoot);
      expect(devContainerAtRootExists).toBe(true);

      // Verify .devcontainer is NOT inside logic app folder
      const devContainerInLogicApp = path.join(logicAppFolderPath, devContainerFolderName);
      const devContainerInLogicAppExists = await fse.pathExists(devContainerInLogicApp);
      expect(devContainerInLogicAppExists).toBe(false);

      // Verify .code-workspace file is at workspace root (same level as .devcontainer)
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceFileExists = await fse.pathExists(workspaceFilePath);
      expect(workspaceFileExists).toBe(true);

      // Verify logic app folder is at workspace root (same level as .devcontainer)
      const logicAppExists = await fse.pathExists(logicAppFolderPath);
      expect(logicAppExists).toBe(true);

      // All three should be siblings at the workspace root
      const workspaceRootContents = await fse.readdir(workspaceRootFolder);
      expect(workspaceRootContents).toContain(devContainerFolderName);
      expect(workspaceRootContents).toContain(options.logicAppName);
      expect(workspaceRootContents).toContain(`${options.workspaceName}.code-workspace`);
    });

    it('should create devcontainer with custom code project', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'CustomCodeDevContainer',
        logicAppName: 'CustomCodeDevApp',
        logicAppType: ProjectType.customCode,
        workflowName: 'CustomWorkflow',
        workflowType: 'Stateful',
        functionFolderName: 'CustomFunctions',
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify .devcontainer exists
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(true);

      // Verify workspace file includes both logic app, function folder, and .devcontainer
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceContent = await fse.readJSON(workspaceFilePath);

      expect(workspaceContent.folders).toHaveLength(3);
      expect(workspaceContent.folders.some((f: any) => f.name === 'CustomCodeDevApp')).toBe(true);
      expect(workspaceContent.folders.some((f: any) => f.name === 'CustomFunctions')).toBe(true);
      expect(workspaceContent.folders.some((f: any) => f.name === devContainerFolderName)).toBe(true);
    });

    it('should create devcontainer with rules engine project', async () => {
      const options: IWebviewProjectContext = {
        workspaceProjectPath: { fsPath: tempDir } as vscode.Uri,
        workspaceName: 'RulesDevContainer',
        logicAppName: 'RulesDevApp',
        logicAppType: ProjectType.rulesEngine,
        workflowName: 'RulesWorkflow',
        workflowType: 'Stateful',
        functionFolderName: 'RulesFunctions',
        targetFramework: 'net8',
        isDevContainerProject: true,
      } as any;

      await createLogicAppWorkspace(mockContext, options, false);

      // Verify .devcontainer exists
      const workspaceRootFolder = getWorkspaceRootFolder(options.workspaceName);
      const devContainerPath = path.join(workspaceRootFolder, devContainerFolderName);
      const devContainerExists = await fse.pathExists(devContainerPath);
      expect(devContainerExists).toBe(true);

      // Verify workspace file structure
      const workspaceFilePath = getWorkspaceFilePath(options.workspaceName);
      const workspaceContent = await fse.readJSON(workspaceFilePath);

      expect(workspaceContent.folders).toHaveLength(3);
      expect(workspaceContent.folders.some((f: any) => f.name === 'RulesDevApp')).toBe(true);
      expect(workspaceContent.folders.some((f: any) => f.name === 'RulesFunctions')).toBe(true);
      expect(workspaceContent.folders.some((f: any) => f.name === devContainerFolderName)).toBe(true);
    });
  });
});
