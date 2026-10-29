import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../localize', () => ({
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

vi.mock('../../shared/workspaceWebviewCommandHandler', () => ({
  createWorkspaceWebviewCommandHandler: vi.fn(),
}));

vi.mock('../../../utils/codeful', () => ({
  isCodefulLogicApp: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getLogicAppRoots: vi.fn(),
  isLogicApp: vi.fn(),
  selectLogicAppRoot: vi.fn(),
}));

vi.mock('../../../utils/codeless/common', () => ({
  getWorkflowsInLocalProject: vi.fn().mockResolvedValue({}),
}));

vi.mock('../createLogicAppWorkflow', () => ({
  createLogicAppWorkflow: vi.fn(),
}));

import { createWorkspaceWebviewCommandHandler } from '../../shared/workspaceWebviewCommandHandler';
import { isCodefulLogicApp } from '../../../utils/codeful';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { getLogicAppRoots, isLogicApp, selectLogicAppRoot } from '../../../utils/workspace';
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
    vi.mocked(getLogicAppRoots).mockResolvedValue([]);
    vi.mocked(isCodefulLogicApp).mockResolvedValue(false);
    vi.mocked(isLogicApp).mockResolvedValue(false);
    vi.mocked(selectLogicAppRoot).mockResolvedValue(undefined);
    vi.mocked(getWorkflowsInLocalProject).mockResolvedValue({});
  });

  describe('project collection and selection', () => {
    it('collects all projects and sends their metadata to the webview', async () => {
      const projectA = 'D:\\workspace\\ProjectA';
      const projectB = 'D:\\workspace\\ProjectB';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectA);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectA, projectB]);
      vi.mocked(isCodefulLogicApp).mockImplementation(async (projectPath) => projectPath === projectB);

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            availableProjects: [
              { name: 'ProjectA', path: projectA, isCodeful: false, existingWorkflows: [] },
              { name: 'ProjectB', path: projectB, isCodeful: true, existingWorkflows: [] },
            ],
          }),
        })
      );
    });

    it('auto-selects the only project', async () => {
      const projectPath = 'D:\\workspace\\OnlyProject';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectPath);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectPath]);
      vi.mocked(isCodefulLogicApp).mockResolvedValue(true);

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

    it('pre-selects the project chosen by the shared selector when multiple projects exist', async () => {
      const projectA = 'D:\\workspace\\ProjectA';
      const projectB = 'D:\\workspace\\ProjectB';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectB);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectA, projectB]);

      await createWorkflow(context);

      expect(selectLogicAppRoot).toHaveBeenCalledWith(context);
      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInitializeData: expect.objectContaining({
            logicAppName: 'ProjectB',
            logicAppType: '',
          }),
        })
      );
    });
  });

  describe('URI-based project pre-selection', () => {
    it('pre-selects a Logic App project from the right-click URI', async () => {
      const projectA = 'D:\\workspace\\ProjectA';
      const controlFlowProject = 'D:\\workspace\\ControlFlow';
      const clickedUri = { fsPath: controlFlowProject } as vscode.Uri;
      vi.mocked(isLogicApp).mockResolvedValue(true);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectA, controlFlowProject]);
      vi.mocked(isCodefulLogicApp).mockImplementation(async (projectPath) => projectPath === controlFlowProject);

      await createWorkflow(context, clickedUri);

      expect(selectLogicAppRoot).not.toHaveBeenCalled();
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

  describe('create handler project resolution', () => {
    it('uses logicAppName from webview data to find the project path', async () => {
      const projectPath = 'D:\\workspace\\ProjectA';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectPath);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectPath]);

      await createWorkflow(context);

      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      const data = { workflowName: 'MyWorkflow', logicAppName: 'ProjectA' };
      await webviewOptions.createHandler(data);

      expect(createLogicAppWorkflow).toHaveBeenCalledWith(expect.any(Object), data, projectPath);
    });

    it('resolves to the first matching project when duplicate basenames exist', async () => {
      const firstProject = 'D:\\repoA\\SharedProject';
      const secondProject = 'D:\\repoB\\SharedProject';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(firstProject);
      vi.mocked(getLogicAppRoots).mockResolvedValue([firstProject, secondProject]);

      await createWorkflow(context);

      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      const data = { workflowName: 'MyWorkflow', logicAppName: 'SharedProject' };
      await webviewOptions.createHandler(data);

      expect(createLogicAppWorkflow).toHaveBeenCalledWith(expect.any(Object), data, firstProject);
    });

    it('throws when the webview sends an unrecognized project name', async () => {
      const projectPath = 'D:\\workspace\\ProjectA';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectPath);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectPath]);

      await createWorkflow(context);

      const webviewOptions = vi.mocked(createWorkspaceWebviewCommandHandler).mock.calls[0][0] as any;
      const data = { workflowName: 'MyWorkflow', logicAppName: 'NonExistentProject' };

      await expect(webviewOptions.createHandler(data)).rejects.toThrow('No project selected. Please select a project and try again.');
    });
  });

  describe('panel naming', () => {
    it('uses a generic panel name without a project-specific suffix', async () => {
      const projectPath = 'D:\\workspace\\MyProject';
      vi.mocked(selectLogicAppRoot).mockResolvedValue(projectPath);
      vi.mocked(getLogicAppRoots).mockResolvedValue([projectPath]);

      await createWorkflow(context);

      expect(createWorkspaceWebviewCommandHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelName: 'Create workflow',
        })
      );
    });
  });

  describe('error cases', () => {
    it('throws when the shared selector cannot determine a project root', async () => {
      await expect(createWorkflow(context)).rejects.toThrow('Unable to determine logic app project root.');
      expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
    });

    it('throws when the selected project is no longer present in the workspace project list', async () => {
      vi.mocked(selectLogicAppRoot).mockResolvedValue('D:\\workspace\\MissingProject');
      vi.mocked(getLogicAppRoots).mockResolvedValue([]);

      await expect(createWorkflow(context)).rejects.toThrow('No Logic App project found in the current workspace.');
      expect(createWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
    });
  });
});
