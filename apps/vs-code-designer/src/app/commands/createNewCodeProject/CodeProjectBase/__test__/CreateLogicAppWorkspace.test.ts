import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, type Mock } from 'vitest';
import * as CreateLogicAppWorkspaceModule from '../CreateLogicAppWorkspace';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as funcVersionModule from '../../../../utils/funcCoreTools/funcVersion';
import * as gitModule from '../../../../utils/git';
import * as artifactsModule from '../../../../utils/codeless/artifacts';
import * as fsUtils from '../../../../utils/fs';
import { CreateFunctionAppFiles } from '../CreateFunctionAppFiles';
import * as CreateLogicAppVSCodeContentsModule from '../CreateLogicAppVSCodeContents';
import * as cloudToLocalUtilsModule from '../../../../utils/cloudToLocalUtils';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';

vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
  },
}));
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return actual;
});
vi.mock('../../../../utils/funcCoreTools/funcVersion');
vi.mock('../../../../utils/git');
vi.mock('../../../../utils/codeless/artifacts');
vi.mock('../CreateFunctionAppFiles');
vi.mock('../CreateLogicAppVSCodeContents');
vi.mock('../../../../utils/cloudToLocalUtils');
vi.mock('../../../../utils/fs', () => ({
  confirmEditJsonFile: vi.fn(async (context, filePath, callback) => {
    // Simulate editing a JSON file
    const data = {};
    const result = callback(data);
    return result;
  }),
  writeFormattedJson: vi.fn().mockResolvedValue({}),
}));
vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  writeJSON: vi.fn(),
  writeJson: vi.fn(),
  readJson: vi.fn(),
  readJSON: vi.fn(),
  pathExists: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  copyFile: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('getHostContent', () => {
  it('should return host.json with correct structure', async () => {
    const hostJson = await CreateLogicAppWorkspaceModule.getHostContent();

    expect(hostJson).toEqual({
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
        id: expect.stringContaining('Microsoft.Azure.Functions.ExtensionBundle.Workflows'),
        version: expect.any(String),
      },
    });
  });

  it('should return host.json with version 2.0', async () => {
    const hostJson = await CreateLogicAppWorkspaceModule.getHostContent();
    expect(hostJson.version).toBe('2.0');
  });

  it('should include application insights logging configuration', async () => {
    const hostJson = await CreateLogicAppWorkspaceModule.getHostContent();
    expect(hostJson.logging.applicationInsights.samplingSettings.isEnabled).toBe(true);
    expect(hostJson.logging.applicationInsights.samplingSettings.excludedTypes).toBe('Request');
  });

  it('should include extension bundle configuration', async () => {
    const hostJson = await CreateLogicAppWorkspaceModule.getHostContent();
    expect(hostJson.extensionBundle).toBeDefined();
    expect(hostJson.extensionBundle.id).toContain('Workflows');
    expect(hostJson.extensionBundle.version).toBeTruthy();
  });
});

