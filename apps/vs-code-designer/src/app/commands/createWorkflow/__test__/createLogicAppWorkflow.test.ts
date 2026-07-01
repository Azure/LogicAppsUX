import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { hasCodefulWorkflowSetting } from '../../../utils/codeful';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import { createLogicAppAndWorkflow } from '../../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createLogicAppWorkflow } from '../createLogicAppWorkflow';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  addLocalFuncTelemetry: vi.fn(),
}));

vi.mock('../../../utils/codeful', () => ({
  hasCodefulWorkflowSetting: vi.fn(),
}));

vi.mock('../../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace', () => ({
  createLogicAppAndWorkflow: vi.fn(),
}));

describe('createLogicAppWorkflow', () => {
  const workspaceFilePath = 'D:\\workspace\\MyWorkspace.code-workspace';
  const logicAppFolderPath = 'D:\\workspace\\Orders';
  let context: any;

  beforeEach(() => {
    vi.clearAllMocks();
    context = { telemetry: { properties: {}, measurements: {} } };
    (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(true);
  });

  it('creates a workflow in the open workspace and infers codeful project metadata', async () => {
    const options: any = {
      logicAppName: 'Orders',
      functionFolderName: 'Functions',
      targetFramework: 'net8.0',
    };

    await createLogicAppWorkflow(context, options, logicAppFolderPath);

    expect(addLocalFuncTelemetry).toHaveBeenCalledWith(context);
    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(logicAppFolderPath);
    expect(options).toMatchObject({
      logicAppType: ProjectType.codeful,
      workspaceFilePath,
      shouldCreateLogicAppProject: false,
    });
    expect(context).toMatchObject({
      logicAppName: 'Orders',
      projectPath: logicAppFolderPath,
      projectType: ProjectType.codeful,
      functionFolderName: 'Functions',
      targetFramework: 'net8.0',
    });
    expect(createLogicAppAndWorkflow).toHaveBeenCalledWith(options, logicAppFolderPath, context);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Finished creating workflow.');
  });

  it('creates a workflow in a folder-opened Logic App project when no workspace file is open', async () => {
    (vscode.workspace as any).workspaceFile = undefined;
    const options: any = { logicAppName: 'Orders', logicAppType: ProjectType.logicApp };

    await createLogicAppWorkflow(context, options, logicAppFolderPath);

    expect(options).toMatchObject({
      logicAppType: ProjectType.logicApp,
      shouldCreateLogicAppProject: false,
    });
    expect(options.workspaceFilePath).toBeUndefined();
    expect(createLogicAppAndWorkflow).toHaveBeenCalledWith(options, logicAppFolderPath, context);
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Finished creating workflow.');
  });
});
