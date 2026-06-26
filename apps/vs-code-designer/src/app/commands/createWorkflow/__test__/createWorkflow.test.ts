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
    (vscode.workspace.getWorkspaceFolder as any) = vi.fn();
    vi.mocked(getWorkspaceRoot).mockResolvedValue(undefined);
    vi.mocked(isCodefulProject).mockResolvedValue(false);
  });

  describe('URI-based project resolution (explorer context menu)', () => {
    it('resolves project from right-click URI in multi-root workspace', async () => {
      const firstFolder = {
        name: 'ProjectA',
        uri: { fsPath: 'D:\\workspace\\ProjectA' },
        index: 0,
      } as vscode.WorkspaceFolder;
      const secondFolder = {
        name: 'ControlFlowWorkflows',
        uri: { fsPath: 'D:\\workspace\\ControlFlowWorkflows' },
        index: 1,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [firstFolder, secondFolder];

      const clickedUri = { fsPath: 'D:\\workspace\\ControlFlowWorkflows' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(secondFolder);
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        if (folder === 'D:\\workspace\\ControlFlowWorkflows') {
          return 'D:\\workspace\\ControlFlowWorkflows';
        }
        if (folder === 'D:\\workspace\\ProjectA') {
          return 'D:\\workspace\\ProjectA';
        }
        return undefined;
      });
      vi.mocked(isCodefulProject).mockResolvedValue(true);

      await createWorkflow(context, clickedUri);

      // Should resolve from the clicked URI, not scan from first folder
      expect(vscode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(clickedUri);
      expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, 'D:\\workspace\\ControlFlowWorkflows', true);
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: {
            logicAppType: ProjectType.codeful,
            logicAppName: 'ControlFlowWorkflows',
          },
        })
      );

      // Verify the handler passes the correct project root
      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      await webviewOptions.createHandler(context, { workflowName: 'ForEachWorkflow' });
      expect(createLogicAppWorkflow).toHaveBeenCalledWith(
        context,
        { workflowName: 'ForEachWorkflow' },
        'D:\\workspace\\ControlFlowWorkflows'
      );
    });

    it('does not fall through to workspace scan when URI resolves a project', async () => {
      const firstFolder = {
        name: 'ProjectA',
        uri: { fsPath: 'D:\\workspace\\ProjectA' },
        index: 0,
      } as vscode.WorkspaceFolder;
      const secondFolder = {
        name: 'ProjectB',
        uri: { fsPath: 'D:\\workspace\\ProjectB' },
        index: 1,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [firstFolder, secondFolder];

      const clickedUri = { fsPath: 'D:\\workspace\\ProjectB' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(secondFolder);
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        return folder === 'D:\\workspace\\ProjectB' ? 'D:\\workspace\\ProjectB\\LogicApp' : 'D:\\workspace\\ProjectA\\LogicApp';
      });

      await createWorkflow(context, clickedUri);

      // getWorkspaceRoot should NOT be called since URI resolved successfully
      expect(getWorkspaceRoot).not.toHaveBeenCalled();
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: 'LogicApp',
          }),
        })
      );
    });

    it('falls back to workspace scan if URI workspace folder has no project', async () => {
      const firstFolder = {
        name: 'ProjectA',
        uri: { fsPath: 'D:\\workspace\\ProjectA' },
        index: 0,
      } as vscode.WorkspaceFolder;
      const secondFolder = {
        name: 'NonLogicAppFolder',
        uri: { fsPath: 'D:\\workspace\\NonLogicAppFolder' },
        index: 1,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [firstFolder, secondFolder];

      const clickedUri = { fsPath: 'D:\\workspace\\NonLogicAppFolder\\subfolder' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(secondFolder);
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        return folder === 'D:\\workspace\\ProjectA' ? 'D:\\workspace\\ProjectA\\LogicApp' : undefined;
      });

      await createWorkflow(context, clickedUri);

      // Falls back and finds ProjectA
      expect(getWorkspaceRoot).toHaveBeenCalledWith(context);
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: 'LogicApp',
          }),
        })
      );
    });

    it('falls back to workspace scan when URI has no containing workspace folder', async () => {
      const firstFolder = {
        name: 'ProjectA',
        uri: { fsPath: 'D:\\workspace\\ProjectA' },
        index: 0,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [firstFolder];

      const clickedUri = { fsPath: 'D:\\external\\SomeFolder' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        return folder === 'D:\\workspace\\ProjectA' ? 'D:\\workspace\\ProjectA' : undefined;
      });

      await createWorkflow(context, clickedUri);

      expect(getWorkspaceRoot).toHaveBeenCalledWith(context);
    });
  });

  describe('fallback project resolution (command palette)', () => {
    it('falls back to workspace folders when no URI and no workspace root', async () => {
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

  describe('panel naming per project', () => {
    it('includes project name in panel name for project isolation', async () => {
      const folder = {
        name: 'ControlFlowWorkflows',
        uri: { fsPath: 'D:\\workspace\\ControlFlowWorkflows' },
        index: 0,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];

      const clickedUri = { fsPath: 'D:\\workspace\\ControlFlowWorkflows' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\ControlFlowWorkflows');
      vi.mocked(isCodefulProject).mockResolvedValue(true);

      await createWorkflow(context, clickedUri);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelName: 'Create workflow - ControlFlowWorkflows',
        })
      );
    });

    it('different projects get different panel names', async () => {
      const folderA = {
        name: 'ProjectA',
        uri: { fsPath: 'D:\\workspace\\ProjectA' },
        index: 0,
      } as vscode.WorkspaceFolder;
      const folderB = {
        name: 'ProjectB',
        uri: { fsPath: 'D:\\workspace\\ProjectB' },
        index: 1,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folderA, folderB];

      // First call: ProjectA
      const uriA = { fsPath: 'D:\\workspace\\ProjectA' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folderA);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\ProjectA');
      await createWorkflow(context, uriA);

      // Second call: ProjectB
      vi.clearAllMocks();
      vi.mocked(getWorkspaceRoot).mockResolvedValue(undefined);
      vi.mocked(isCodefulProject).mockResolvedValue(false);
      (vscode.workspace.getWorkspaceFolder as any) = vi.fn();
      const uriB = { fsPath: 'D:\\workspace\\ProjectB' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folderB);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\ProjectB');
      await createWorkflow(context, uriB);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelName: 'Create workflow - ProjectB',
        })
      );
    });
  });

  describe('codeful project detection with URI', () => {
    it('detects codeful project type from URI-resolved path', async () => {
      const folder = {
        name: 'CodefulProject',
        uri: { fsPath: 'D:\\workspace\\CodefulProject' },
        index: 0,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];

      const clickedUri = { fsPath: 'D:\\workspace\\CodefulProject' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\CodefulProject');
      vi.mocked(isCodefulProject).mockResolvedValue(true);

      await createWorkflow(context, clickedUri);

      expect(isCodefulProject).toHaveBeenCalledWith('D:\\workspace\\CodefulProject');
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppType: ProjectType.codeful,
          }),
        })
      );
    });

    it('detects codeless project type from URI-resolved path', async () => {
      const folder = {
        name: 'CodelessProject',
        uri: { fsPath: 'D:\\workspace\\CodelessProject' },
        index: 0,
      } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];

      const clickedUri = { fsPath: 'D:\\workspace\\CodelessProject' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folder);
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\CodelessProject');
      vi.mocked(isCodefulProject).mockResolvedValue(false);

      await createWorkflow(context, clickedUri);

      expect(isCodefulProject).toHaveBeenCalledWith('D:\\workspace\\CodelessProject');
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppType: '',
          }),
        })
      );
    });
  });
});