describe('createLogicAppWorkspace', () => {
  const mockContext: IActionContext = {
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

  // Mock options for standard Logic App (no custom code)
  const mockOptionsLogicApp: IWebviewProjectContext = {
    workspaceProjectPath: { fsPath: path.join('test', 'workspace') } as vscode.Uri,
    workspaceName: 'TestWorkspace',
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.logicApp,
    workflowName: 'TestWorkflow',
    workflowType: 'Stateful',
    functionFolderName: 'Functions',
    functionName: 'TestFunction',
    functionNamespace: 'TestNamespace',
    targetFramework: 'net6.0',
    packagePath: { fsPath: path.join('test', 'package.zip') } as vscode.Uri,
  } as any;

  // Mock options for Custom Code Logic App
  const mockOptionsCustomCode: IWebviewProjectContext = {
    workspaceProjectPath: { fsPath: path.join('test', 'workspace') } as vscode.Uri,
    workspaceName: 'TestWorkspaceCustomCode',
    logicAppName: 'TestLogicAppCustomCode',
    logicAppType: ProjectType.customCode,
    workflowName: 'TestWorkflowCustomCode',
    workflowType: 'Stateful',
    functionFolderName: 'CustomCodeFunctions',
    functionName: 'CustomFunction',
    functionNamespace: 'CustomNamespace',
    targetFramework: 'net8.0',
    packagePath: { fsPath: path.join('test', 'package-custom.zip') } as vscode.Uri,
  } as any;

  // Mock options for Rules Engine Logic App
  const mockOptionsRulesEngine: IWebviewProjectContext = {
    workspaceProjectPath: { fsPath: path.join('test', 'workspace') } as vscode.Uri,
    workspaceName: 'TestWorkspaceRules',
    logicAppName: 'TestLogicAppRules',
    logicAppType: ProjectType.rulesEngine,
    workflowName: 'TestWorkflowRules',
    workflowType: 'Stateless',
    functionFolderName: 'RulesFunctions',
    functionName: 'RulesFunction',
    functionNamespace: 'RulesNamespace',
    targetFramework: 'net6.0',
    packagePath: { fsPath: path.join('test', 'package-rules.zip') } as vscode.Uri,
  } as any;

  const workspaceFolder = path.join('test', 'workspace', 'TestWorkspace');
  const logicAppFolderPath = path.join(workspaceFolder, 'TestLogicApp');
  const workspaceFilePath = path.join(workspaceFolder, 'TestWorkspace.code-workspace');

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock vscode functions
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);

    // Mock fs-extra functions
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fse.writeJSON).mockResolvedValue(undefined);
    vi.mocked(fse.readJson).mockResolvedValue({ folders: [] });
    vi.mocked(fse.readFile).mockResolvedValue('Sample content with <%= methodName %>' as any);
    vi.mocked(fse.copyFile).mockResolvedValue(undefined);
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
    vi.mocked(fse.mkdirSync).mockReturnValue(undefined);

    // Note: Cannot spy on functions called internally within CreateLogicAppWorkspace module:
    // - createLogicAppAndWorkflow, createLocalConfigurationFiles, createRulesFiles, createLibFolder
    // These are called directly within the module, not through the export object.
    // Verify their side effects (files created, directories made) instead of using spies.

    // Mock external module functions (these CAN be spied on)
    vi.spyOn(CreateLogicAppVSCodeContentsModule, 'createLogicAppVsCodeContents').mockResolvedValue(undefined);
    vi.spyOn(CreateLogicAppVSCodeContentsModule, 'createDevContainerContents').mockResolvedValue(undefined);
    vi.spyOn(funcVersionModule, 'addLocalFuncTelemetry').mockReturnValue(undefined);
    vi.spyOn(gitModule, 'isGitInstalled').mockResolvedValue(true);
    vi.spyOn(gitModule, 'isInsideRepo').mockResolvedValue(false);
    vi.spyOn(gitModule, 'gitInit').mockResolvedValue(undefined);
    vi.spyOn(artifactsModule, 'createArtifactsFolder').mockResolvedValue(undefined);
    vi.spyOn(cloudToLocalUtilsModule, 'unzipLogicAppPackageIntoWorkspace').mockResolvedValue(undefined);
    vi.spyOn(cloudToLocalUtilsModule, 'logicAppPackageProcessing').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add telemetry when creating a workspace', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(funcVersionModule.addLocalFuncTelemetry).toHaveBeenCalledWith(mockContext);
  });

  it('should create workspace structure with logic app and workflow', async () => {
    const { writeFormattedJson } = fsUtils;
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(fse.ensureDir).toHaveBeenCalledWith(workspaceFolder);
    // Verify side effect: workflow.json was created
    expect(writeFormattedJson).toHaveBeenCalledWith(
      expect.stringContaining(path.join('TestLogicApp', 'TestWorkflow', 'workflow.json')),
      expect.objectContaining({ definition: expect.any(Object) })
    );
  });

  it('should create workspace file with correct structure for standard logic app', async () => {
    await CreateLogicAppWorkspaceModule.createWorkspaceStructure(mockOptionsLogicApp);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify complete workspace structure
    expect(workspaceData).toEqual({
      folders: [
        {
          name: 'TestLogicApp',
          path: './TestLogicApp',
        },
      ],
    });

    // Should have exactly 1 folder (logic app only)
    expect(folders).toHaveLength(1);

    // Should NOT have a functions folder for standard logic app (ProjectType.logicApp)
    const hasFunctionsFolder = folders.some((f: any) => f.name === 'Functions');
    expect(hasFunctionsFolder).toBe(false);
  });

  it('should include function folder for custom code projects', async () => {
    const customCodeWorkspaceFilePath = path.join('test', 'workspace', 'TestWorkspaceCustomCode', 'TestWorkspaceCustomCode.code-workspace');

    await CreateLogicAppWorkspaceModule.createWorkspaceStructure(mockOptionsCustomCode);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify complete workspace structure with both logic app and functions folders
    expect(workspaceData).toEqual({
      folders: [
        {
          name: 'TestLogicAppCustomCode',
          path: './TestLogicAppCustomCode',
        },
        {
          name: 'CustomCodeFunctions',
          path: './CustomCodeFunctions',
        },
      ],
    });

    // Should have exactly 2 folders (logic app + functions)
    expect(folders).toHaveLength(2);

    // Verify folder order: logic app first, then functions
    expect(folders[0].name).toBe('TestLogicAppCustomCode');
    expect(folders[1].name).toBe('CustomCodeFunctions');
  });

  it('should include function folder for rules engine projects', async () => {
    const rulesEngineWorkspaceFilePath = path.join('test', 'workspace', 'TestWorkspaceRules', 'TestWorkspaceRules.code-workspace');

    await CreateLogicAppWorkspaceModule.createWorkspaceStructure(mockOptionsRulesEngine);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify complete workspace structure with both logic app and functions folders
    expect(workspaceData).toEqual({
      folders: [
        {
          name: 'TestLogicAppRules',
          path: './TestLogicAppRules',
        },
        {
          name: 'RulesFunctions',
          path: './RulesFunctions',
        },
      ],
    });

    // Should have exactly 2 folders (logic app + functions)
    expect(folders).toHaveLength(2);

    // Verify folder order: logic app first, then functions
    expect(folders[0].name).toBe('TestLogicAppRules');
    expect(folders[1].name).toBe('RulesFunctions');
  });

  it('should create vscode and dev container contents', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    // Verify createLogicAppVsCodeContents is called with correct parameters
    expect(CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents).toHaveBeenCalledWith(mockOptionsLogicApp, logicAppFolderPath);
    expect(CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents).toHaveBeenCalledTimes(1);

    // Verify createDevContainerContents is called with correct parameters
    expect(CreateLogicAppVSCodeContentsModule.createDevContainerContents).toHaveBeenCalledWith(mockOptionsLogicApp, logicAppFolderPath);
    expect(CreateLogicAppVSCodeContentsModule.createDevContainerContents).toHaveBeenCalledTimes(1);
  });

  it('should call createLogicAppVsCodeContents with different project types', async () => {
    vi.mocked(fse.readFile).mockResolvedValue('Sample template content' as any);
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
    vi.mocked(fse.copyFile).mockResolvedValue(undefined);
    // Test with custom code project
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsCustomCode, false);

    const customCodeLogicAppPath = path.join('test', 'workspace', 'TestWorkspaceCustomCode', 'TestLogicAppCustomCode');
    expect(CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents).toHaveBeenCalledWith(
      mockOptionsCustomCode,
      customCodeLogicAppPath
    );

    // Test with rules engine project
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsRulesEngine, false);

    const rulesEngineLogicAppPath = path.join('test', 'workspace', 'TestWorkspaceRules', 'TestLogicAppRules');
    expect(CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents).toHaveBeenCalledWith(
      mockOptionsRulesEngine,
      rulesEngineLogicAppPath
    );
  });

  it('should create local configuration files', async () => {
    const { writeFormattedJson } = fsUtils;
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    // Verify side effects: host.json and local.settings.json were created
    expect(writeFormattedJson).toHaveBeenCalledWith(expect.stringContaining('host.json'), expect.objectContaining({ version: '2.0' }));
    expect(writeFormattedJson).toHaveBeenCalledWith(
      expect.stringContaining('local.settings.json'),
      expect.objectContaining({ IsEncrypted: false })
    );
  });

  it('should initialize git when not inside a repo', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(gitModule.gitInit).toHaveBeenCalledWith(workspaceFolder);
  });

  it('should not initialize git when already inside a repo', async () => {
    vi.spyOn(gitModule, 'isInsideRepo').mockResolvedValue(true);

    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(gitModule.gitInit).not.toHaveBeenCalled();
  });

  it('should create artifacts, rules, and lib folders', async () => {
    vi.mocked(fse.readFile).mockResolvedValue('Sample content with <%= methodName %>' as any);
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsRulesEngine, false);

    // Verify side effects instead of spy calls (internal calls can't be spied on)
    expect(artifactsModule.createArtifactsFolder).toHaveBeenCalled();
    expect(fse.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('lib', 'builtinOperationSdks', 'JAR')),
      expect.any(Object)
    );
    expect(fse.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('SampleRuleSet.xml'),
      expect.stringContaining(mockOptionsRulesEngine.functionName)
    );
  });

  it('should not create artifacts, rules, and lib folders with standard logic apps', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(artifactsModule.createArtifactsFolder).toHaveBeenCalled();
    // Verify rules files were NOT created (only for rulesEngine type)
    expect(fse.writeFile).not.toHaveBeenCalledWith(expect.stringContaining('SampleRuleSet.xml'), expect.anything());
    // Lib folder is always created
    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('lib', 'builtinOperationSdks')), expect.any(Object));
  });

  it('should not create artifacts, rules, and lib folders with custom code logic apps', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsCustomCode, false);

    expect(artifactsModule.createArtifactsFolder).toHaveBeenCalled();
    // Verify rules files were NOT created (only for rulesEngine type)
    expect(fse.writeFile).not.toHaveBeenCalledWith(expect.stringContaining('SampleRuleSet.xml'), expect.anything());
    // Lib folder is always created
    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('lib', 'builtinOperationSdks')), expect.any(Object));
  });

  it('should unzip package when fromPackage is true', async () => {
    const { writeFormattedJson } = fsUtils;
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, true);

    expect(cloudToLocalUtilsModule.unzipLogicAppPackageIntoWorkspace).toHaveBeenCalled();
    // Verify workflow.json was NOT created (because we're using a package instead)
    expect(writeFormattedJson).not.toHaveBeenCalledWith(expect.stringContaining('workflow.json'), expect.anything());
  });

  it('should process logic app package when fromPackage is true', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, true);

    expect(cloudToLocalUtilsModule.logicAppPackageProcessing).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Finished extracting package'));
  });

  it('should create function app files for custom code projects when not from package', async () => {
    const mockSetup = vi.fn().mockResolvedValue(undefined);
    (CreateFunctionAppFiles as Mock).mockImplementation(() => ({
      setup: mockSetup,
    }));

    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsCustomCode, false);

    expect(mockSetup).toHaveBeenCalled();
  });

  it('should create function app files for rules engine projects when not from package', async () => {
    const mockSetup = vi.fn().mockResolvedValue(undefined);
    (CreateFunctionAppFiles as Mock).mockImplementation(() => ({
      setup: mockSetup,
    }));
    vi.mocked(fse.readFile).mockResolvedValue('Sample content with <%= methodName %>' as any);

    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsRulesEngine, false);

    expect(mockSetup).toHaveBeenCalled();
  });

  it('should not create function app files for standard logic app projects', async () => {
    const mockSetup = vi.fn().mockResolvedValue(undefined);
    (CreateFunctionAppFiles as Mock).mockImplementation(() => ({
      setup: mockSetup,
    }));

    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(mockSetup).not.toHaveBeenCalled();
  });

  it('should open workspace in new window after creation', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.openFolder',
      expect.anything(), // vscode.Uri.file() returns an object
      true // forceNewWindow
    );
  });

  it('should show success message after workspace creation', async () => {
    await CreateLogicAppWorkspaceModule.createLogicAppWorkspace(mockContext, mockOptionsLogicApp, false);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Finished creating project'));
  });
});

