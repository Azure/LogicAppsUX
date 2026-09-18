import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IProjectWizardContext, ITemplates } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion, ProjectLanguage, ProjectPackageType, ProjectType } from '@microsoft/vscode-extension-logic-apps';

// Hoisted mock variables
const {
  mockGetCachedTemplates,
  mockGetLatestTemplateVersion,
  mockGetLatestTemplates,
  mockGetBackupTemplates,
  mockDetectProjectType,
  mockDetectProjectPackageType,
} = vi.hoisted(() => ({
  mockGetCachedTemplates: vi.fn(),
  mockGetLatestTemplateVersion: vi.fn(),
  mockGetLatestTemplates: vi.fn(),
  mockGetBackupTemplates: vi.fn(),
  mockDetectProjectType: vi.fn(),
  mockDetectProjectPackageType: vi.fn(),
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
  getContainingWorkspaceFolder: vi.fn(),
  getLogicAppProjectRoots: vi.fn(),
  getWorkspaceFolder: vi.fn(),
  selectLogicAppProject: vi.fn(async (context, projectPaths, placeHolder) => {
    if (projectPaths.length <= 1) {
      return projectPaths[0];
    }
    return (
      await context.ui.showQuickPick(
        projectPaths.map((projectPath) => ({
          label: projectPath.split('/').pop(),
          description: projectPath,
          data: projectPath,
        })),
        { placeHolder }
      )
    ).data;
  }),
}));

vi.mock('../../../utils/funcCoreTools/funcHostTask', () => ({
  stopFuncTaskForWorkspace: vi.fn(),
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

vi.mock('../../../utils/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/project')>()),
  detectProjectPackageType: mockDetectProjectPackageType,
  detectProjectType: mockDetectProjectType,
  getLogicAppProjectMetadata: vi.fn(async (projectPaths: string[]) =>
    Promise.all(
      projectPaths.map(async (projectPath) => ({
        path: projectPath,
        projectType: await mockDetectProjectType(projectPath),
        packageType: await mockDetectProjectPackageType(projectPath),
      }))
    )
  ),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: { showError: vi.fn(), outputChannel: { appendLog: vi.fn() } },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
    basename: (p: string) => p.split('/').pop() || p,
  };
});

