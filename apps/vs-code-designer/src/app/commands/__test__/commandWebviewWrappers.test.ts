import { ExtensionCommand, ProjectName, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { getLogicAppWithoutCustomCode, getWorkspaceRoot } from '../../utils/workspace';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { cloudToLocal } from '../cloudToLocal/cloudToLocal';
import { convertToWorkspace } from '../convertToWorkspace';
import { createLogicAppWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createLogicAppProject } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { createNewProject } from '../createProject/createProject';
import { createLogicAppWorkflow } from '../createWorkflow/createLogicAppWorkflow';
import { createWorkflow } from '../createWorkflow/createWorkflow';
import { createWorkspace } from '../createWorkspace/createWorkspace';
import { createWorkspaceWebviewCommandHandler, type WorkspaceWebviewCommandConfig } from '../shared/workspaceWebviewCommandHandler';

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../shared/workspaceWebviewCommandHandler', () => ({
  createWorkspaceWebviewCommandHandler: vi.fn(),
}));

vi.mock('../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace', () => ({
  createLogicAppWorkspace: vi.fn(),
}));

vi.mock('../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects', () => ({
  createLogicAppProject: vi.fn(),
}));

vi.mock('../convertToWorkspace', () => ({
  convertToWorkspace: vi.fn(),
}));

vi.mock('../createWorkflow/createLogicAppWorkflow', () => ({
  createLogicAppWorkflow: vi.fn(),
}));

vi.mock('../../utils/workspace', () => ({
  getLogicAppWithoutCustomCode: vi.fn(),
  getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../utils/codeful', () => ({
  hasCodefulWorkflowSetting: vi.fn(),
}));

vi.mock('../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

function getLastWebviewConfig(): WorkspaceWebviewCommandConfig {
  const calls = (createWorkspaceWebviewCommandHandler as Mock).mock.calls;
  return calls[calls.length - 1][0] as WorkspaceWebviewCommandConfig;
}

describe('workspace webview command wrappers', () => {
  const context = { telemetry: { properties: {}, measurements: {} } } as any;
  const workspaceRoot = 'D:\\workspace';
  const logicAppRoot = path.join(workspaceRoot, 'LogicApp');

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFile = undefined;
    (vscode.workspace.fs.readFile as Mock).mockReset();
    (getWorkspaceRoot as Mock).mockResolvedValue(workspaceRoot);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue(logicAppRoot);
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(false);
    (getLogicAppWithoutCustomCode as Mock).mockResolvedValue([]);
  });

  it('createWorkspace passes workspace config and invokes createLogicAppWorkspace', async () => {
    await createWorkspace();

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create workspace',
      panelGroupKey: ext.webViewKey.createWorkspace,
      projectName: ProjectName.createWorkspace,
      createCommand: ExtensionCommand.createWorkspace,
    });

    const data = { workspaceName: 'MyWorkspace' };
    await config.createHandler(context, data);

    expect(createLogicAppWorkspace).toHaveBeenCalledWith(context, data, false);
  });

  it('cloudToLocal passes package config and invokes createLogicAppWorkspace for package import', async () => {
    await cloudToLocal();

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create workspace from package',
      panelGroupKey: ext.webViewKey.createWorkspaceFromPackage,
      projectName: ProjectName.createWorkspaceFromPackage,
      createCommand: ExtensionCommand.createWorkspaceFromPackage,
    });
    expect(config.dialogOptions?.package).toMatchObject({
      canSelectMany: false,
      openLabel: 'Select package file',
      filters: { Packages: ['zip'] },
    });

    const data = { packagePath: 'D:\\downloads\\app.zip' };
    await config.createHandler(context, data);

    expect(createLogicAppWorkspace).toHaveBeenCalledWith(context, data, true);
  });

  it('createNewProject opens the project webview when a workspace is present', async () => {
    const workspaceFile = { fsPath: 'D:\\workspace\\MyWorkspace.code-workspace' };
    const workspaceFileJson = { folders: [{ path: './LogicApp' }] };
    const logicAppsWithoutCustomCode = ['LogicApp'];
    (vscode.workspace as any).workspaceFile = workspaceFile;
    (vscode.workspace.fs.readFile as Mock).mockResolvedValue(Buffer.from(JSON.stringify(workspaceFileJson)));
    (getLogicAppWithoutCustomCode as Mock).mockResolvedValue(logicAppsWithoutCustomCode);

    await createNewProject(context);

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create project',
      panelGroupKey: ext.webViewKey.createLogicApp,
      projectName: ProjectName.createLogicApp,
      createCommand: ExtensionCommand.createLogicApp,
    });
    expect(config.extraInitializeData).toEqual({
      workspaceFileJson,
      logicAppsWithoutCustomCode,
    });
    expect(config.dialogOptions?.workspace).toMatchObject({
      canSelectMany: false,
      openLabel: 'Select workspace parent folder',
      canSelectFiles: false,
      canSelectFolders: true,
    });

    const data = { logicAppName: 'Orders' };
    await config.createHandler(context, data);

    expect(createLogicAppProject).toHaveBeenCalledWith(context, data, path.dirname(workspaceFile.fsPath));
  });

  it('createNewProject falls back to convertToWorkspace when no workspace file is open', async () => {
    await createNewProject(context);

    expect(convertToWorkspace).toHaveBeenCalledWith(context);
    expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('createWorkflow passes codeful metadata and wires createLogicAppWorkflow', async () => {
    const projectRoot = path.join(workspaceRoot, 'CodefulLogicApp');
    (getWorkspaceRoot as Mock).mockResolvedValue(workspaceRoot);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue(projectRoot);
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(true);

    await createWorkflow(context);

    expect(getWorkspaceRoot).toHaveBeenCalledWith(context);
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, workspaceRoot, true);
    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(projectRoot);

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create workflow',
      panelGroupKey: ext.webViewKey.createWorkflow,
      projectName: ProjectName.createWorkflow,
      createCommand: ExtensionCommand.createWorkflow,
      extraInitializeData: {
        logicAppType: ProjectType.codeful,
        logicAppName: 'CodefulLogicApp',
      },
    });

    const data = { workflowName: 'ProcessOrder' };
    await config.createHandler(context, data);

    expect(createLogicAppWorkflow).toHaveBeenCalledWith(context, data, projectRoot);
  });
});
