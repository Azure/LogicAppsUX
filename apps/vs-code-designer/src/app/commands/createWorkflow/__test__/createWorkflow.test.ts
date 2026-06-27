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

vi.mock('../../../utils/codeful', () => ({
  isCodefulProject: vi.fn(),
}));

vi.mock('../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../../utils/codeless/common', () => ({
  getWorkflowsInLocalProject: vi.fn().mockResolvedValue({}),
}));

vi.mock('../createLogicAppWorkflow', () => ({
  createLogicAppWorkflow: vi.fn(),
}));

import { createWorkspaceWebviewCommandHandler } from '../../shared/workspaceWebviewCommandHandler';
import { isCodefulProject } from '../../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
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
    vi.mocked(isCodefulProject).mockResolvedValue(false);
  });

  describe('project collection and selection', () => {
    it('collects all projects from workspace folders and sends to webview', async () => {
      const folderA = { name: 'ProjectA', uri: { fsPath: 'D:\\workspace\\ProjectA' }, index: 0 } as vscode.WorkspaceFolder;
      const folderB = { name: 'ProjectB', uri: { fsPath: 'D:\\workspace\\ProjectB' }, index: 1 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folderA, folderB];
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        if (folder === 'D:\\workspace\\ProjectA') {
          return 'D:\\workspace\\ProjectA';
        }
        if (folder === 'D:\\workspace\\ProjectB') {
          return 'D:\\workspace\\ProjectB';
        }
        return undefined;
      });
      vi.mocked(isCodefulProject).mockImplementation(async (projectPath) => {
        return projectPath === 'D:\\workspace\\ProjectB';
      });

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            availableProjects: [
              { name: 'ProjectA', path: 'D:\\workspace\\ProjectA', isCodeful: false, existingWorkflows: [] },
              { name: 'ProjectB', path: 'D:\\workspace\\ProjectB', isCodeful: true, existingWorkflows: [] },
            ],
          }),
        })
      );
    });

    it('auto-selects when only one project exists', async () => {
      const folder = { name: 'OnlyProject', uri: { fsPath: 'D:\\workspace\\OnlyProject' }, index: 0 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\OnlyProject');
      vi.mocked(isCodefulProject).mockResolvedValue(true);

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: 'OnlyProject',
            logicAppType: ProjectType.codeful,
          }),
        })
      );
    });

    it('does not pre-select when multiple projects and no URI', async () => {
      const folderA = { name: 'ProjectA', uri: { fsPath: 'D:\\workspace\\ProjectA' }, index: 0 } as vscode.WorkspaceFolder;
      const folderB = { name: 'ProjectB', uri: { fsPath: 'D:\\workspace\\ProjectB' }, index: 1 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folderA, folderB];
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        if (folder === 'D:\\workspace\\ProjectA') {
          return 'D:\\workspace\\ProjectA';
        }
        if (folder === 'D:\\workspace\\ProjectB') {
          return 'D:\\workspace\\ProjectB';
        }
        return undefined;
      });

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: '',
            logicAppType: '',
          }),
        })
      );
    });
  });

  describe('URI-based project pre-selection', () => {
    it('pre-selects project from right-click URI', async () => {
      const folderA = { name: 'ProjectA', uri: { fsPath: 'D:\\workspace\\ProjectA' }, index: 0 } as vscode.WorkspaceFolder;
      const folderB = { name: 'ControlFlow', uri: { fsPath: 'D:\\workspace\\ControlFlow' }, index: 1 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folderA, folderB];

      const clickedUri = { fsPath: 'D:\\workspace\\ControlFlow' } as vscode.Uri;
      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(folderB);
      vi.mocked(tryGetLogicAppProjectRoot).mockImplementation(async (_ctx, folder) => {
        if (folder === 'D:\\workspace\\ProjectA') {
          return 'D:\\workspace\\ProjectA';
        }
        if (folder === 'D:\\workspace\\ControlFlow') {
          return 'D:\\workspace\\ControlFlow';
        }
        return undefined;
      });
      vi.mocked(isCodefulProject).mockResolvedValue(true);

      await createWorkflow(context, clickedUri);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: 'ControlFlow',
            logicAppType: ProjectType.codeful,
          }),
        })
      );
    });
  });

  describe('create handler resolves project from webview data', () => {
    it('uses logicAppName from webview to find project path', async () => {
      const folder = { name: 'ProjectA', uri: { fsPath: 'D:\\workspace\\ProjectA' }, index: 0 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\ProjectA');

      await createWorkflow(context);

      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      const data = { workflowName: 'MyWorkflow', logicAppName: 'ProjectA' };
      await webviewOptions.createHandler(context, data);

      expect(createLogicAppWorkflow).toHaveBeenCalledWith(context, data, 'D:\\workspace\\ProjectA');
    });

    it('throws when webview sends unrecognized project name', async () => {
      const folder = { name: 'ProjectA', uri: { fsPath: 'D:\\workspace\\ProjectA' }, index: 0 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\ProjectA');

      await createWorkflow(context);

      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      const data = { workflowName: 'MyWorkflow', logicAppName: 'NonExistentProject' };

      await expect(webviewOptions.createHandler(context, data)).rejects.toThrow(
        'No project selected. Please select a project and try again.'
      );
    });
  });

  describe('panel naming', () => {
    it('uses generic panel name without project-specific suffix', async () => {
      const folder = { name: 'MyProject', uri: { fsPath: 'D:\\workspace\\MyProject' }, index: 0 } as vscode.WorkspaceFolder;
      (vscode.workspace as any).workspaceFolders = [folder];
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:\\workspace\\MyProject');

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelName: 'Create workflow',
        })
      );
    });
  });

  describe('error cases', () => {
    it('throws when no projects found in workspace', async () => {
      (vscode.workspace as any).workspaceFolders = [
        { name: 'Empty', uri: { fsPath: 'D:\\workspace\\Empty' }, index: 0 } as vscode.WorkspaceFolder,
      ];
      vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);

      await expect(createWorkflow(context)).rejects.toThrow('No Logic App project found in the current workspace.');
      expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
    });

    it('throws when no workspace folders exist', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      await expect(createWorkflow(context)).rejects.toThrow('No Logic App project found in the current workspace.');
    });
  });
});