import { ext } from '../../../../extensionVariables';
import { switchToDotnetProject, switchToDotnetProjectCommand } from '../switchToDotnetProject';
import { validateDotNetIsInstalled } from '../../dotnet/validateDotNetInstalled';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getLogicAppProjectRoots, getWorkspaceFolder, getContainingWorkspaceFolder, selectLogicAppProject } from '../../../utils/workspace';
import { getProjFiles, getTemplateKeyFromProjFile, getLocalDotNetVersionFromBinaries } from '../../../utils/dotnet/dotnet';
import { getFramework, executeDotnetTemplateCommand } from '../../../utils/dotnet/executeDotnetTemplateCommand';
import { tryParseFuncVersion, tryGetMajorVersion } from '../../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { useBinariesDependencies } from '../../../utils/binaries';
import { DotnetTemplateProvider } from '../../../templates/dotnet/DotnetTemplateProvider';
import { InitDotnetProjectStep } from '../../initProjectForVSCode/initDotnetProjectStep';
import { stopFuncTaskForWorkspace } from '../../../utils/funcCoreTools/funcHostTask';
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
  let initDotnetExecute: Mock;

  beforeEach(() => {
    mockContext = {
      ui: {
        showQuickPick: vi.fn(),
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
    initDotnetExecute = vi.fn().mockResolvedValue(undefined);
    vi.mocked(InitDotnetProjectStep).mockImplementation(() => ({ execute: initDotnetExecute }) as any);

    vi.mocked(validateDotNetIsInstalled).mockResolvedValue(true);
    mockDetectProjectPackageType.mockResolvedValue(ProjectPackageType.Bundle);
    mockDetectProjectType.mockResolvedValue(ProjectType.logicApp);
    vi.mocked(getLogicAppProjectRoots).mockResolvedValue([mockTarget.fsPath]);
    vi.mocked(tryParseFuncVersion).mockReturnValue(FuncVersion.v4);
    vi.mocked(getWorkspaceSetting).mockReturnValue('~4');
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(getFramework).mockResolvedValue('net8.0');
    vi.mocked(executeDotnetTemplateCommand).mockResolvedValue(undefined);
    vi.mocked(useBinariesDependencies).mockResolvedValue(false);
    vi.mocked(stopFuncTaskForWorkspace).mockResolvedValue(false);
    vi.mocked(tryGetMajorVersion).mockReturnValue('4');
    vi.mocked(getTemplateKeyFromProjFile).mockResolvedValue('testKey');
    vi.mocked(getContainingWorkspaceFolder).mockReturnValue(undefined);
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/workspace' } } as vscode.WorkspaceFolder];
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

      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('already a NuGet-based project'));
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

    it('should log completion message on success', async () => {
      await switchToDotnetProject(mockContext, mockTarget);

      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Successfully converted to NuGet-based'));
    });

    it('should await VS Code initialization before logging completion', async () => {
      let resolveInit: (() => void) | undefined;
      initDotnetExecute.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve;
          })
      );

      const result = switchToDotnetProject(mockContext, mockTarget);

      await vi.waitFor(() => expect(initDotnetExecute).toHaveBeenCalled());
      expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(expect.stringContaining('Successfully converted to NuGet-based'));

      resolveInit?.();
      await result;

      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Successfully converted to NuGet-based'));
    });

    it('should initialize VS Code files as a NuGet package project', async () => {
      await switchToDotnetProject(mockContext, mockTarget);

      expect(initDotnetExecute).toHaveBeenCalledWith(expect.objectContaining({ projectPackageType: ProjectPackageType.Nuget }));
    });

    it('should stop an active func host before initializing NuGet VS Code files', async () => {
      const events: string[] = [];
      const workspaceFolder = { uri: { fsPath: mockTarget.fsPath } } as vscode.WorkspaceFolder;
      vi.mocked(getContainingWorkspaceFolder).mockReturnValue(workspaceFolder);
      vi.mocked(stopFuncTaskForWorkspace).mockImplementation(async () => {
        events.push('stop-func');
        return true;
      });
      initDotnetExecute.mockImplementation(async () => {
        events.push('init-vscode');
      });

      await switchToDotnetProject(mockContext, mockTarget);

      expect(stopFuncTaskForWorkspace).toHaveBeenCalledWith(workspaceFolder);
      expect(events).toEqual(['stop-func', 'init-vscode']);
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
    it('should block conversion for a codeful project', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/workspace/codeful-project']);
      mockDetectProjectType.mockResolvedValue(ProjectType.codeful);

      await switchToDotnetProjectCommand(mockContext, mockTarget);

      expect(getLogicAppProjectRoots).toHaveBeenCalledWith(mockContext, mockTarget);
      expect(mockDetectProjectType).toHaveBeenCalledWith('/workspace/codeful-project');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Converting to a NuGet-based project is not available for codeful projects.',
        'OK'
      );
      expect(validateDotNetIsInstalled).not.toHaveBeenCalled();
    });

    it('should continue conversion for a codeless project', async () => {
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext, mockTarget);

      expect(mockDetectProjectType).toHaveBeenCalledWith(mockTarget.fsPath);
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalledWith(
        'Converting to a NuGet-based project is not available for codeful projects.',
        'OK'
      );
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, mockTarget.fsPath);
    });

    it('should prompt to select an eligible project when multiple projects are found', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/workspace/AppA', '/workspace/AppB']);
      vi.mocked(mockContext.ui.showQuickPick).mockResolvedValue({
        label: 'AppB',
        description: '/workspace/AppB',
        data: '/workspace/AppB',
      });
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext);

      expect(mockContext.ui.showQuickPick).toHaveBeenCalledWith(
        [
          { label: 'AppA', description: '/workspace/AppA', data: '/workspace/AppA' },
          { label: 'AppB', description: '/workspace/AppB', data: '/workspace/AppB' },
        ],
        { placeHolder: 'Select a Logic App project to convert to NuGet-based' }
      );
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, '/workspace/AppB');
      expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    });

    it('should only offer projects that are not codeful or already NuGet-based', async () => {
      const projectPaths = ['/workspace/Eligible', '/workspace/Codeful', '/workspace/AlreadyNuget'];
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(projectPaths);
      mockDetectProjectType.mockImplementation(async (projectPath) =>
        projectPath === '/workspace/Codeful' ? ProjectType.codeful : ProjectType.logicApp
      );
      mockDetectProjectPackageType.mockImplementation(async (projectPath) =>
        projectPath === '/workspace/AlreadyNuget' ? ProjectPackageType.Nuget : ProjectPackageType.Bundle
      );
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext);

      expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
      expect(selectLogicAppProject).toHaveBeenCalledWith(
        mockContext,
        ['/workspace/Eligible'],
        'Select a Logic App project to convert to NuGet-based'
      );
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, '/workspace/Eligible');
    });

    it('should allow a codeless Logic App project with associated custom code', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/workspace/CustomCode', '/workspace/Codeful']);
      mockDetectProjectType.mockImplementation(async (projectPath) =>
        projectPath === '/workspace/CustomCode' ? ProjectType.customCode : ProjectType.codeful
      );
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext);

      expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
      expect(selectLogicAppProject).toHaveBeenCalledWith(
        mockContext,
        ['/workspace/CustomCode'],
        'Select a Logic App project to convert to NuGet-based'
      );
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, '/workspace/CustomCode');
    });

    it('should automatically select the only project in the workspace', async () => {
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext);

      expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, mockTarget.fsPath);
    });

    it('should show a message when no Logic App projects are found', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue([]);

      await switchToDotnetProjectCommand(mockContext);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No Logic App projects were found in the selected workspace.',
        'OK'
      );
      expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
      expect(validateDotNetIsInstalled).not.toHaveBeenCalled();
    });

    it('should not start conversion when no projects are eligible', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/workspace/Codeful', '/workspace/AlreadyNuget']);
      mockDetectProjectType.mockImplementation(async (projectPath) =>
        projectPath === '/workspace/Codeful' ? ProjectType.codeful : ProjectType.logicApp
      );
      mockDetectProjectPackageType.mockImplementation(async (projectPath) =>
        projectPath === '/workspace/AlreadyNuget' ? ProjectPackageType.Nuget : ProjectPackageType.Bundle
      );

      await switchToDotnetProjectCommand(mockContext);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No Logic App projects are available to convert. Only non-codeful projects that are not already NuGet-based can be converted.',
        'OK'
      );
      expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
      expect(validateDotNetIsInstalled).not.toHaveBeenCalled();
    });

    it('should distinguish projects with duplicate folder names by their full paths', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/repoA/SharedProject', '/repoB/SharedProject']);
      vi.mocked(mockContext.ui.showQuickPick).mockResolvedValue({
        label: 'SharedProject',
        description: '/repoB/SharedProject',
        data: '/repoB/SharedProject',
      });
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext);

      expect(mockContext.ui.showQuickPick).toHaveBeenCalledWith(
        [
          { label: 'SharedProject', description: '/repoA/SharedProject', data: '/repoA/SharedProject' },
          { label: 'SharedProject', description: '/repoB/SharedProject', data: '/repoB/SharedProject' },
        ],
        { placeHolder: 'Select a Logic App project to convert to NuGet-based' }
      );
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, '/repoB/SharedProject');
    });

    it('should discover projects from the selected container folder', async () => {
      vi.mocked(getLogicAppProjectRoots).mockResolvedValue(['/workspace/AppA', '/workspace/AppB']);
      vi.mocked(mockContext.ui.showQuickPick).mockResolvedValue({
        label: 'AppA',
        description: '/workspace/AppA',
        data: '/workspace/AppA',
      });
      vi.mocked(validateDotNetIsInstalled).mockResolvedValue(false);

      await switchToDotnetProjectCommand(mockContext, mockTarget);

      expect(getLogicAppProjectRoots).toHaveBeenCalledWith(mockContext, mockTarget);
      expect(validateDotNetIsInstalled).toHaveBeenCalledWith(mockContext, '/workspace/AppA');
    });
  });
});
