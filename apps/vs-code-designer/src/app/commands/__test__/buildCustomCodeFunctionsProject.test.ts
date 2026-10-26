import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { window, tasks, Uri } from 'vscode';
import * as workspaceUtils from '../../utils/workspace';
import * as customCodeUtils from '../../utils/customCodeUtils';
import { ext } from '../../../extensionVariables';
import path from 'path';

class MockEventEmitter<T> {
  private listeners: ((e: T) => any)[] = [];

  event(listener: (e: T) => any) {
    this.listeners.push(listener);
  }

  fire(event: T): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

vi.mock('vscode', () => ({
  Uri: {
    file: (p: string) => ({ fsPath: p, path: p }),
  },
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

describe('tryBuildCustomCodeFunctionsProject', () => {
  let context: IActionContext;
  const testWorkspaceFolder = path.join('test', 'workspace', 'folder');
  let executeTaskSpy: any;
  let onDidEndTaskProcessEmitter: MockEventEmitter<any>;

  beforeEach(() => {
    context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    } as unknown as IActionContext;
    vi.restoreAllMocks();

    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(testWorkspaceFolder);
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(window, 'showWarningMessage').mockImplementation(() => undefined);
    vi.spyOn(window, 'showInformationMessage').mockImplementation(() => undefined);
    executeTaskSpy = vi.spyOn(tasks, 'executeTask').mockResolvedValue(undefined);
    onDidEndTaskProcessEmitter = new MockEventEmitter<any>();
    vi.spyOn(tasks, 'onDidEndTaskProcess').mockImplementation((callback) => {
      onDidEndTaskProcessEmitter.event(callback);
      return { dispose: () => {} };
    });
  });

  it('should return false when nodePath is null', async () => {
    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(undefined);

    const result = await tryBuildCustomCodeFunctionsProject(context, undefined);

    expect(result).toBe(false);
  });

  it('should return false when not a custom code project and no logic app projects found', async () => {
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(false);
    vi.spyOn(customCodeUtils, 'tryGetLogicAppCustomCodeFunctionsProjects').mockResolvedValue([]);

    const result = await tryBuildCustomCodeFunctionsProject(context, Uri.file(testWorkspaceFolder));

    expect(result).toBe(false);
    expect(context.telemetry.properties.lastStep).toBe('tryGetLogicAppCustomCodeFunctionsProjects');
  });

  it('should build a custom code functions project successfully', async () => {
    const projectPath = path.join('test', 'project');
    const mockTask = { name: 'build', scope: { uri: { fsPath: projectPath } } };
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(true);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue([mockTask]);

    const buildPromise = tryBuildCustomCodeFunctionsProject(context, Uri.file(projectPath));

    setTimeout(() => {
      onDidEndTaskProcessEmitter.fire({ exitCode: 0, execution: { task: mockTask } });
    }, 50);

    const result = await buildPromise;

    expect(result).toBe(true);
    expect(executeTaskSpy).toHaveBeenCalledTimes(1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`Custom code functions project built successfully at ${projectPath}.`);
    expect(context.telemetry.properties.lastStep).toBe('buildCustomCodeProject');
  });

  it('should return false and set telemetry on build failure', async () => {
    const projectPath = path.join('test', 'project');
    const mockTask = { name: 'build', scope: { uri: { fsPath: projectPath } } };
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(true);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue([mockTask]);

    const buildPromise = tryBuildCustomCodeFunctionsProject(context, Uri.file(projectPath));

    setTimeout(() => {
      onDidEndTaskProcessEmitter.fire({ exitCode: 1, execution: { task: mockTask } });
    }, 50);

    const result = await buildPromise;

    expect(result).toBe(false);
    expect(context.telemetry.properties.result).toBe('Failed');
    expect(context.telemetry.properties.errorMessage).toBeDefined();
  });

  it('should build logic app custom code projects when node is not itself a functions project', async () => {
    const logicAppPath = path.join('test', 'logicapp');
    const functionsPath = path.join('test', 'functions');
    const mockTask = { name: 'build', scope: { uri: { fsPath: functionsPath } } };
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(false);
    vi.spyOn(customCodeUtils, 'tryGetLogicAppCustomCodeFunctionsProjects').mockResolvedValue([functionsPath]);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue([mockTask]);

    const buildPromise = tryBuildCustomCodeFunctionsProject(context, Uri.file(logicAppPath));

    setTimeout(() => {
      onDidEndTaskProcessEmitter.fire({ exitCode: 0, execution: { task: mockTask } });
    }, 50);

    const result = await buildPromise;

    expect(result).toBe(true);
    expect(context.telemetry.properties.lastStep).toBe('buildLogicAppCustomCodeProjects');
  });
});