describe('updateWorkspaceFile', () => {
  const mockOptionsForUpdate: IWebviewProjectContext = {
    workspaceFilePath: path.join('test', 'workspace', 'TestWorkspace.code-workspace'),
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.logicApp,
    functionFolderName: 'Functions',
    shouldCreateLogicAppProject: true,
  } as any;

  const mockOptionsCustomCode: IWebviewProjectContext = {
    workspaceFilePath: path.join('test', 'workspace', 'TestWorkspaceCustomCode.code-workspace'),
    logicAppName: 'TestLogicAppCustomCode',
    logicAppType: ProjectType.customCode,
    functionFolderName: 'CustomCodeFunctions',
    shouldCreateLogicAppProject: true,
  } as any;

  const mockOptionsRulesEngine: IWebviewProjectContext = {
    workspaceFilePath: path.join('test', 'workspace', 'TestWorkspaceRules.code-workspace'),
    logicAppName: 'TestLogicAppRules',
    logicAppType: ProjectType.rulesEngine,
    functionFolderName: 'RulesFunctions',
    shouldCreateLogicAppProject: true,
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fse.readJson).mockResolvedValue({ folders: [] });
    vi.mocked(fse.writeJSON).mockResolvedValue(undefined);
  });

  it('should add logic app folder to workspace', async () => {
    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(mockOptionsForUpdate);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify exact folder structure
    expect(folders).toEqual([
      {
        name: 'TestLogicApp',
        path: './TestLogicApp',
      },
    ]);

    // Should have exactly 1 folder
    expect(folders).toHaveLength(1);

    // Should NOT have a functions folder for standard logic app (ProjectType.logicApp)
    const hasFunctionsFolder = folders.some((f: any) => f.name === 'Functions');
    expect(hasFunctionsFolder).toBe(false);
  });

  it('should add function folder for custom code projects', async () => {
    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(mockOptionsCustomCode);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify exact folder structure
    expect(folders).toEqual([
      {
        name: 'TestLogicAppCustomCode',
        path: './TestLogicAppCustomCode',
      },
      {
        name: 'CustomCodeFunctions',
        path: './CustomCodeFunctions',
      },
    ]);

    // Should have exactly 2 folders
    expect(folders).toHaveLength(2);

    // Verify folder order
    expect(folders[0].name).toBe('TestLogicAppCustomCode');
    expect(folders[1].name).toBe('CustomCodeFunctions');
  });

  it('should add function folder for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(mockOptionsRulesEngine);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const workspaceData = writeCall[1];
    const folders = workspaceData.folders;

    // Verify exact folder structure
    expect(folders).toEqual([
      {
        name: 'TestLogicAppRules',
        path: './TestLogicAppRules',
      },
      {
        name: 'RulesFunctions',
        path: './RulesFunctions',
      },
    ]);

    // Should have exactly 2 folders
    expect(folders).toHaveLength(2);

    // Verify folder order
    expect(folders[0].name).toBe('TestLogicAppRules');
    expect(folders[1].name).toBe('RulesFunctions');
  });

  it('should not add logic app folder when shouldCreateLogicAppProject is false', async () => {
    const optionsNoCreate = {
      ...mockOptionsForUpdate,
      shouldCreateLogicAppProject: false,
    };

    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(optionsNoCreate);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const folders = writeCall[1].folders;
    const hasLogicApp = folders.some((f: any) => f.name === 'TestLogicApp');

    expect(hasLogicApp).toBe(false);
  });

  it('should move tests folder to end if it exists', async () => {
    vi.mocked(fse.readJson).mockResolvedValue({
      folders: [
        { name: 'Tests', path: './Tests' },
        { name: 'src', path: './src' },
      ],
    });

    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(mockOptionsForUpdate);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    const folders = writeCall[1].folders;
    const testsIndex = folders.findIndex((f: any) => f.name === 'Tests');

    // Tests folder should be moved to the end after the logic app folder is added
    expect(testsIndex).toBe(folders.length - 1);
    expect(fse.writeJSON).toHaveBeenCalledWith(
      mockOptionsForUpdate.workspaceFilePath,
      expect.objectContaining({
        folders: expect.arrayContaining([expect.objectContaining({ name: 'Tests' })]),
      }),
      { spaces: 2 }
    );
  });
  it('should preserve existing folders in workspace', async () => {
    vi.mocked(fse.readJson).mockResolvedValue({
      folders: [{ name: 'existing', path: './existing' }],
    });

    await CreateLogicAppWorkspaceModule.updateWorkspaceFile(mockOptionsForUpdate);

    expect(fse.writeJSON).toHaveBeenCalledWith(
      mockOptionsForUpdate.workspaceFilePath,
      expect.objectContaining({
        folders: expect.arrayContaining([
          expect.objectContaining({ name: 'existing', path: './existing' }),
          expect.objectContaining({ name: 'TestLogicApp', path: './TestLogicApp' }),
        ]),
      }),
      { spaces: 2 }
    );
  });
});

