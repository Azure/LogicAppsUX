import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../shared/workspaceWebviewCommandHandler', () => ({
  createWorkspaceWebviewCommandHandler: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../../utils/codeful', () => ({
  isCodefulProject: vi.fn(),
}));

vi.mock('../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../createLogicAppWorkflow', () => ({
  createLogicAppWorkflow: vi.fn(),
}));

import { createWorkspaceWebviewCommandHandler } from '../../shared/workspaceWebviewCommandHandler';
import { isCodefulProject } from '../../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceRoot } from '../../../utils/workspace';
import { createLogicAppWorkflow } from '../createLogicAppWorkflow';
import { createWorkflow } from '../createWorkflow';

describe('createWorkflow', () => {
  const context = {
    telemetry: {
      properties: {},
      measurements: {},
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = undefined;
    vi.mocked(getWorkspaceRoot).mockResolvedValue(undefined);
    vi.mocked(isCodefulProject).mockResolvedValue(false);
  });

  it('falls back to workspace folders when no workspace root', async () => {
    const firstWorkspaceFolder = {
      name: 'WorkspaceA',
      uri: { fsPath: 'D:\\workspace\\WorkspaceA' },
      index: 0,
    } as vscode.WorkspaceFolder;
    const secondWorkspaceFolder = {
      name: 'WorkspaceB',
      uri: { fsPath: 'D:\\workspace\\WorkspaceB' },
      index: 1,
    } as vscode.WorkspaceFolder;
    (vscode.workspace as any).workspaceFolders = [firstWorkspaceFolder, secondWorkspaceFolder];
    vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_context, workspaceFolder) => {
      return workspaceFolder === secondWorkspaceFolder.uri.fsPath ? 'D:\\workspace\\WorkspaceB\\LogicApp' : undefined;
    });
    vi.mocked(isCodefulProject).mockResolvedValue(true);

    await createWorkflow(context);

    expect(tryGetLogicAppProjectRoot).toHaveBeenNthCalledWith(1, context, firstWorkspaceFolder.uri.fsPath, true);
    expect(tryGetLogicAppProjectRoot).toHaveBeenNthCalledWith(2, context, secondWorkspaceFolder.uri.fsPath, true);
    expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        extraInitializeData: {
          logicAppType: ProjectType.codeful,
          logicAppName: 'LogicApp',
        },
      })
    );

    const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
    const workflowData = { workflowName: 'WorkflowA' };
    await webviewOptions.createHandler(context, workflowData);
    expect(createLogicAppWorkflow).toHaveBeenCalledWith(context, workflowData, 'D:\\workspace\\WorkspaceB\\LogicApp');
  });

  it('throws user-friendly error when no project found', async () => {
    (vscode.workspace as any).workspaceFolders = [
      {
        name: 'WorkspaceA',
        uri: { fsPath: 'D:\\workspace\\WorkspaceA' },
        index: 0,
      } as vscode.WorkspaceFolder,
    ];
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);

    await expect(createWorkflow(context)).rejects.toThrow('No Logic App project found in the current workspace.');
    expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });
});
