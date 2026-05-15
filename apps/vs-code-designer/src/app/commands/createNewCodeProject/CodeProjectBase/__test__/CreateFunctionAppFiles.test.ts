import { FuncVersion, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDebugConfigs, updateDebugConfigs } from '../../../../utils/vsCodeConfig/launch';
import { isMultiRootWorkspace } from '../../../../utils/workspace';
import { CreateFunctionAppFiles } from '../CreateFunctionAppFiles';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  writeJson: vi.fn(),
  copyFile: vi.fn(),
  pathExists: vi.fn(),
  readJson: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('../../../../utils/assets', () => ({
  getAssetsRoot: () => 'C:\\assets',
}));

vi.mock('../../../../utils/vsCodeConfig/launch', () => ({
  getDebugConfigs: vi.fn(),
  updateDebugConfigs: vi.fn(),
}));

vi.mock('../../../../utils/workspace', () => ({
  getContainingWorkspace: vi.fn(),
  isMultiRootWorkspace: vi.fn(),
}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

vi.mock('vscode', () => ({
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
}));

describe('CreateFunctionAppFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.copyFile).mockResolvedValue(undefined);
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    vi.mocked(fs.readJson).mockResolvedValue({});
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeJson).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([]);
    vi.mocked(getDebugConfigs).mockReturnValue([]);
    vi.mocked(isMultiRootWorkspace).mockReturnValue(false);
    vi.mocked(fs.readFile).mockImplementation((filePath: any) => {
      const pathText = String(filePath);
      if (pathText.includes('FunctionsProjNet8New')) {
        return Promise.resolve('<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\LogicApp</LogicAppFolderToPublish>');
      }
      if (pathText.includes('FunctionsProjNetFx')) {
        return Promise.resolve('<LogicAppFolder>LogicApp</LogicAppFolder>');
      }
      if (pathText.includes('RulesFunctionsProj')) {
        return Promise.resolve('<RulesProject />');
      }
      return Promise.resolve('namespace <%= namespace %> { public class <%= methodName %> {} }');
    });
  });

  it('should create .NET 8 custom code files from the asset root', async () => {
    await new CreateFunctionAppFiles().setup(createContext());

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionProjectTemplate\\FunctionsFileNet8'), 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionProjectTemplate\\FunctionsProjNet8New'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.cs'),
      'namespace Contoso.Functions { public class ProcessOrder {} }'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.csproj'),
      '<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\SalesLogicApp</LogicAppFolderToPublish>'
    );
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        'azureFunctions.deploySubpath': 'bin/Release/net8/publish',
        'azureFunctions.projectSubpath': 'bin\\Release\\net8\\publish',
      }),
      { spaces: 2 }
    );
    expect(fs.writeJson).toHaveBeenCalledWith(expect.stringContaining('tasks.json'), expect.objectContaining({ version: '2.0.0' }), {
      spaces: 2,
    });
  });

  it('should create .NET Framework custom code files', async () => {
    await new CreateFunctionAppFiles().setup(createContext({ targetFramework: TargetFramework.NetFx }));

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsProjNetFx'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.csproj'),
      '<LogicAppFolder>SalesLogicApp</LogicAppFolder>'
    );
  });

  it('should create rules engine files and copy ContosoPurchase.cs', async () => {
    await new CreateFunctionAppFiles().setup(
      createContext({
        projectType: ProjectType.rulesEngine,
        targetFramework: TargetFramework.Net8,
      })
    );

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('RulesFunctionsFile'), 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('RulesFunctionsProj'), 'utf-8');
    expect(fs.copyFile).toHaveBeenCalledWith(expect.stringContaining('ContosoPurchase'), expect.stringContaining('ContosoPurchase.cs'));
  });

  it('should update existing launch configurations for custom code runtime', async () => {
    vi.mocked(getDebugConfigs).mockReturnValue([{ type: 'logicapp', request: 'launch' }]);

    await (new CreateFunctionAppFiles() as any).updateLogicAppLaunchJson(
      'C:\\workspace\\Functions\\.vscode',
      TargetFramework.Net8,
      FuncVersion.v4,
      'SalesLogicApp'
    );

    expect(updateDebugConfigs).toHaveBeenCalledWith(
      undefined,
      expect.arrayContaining([expect.objectContaining({ type: 'logicapp', customCodeRuntime: 'coreclr', isCodeless: true })])
    );
  });

  it('should create launch.json in multi-root workspaces', async () => {
    vi.mocked(isMultiRootWorkspace).mockReturnValue(true);
    vi.mocked(fs.pathExists).mockResolvedValue(false);

    await (new CreateFunctionAppFiles() as any).updateLogicAppLaunchJson(
      'C:\\workspace\\Functions\\.vscode',
      TargetFramework.NetFx,
      FuncVersion.v1,
      'SalesLogicApp'
    );

    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('launch.json'),
      expect.objectContaining({
        configurations: expect.arrayContaining([expect.objectContaining({ customCodeRuntime: 'clr', funcRuntime: 'clr' })]),
      }),
      { spaces: 2 }
    );
  });
});

function createContext(overrides: Partial<IProjectWizardContext> = {}): IProjectWizardContext {
  return {
    functionAppName: 'ProcessOrder',
    functionFolderName: 'Functions',
    functionAppNamespace: 'Contoso.Functions',
    targetFramework: TargetFramework.Net8,
    logicAppName: 'SalesLogicApp',
    workspacePath: 'C:\\workspace',
    projectType: ProjectType.customCode,
    ...overrides,
  } as IProjectWizardContext;
}