describe('createWorkspaceStructure - Testing Actual Implementation', () => {
  // This suite tests the ACTUAL createWorkspaceStructure function
  // Only file system operations are mocked, business logic is real

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fse.writeJSON).mockResolvedValue(undefined);
  });

  it('should create workspace folder and file for standard logic app', async () => {
    const mockOptions: IWebviewProjectContext = {
      workspaceProjectPath: { fsPath: path.join('test', 'workspace') } as vscode.Uri,
      workspaceName: 'MyWorkspace',
      logicAppName: 'MyLogicApp',
      logicAppType: ProjectType.logicApp,
    } as any;

    await CreateLogicAppWorkspaceModule.createWorkspaceStructure(mockOptions);

    // Verify workspace folder creation - normalize path for cross-platform compatibility
    expect(fse.ensureDir).toHaveBeenCalledWith(path.join('test', 'workspace', 'MyWorkspace'));

    // Verify workspace file structure - actual function logic
    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    expect(writeCall[0]).toContain('MyWorkspace.code-workspace');
    expect(writeCall[1]).toEqual({
      folders: [{ name: 'MyLogicApp', path: './MyLogicApp' }],
    });
  });

  it('should include functions folder for non-standard logic app types', async () => {
    const mockOptions: IWebviewProjectContext = {
      workspaceProjectPath: { fsPath: path.join('test', 'workspace') } as vscode.Uri,
      workspaceName: 'MyWorkspace',
      logicAppName: 'MyLogicApp',
      logicAppType: ProjectType.customCode,
      functionFolderName: 'MyFunctions',
    } as any;

    await CreateLogicAppWorkspaceModule.createWorkspaceStructure(mockOptions);

    const writeCall = vi.mocked(fse.writeJSON).mock.calls[0];
    expect(writeCall[1].folders).toHaveLength(2);
    expect(writeCall[1].folders[1]).toEqual({
      name: 'MyFunctions',
      path: './MyFunctions',
    });
  });
});

