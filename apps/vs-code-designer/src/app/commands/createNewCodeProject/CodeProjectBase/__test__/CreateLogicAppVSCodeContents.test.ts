import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as CreateLogicAppVSCodeContentsModule from '../CreateLogicAppVSCodeContents';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as fsUtils from '../../../../utils/fs';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { IWebviewProjectContext } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  pathExists: vi.fn(),
  writeJson: vi.fn(),
}));
vi.mock('../../../../utils/fs', () => ({
  confirmEditJsonFile: vi.fn(),
}));
vi.mock('../../../../utils/binaries', () => ({
  binariesExist: vi.fn().mockReturnValue(false),
  binariesExistSync: vi.fn().mockReturnValue(false),
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

  const mockContextCustomCodeNet10: IWebviewProjectContext = {
    logicAppName: 'TestLogicAppCustomCodeNet10',
    logicAppType: ProjectType.customCode,
    targetFramework: TargetFramework.Net10,
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

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock fs-extra functions
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fse.copyFile).mockResolvedValue(undefined);
    vi.mocked(fse.pathExists).mockResolvedValue(false); // File doesn't exist
    vi.mocked(fse.writeJson).mockResolvedValue(undefined);

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

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

      // Should have standard settings but NOT deploySubpath
      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');

      // Verify exactly 4 properties, no more
      expect(Object.keys(settingsData)).toHaveLength(4);
    });

    it('should create settings.json without deploySubpath for net10 custom code project', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCodeNet10, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

      expect(settingsData).toHaveProperty('azureFunctions.suppressProject', true);
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectLanguage', 'JavaScript');
      expect(settingsData).toHaveProperty('azureLogicAppsStandard.projectRuntime', '~4');
      expect(settingsData).toHaveProperty('debug.internalConsoleOptions', 'neverOpen');
      expect(settingsData).not.toHaveProperty('azureLogicAppsStandard.deploySubpath');
      expect(Object.keys(settingsData)).toHaveLength(4);
    });

    it('should create settings.json without deploySubpath for netfx custom code project', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCodeNetFx, logicAppFolderPath);

      const settingsJsonPath = path.join(logicAppFolderPath, '.vscode', 'settings.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

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

    it('should create launch.json with logicapp configuration for .NET 10 custom code projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextCustomCodeNet10, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

      const config = launchData.configurations[0];
      expect(config).toMatchObject({
        name: expect.stringContaining('Run/Debug logic app with local function TestLogicAppCustomCodeNet10'),
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      });
    });

    it('should create launch.json with clr runtime for NetFx rules engine projects', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContextRulesEngine, logicAppFolderPath);

      const launchJsonPath = path.join(logicAppFolderPath, '.vscode', 'launch.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === settingsJsonPath);
      expect(writeCall).toBeDefined();
      const settingsData = writeCall![1] as Record<string, any>;

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
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === launchJsonPath);
      expect(writeCall).toBeDefined();
      const launchData = writeCall![1] as { version: string; configurations: any[] };

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

    it('should write extensions.json with Logic Apps extension recommendation', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const extensionsJsonPath = path.join(logicAppFolderPath, '.vscode', 'extensions.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === extensionsJsonPath);
      expect(writeCall).toBeDefined();
      expect(writeCall[1]).toHaveProperty('recommendations');
      expect((writeCall[1] as any).recommendations).toContain('ms-azuretools.vscode-azurelogicapps');
    });

    it('should use an extensions.json template that does not recommend Dev Containers', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const extensionsJsonPath = path.join(logicAppFolderPath, '.vscode', 'extensions.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === extensionsJsonPath);
      const extensionsData = writeCall?.[1] as { recommendations: string[] };

      expect(extensionsData.recommendations).not.toContain('ms-vscode-remote.remote-containers');
    });

    it('should write tasks.json via generator', async () => {
      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(mockContext, logicAppFolderPath);

      const tasksJsonPath = path.join(logicAppFolderPath, '.vscode', 'tasks.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === tasksJsonPath);
      expect(writeCall).toBeDefined();
      expect(writeCall[1]).toHaveProperty('version', '2.0.0');
      expect(writeCall[1]).toHaveProperty('tasks');
    });

    it('should write tasks.json without platform env when isDevContainerProject is true', async () => {
      const devContainerContext = { ...mockContext, isDevContainerProject: true };

      await CreateLogicAppVSCodeContentsModule.createLogicAppVsCodeContents(devContainerContext, logicAppFolderPath);

      const tasksJsonPath = path.join(logicAppFolderPath, '.vscode', 'tasks.json');
      const writeCall = vi.mocked(fse.writeJson).mock.calls.find((call) => call[0] === tasksJsonPath);
      expect(writeCall).toBeDefined();
      const funcTask = (writeCall[1] as any).tasks.find((t: any) => t.label === 'func: host start');
      expect(funcTask).toBeDefined();
      expect(funcTask.windows).toBeUndefined();
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
});
