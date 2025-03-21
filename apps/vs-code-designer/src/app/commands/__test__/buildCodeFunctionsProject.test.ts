import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWorkspaceCodeFunctionsProjects } from '../buildCodeFunctionsProject';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { window, tasks, Task } from 'vscode';
import * as workspaceUtils from '../../utils/workspace';
import * as verifyUtils from '../../utils/verifyIsCodeProject';
import { ext } from '../../../extensionVariables';
import path from 'path';

vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
  },
  tasks: {
    fetchTasks: vi.fn(),
    executeTask: vi.fn(),
    onDidEndTaskProcess: vi.fn(),
  },
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('buildWorkspaceCodeFunctionsProjects', () => {
  let context: IActionContext;
  const testWorkspaceFolder = path.join('test', 'workspace', 'folder');
  let executeTaskSpy: any;

  beforeEach(() => {
    context = {} as IActionContext;
    vi.restoreAllMocks();

    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(testWorkspaceFolder);
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(window, 'showWarningMessage').mockImplementation(() => undefined);
    vi.spyOn(window, 'showInformationMessage').mockImplementation(() => undefined);
    executeTaskSpy = vi.spyOn(tasks, 'executeTask').mockResolvedValue(undefined);
  });

  it('should log and return if no custom code functions projects are found', async () => {
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue([]);

    await buildWorkspaceCodeFunctionsProjects(context);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('No custom code functions projects found.');
  });

  it('should build all custom code functions projects successfully', async () => {
    const projectPaths = ['project1', 'project2'];
    const mockTasks = [
      {
        name: 'build',
        scope: { uri: { fsPath: projectPaths[0] } },
      },
      {
        name: 'build',
        scope: { uri: { fsPath: projectPaths[1] } },
      },
    ];
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue(projectPaths);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue(mockTasks);
    let callCount = 0;
    const events = [
      { exitCode: 0, execution: { task: mockTasks[0] } },
      { exitCode: 0, execution: { task: mockTasks[1] } },
    ];
    vi.spyOn(tasks, 'onDidEndTaskProcess').mockImplementation((callback) => {
      callback(events[callCount++]);
      return { dispose: () => {} };
    });

    await buildWorkspaceCodeFunctionsProjects(context);

    for (const projectPath of projectPaths) {
      expect(executeTaskSpy).toHaveBeenCalledTimes(projectPaths.length);
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`Custom code functions project built successfully at ${projectPath}.`);
    }
    expect(ext.outputChannel.appendLog).toHaveBeenCalledTimes(projectPaths.length);
    expect(window.showWarningMessage).not.toHaveBeenCalled();
  });

  it('should handle errors during build for a custom code functions project', async () => {
    const projectPaths = ['projectError'];
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue(projectPaths);

    const mockTasks = [
      {
        name: 'build',
        scope: { uri: { fsPath: projectPaths[0] } },
      },
    ];
    const testBuildError = 'Test build error';
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue(mockTasks);
    vi.spyOn(tasks, 'onDidEndTaskProcess').mockImplementation((callback) => {
      callback({ exitCode: 1, execution: { task: mockTasks[0] } });
      return { dispose: () => {} };
    });

    await buildWorkspaceCodeFunctionsProjects(context);

    const testErrorMessage = `Error building custom code functions project at ${projectPaths[0]}: 1`;
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(testErrorMessage);
    expect(window.showWarningMessage).toHaveBeenCalledWith(testErrorMessage);
    expect(window.showInformationMessage).not.toHaveBeenCalled();
  });
});
