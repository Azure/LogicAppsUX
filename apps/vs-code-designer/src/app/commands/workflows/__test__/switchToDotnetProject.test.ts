import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IProjectWizardContext, ITemplates } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';

// Hoisted mock variables
const { mockGetCachedTemplates, mockGetLatestTemplateVersion, mockGetLatestTemplates, mockGetBackupTemplates } = vi.hoisted(() => ({
  mockGetCachedTemplates: vi.fn(),
  mockGetLatestTemplateVersion: vi.fn(),
  mockGetLatestTemplates: vi.fn(),
  mockGetBackupTemplates: vi.fn(),
}));

// Module mocks
vi.mock('../../../../constants', () => ({
  connectionsFileName: 'connections.json',
  parametersFileName: 'parameters.json',
  funcIgnoreFileName: '.funcignore',
  funcVersionSetting: 'azureFunctions.projectRuntime',
  hostFileName: 'host.json',
  localSettingsFileName: 'local.settings.json',
  workflowFileName: 'workflow.json',
  CodefulSDKs: { DurableTask: 'DurableTask', WorkflowsWebJobs: 'WorkflowsWebJobs', WorkflowsSDK: 'WorkflowsSDK' },
  CodefulSdkVersions: { DurableTask: '1.0.0', WorkflowsWebJobs: '1.0.0', WorkflowsSDK: '1.0.0' },
  artifactsDirectory: 'Artifacts',
  libDirectory: 'lib',
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

vi.mock('../../../commands/initProjectForVSCode/initProjectForVSCode', () => ({
  initProjectForVSCode: vi.fn(),
}));

vi.mock('../../../templates/dotnet/DotnetTemplateProvider', () => ({
  DotnetTemplateProvider: vi.fn(),
}));

vi.mock('../../../utils/binaries', () => ({
  useBinariesDependencies: vi.fn(),
}));

vi.mock('../../../utils/codeless/updateBuildFile', () => ({
  getDotnetBuildFile: vi.fn(),
  addNugetPackagesToBuildFile: vi.fn((x: any) => x),
  addNugetPackagesToBuildFileByName: vi.fn((x: any) => x),
  suppressJavaScriptBuildWarnings: vi.fn((x: any) => x),
  updateFunctionsSDKVersion: vi.fn((x: any) => x),
  addFolderToBuildPath: vi.fn((x: any) => x),
  writeBuildFileToDisk: vi.fn(),
  addFileToBuildPath: vi.fn((x: any) => x),
  addLibToPublishPath: vi.fn((x: any) => x),
  allowLocalSettingsToPublishDirectory: vi.fn((_ctx: any, x: any) => x),
}));

vi.mock('../../../utils/dotnet/dotnet', () => ({
  getLocalDotNetVersionFromBinaries: vi.fn(),
  getProjFiles: vi.fn(),
  getTemplateKeyFromProjFile: vi.fn(),
}));

vi.mock('../../../utils/dotnet/executeDotnetTemplateCommand', () => ({
  getFramework: vi.fn(),
  executeDotnetTemplateCommand: vi.fn(),
}));

vi.mock('../../../utils/funcCoreTools/cpUtils', () => ({
  wrapArgInQuotes: vi.fn((s: string) => `"${s}"`),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  tryParseFuncVersion: vi.fn(),
  tryGetMajorVersion: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getContainingWorkspace: vi.fn(),
  getWorkspaceFolder: vi.fn(),
}));

vi.mock('../../initProjectForVSCode/initDotnetProjectStep', () => ({
  InitDotnetProjectStep: vi.fn(),
}));

vi.mock('../../dotnet/validateDotNetInstalled', () => ({
  validateDotNetIsInstalled: vi.fn(),
}));

vi.mock('../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: { showError: vi.fn() },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
    basename: (p: string) => p.split('/').pop() || p,
  };
});

import { switchToDotnetProject, switchToDotnetProjectCommand } from '../switchToDotnetProject';
import { validateDotNetIsInstalled } from '../../dotnet/validateDotNetInstalled';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceFolder, getContainingWorkspace } from '../../../utils/workspace';
import { getProjFiles, getTemplateKeyFromProjFile, getLocalDotNetVersionFromBinaries } from '../../../utils/dotnet/dotnet';
import { getFramework, executeDotnetTemplateCommand } from '../../../utils/dotnet/executeDotnetTemplateCommand';
import { tryParseFuncVersion, tryGetMajorVersion } from '../../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { useBinariesDependencies } from '../../../utils/binaries';
import { DotnetTemplateProvider } from '../../../templates/dotnet/DotnetTemplateProvider';
import { InitDotnetProjectStep } from '../../initProjectForVSCode/initDotnetProjectStep';
import {
  getDotnetBuildFile,
  addNugetPackagesToBuildFile,
  suppressJavaScriptBuildWarnings,
  updateFunctionsSDKVersion,
  addFolderToBuildPath,
  addFileToBuildPath,
  addLibToPublishPath,
  allowLocalSettingsToPublishDirectory,
  addNugetPackagesToBuildFileByName,
} from '../../../utils/codeless/updateBuildFile';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';

