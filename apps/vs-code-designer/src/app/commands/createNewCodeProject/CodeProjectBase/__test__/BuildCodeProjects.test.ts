import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildCodeProjects } from '../BuildCodeProjects';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { window } from 'vscode';
import * as child_process from 'child_process';
import * as workspaceUtils from '../../../../utils/workspace';
import * as verifyUtils from '../../../../utils/verifyIsCodeProject';
import { ext } from '../../../../../extensionVariables';
import path from 'path';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
  },
}));

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('buildCodeProjects', () => {
  let context: IActionContext;
  const testWorkspaceFolder = path.join('test', 'workspace', 'folder');
  let execSpy: any;

  beforeEach(() => {
    context = {} as IActionContext;
    vi.restoreAllMocks();

    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(testWorkspaceFolder);
    execSpy = vi.spyOn(child_process, 'exec').mockImplementation((cmd, options, callback) => {
      if (callback) callback(null, '', '');
    });
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(window, 'showErrorMessage').mockImplementation(() => undefined);
    vi.spyOn(window, 'showInformationMessage').mockImplementation(() => undefined);
  });

  it('should log and return if no custom code functions projects are found', async () => {
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue([]);

    await buildCodeProjects(context);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('No custom code functions projects found.');
    expect(execSpy).not.toHaveBeenCalled();
  });

  it('should build all custom code functions projects successfully', async () => {
    const projectPaths = ['project1', 'project2'];
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue(projectPaths);

    execSpy.mockImplementation((cmd, options, callback) => {
      callback(null, 'build successful', '');
      return {} as child_process.ChildProcess;
    });

    await buildCodeProjects(context);

    for (const projectPath of projectPaths) {
      expect(execSpy).toHaveBeenCalledWith('dotnet restore && dotnet build', { cwd: projectPath }, expect.any(Function));
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`Custom code functions project built successfully at ${projectPath}.`);
    }
    expect(window.showInformationMessage).toHaveBeenCalledTimes(projectPaths.length);
  });

  it('should handle errors during build for a custom code functions project', async () => {
    const projectPaths = ['projectError'];
    vi.spyOn(verifyUtils, 'tryGetCustomCodeFunctionsProjects').mockResolvedValue(projectPaths);

    const testBuildError = new Error('build failed');

    execSpy.mockImplementation((cmd, options, callback) => {
      callback(testBuildError, '', 'build failed');
      return {} as child_process.ChildProcess;
    });

    await expect(buildCodeProjects(context)).rejects.toBe(testBuildError);

    const testErrorMessage = `Error building custom code functions project at ${projectPaths[0]}: ${testBuildError}`;
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(testErrorMessage);
    expect(window.showErrorMessage).toHaveBeenCalledWith(testErrorMessage);
  });
});
