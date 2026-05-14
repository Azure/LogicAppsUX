import { FuncVersion, WorkerRuntime, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import { writeFileSync } from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appKindSetting,
  azureWebJobsStorageKey,
  codefulWorkflowFileName,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  workerRuntimeKey,
} from '../../../../../../constants';
import { setLocalAppSetting, removeAppKindFromLocalSettings } from '../../../../../utils/appSettings/localSettings';
import { createConnectionsJson } from '../../../../../utils/codeless/connection';
import { createEmptyParametersJson } from '../../../../../utils/codeless/parameter';
import { getCodefulWorkflowTemplate } from '../../../../../utils/codeless/templates';
import { getDebugConfiguration } from '../../../../../utils/debug';
import { validateDotnetInstalled } from '../../../../../utils/dotnet/executeDotnetTemplateCommand';
import { getDebugConfigs } from '../../../../../utils/vsCodeConfig/launch';
import { getWorkspaceFolder, isMultiRootWorkspace } from '../../../../../utils/workspace';
import { switchToDotnetProject } from '../../../../workflows/switchToDotnetProject';
import { CodefulWorkflowCreateStep } from '../codefulWorkflowCreateStep';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  writeFile: vi.fn(),
  writeJson: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardExecuteStep: class {},
  callWithTelemetryAndErrorHandling: vi.fn(),
  DialogResponses: { cancel: { title: 'Cancel' } },
  nonNullProp: (object: Record<string, unknown>, property: string) => object[property],
  parseError: (error: Error) => error,
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  setLocalAppSetting: vi.fn(),
  removeAppKindFromLocalSettings: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/templates', () => ({
  getCodefulWorkflowTemplate: vi.fn().mockResolvedValue('{"definition":{}}'),
}));

vi.mock('../../../../../utils/codeless/connection', () => ({
  createConnectionsJson: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/common', () => ({
  createJsonFileIfDoesNotExist: vi.fn(),
}));

vi.mock('../../../../../utils/codeless/parameter', () => ({
  createEmptyParametersJson: vi.fn(),
}));

vi.mock('../../../../../utils/dotnet/executeDotnetTemplateCommand', () => ({
  validateDotnetInstalled: vi.fn(),
}));

vi.mock('../../../../workflows/switchToDotnetProject', () => ({
  switchToDotnetProject: vi.fn(),
}));

vi.mock('../../../../../utils/vsCodeConfig/launch', () => ({
  getDebugConfigs: vi.fn().mockReturnValue([]),
  updateDebugConfigs: vi.fn(),
}));

vi.mock('../../../../../utils/workspace', () => ({
  getWorkspaceFolder: vi.fn().mockResolvedValue(undefined),
  isMultiRootWorkspace: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../../../utils/debug', () => ({
  getDebugConfiguration: vi.fn().mockReturnValue({ name: 'generated launch' }),
}));

vi.mock('../../../../../utils/fs', () => ({
  writeFormattedJson: vi.fn(),
}));

vi.mock('vscode', () => ({
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
}));

describe('CodefulWorkflowCreateStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fse.writeFile).mockResolvedValue(undefined);
    vi.mocked(fse.writeJson).mockResolvedValue(undefined);
    vi.mocked(fse.readJson).mockResolvedValue({});
    vi.mocked(getCodefulWorkflowTemplate).mockResolvedValue('{"definition":{}}');
    vi.mocked(setLocalAppSetting).mockResolvedValue(undefined);
    vi.mocked(removeAppKindFromLocalSettings).mockResolvedValue(undefined);
    vi.mocked(getDebugConfigs).mockReturnValue([]);
    vi.mocked(getDebugConfiguration).mockReturnValue({ name: 'generated launch' });
    vi.mocked(isMultiRootWorkspace).mockReturnValue(false);
    vi.mocked(getWorkspaceFolder).mockResolvedValue(undefined);
  });

  it('should create a codeful workflow and return its workflow file path', async () => {
    const step = new CodefulWorkflowCreateStep();
    const context = createContext();
    const updateLogicAppLaunchJson = vi.spyOn(step as any, 'updateLogicAppLaunchJson').mockResolvedValue(undefined);
    vi.spyOn(step, 'createSystemArtifacts').mockResolvedValue(undefined);

    const workflowFilePath = await step.executeCore(context);

    expect(validateDotnetInstalled).toHaveBeenCalledWith(context);
    expect(getCodefulWorkflowTemplate).toHaveBeenCalled();
    expect(fse.ensureDir).toHaveBeenCalledWith('C:\\project\\ProcessOrder');
    expect(fse.writeFile).toHaveBeenCalledWith(`C:\\project\\ProcessOrder\\${codefulWorkflowFileName}`, '{"definition":{}}');
    expect(createConnectionsJson).toHaveBeenCalledWith(context.projectPath);
    expect(createEmptyParametersJson).toHaveBeenCalledWith(context.projectPath);
    expect(writeFileSync).toHaveBeenCalledWith('C:\\project\\nuget.config', expect.stringContaining('LocalPackages'));
    expect(step.createSystemArtifacts).toHaveBeenCalledWith(context);
    expect(getWorkspaceFolder).toHaveBeenCalledWith(context);
    expect(updateLogicAppLaunchJson).toHaveBeenCalledWith(
      context.projectPath,
      context.targetFramework,
      undefined,
      FuncVersion.v4,
      context.logicAppName
    );
    expect(workflowFilePath).toBe(`C:\\project\\ProcessOrder\\${codefulWorkflowFileName}`);
  });

  it('should update app settings for codeful workflows', async () => {
    const context = createContext();

    await new CodefulWorkflowCreateStep().updateAppSettings(context);

    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      context.projectPath,
      workerRuntimeKey,
      WorkerRuntime.Dotnet,
      expect.anything()
    );
    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      context.projectPath,
      functionsInprocNet8Enabled,
      functionsInprocNet8EnabledTrue,
      expect.anything()
    );
    expect(setLocalAppSetting).toHaveBeenCalledWith(context, context.projectPath, appKindSetting, logicAppKind, expect.anything());
    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      context.projectPath,
      azureWebJobsStorageKey,
      localEmulatorConnectionString,
      expect.anything()
    );
    expect(removeAppKindFromLocalSettings).toHaveBeenCalledWith(context.projectPath, context);
  });

  it('should create system artifacts with .NET 8 codeful conversion', async () => {
    const step = new CodefulWorkflowCreateStep();
    const context = createContext();
    vi.spyOn(step as any, 'updateHostJson').mockResolvedValue(undefined);
    vi.spyOn(step, 'updateAppSettings').mockResolvedValue(undefined);

    await step.createSystemArtifacts(context);

    expect(switchToDotnetProject).toHaveBeenCalledWith(context, { fsPath: context.projectPath }, '8', true);
    expect((step as any).updateHostJson).toHaveBeenCalledWith(context, 'host.json');
    expect(step.updateAppSettings).toHaveBeenCalledWith(context);
  });

  it('should add the temporary NuGet config', () => {
    const step = new CodefulWorkflowCreateStep();

    (step as any).addNugetConfig('C:\\project');

    expect(writeFileSync).toHaveBeenCalledWith('C:\\project\\nuget.config', expect.stringContaining('nuget.org'));
  });

  it('should remove extension bundles from host.json for codeful workflows', async () => {
    const step = new CodefulWorkflowCreateStep();
    const context = createContext();
    context.workflowProjectType = WorkflowProjectType.Bundle;
    vi.spyOn(step as any, 'getHostJson').mockResolvedValue({
      extensionBundle: {
        id: 'legacy.bundle',
        version: '[0.*, 1.0.0)',
      },
    });
    const { writeFormattedJson } = await import('../../../../../utils/fs');

    await (step as any).updateHostJson(context, 'host.json');

    expect(writeFormattedJson).toHaveBeenCalledWith(
      'C:\\project\\host.json',
      expect.objectContaining({
        extensionBundle: undefined,
      })
    );
  });

  it('should update launch.json in multi-root workspaces', async () => {
    vi.mocked(isMultiRootWorkspace).mockReturnValue(true);

    await (new CodefulWorkflowCreateStep() as any).updateLogicAppLaunchJson(
      'C:\\project',
      'net8',
      undefined,
      FuncVersion.v4,
      'SalesLogicApp'
    );

    expect(fse.writeJson).toHaveBeenCalledWith(
      'C:\\project\\.vscode\\launch.json',
      expect.objectContaining({
        configurations: expect.arrayContaining([expect.objectContaining({ name: 'generated launch' })]),
      }),
      { spaces: 2 }
    );
  });

  it('should update existing launch configs in single-root workspaces', async () => {
    vi.mocked(getDebugConfigs).mockReturnValue([{ type: 'logicapp', request: 'launch' }]);
    const { updateDebugConfigs } = await import('../../../../../utils/vsCodeConfig/launch');

    await (new CodefulWorkflowCreateStep() as any).updateLogicAppLaunchJson(
      'C:\\project',
      'net8',
      undefined,
      FuncVersion.v4,
      'SalesLogicApp'
    );

    expect(updateDebugConfigs).toHaveBeenCalledWith(
      undefined,
      expect.arrayContaining([expect.objectContaining({ customCodeRuntime: 'coreclr', funcRuntime: 'coreclr', isCodeless: false })])
    );
  });

  it('should preserve non-logicapp debug configs when updating existing launch configs', async () => {
    const existingDebugConfig = { type: 'node', request: 'launch' };
    vi.mocked(getDebugConfigs).mockReturnValue([{ type: 'logicapp', request: 'launch' }, existingDebugConfig]);
    const { updateDebugConfigs } = await import('../../../../../utils/vsCodeConfig/launch');

    await (new CodefulWorkflowCreateStep() as any).updateLogicAppLaunchJson(
      'C:\\project',
      'net8',
      undefined,
      FuncVersion.v4,
      'SalesLogicApp'
    );

    expect(updateDebugConfigs).toHaveBeenCalledWith(undefined, expect.arrayContaining([existingDebugConfig]));
  });

  it('should filter attach pick-process configs when generating launch configs', async () => {
    const attachConfig = { request: 'attach', processId: '${command:azureLogicAppsStandard.pickProcess}' };
    const keepConfig = { type: 'node', request: 'launch' };
    vi.mocked(getDebugConfigs).mockReturnValue([attachConfig, keepConfig]);
    const { updateDebugConfigs } = await import('../../../../../utils/vsCodeConfig/launch');

    await (new CodefulWorkflowCreateStep() as any).updateLogicAppLaunchJson(
      'C:\\project',
      'net8',
      undefined,
      FuncVersion.v4,
      'SalesLogicApp'
    );

    expect(updateDebugConfigs).toHaveBeenCalledWith(undefined, [expect.objectContaining({ name: 'generated launch' }), keepConfig]);
  });
});

function createContext(): IFunctionWizardContext {
  return {
    projectPath: 'C:\\project',
    functionName: 'ProcessOrder',
    logicAppName: 'SalesLogicApp',
    targetFramework: 'net8',
    workspaceFolder: undefined,
  } as IFunctionWizardContext;
}