describe('createLocalConfigurationFiles', () => {
  const mockContext: IWebviewProjectContext = {
    workspaceName: 'TestWorkspace',
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.logicApp,
    workflowName: 'TestWorkflow',
  } as any;

  const mockContextCustomCode: IWebviewProjectContext = {
    workspaceName: 'TestWorkspace',
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.customCode,
    workflowName: 'TestWorkflow',
  } as any;

  const mockContextRulesEngine: IWebviewProjectContext = {
    workspaceName: 'TestWorkspace',
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.rulesEngine,
    workflowName: 'TestWorkflow',
  } as any;

  const logicAppFolderPath = path.join('test', 'workspace', 'TestLogicApp');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
    vi.mocked(fse.copyFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create host.json file', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    expect(fsUtils.writeFormattedJson).toHaveBeenCalledWith(
      expect.stringContaining('host.json'),
      expect.objectContaining({
        version: '2.0',
        extensionBundle: expect.any(Object),
      })
    );
  });

  it('should create local.settings.json file', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    expect(fsUtils.writeFormattedJson).toHaveBeenCalledWith(
      expect.stringContaining('local.settings.json'),
      expect.objectContaining({
        IsEncrypted: false,
        Values: expect.any(Object),
      })
    );
  });

  it('should create .gitignore file by copying from template', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    expect(fse.copyFile).toHaveBeenCalledWith(expect.stringContaining('GitIgnoreFile'), expect.stringContaining('.gitignore'));
  });

  it('should create .funcignore file with proper entries for logic app', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    const funcIgnoreCall = vi.mocked(fse.writeFile).mock.calls.find((call) => call[0].toString().includes('.funcignore'));
    expect(funcIgnoreCall).toBeDefined();
    const funcIgnoreContent = funcIgnoreCall![1] as string;

    // Verify standard entries are present
    expect(funcIgnoreContent).toContain('__blobstorage__');
    expect(funcIgnoreContent).toContain('__queuestorage__');
    expect(funcIgnoreContent).toContain('.git*');
    expect(funcIgnoreContent).toContain('.vscode');
    expect(funcIgnoreContent).toContain('local.settings.json');
    expect(funcIgnoreContent).toContain('test');
    expect(funcIgnoreContent).toContain('.debug');
    expect(funcIgnoreContent).toContain('workflow-designtime/');
  });

  it('should NOT include global.json in .funcignore for standard logic app projects', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    const funcIgnoreCall = vi.mocked(fse.writeFile).mock.calls.find((call) => call[0].toString().includes('.funcignore'));
    expect(funcIgnoreCall).toBeDefined();
    const funcIgnoreContent = funcIgnoreCall![1] as string;

    expect(funcIgnoreContent).not.toContain('global.json');
  });

  it('should NOT include multi-language worker setting for standard logic app', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    expect(localSettingsData.Values).not.toHaveProperty('AzureWebJobsFeatureFlags');
  });

  it('should create local.settings.json with exact required values for standard logic app', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    // Check exact Values properties
    expect(localSettingsData.Values).toEqual({
      AzureWebJobsStorage: 'UseDevelopmentStorage=true',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      APP_KIND: 'workflowapp',
      ProjectDirectoryPath: path.join('test', 'workspace', 'TestLogicApp'),
    });

    // Verify no other properties exist
    expect(Object.keys(localSettingsData.Values)).toHaveLength(5);
  });

  it('should include global.json in .funcignore for custom code projects', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextCustomCode, logicAppFolderPath);

    const funcIgnoreCall = vi.mocked(fse.writeFile).mock.calls.find((call) => call[0].toString().includes('.funcignore'));
    expect(funcIgnoreCall).toBeDefined();
    const funcIgnoreContent = funcIgnoreCall![1] as string;

    expect(funcIgnoreContent).toContain('global.json');
  });

  it('should include multi-language worker setting in local.settings.json for custom code', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextCustomCode, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    expect(localSettingsData.Values).toHaveProperty('AzureWebJobsFeatureFlags');
    expect(localSettingsData.Values['AzureWebJobsFeatureFlags']).toContain('EnableMultiLanguageWorker');
  });

  it('should create local.settings.json with exact required values for custom code projects', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextCustomCode, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    // Check exact Values properties including multi-language worker flag
    expect(localSettingsData.Values).toEqual({
      AzureWebJobsStorage: 'UseDevelopmentStorage=true',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      APP_KIND: 'workflowapp',
      ProjectDirectoryPath: path.join('test', 'workspace', 'TestLogicApp'),
      AzureWebJobsFeatureFlags: 'EnableMultiLanguageWorker',
    });

    // Verify exactly 6 properties exist (5 standard + 1 feature flag)
    expect(Object.keys(localSettingsData.Values)).toHaveLength(6);
  });

  it('should include global.json in .funcignore for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextRulesEngine, logicAppFolderPath);

    const funcIgnoreCall = vi.mocked(fse.writeFile).mock.calls.find((call) => call[0].toString().includes('.funcignore'));
    expect(funcIgnoreCall).toBeDefined();
    const funcIgnoreContent = funcIgnoreCall![1] as string;

    expect(funcIgnoreContent).toContain('global.json');
  });

  it('should include multi-language worker setting in local.settings.json for rules engine', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextRulesEngine, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    expect(localSettingsData.Values).toHaveProperty('AzureWebJobsFeatureFlags');
    expect(localSettingsData.Values['AzureWebJobsFeatureFlags']).toContain('EnableMultiLanguageWorker');
  });

  it('should create local.settings.json with exact required values for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContextRulesEngine, logicAppFolderPath);

    const localSettingsCall = vi
      .mocked(fsUtils.writeFormattedJson)
      .mock.calls.find((call) => call[0].toString().includes('local.settings.json'));
    expect(localSettingsCall).toBeDefined();
    const localSettingsData = localSettingsCall![1] as any;

    // Check exact Values properties including multi-language worker flag
    expect(localSettingsData.Values).toEqual({
      AzureWebJobsStorage: 'UseDevelopmentStorage=true',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      APP_KIND: 'workflowapp',
      ProjectDirectoryPath: path.join('test', 'workspace', 'TestLogicApp'),
      AzureWebJobsFeatureFlags: 'EnableMultiLanguageWorker',
    });

    // Verify exactly 6 properties exist (5 standard + 1 feature flag)
    expect(Object.keys(localSettingsData.Values)).toHaveLength(6);
  });

  it('should include extension bundle configuration in host.json', async () => {
    await CreateLogicAppWorkspaceModule.createLocalConfigurationFiles(mockContext, logicAppFolderPath);

    const hostJsonCall = vi.mocked(fsUtils.writeFormattedJson).mock.calls.find((call) => call[0].toString().includes('host.json'));
    expect(hostJsonCall).toBeDefined();
    const hostJsonData = hostJsonCall![1] as any;

    expect(hostJsonData).toHaveProperty('extensionBundle');
    expect(hostJsonData.extensionBundle).toHaveProperty('id');
    expect(hostJsonData.extensionBundle.id).toContain('Microsoft.Azure.Functions.ExtensionBundle.Workflows');
  });
});

