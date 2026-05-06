import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { isCodefulProject } from '../../../utils/codeful';
import { addLocalFuncTelemetry } from '../../../utils/funcCoreTools/funcVersion';
import { createLogicAppAndWorkflow } from '../../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createLogicAppWorkflow } from '../createLogicAppWorkflow';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  addLocalFuncTelemetry: vi.fn(),
}));

vi.mock('../../../utils/codeful', () => ({
  isCodefulProject: vi.fn(),
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
    (fse.pathExists as Mock).mockResolvedValue(true);
    (isCodefulProject as Mock).mockResolvedValue(true);
  });

  it('creates a workflow in the open workspace and infers codeful project metadata', async () => {
    const options: any = {
      logicAppName: 'Orders',
      functionFolderName: 'Functions',
      targetFramework: 'net8.0',
    };

    await createLogicAppWorkflow(context, options, logicAppFolderPath);

    expect(addLocalFuncTelemetry).toHaveBeenCalledWith(context);
    expect(fse.pathExists).toHaveBeenCalledWith(logicAppFolderPath);
    expect(isCodefulProject).toHaveBeenCalledWith(logicAppFolderPath);
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
    expect(createLogicAppAndWorkflow).toHaveBeenCalledWith(options, logicAppFolderPath);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Finished creating workflow.');
  });

  it('shows an error and skips creation when no workspace file is open', async () => {
    (vscode.workspace as any).workspaceFile = undefined;
    const options: any = { logicAppName: 'Orders', logicAppType: ProjectType.logicApp };

    await createLogicAppWorkflow(context, options, logicAppFolderPath);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Please open an existing logic app workspace before trying to add a new logic app project.'
    );
    expect(createLogicAppAndWorkflow).not.toHaveBeenCalled();
  });
});
