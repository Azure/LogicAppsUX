import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildCustomCodeFunctionsProject, tryBuildCustomCodeFunctionsProjectInternal } from '../buildCustomCodeFunctionsProject';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { window, tasks, Uri } from 'vscode';
import * as customCodeUtils from '../../utils/customCodeUtils';
import { selectCustomCodeRoot } from '../../utils/workspace';
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

vi.mock('../../utils/workspace', () => ({
  selectCustomCodeRoot: vi.fn(),
}));

describe('buildCustomCodeFunctionsProject', () => {
  let context: IActionContext;
  const testWorkspaceFolder = path.join('test', 'workspace', 'folder');
  let executeTaskSpy: any;
  let onDidEndTaskProcessEmitter: MockEventEmitter<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    } as unknown as IActionContext;
    vi.restoreAllMocks();
    vi.mocked(selectCustomCodeRoot).mockResolvedValue(undefined);

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

  it('should throw when no custom code project can be selected', async () => {
    await expect(buildCustomCodeFunctionsProject(context, undefined)).rejects.toThrow(
      'Unable to determine custom code functions project root.'
    );

    expect(selectCustomCodeRoot).toHaveBeenCalledWith(context);
  });

  it('should select and build a custom code project when the provided node is not one', async () => {
    const selectedProjectPath = path.join('test', 'selected-project');
    const mockTask = { name: 'build', scope: { uri: { fsPath: selectedProjectPath } } };
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(false);
    vi.mocked(selectCustomCodeRoot).mockResolvedValue(selectedProjectPath);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue([mockTask]);

    const buildPromise = buildCustomCodeFunctionsProject(context, Uri.file(testWorkspaceFolder));

    setTimeout(() => {
      onDidEndTaskProcessEmitter.fire({ exitCode: 0, execution: { task: mockTask } });
    }, 50);

    await expect(buildPromise).resolves.toBe(true);

    expect(selectCustomCodeRoot).toHaveBeenCalledWith(context);
    expect(context.telemetry.properties.lastStep).toBe('buildCustomCodeProject');
  });

  it('should build a custom code functions project successfully', async () => {
    const projectPath = path.join('test', 'project');
    const mockTask = { name: 'build', scope: { uri: { fsPath: projectPath } } };
    vi.spyOn(customCodeUtils, 'isCustomCodeFunctionsProject').mockResolvedValue(true);
    vi.spyOn(tasks, 'fetchTasks').mockResolvedValue([mockTask]);

    const buildPromise = buildCustomCodeFunctionsProject(context, Uri.file(projectPath));

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

    const buildPromise = buildCustomCodeFunctionsProject(context, Uri.file(projectPath));

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

    const buildPromise = tryBuildCustomCodeFunctionsProjectInternal(context, logicAppPath);

    setTimeout(() => {
      onDidEndTaskProcessEmitter.fire({ exitCode: 0, execution: { task: mockTask } });
    }, 50);

    const result = await buildPromise;

    expect(result).toBe(true);
    expect(context.telemetry.properties.lastStep).toBe('buildLogicAppCustomCodeProjects');
  });
});