describe('switchToDotnetProject', () => {
  let mockContext: IProjectWizardContext;
  let mockTarget: vscode.Uri;

  beforeEach(() => {
    mockContext = {
      ui: {
        showWarningMessage: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as IProjectWizardContext;

    mockTarget = {
      fsPath: '/test/project',
    } as vscode.Uri;

    // Re-set the DotnetTemplateProvider constructor mock (restoreMocks resets it)
    vi.mocked(DotnetTemplateProvider).mockImplementation(
      () =>
        ({
          getCachedTemplates: mockGetCachedTemplates,
          getLatestTemplateVersion: mockGetLatestTemplateVersion,
          getLatestTemplates: mockGetLatestTemplates,
          getBackupTemplates: mockGetBackupTemplates,
        }) as any
    );

    // Re-set the InitDotnetProjectStep constructor mock
    vi.mocked(InitDotnetProjectStep).mockImplementation(
      () =>
        ({
          execute: vi.fn(),
        }) as any
    );

    vi.mocked(validateDotNetIsInstalled).mockResolvedValue(true);
    vi.mocked(tryParseFuncVersion).mockReturnValue(FuncVersion.v4);
    vi.mocked(getWorkspaceSetting).mockReturnValue('~4');
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(getFramework).mockResolvedValue('net8.0');
    vi.mocked(executeDotnetTemplateCommand).mockResolvedValue(undefined);
    vi.mocked(useBinariesDependencies).mockResolvedValue(false);
    vi.mocked(tryGetMajorVersion).mockReturnValue('4');
    vi.mocked(getTemplateKeyFromProjFile).mockResolvedValue('testKey');
    vi.mocked(getContainingWorkspace).mockReturnValue(undefined);
    (fse.pathExists as unknown as Mock).mockResolvedValue(false);
    (fse.readdir as unknown as Mock).mockResolvedValue([]);
    (fse.stat as unknown as Mock).mockResolvedValue({ isDirectory: () => false });
    // writeFileSync is used by createGlobalJsonFile but not in the global test-setup mock
    (fse as any).writeFileSync = vi.fn();

    // Build file utils - must be set in beforeEach because restoreMocks resets factories
    vi.mocked(getDotnetBuildFile).mockResolvedValue('{"Project":{"PropertyGroup":{}}}');
    vi.mocked(addNugetPackagesToBuildFile).mockImplementation((x: any) => x);
    vi.mocked(addNugetPackagesToBuildFileByName).mockImplementation((x: any) => x);
    vi.mocked(suppressJavaScriptBuildWarnings).mockImplementation((x: any) => x);
    vi.mocked(updateFunctionsSDKVersion).mockImplementation((x: any) => x);
    vi.mocked(addFolderToBuildPath).mockImplementation((x: any) => x);
    vi.mocked(addFileToBuildPath).mockImplementation((x: any) => x);
    vi.mocked(addLibToPublishPath).mockImplementation((x: any) => x);
    vi.mocked(allowLocalSettingsToPublishDirectory).mockImplementation((_ctx: any, x: any) => x);

    // By default, return cached templates so we don't hit template download paths
    mockGetCachedTemplates.mockResolvedValue({ templates: [] } as unknown as ITemplates);
  });

  describe('target resolution', () => {
    it('should resolve target from workspace when target is undefined', async () => {
      const workspaceFolder = { uri: { fsPath: '/workspace' } };
      vi.mocked(getWorkspaceFolder).mockResolvedValue(workspaceFolder as any);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/workspace/project');

      await switchToDotnetProject(mockContext, undefined as unknown as vscode.Uri);

      expect(getWorkspaceFolder).toHaveBeenCalledWith(mockContext);
      expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(mockContext, workspaceFolder);
    });

    it('should resolve target from workspace when target is empty object', async () => {
      const workspaceFolder = { uri: { fsPath: '/workspace' } };
      vi.mocked(getWorkspaceFolder).mockResolvedValue(workspaceFolder as any);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/workspace/project');

      await switchToDotnetProject(mockContext, {} as vscode.Uri);

      expect(getWorkspaceFolder).toHaveBeenCalled();
    });
  });

  describe('dotnet installation check', () => {
    it('should return early when dotnet is not installed', async () => {
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, mockTarget.fsPath);
      expect(getProjFiles).not.toHaveBeenCalled();
    });
  });

  describe('existing dotnet project detection', () => {
    it('should show info message and return when project already has proj files', async () => {
      vi.mocked(getProjFiles).mockResolvedValue(['existing.csproj']);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('already a NuGet-based project'), 'OK');
      // Should not proceed to template resolution
      expect(DotnetTemplateProvider).not.toHaveBeenCalled();
    });
  });

  describe('template resolution', () => {
    it('should use cached templates when available', async () => {
      const cachedTemplates = { templates: [{ id: 'cached' }] };
      mockGetCachedTemplates.mockResolvedValue(cachedTemplates);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(mockGetCachedTemplates).toHaveBeenCalled();
      expect(mockGetLatestTemplateVersion).not.toHaveBeenCalled();
    });

    it('should download latest templates when cached templates are not available', async () => {
      const latestTemplates = { templates: [{ id: 'latest' }] };
      mockGetCachedTemplates.mockResolvedValue(undefined);
      mockGetLatestTemplateVersion.mockResolvedValue('1.0.0');
      mockGetLatestTemplates.mockResolvedValue(latestTemplates);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(mockGetLatestTemplateVersion).toHaveBeenCalled();
      expect(mockGetLatestTemplates).toHaveBeenCalledWith(mockContext, '1.0.0');
    });

    it('should fall back to backup templates when latest download fails', async () => {
      const backupTemplates = { templates: [{ id: 'backup' }] };
      mockGetCachedTemplates.mockResolvedValue(undefined);
      mockGetLatestTemplateVersion.mockResolvedValue('1.0.0');
      mockGetLatestTemplates.mockRejectedValue(new Error('download failed'));
      mockGetBackupTemplates.mockResolvedValue(backupTemplates);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(mockGetBackupTemplates).toHaveBeenCalled();
    });

    it('should throw error when no templates are available', async () => {
      mockGetCachedTemplates.mockResolvedValue(undefined);
      mockGetLatestTemplateVersion.mockResolvedValue('1.0.0');
      mockGetLatestTemplates.mockRejectedValue(new Error('download failed'));
      mockGetBackupTemplates.mockResolvedValue(undefined);

      await expect(switchToDotnetProject(mockContext, mockTarget)).rejects.toThrow("Can't find dotnet templates");
    });
  });

  describe('dotnet project creation', () => {
    it('should execute dotnet template command with correct arguments', async () => {
      await switchToDotnetProject(mockContext, mockTarget);

      expect(executeDotnetTemplateCommand).toHaveBeenCalledWith(
        mockContext,
        FuncVersion.v4,
        'testKey',
        mockTarget.fsPath,
        'create',
        '--identity',
        expect.stringContaining('Microsoft.AzureFunctions.ProjectTemplate.CSharp'),
        '--arg:name',
        expect.any(String),
        '--arg:AzureFunctionsVersion',
        'v4'
      );
    });

    it('should show completion message on success', async () => {
      await switchToDotnetProject(mockContext, mockTarget);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Completed moving'), 'OK');
    });
  });

  describe('binaries handling', () => {
    it('should create global.json when using binaries', async () => {
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(getLocalDotNetVersionFromBinaries).mockResolvedValue('8.0.100');

      await switchToDotnetProject(mockContext, mockTarget, '8');

      expect(fse.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('global.json'),
        expect.stringContaining('"version": "8.0.100"'),
        'utf8'
      );
    });

    it('should not create global.json when not using binaries', async () => {
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await switchToDotnetProject(mockContext, mockTarget);

      expect(fse.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('switchToDotnetProjectCommand', () => {
    it('should delegate to switchToDotnetProject', async () => {
      // switchToDotnetProjectCommand just calls switchToDotnetProject
      // We verify it doesn't throw and the underlying function gets called
      await switchToDotnetProjectCommand(mockContext, mockTarget);

      expect(validateDotNetIsInstalled).toHaveBeenCalled();
    });
  });
});