describe('createArtifactsFolder', () => {
  let actualArtifactsModule: typeof artifactsModule;

  beforeAll(async () => {
    // Import the ACTUAL module implementation (not mocked) for testing
    actualArtifactsModule = await vi.importActual('../../../../utils/codeless/artifacts');
  });

  const mockContext: any = {
    projectPath: path.join('test', 'workspace', 'TestLogicApp'),
    projectType: ProjectType.logicApp,
  };

  beforeEach(() => {
    vi.mocked(fse.mkdirSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create Artifacts/Maps directory', async () => {
    await actualArtifactsModule.createArtifactsFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('Artifacts', 'Maps')), { recursive: true });
  });

  it('should create Artifacts/Schemas directory', async () => {
    await actualArtifactsModule.createArtifactsFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('Artifacts', 'Schemas')), { recursive: true });
  });

  it('should create Artifacts/Rules directory', async () => {
    await actualArtifactsModule.createArtifactsFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('Artifacts', 'Rules')), { recursive: true });
  });

  it('should create all three artifact directories', async () => {
    await actualArtifactsModule.createArtifactsFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledTimes(3);
  });

  it('should create directories with recursive option', async () => {
    await actualArtifactsModule.createArtifactsFolder(mockContext);

    const calls = vi.mocked(fse.mkdirSync).mock.calls;
    calls.forEach((call) => {
      expect(call[1]).toEqual({ recursive: true });
    });
  });
});

