import { ExtensionCommand, ProjectName, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { getWorkspaceRoot } from '../../utils/workspace';
import { getEligibleLogicAppFoldersForCustomCode } from '../../utils/customCodeUtils';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { cloudToLocal } from '../cloudToLocal/cloudToLocal';
import { ensureWorkspace } from '../ensureWorkspace';
import { createLogicAppWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { createLogicAppProject } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { createProject } from '../createProject/createProject';
import { createLogicAppWorkflow } from '../createWorkflow/createLogicAppWorkflow';
import { createWorkflow } from '../createWorkflow/createWorkflow';
import { createWorkspace } from '../createWorkspace/createWorkspace';
import { createWorkspaceWebviewCommandHandler, type WorkspaceWebviewCommandConfig } from '../shared/workspaceWebviewCommandHandler';

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    return await callback(context);
  }),
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

vi.mock('../ensureWorkspace', () => ({
  ensureWorkspace: vi.fn(),
}));

vi.mock('../createWorkflow/createLogicAppWorkflow', () => ({
  createLogicAppWorkflow: vi.fn(),
}));

vi.mock('../../utils/workspace', () => ({
  getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../utils/customCodeUtils', () => ({
  getEligibleLogicAppFoldersForCustomCode: vi.fn(),
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
  const workspaceRoot = path.resolve(path.sep, 'workspace');
  const logicAppRoot = path.join(workspaceRoot, 'LogicApp');

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFile = undefined;
    (vscode.workspace.fs.readFile as Mock).mockReset();
    (getWorkspaceRoot as Mock).mockResolvedValue(workspaceRoot);
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue(logicAppRoot);
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(false);
    (getEligibleLogicAppFoldersForCustomCode as Mock).mockResolvedValue([]);
  });

  it('createWorkspace passes workspace config and invokes createLogicAppWorkspace', async () => {
    await createWorkspace(context);

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create workspace',
      panelGroupKey: ext.webViewKey.createWorkspace,
      projectName: ProjectName.createWorkspace,
      createCommand: ExtensionCommand.createWorkspace,
    });

    const data = { workspaceName: 'MyWorkspace' };
    await config.createHandler(data);

    expect(createLogicAppWorkspace).toHaveBeenCalledWith(expect.any(Object), data, false);
  });

  it('cloudToLocal passes package config and invokes createLogicAppWorkspace for package import', async () => {
    await cloudToLocal(context);

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
    await config.createHandler(data);

    expect(createLogicAppWorkspace).toHaveBeenCalledWith(expect.any(Object), data, true);
  });

  it('createProject opens the project webview when a workspace is present', async () => {
    const workspaceFile = { fsPath: path.join(workspaceRoot, 'MyWorkspace.code-workspace') };
    const workspaceFileJson = { folders: [{ path: './LogicApp' }] };
    const eligiblePaths = [path.join(workspaceRoot, 'LogicApp')];
    (vscode.workspace as any).workspaceFile = workspaceFile;
    (vscode.workspace.fs.readFile as Mock).mockResolvedValue(Buffer.from(JSON.stringify(workspaceFileJson)));
    (vscode.workspace.fs.readDirectory as Mock).mockResolvedValue([
      ['LogicApp', 'directory'],
      ['CSharpProject', 'directory'],
      ['MyWorkspace.code-workspace', 'file'],
    ]);
    (getEligibleLogicAppFoldersForCustomCode as Mock).mockResolvedValue(eligiblePaths);

    await createProject(context);

    const config = getLastWebviewConfig();
    expect(config).toMatchObject({
      panelName: 'Create project',
      panelGroupKey: ext.webViewKey.createLogicApp,
      projectName: ProjectName.createLogicApp,
      createCommand: ExtensionCommand.createLogicApp,
    });
    const expectedLogicAppPath = path.join(workspaceRoot, 'LogicApp');
    expect(config.extraInitializeData).toEqual({
      workspaceFileJson,
      logicAppsWithoutCustomCode: [{ label: 'LogicApp', description: expectedLogicAppPath, data: expectedLogicAppPath }],
      existingFolders: ['LogicApp', 'CSharpProject'],
    });
    expect(config.dialogOptions?.workspace).toMatchObject({
      canSelectMany: false,
      openLabel: 'Select workspace parent folder',
      canSelectFiles: false,
      canSelectFolders: true,
    });

    const data = { logicAppName: 'Orders' };
    await config.createHandler(data);

    expect(createLogicAppProject).toHaveBeenCalledWith(expect.any(Object), data, path.dirname(workspaceFile.fsPath));
  });

  it('getExistingFoldersOnDisk filters out non-directory entries using FileType mock', async () => {
    const workspaceFile = { fsPath: path.join(workspaceRoot, 'MyWorkspace.code-workspace') };
    const workspaceFileJson = { folders: [{ path: './LogicApp' }] };
    (vscode.workspace as any).workspaceFile = workspaceFile;
    (vscode.workspace.fs.readFile as Mock).mockResolvedValue(Buffer.from(JSON.stringify(workspaceFileJson)));
    (vscode.workspace.fs.readDirectory as Mock).mockResolvedValue([
      ['LogicApp', 'directory'],
      ['notes.txt', 'file'],
      ['SomeLink', 'symlink'],
      ['AnotherProject', 'directory'],
      ['UnknownEntry', ''],
    ]);

    await createProject(context);

    const config = getLastWebviewConfig();
    expect(config.extraInitializeData).toEqual({
      workspaceFileJson,
      logicAppsWithoutCustomCode: [],
      existingFolders: ['LogicApp', 'AnotherProject'],
    });
  });

  it('createProject falls back to ensureWorkspace when no workspace file is open', async () => {
    await createProject(context);

    expect(ensureWorkspace).toHaveBeenCalledWith(expect.any(Object));
    expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('createWorkflow passes codeful metadata and wires createLogicAppWorkflow', async () => {
    const projectRoot = path.join(workspaceRoot, 'CodefulLogicApp');
    const folder = {
      name: 'workspace',
      uri: { fsPath: workspaceRoot },
      index: 0,
    } as vscode.WorkspaceFolder;
    (vscode.workspace as any).workspaceFolders = [folder];
    (tryGetLogicAppProjectRoot as Mock).mockResolvedValue(projectRoot);
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(true);

    await createWorkflow(context);

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
        availableProjects: [{ name: 'CodefulLogicApp', path: projectRoot, isCodeful: true }],
      },
    });

    const data = { workflowName: 'ProcessOrder', logicAppName: 'CodefulLogicApp' };
    await config.createHandler(data);

    expect(createLogicAppWorkflow).toHaveBeenCalledWith(expect.any(Object), data, projectRoot);
  });
});
