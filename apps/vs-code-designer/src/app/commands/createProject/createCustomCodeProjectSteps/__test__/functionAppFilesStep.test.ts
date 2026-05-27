import { FuncVersion, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDebugConfiguration } from '../../../../utils/debug';
import { getDebugConfigs, updateDebugConfigs } from '../../../../utils/vsCodeConfig/launch';
import { isMultiRootWorkspace } from '../../../../utils/workspace';
import { FunctionAppFilesStep } from '../functionAppFilesStep';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  writeJson: vi.fn(),
  copyFile: vi.fn(),
  pathExists: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock('vscode', () => ({}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

vi.mock('../../../../utils/vsCodeConfig/launch', () => ({
  getDebugConfigs: vi.fn(),
  updateDebugConfigs: vi.fn(),
}));

vi.mock('../../../../utils/workspace', () => ({
  getContainingWorkspace: vi.fn(),
  isMultiRootWorkspace: vi.fn(),
}));

vi.mock('../../../../utils/funcCoreTools/funcVersion', () => ({
  tryGetLocalFuncVersion: vi.fn().mockResolvedValue(FuncVersion.v4),
}));

vi.mock('../../../../utils/debug', () => ({
  getDebugConfiguration: vi.fn().mockReturnValue({ name: 'generated launch' }),
  usesPublishFolderProperty: vi.fn((projectType: ProjectType, targetFramework: TargetFramework) => {
    return projectType === ProjectType.customCode && targetFramework !== TargetFramework.NetFx;
  }),
}));

describe('FunctionAppFilesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.copyFile).mockResolvedValue(undefined);
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    vi.mocked(fs.readJson).mockResolvedValue({});
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.writeJson).mockResolvedValue(undefined);
    vi.mocked(getDebugConfigs).mockReturnValue([]);
    vi.mocked(getDebugConfiguration).mockReturnValue({ name: 'generated launch' });
    vi.mocked(isMultiRootWorkspace).mockReturnValue(false);
    vi.mocked(fs.readFile).mockImplementation((filePath: any) => {
      const pathText = String(filePath);
      if (pathText.includes('FunctionsProjNet8')) {
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

  it('should always prompt', () => {
    expect(new FunctionAppFilesStep().shouldPrompt()).toBe(true);
  });

  it('should create .NET 8 custom code project files and VS Code configuration', async () => {
    await new FunctionAppFilesStep().prompt(createContext());

    expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('ProcessOrder'));
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsFileNet8'), 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsProjNet8'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.cs'),
      'namespace Contoso.Functions { public class ProcessOrder {} }'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.csproj'),
      '<LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\SalesLogicApp</LogicAppFolderToPublish>'
    );
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('extensions.json'),
      expect.objectContaining({ recommendations: expect.any(Array) }),
      {
        spaces: 2,
      }
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

  it('should create .NET Framework project files with LogicAppFolder replacement', async () => {
    await new FunctionAppFilesStep().prompt(createContext({ targetFramework: TargetFramework.NetFx }));

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsFileNetFx'), 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('FunctionsProjNetFx'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ProcessOrder.csproj'),
      '<LogicAppFolder>SalesLogicApp</LogicAppFolder>'
    );
  });

  it('should create rules engine project files and copy the sample rule file', async () => {
    await new FunctionAppFilesStep().prompt(
      createContext({
        projectType: ProjectType.rulesEngine,
        targetFramework: TargetFramework.Net8,
      })
    );

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('RulesFunctionsFile'), 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('RulesFunctionsProj'), 'utf-8');
    expect(fs.copyFile).toHaveBeenCalledWith(expect.stringContaining('ContosoPurchase'), expect.stringContaining('ContosoPurchase.cs'));
  });

  it('should update launch configuration for existing logic app projects', async () => {
    vi.mocked(getDebugConfigs).mockReturnValue([{ type: 'node', request: 'launch' }]);

    await new FunctionAppFilesStep().prompt(createContext({ shouldCreateLogicAppProject: false }));

    expect(getDebugConfiguration).toHaveBeenCalledWith(FuncVersion.v4, 'SalesLogicApp', TargetFramework.Net8);
    expect(updateDebugConfigs).toHaveBeenCalledWith(undefined, expect.arrayContaining([{ name: 'generated launch' }]));
  });

  it('should write launch.json in multi-root workspaces', async () => {
    vi.mocked(isMultiRootWorkspace).mockReturnValue(true);
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({ configurations: [] });

    await new FunctionAppFilesStep().prompt(createContext({ shouldCreateLogicAppProject: false }));

    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('launch.json'),
      expect.objectContaining({ configurations: expect.any(Array) }),
      {
        spaces: 2,
      }
    );
    expect(updateDebugConfigs).not.toHaveBeenCalled();
  });
});

function createContext(overrides: Partial<IProjectWizardContext> = {}): IProjectWizardContext {
  return {
    functionAppName: 'ProcessOrder',
    functionAppNamespace: 'Contoso.Functions',
    targetFramework: TargetFramework.Net8,
    logicAppName: 'SalesLogicApp',
    version: FuncVersion.v4,
    workspacePath: 'C:\\workspace',
    projectType: ProjectType.customCode,
    shouldCreateLogicAppProject: true,
    ...overrides,
  } as IProjectWizardContext;
}