describe('createRulesFiles - Testing Actual Implementation', () => {
  // This suite tests the ACTUAL createRulesFiles function
  // Only file system operations are mocked, conditional logic and template processing is real

  const mockContextRulesEngine: any = {
    projectPath: path.join('test', 'workspace', 'TestLogicApp'),
    projectType: ProjectType.rulesEngine,
    functionAppName: 'TestRulesApp',
  };

  const mockContextLogicApp: any = {
    projectPath: path.join('test', 'workspace', 'TestLogicApp'),
    projectType: ProjectType.logicApp,
    functionAppName: 'TestLogicApp',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fse.readFile).mockResolvedValue('Sample content with <%= methodName %>' as any);
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create SampleRuleSet.xml for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextRulesEngine);

    expect(fse.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('Artifacts', 'Rules', 'SampleRuleSet.xml')),
      expect.any(String)
    );
  });

  it('should create SchemaUser.xsd for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextRulesEngine);

    expect(fse.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('Artifacts', 'Schemas', 'SchemaUser.xsd')),
      expect.any(String)
    );
  });

  it('should replace methodName placeholder with functionAppName in SampleRuleSet.xml', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextRulesEngine);

    const ruleSetCall = vi.mocked(fse.writeFile).mock.calls.find((call) => call[0].toString().includes('SampleRuleSet.xml'));
    expect(ruleSetCall).toBeDefined();
    const ruleSetContent = ruleSetCall![1] as string;

    expect(ruleSetContent).toContain('TestRulesApp');
    expect(ruleSetContent).not.toContain('<%= methodName %>');
  });

  it('should read template files from assets folder', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextRulesEngine);

    expect(fse.readFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('assets', 'RuleSetProjectTemplate', 'SampleRuleSet')),
      'utf-8'
    );
    expect(fse.readFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('assets', 'RuleSetProjectTemplate', 'SchemaUser')),
      'utf-8'
    );
  });

  it('should NOT create rule files for standard logic app projects', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextLogicApp);

    expect(fse.writeFile).not.toHaveBeenCalled();
    expect(fse.readFile).not.toHaveBeenCalled();
  });

  it('should NOT create rule files for custom code projects', async () => {
    const mockContextCustomCode = {
      ...mockContextRulesEngine,
      projectType: ProjectType.customCode,
    };

    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextCustomCode);

    expect(fse.writeFile).not.toHaveBeenCalled();
    expect(fse.readFile).not.toHaveBeenCalled();
  });

  it('should create both files for rules engine projects', async () => {
    await CreateLogicAppWorkspaceModule.createRulesFiles(mockContextRulesEngine);

    expect(fse.writeFile).toHaveBeenCalledTimes(2);
    expect(fse.readFile).toHaveBeenCalledTimes(2);
  });
});

