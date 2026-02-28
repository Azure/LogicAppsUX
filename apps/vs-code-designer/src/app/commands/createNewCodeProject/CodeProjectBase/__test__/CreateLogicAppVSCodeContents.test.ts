import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, type Mock } from 'vitest';
import * as CreateLogicAppVSCodeContentsModule from '../CreateLogicAppVSCodeContents';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as fsUtils from '../../../../utils/fs';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';
import { assetsFolderName, workspaceTemplatesFolderName } from '../../../../../constants';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  pathExists: vi.fn(),
  readFile: vi.fn(),
  readJson: vi.fn(),
  writeJson: vi.fn(),
  writeJSON: vi.fn(),
}));
vi.mock('../../../../utils/fs', () => ({
  confirmEditJsonFile: vi.fn(),
}));
vi.mock('../../../../utils/binaries', () => ({
  binariesExist: vi.fn().mockReturnValue(false),
}));

describe('CreateLogicAppVSCodeContents', () => {
  const mockContext: IWebviewProjectContext = {
    logicAppName: 'TestLogicApp',
    logicAppType: ProjectType.logicApp,
    isDevContainerProject: false,
  } as any;

  const mockContextCustomCode: IWebviewProjectContext = {
    logicAppName: 'TestLogicAppCustomCode',
    logicAppType: ProjectType.customCode,
    targetFramework: TargetFramework.Net8,
    isDevContainerProject: false,
  } as any;

  const mockContextCustomCodeNetFx: IWebviewProjectContext = {
    logicAppName: 'TestLogicAppCustomCodeNetFx',
    logicAppType: ProjectType.customCode,
    targetFramework: TargetFramework.NetFx,
    isDevContainerProject: false,
  } as any;

  const mockContextRulesEngine: IWebviewProjectContext = {
    logicAppName: 'TestLogicAppRulesEngine',
    logicAppType: ProjectType.rulesEngine,
    targetFramework: TargetFramework.NetFx,
    isDevContainerProject: false,
  } as any;

  const mockContextCodeful: IWebviewProjectContext = {
    logicAppName: 'TestLogicAppCodeful',
    logicAppType: ProjectType.codeful,
    targetFramework: TargetFramework.NetFx,
    isDevContainerProject: false,
  } as any;

  const logicAppFolderPath = path.join('test', 'workspace', 'TestLogicApp');

  let extensionsJsonFileContent: string;
  let tasksJsonFileContent: string;
  let devContainerTasksJsonFileContent: string;

  beforeAll(async () => {
    const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
    const templatesFolderPath = path.join(__dirname, '..', '..', '..', '..', '..', assetsFolderName, workspaceTemplatesFolderName);

    extensionsJsonFileContent = await realFs.readFile(path.join(templatesFolderPath, 'ExtensionsJsonFile'), 'utf8');
    tasksJsonFileContent = await realFs.readFile(path.join(templatesFolderPath, 'TasksJsonFile'), 'utf8');
    devContainerTasksJsonFileContent = await realFs.readFile(path.join(templatesFolderPath, 'DevContainerTasksJsonFile'), 'utf8');
  });

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock fs-extra functions
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fse.copyFile).mockResolvedValue(undefined);
    vi.mocked(fse.pathExists).mockResolvedValue(false); // File doesn't exist
    vi.mocked(fse.readFile).mockImplementation(async (filePath: any) => {
      const filePathStr = String(filePath);
      if (filePathStr.endsWith('ExtensionsJsonFile')) {
        return extensionsJsonFileContent;
      }
      if (filePathStr.endsWith('DevContainerTasksJsonFile')) {
        return devContainerTasksJsonFileContent;
      }
      if (filePathStr.endsWith('TasksJsonFile')) {
        return tasksJsonFileContent;
      }
      return '{}';
    });
    vi.mocked(fse.readJson).mockResolvedValue({});
    vi.mocked(fse.writeJson).mockResolvedValue(undefined);
    vi.mocked(fse.writeJSON).mockResolvedValue(undefined);

    // Mock confirmEditJsonFile to capture what would be written
    vi.mocked(fsUtils.confirmEditJsonFile).mockImplementation(async (context, filePath, callback) => {
      const data = {};
      const result = callback(data);
      return result;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogicAppVsCodeContents', () => {
    it('should create .vscode folder', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const vscodePath = path.join(logicAppFolderPath, '.vscode');
      expect(fse.ensureDir).toHaveBeenCalledWith(vscodePath);
    });

    it('should create settings.json with correct settings for standard logic app', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      // Verify confirmEditJsonFile was called for settings.json
      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      expect(fsUtils.confirmEditJsonFile).toHaveBeenCalledWith(mockContext, settingsJsonPath, expect.any(Function));

      // Get the callback function and test what it would write
      const settingsCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === settingsJsonPath);
      const settingsCallback = settingsCall[2];
      const settingsData = settingsCallback({});

      // Verify settings content
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.deploySubpath', '.');
      // Verify exactly 5 properties, no more
      expect(Object.keys(settingsData)).toHaveLength(5);
    });

    it('should create settings.json without deploySubpath for net8 custom code project', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCode, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const settingsCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === settingsJsonPath);
      const settingsCallback = settingsCall[2];
      const settingsData = settingsCallback({});

      // Should have standard settings but NOT deploySubpath
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');

      // Verify exactly 4 properties, no more
      expect(Object.keys(settingsData)).toHaveLength(4);
    });

    it('should create settings.json without deploySubpath for netfx custom code project', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCodeNetFx, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const settingsCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === settingsJsonPath);
      const settingsCallback = settingsCall[2];
      const settingsData = settingsCallback({});

      // Should have standard settings but NOT deploySubpath
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');

      // Verify exactly 4 properties, no more
      expect(Object.keys(settingsData)).toHaveLength(4);
    });

    it('should create settings.json without deploySubpath for rules engine projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextRulesEngine, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const settingsCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === settingsJsonPath);
      const settingsCallback = settingsCall[2];
      const settingsData = settingsCallback({});

      // Should have standard settings but NOT deploySubpath
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');

      // Verify exactly 4 properties
      expect(Object.keys(settingsData)).toHaveLength(4);
    });

    it('should create launch.json with attach configuration for standard logic app', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      expect(fsUtils.confirmEditJsonFile).toHaveBeenCalledWith(mockContext, launchJsonPath, expect.any(Function));

      // Get the callback and test the configuration
      const launchCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === launchJsonPath);
      const launchCallback = launchCall[2];
      const launchData = launchCallback({ configurations: [] });

      // Verify launch.json structure
      expect(launchData).toHaveProperty('version', '0.2.0');
      expect(launchData.configurations).toHaveLength(1);

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app TestLogicApp'),
        type: 'coreclr',
        request: 'attach',
        processId: expect.stringContaining('${command:azureLogicAppsStandard.pickProcess}'),
      });
    });

    it('should create launch.json with logicapp configuration for custom code projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCode, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const launchCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === launchJsonPath);
      const launchCallback = launchCall[2];
      const launchData = launchCallback({ configurations: [] });

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app with local function TestLogicAppCustomCode'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr', // Net8
        isCodeless: true,
      });
    });

    it('should create launch.json with clr runtime for NetFx rules engine projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextRulesEngine, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const launchCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === launchJsonPath);
      const launchCallback = launchCall[2];
      const launchData = launchCallback({ configurations: [] });

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app with local function TestLogicAppRulesEngine'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'clr', // NetFx
        isCodeless: true,
      });
    });

    it('should create launch.json with clr runtime for NetFx custom code projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCodeNetFx, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const launchCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === launchJsonPath);
      const launchCallback = launchCall[2];
      const launchData = launchCallback({ configurations: [] });

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app with local function TestLogicAppCustomCodeNetFx'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'clr', // NetFx
        isCodeless: true,
      });
    });

    it('should create settings.json with codeful-specific settings for codeful project', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCodeful, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const settingsCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === settingsJsonPath);
      const settingsCallback = settingsCall[2];
      const settingsData = settingsCallback({});

      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'C#');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureFunctions.deploySubpath');
      expect(settingsData).toHaveProperty('azureFunctions.preDeployTask', 'publish');
      expect(settingsData).toHaveProperty('azureFunctions.projectSubpath');
      expect(settingsData).toHaveProperty('omnisharp.enableMsBuildLoadProjectsOnDemand', false);
      expect(settingsData).toHaveProperty('omnisharp.disableMSBuildDiagnosticWarning', true);
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');
    });

    it('should create launch.json with logicapp configuration for codeful projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCodeful, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const launchCall = vi.mocked(fsUtils.confirmEditJsonFile).mock.calls.find((call) => call[1] === launchJsonPath);
      const launchCallback = launchCall[2];
      const launchData = launchCallback({ configurations: [] });

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app TestLogicAppCodeful'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: false,
      });
      expect(config).not.toHaveProperty('customCodeRuntime');
    });

    it('should copy extensions.json from template', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const extensionsJsonPath = path.join(logicAppFolderPath, '.vscode', 'extensions.json');
      expect(fse.writeJson).toHaveBeenCalledWith(extensionsJsonPath, JSON.parse(extensionsJsonFileContent), { spaces: 2 });
    });

    it('should copy tasks.json from template', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const tasksJsonPath = path.join(logicAppFolderPath, '.vscode', 'tasks.json');
      expect(fse.copyFile).toHaveBeenCalledWith(expect.stringContaining('TasksJsonFile'), tasksJsonPath);
    });

    it('should copy DevContainerTasksJsonFile when isDevContainerProject is true', async () => {
      const devContainerContext = { ...mockContext, isDevContainerProject: true };

      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(devContainerContext, logicAppFolderPath);

      const tasksJsonPath = path.join(logicAppFolderPath, '.vscode', 'tasks.json');
      expect(fse.copyFile).toHaveBeenCalledWith(expect.stringContaining('DevContainerTasksJsonFile'), tasksJsonPath);
    });
  });

  describe('createDevContainerContents', () => {
    it('should create .devcontainer folder when isDevContainerProject is true', async () => {
      const devContainerContext = { ...mockContext, isDevContainerProject: true };

      await CreateLogicAppVSCodeContentsModule.createDevContainerContents(devContainerContext, logicAppFolderPath);

      const devContainerPath = path.join(logicAppFolderPath, '.devcontainer');
      expect(fse.ensureDir).toHaveBeenCalledWith(devContainerPath);
    });

    it('should copy devcontainer.json from template', async () => {
      const devContainerContext = { ...mockContext, isDevContainerProject: true };

      await CreateLogicAppVSCodeContentsModule.createDevContainerContents(devContainerContext, logicAppFolderPath);

      const devContainerJsonPath = path.join(logicAppFolderPath, '.devcontainer', 'devcontainer.json');
      expect(fse.copyFile).toHaveBeenCalledWith(expect.stringContaining('devcontainer.json'), devContainerJsonPath);
    });

    it('should not create anything when isDevContainerProject is false', async () => {
      const noDevContainerContext = { ...mockContext, isDevContainerProject: false };

      await CreateLogicAppVSCodeContentsModule.createDevContainerContents(noDevContainerContext, logicAppFolderPath);

      expect(fse.ensureDir).not.toHaveBeenCalled();
      expect(fse.copyFile).not.toHaveBeenCalled();
    });
  });

  describe('getDebugConfiguration', () => {
    it('should return attach configuration for standard logic app', () => {
      const config = CreateLogicAppVSCodeContentsModule.getDebugConfiguration('TestLogicApp');

      expect(config).toMatchObject({
        name: expect.stringContaining('TestLogicApp'),
        type: 'coreclr',
        request: 'attach',
        processId: expect.any(String),
      });
    });

    it('should return logicapp configuration with coreclr for Net8 custom code', () => {
      const config = CreateLogicAppVSCodeContentsModule.getDebugConfiguration('TestLogicApp', TargetFramework.Net8);

      expect(config).toMatchObject({
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      });
    });

    it('should return logicapp configuration with clr for NetFx custom code', () => {
      const config = CreateLogicAppVSCodeContentsModule.getDebugConfiguration('TestLogicApp', TargetFramework.NetFx);

      expect(config).toMatchObject({
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'clr',
        isCodeless: true,
      });
    });

    it('should return logicapp configuration with isCodeless false for codeful project', () => {
      const config = CreateLogicAppVSCodeContentsModule.getDebugConfiguration('TestLogicApp', undefined, true);

      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app TestLogicApp'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: false,
      });
      expect(config).not.toHaveProperty('customCodeRuntime');
    });
  });
});