describe('createLibFolder - Testing Actual Implementation', () => {
  // This suite tests the ACTUAL createLibFolder function
  // Only file system operations are mocked, directory structure logic is real

  const mockContext: any = {
    projectPath: path.join('test', 'workspace', 'TestLogicApp'),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fse.mkdirSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create lib/builtinOperationSdks/JAR directory', async () => {
    await CreateLogicAppWorkspaceModule.createLibFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('lib', 'builtinOperationSdks', 'JAR')), {
      recursive: true,
    });
  });

  it('should create lib/builtinOperationSdks/net472 directory', async () => {
    await CreateLogicAppWorkspaceModule.createLibFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('lib', 'builtinOperationSdks', 'net472')), {
      recursive: true,
    });
  });

  it('should create both lib directories', async () => {
    await CreateLogicAppWorkspaceModule.createLibFolder(mockContext);

    expect(fse.mkdirSync).toHaveBeenCalledTimes(2);
  });

  it('should create directories with recursive option', async () => {
    await CreateLogicAppWorkspaceModule.createLibFolder(mockContext);

    const calls = vi.mocked(fse.mkdirSync).mock.calls;
    calls.forEach((call) => {
      expect(call[1]).toEqual({ recursive: true });
    });
  });

  it('should use correct project path', async () => {
    await CreateLogicAppWorkspaceModule.createLibFolder(mockContext);

    const calls = vi.mocked(fse.mkdirSync).mock.calls;
    calls.forEach((call) => {
      expect(call[0]).toContain('test');
      expect(call[0]).toContain('workspace');
      expect(call[0]).toContain('TestLogicApp');
    });
  });
});
