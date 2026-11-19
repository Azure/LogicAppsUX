import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import type { IRunningFuncTask } from '../../utils/funcCoreTools/funcHostTask';
import * as findChildProcessModule from '../../utils/findChildProcess/findChildProcess';

// Mock ps-tree to prevent spawning `ps` on Windows hosts.
vi.mock('ps-tree', () => ({
  default: vi.fn((_pid: number, callback: (err: Error | null, result: any[]) => void) => {
    callback(null, []);
  }),
}));

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  sendRequestWithTimeout: vi.fn(),
}));

vi.mock('../../debug/validatePreDebug', () => ({
  getMatchingWorkspaceFolder: vi.fn(),
  preDebugValidate: vi.fn(),
}));

vi.mock('../../utils/appSettings/connectionKeys', () => ({
  refreshConnectionKeys: vi.fn(),
}));

vi.mock('../../utils/azurite/activateAzurite', () => ({
  activateAzurite: vi.fn(),
}));

vi.mock('../../utils/dotnet/dotnet', () => ({
  getProjFiles: vi.fn(),
}));

vi.mock('../../utils/funcCoreTools/funcHostTask', () => ({
  getRunningFuncTaskForWorkspace: vi.fn(),
  getFuncPortFromTaskOrProject: vi.fn(),
  isFuncHostTask: vi.fn(),
  runningFuncTaskMap: new Map(),
  scopeMatchesWorkspace: vi.fn(),
  stopFuncTaskForWorkspace: vi.fn(),
}));

vi.mock('../../utils/taskUtils', () => ({
  executeIfNotActive: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  UserCancelledError: class UserCancelledError extends Error {
    constructor() {
      super('Operation cancelled');
    }
  },
  callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true, rethrow: true, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    return await callback(context);
  }),
}));

vi.mock('../../utils/delay', () => ({
  delay: vi.fn(),
}));

vi.mock('../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
}));

vi.mock('../../utils/codeful', () => ({
  hasCodefulWorkflowSetting: vi.fn(),
}));

vi.mock('../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProject: vi.fn(),
}));

vi.mock('../publishCodefulProject', () => ({
  publishCodefulProject: vi.fn(),
}));

import { sendRequestWithTimeout } from '@microsoft/vscode-azext-azureutils';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { getProjFiles } from '../../utils/dotnet/dotnet';
import {
  getFuncPortFromTaskOrProject,
  getRunningFuncTaskForWorkspace,
  runningFuncTaskMap,
  scopeMatchesWorkspace,
  stopFuncTaskForWorkspace,
} from '../../utils/funcCoreTools/funcHostTask';
import { executeIfNotActive } from '../../utils/taskUtils';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import * as pickFuncProcessModule from '../pickFuncProcess';
import { publishCodefulProject } from '../publishCodefulProject';
import { refreshConnectionKeys } from '../../utils/appSettings/connectionKeys';
import { delay } from '../../utils/delay';
import { getExperimentalBundleRuntime } from '../../utils/bundleFeed';
import { activateAzurite } from '../../utils/azurite/activateAzurite';
import { generateTasksJson } from '../../projectConsistency/fileGenerators/vscodeTasks';
import { ProjectPackageType, ProjectType } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../utils/bundleFeed', () => ({
  getExperimentalBundleRuntime: vi.fn(),
}));

let originalPlatform: NodeJS.Platform;
let originalKill: typeof process.kill;

function setProcessPlatform(platform: NodeJS.Platform): void {
  originalPlatform = process.platform;
  originalKill = process.kill;
  Object.defineProperty(process, 'platform', { value: platform, writable: true, configurable: true });
  // Mock process.kill so isRunning() returns true for any PID in tests
  process.kill = vi.fn() as any;
}

function restoreProcessPlatform(): void {
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true, configurable: true });
  process.kill = originalKill;
}

// Model the relevant VS Code 1.105 Task/executeTask contract, not plain objects:
// extHostTypes.Task.clear() drops _id AND scope on execution/definition assignment;
// node/extHostTask.executeTask serializes only a saved handle while _id is present.
// https://github.com/microsoft/vscode/blob/1.105.0/src/vs/workbench/api/common/extHostTypes.ts
// https://github.com/microsoft/vscode/blob/1.105.0/src/vs/workbench/api/node/extHostTask.ts
class ApiTask {
  _id?: string;
  private taskScope: vscode.WorkspaceFolder | undefined;
  private taskExecution: vscode.Task['execution'];
  private taskDefinition: vscode.TaskDefinition;
  isBackground = false;
  group?: vscode.TaskGroup;
  presentationOptions: vscode.TaskPresentationOptions = {};
  runOptions: vscode.RunOptions = {};
  detail?: string;

  constructor(
    definition: vscode.TaskDefinition,
    scope: vscode.WorkspaceFolder,
    public name: string,
    public source: string,
    execution: vscode.Task['execution'],
    public problemMatchers: string[] = []
  ) {
    this.taskDefinition = definition;
    this.taskScope = scope;
    this.taskExecution = execution;
  }

  private clearSavedHandle() {
    if (this._id !== undefined) {
      this._id = undefined;
      this.taskScope = undefined;
    }
  }

  get scope() {
    return this.taskScope;
  }
  get definition() {
    return this.taskDefinition;
  }
  set definition(value: vscode.TaskDefinition) {
    this.clearSavedHandle();
    this.taskDefinition = value;
  }
  get execution() {
    return this.taskExecution;
  }
  set execution(value: vscode.Task['execution']) {
    this.clearSavedHandle();
    this.taskExecution = value;
  }
}

class ApiShellExecution {
  commandLine?: string;
  command?: string | vscode.ShellQuotedString;
  args: Array<string | vscode.ShellQuotedString> = [];
  options?: vscode.ShellExecutionOptions;

  constructor(
    command: string | vscode.ShellQuotedString,
    argsOrOptions?: Array<string | vscode.ShellQuotedString> | vscode.ShellExecutionOptions,
    options?: vscode.ShellExecutionOptions
  ) {
    if (Array.isArray(argsOrOptions)) {
      this.command = command;
      this.args = argsOrOptions;
      this.options = options;
    } else {
      this.commandLine = command as string;
      this.options = argsOrOptions;
    }
  }
}

function serializeTask(task: vscode.Task) {
  const savedId = (task as unknown as ApiTask)._id;
  // VS Code sends no execution/options at all when a fetched task retains its id.
  return savedId
    ? { kind: 'handle', id: savedId, scope: task.scope }
    : {
        kind: 'task',
        scope: task.scope,
        execution: task.execution,
        env: (task.execution as vscode.ProcessExecution | vscode.ShellExecution)?.options?.env,
      };
}

describe('pickFuncProcessInternal', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  const workspaceFolder = { uri: { fsPath: projectPath }, name: 'CodefulLogicApp', index: 0 } as vscode.WorkspaceFolder;
  const funcTask = {
    name: 'func: host start',
    scope: workspaceFolder,
    definition: { command: 'func host start --port 7071' },
  } as vscode.Task;
  const debugTask = {
    name: 'generateDebugSymbols',
    scope: workspaceFolder,
    definition: { command: 'dotnet path/to/debugsymbol.dll' },
  } as vscode.Task;
  const context: any = {
    telemetry: { properties: {}, measurements: {} },
    errorHandling: {},
  };
  const originalTaskConstructor = Object.getOwnPropertyDescriptor(vscode, 'Task')?.value;
  const originalShellConstructor = vscode.ShellExecution;
  let taskConfigurations: Array<Record<string, unknown>>;
  const fetchedTask = (name: string, execution: vscode.Task['execution']): vscode.Task => {
    const task = new ApiTask(
      { type: execution instanceof vscode.ProcessExecution ? 'process' : 'shell' },
      workspaceFolder,
      name,
      'Workspace',
      execution
    );
    task._id = `saved:${name}`;
    return task as unknown as vscode.Task;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(getExperimentalBundleRuntime).mockReset();
    funcTask.execution = undefined;
    debugTask.execution = undefined;
    setProcessPlatform('linux');
    context.telemetry = { properties: {}, measurements: {} };
    context.errorHandling = {};
    runningFuncTaskMap.clear();
    (preDebugValidate as any).mockResolvedValue(true);
    (hasCodefulWorkflowSetting as any).mockResolvedValue(true);
    (tryBuildCustomCodeFunctionsProject as any).mockResolvedValue(true);
    (publishCodefulProject as any).mockResolvedValue(undefined);
    (getProjFiles as any).mockResolvedValue(['CodefulLogicApp.csproj']);
    (getWorkspaceSetting as any).mockReturnValue(1);
    (getFuncPortFromTaskOrProject as any).mockResolvedValue('7071');
    (stopFuncTaskForWorkspace as any).mockResolvedValue(false);
    (scopeMatchesWorkspace as any).mockImplementation((scope: vscode.WorkspaceFolder | undefined, folder: vscode.WorkspaceFolder) => {
      return scope === folder || scope?.uri?.fsPath === folder.uri.fsPath;
    });
    (getRunningFuncTaskForWorkspace as any).mockImplementation((folder: vscode.WorkspaceFolder) => runningFuncTaskMap.get(folder));
    (sendRequestWithTimeout as any).mockResolvedValue({ parsedBody: { state: 'Running' } });
    (executeIfNotActive as any).mockImplementation(async () => {
      runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 1234 });
    });
    (vscode.EventEmitter as any).mockImplementation(() => ({ fire: vi.fn() }));
    Object.assign(vscode, { Task: ApiTask, ShellExecution: ApiShellExecution });
    taskConfigurations = [
      { label: funcTask.name, type: 'shell' },
      { label: debugTask.name, type: 'process' },
    ];
    vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn((key) => (key === 'tasks' ? taskConfigurations : undefined)),
    } as any);
    (vscode.tasks as any) = {
      fetchTasks: vi.fn().mockResolvedValue([funcTask]),
      executeTask: vi.fn().mockResolvedValue(undefined),
      onDidEndTaskProcess: vi.fn(() => ({ dispose: vi.fn() })),
    };
  });

  it('reproduces saved-handle serialization and scope invalidation from the real Task API', () => {
    const task = fetchedTask('func: host start', new vscode.ProcessExecution('func', ['host', 'start']));
    (task.execution as vscode.ProcessExecution).options = { env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'ignored' } };
    expect(serializeTask(task)).toEqual({ kind: 'handle', id: 'saved:func: host start', scope: workspaceFolder });
    task.execution = new vscode.ProcessExecution('func', ['host', 'start']);
    expect((task as unknown as ApiTask)._id).toBeUndefined();
    expect(task.scope).toBeUndefined();
  });

  it.each(['shell', 'shell-command', 'process'])(
    'passes the selected runtime binding to the actual %s task execution without persisting it',
    async (kind) => {
      vi.mocked(getProjFiles).mockResolvedValue([]);
      const execution =
        kind === 'shell'
          ? new vscode.ShellExecution('func host start', { env: { PATH: 'preserved-path', OTHER: 'preserved' } })
          : kind === 'shell-command'
            ? new vscode.ShellExecution('func', ['host', 'start'], {
                cwd: 'original-cwd',
                env: { PATH: 'preserved-path', OTHER: 'preserved' },
              })
            : new vscode.ProcessExecution('func', ['host', 'start'], { env: { PATH: 'preserved-path', OTHER: 'preserved' } });
      const savedHost = fetchedTask(funcTask.name, execution);
      taskConfigurations[0].type = kind === 'process' ? 'process' : 'shell';
      savedHost.isBackground = true;
      savedHost.presentationOptions = { reveal: 3 };
      savedHost.runOptions = { reevaluateOnRerun: false };
      savedHost.detail = 'original task';
      savedHost.group = { id: 'build', isDefault: true } as vscode.TaskGroup;
      savedHost.problemMatchers = ['$func-watch'];
      vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost]);
      const binding = {
        directory: 'synthetic-cache',
        folderVersion: '1.197.13',
        manifestVersion: '1.197.0.13',
        env: {
          FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/synthetic-selection',
          AzureFunctionsJobHost__extensionBundle__version: '[1.197.13]',
        },
      };
      vi.mocked(getExperimentalBundleRuntime).mockResolvedValue(binding);
      vi.mocked(executeIfNotActive).mockImplementation(async (task) => {
        expect(task).not.toBe(savedHost);
        expect(serializeTask(task)).toMatchObject({
          kind: 'task',
          scope: workspaceFolder,
          env: { PATH: 'preserved-path', OTHER: 'preserved', ...binding.env },
        });
        expect(task.isBackground).toBe(true);
        expect(task.presentationOptions).toEqual(savedHost.presentationOptions);
        expect(task.runOptions).toEqual(savedHost.runOptions);
        expect(task.group).toEqual(savedHost.group);
        expect(task.detail).toBe(savedHost.detail);
        expect(task.problemMatchers).toEqual(savedHost.problemMatchers);
        if (kind === 'shell-command') {
          expect((task.execution as vscode.ShellExecution).command).toBe('func');
          expect((task.execution as vscode.ShellExecution).args).toEqual(['host', 'start']);
          expect((task.execution as vscode.ShellExecution).options?.cwd).toBe('original-cwd');
        }
        throw new Error('test stopped at actual task boundary');
      });

      await expect(
        pickFuncProcessModule.pickFuncProcessInternal(
          context,
          { type: 'logicapp', preLaunchTask: funcTask.name, noDebug: true },
          workspaceFolder,
          projectPath
        )
      ).rejects.toThrow('test stopped at actual task boundary');
      expect(getExperimentalBundleRuntime).toHaveBeenCalledWith(context, projectPath);
      expect(executeIfNotActive).toHaveBeenCalledOnce();
      expect(serializeTask(savedHost)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
      expect(execution.options?.env).toEqual({ PATH: 'preserved-path', OTHER: 'preserved' });
    }
  );

  it.each([
    { hasFuncBinaries: true, isDevContainer: false, noDebug: false },
    { hasFuncBinaries: true, isDevContainer: false, noDebug: true },
    { hasFuncBinaries: false, isDevContainer: false, noDebug: false },
    { hasFuncBinaries: false, isDevContainer: false, noDebug: true },
    { hasFuncBinaries: false, isDevContainer: true, noDebug: false },
    { hasFuncBinaries: false, isDevContainer: true, noDebug: true },
  ])('binds the actual generated Bundle default: %j', async ({ hasFuncBinaries, isDevContainer, noDebug }) => {
    const generated = generateTasksJson({
      projectType: ProjectType.logicApp,
      projectPackageType: ProjectPackageType.Bundle,
      hasFuncBinaries,
      isDevContainer,
    });
    taskConfigurations = generated.tasks;
    const hostConfiguration = generated.tasks.find((task) => task.label === funcTask.name)!;
    const symbolConfiguration = generated.tasks.find((task) => task.label === debugTask.name)!;
    expect(hostConfiguration.dependsOn).toBeUndefined();
    expect(symbolConfiguration.dependsOn).toBeUndefined();
    expect(hostConfiguration.type).toBe(hasFuncBinaries ? 'shell' : 'func');
    expect(symbolConfiguration.type).toBe('process');
    const options = (hostConfiguration.linux as { options?: vscode.ShellExecutionOptions } | undefined)?.options ??
      (hostConfiguration.options as vscode.ShellExecutionOptions | undefined) ?? {
        cwd: projectPath,
        env: { AzureWebJobsStorage: 'UseDevelopmentStorage=true' },
      };
    // The Functions provider resolves its generated command to a ShellExecution.
    const execution = hasFuncBinaries
      ? new vscode.ShellExecution(hostConfiguration.command as string, hostConfiguration.args as string[], options)
      : new vscode.ShellExecution('func', ['host', 'start'], options);
    const host = new ApiTask({ type: hostConfiguration.type as string }, workspaceFolder, funcTask.name, 'Workspace', execution);
    host.isBackground = true;
    host._id = 'saved:generated-host';
    const symbols = fetchedTask(
      debugTask.name,
      new vscode.ProcessExecution(symbolConfiguration.command as string, symbolConfiguration.args as string[])
    );
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([host as unknown as vscode.Task, symbols]);
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(hasCodefulWorkflowSetting).mockResolvedValue(false);
    const stages: string[] = [];
    vi.mocked(activateAzurite).mockImplementation(async () => {
      stages.push('azurite');
    });
    vi.mocked(refreshConnectionKeys).mockImplementation(async () => {
      stages.push('keys');
    });
    vi.mocked(preDebugValidate).mockImplementation(async () => {
      stages.push('predebug');
      return true;
    });
    vi.mocked(tryBuildCustomCodeFunctionsProject).mockImplementation(async () => {
      stages.push('custom-code-build');
      return true;
    });
    const environment = {
      FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/generated-default',
      AzureFunctionsJobHost__extensionBundle__id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
      AzureFunctionsJobHost__extensionBundle__version: '[1.197.13]',
      AzureFunctionsJobHost__extensionBundle__downloadPath: 'selected-cache',
    };
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: environment,
    });
    const listeners = new Set<(event: vscode.TaskProcessEndEvent) => void>();
    vi.mocked(vscode.tasks.onDidEndTaskProcess).mockImplementation((listener) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    });
    vi.mocked(vscode.tasks.executeTask).mockImplementation(async (task) => {
      expect(task.name).toBe(debugTask.name);
      expect(serializeTask(task)).toMatchObject({ kind: 'task', scope: workspaceFolder });
      expect((task.execution as vscode.ProcessExecution).args[0]).toMatch(/selected-cache[/\\]bin[/\\]/);
      stages.push('symbols');
      for (const listener of listeners) {
        listener({ execution: { task }, exitCode: 0 } as vscode.TaskProcessEndEvent);
      }
      return { task, terminate: vi.fn() };
    });
    vi.mocked(executeIfNotActive).mockImplementation(async (task) => {
      expect(serializeTask(task)).toMatchObject({
        kind: 'task',
        scope: workspaceFolder,
        env: { ...options?.env, ...environment },
      });
      expect(task.definition.type).toBe('shell');
      expect((task.execution as vscode.ShellExecution).args).toEqual(['host', 'start']);
      expect((task.execution as vscode.ShellExecution).options?.cwd).toBe(options.cwd);
      expect(task.isBackground).toBe(true);
      stages.push('host');
      throw new Error('generated default bound host reached');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name, noDebug },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('generated default bound host reached');
    expect(stages).toEqual(['azurite', 'keys', 'predebug', 'custom-code-build', ...(noDebug ? [] : ['symbols']), 'host']);
    expect(serializeTask(host as unknown as vscode.Task)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
    expect(serializeTask(symbols)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
    expect(listeners.size).toBe(0);
  });

  it.each([
    { projectType: ProjectType.logicApp, hasFuncBinaries: true },
    { projectType: ProjectType.logicApp, hasFuncBinaries: false },
    { projectType: ProjectType.codeful, hasFuncBinaries: true },
    { projectType: ProjectType.codeful, hasFuncBinaries: false },
  ])('retains the generated NuGet/codeful dependency graph: %j', async ({ projectType, hasFuncBinaries }) => {
    const generated = generateTasksJson({
      projectType,
      projectPackageType: ProjectPackageType.Nuget,
      hasFuncBinaries,
    });
    taskConfigurations = generated.tasks;
    expect(generated.tasks.find((task) => task.label === funcTask.name)?.dependsOn).toBe('build');
    expect(generated.tasks.find((task) => task.label === 'build')?.dependsOn).toBe('clean');
    expect(generated.tasks.find((task) => task.label === 'publish')?.dependsOn).toBe('clean release');
    const host = fetchedTask(funcTask.name, new vscode.ShellExecution('func', ['host', 'start']));
    vi.mocked(hasCodefulWorkflowSetting).mockResolvedValue(projectType === ProjectType.codeful);
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([host]);
    vi.mocked(executeIfNotActive).mockImplementation(async (task) => {
      expect(task).toBe(host);
      expect(serializeTask(task)).toEqual({ kind: 'handle', id: 'saved:func: host start', scope: workspaceFolder });
      throw new Error('original dependency graph retained');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name, noDebug: true },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('original dependency graph retained');
    expect(getExperimentalBundleRuntime).not.toHaveBeenCalled();
    expect(publishCodefulProject).toHaveBeenCalledTimes(projectType === ProjectType.codeful ? 1 : 0);
    expect(tryBuildCustomCodeFunctionsProject).toHaveBeenCalledTimes(projectType === ProjectType.codeful ? 0 : 1);
    expect(taskConfigurations).toEqual(generated.tasks);
  });

  it('does not execute a task when experimental resolution fails', async () => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(getExperimentalBundleRuntime).mockRejectedValue(new Error('selected bundle invalid'));
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('selected bundle invalid');
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it('rejects unsupported task execution rather than starting an unbound experimental host', async () => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'synthetic-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: {},
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('require a shell or process');
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });
  afterEach(() => {
    runningFuncTaskMap.clear();
    Object.assign(vscode, { Task: originalTaskConstructor, ShellExecution: originalShellConstructor });
    vi.restoreAllMocks();
    restoreProcessPlatform();
  });

  it('serializes a workspace-scoped selected debug-symbol task without mutating fetched handles', async () => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    const execution = new vscode.ProcessExecution('dotnet', ['${input:getDebugSymbolDll}'], { env: { OTHER: 'preserved' } });
    const savedSymbols = fetchedTask(debugTask.name, execution);
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost, savedSymbols]);
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.170.91',
      manifestVersion: '1.170.91',
      env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/selected' },
    });
    vi.mocked(vscode.tasks.executeTask).mockImplementation(async (task) => {
      expect(task).not.toBe(savedSymbols);
      expect(serializeTask(task)).toMatchObject({ kind: 'task', scope: workspaceFolder, env: { OTHER: 'preserved' } });
      expect(task.execution).toBeInstanceOf(vscode.ProcessExecution);
      const selectedExecution = task.execution as vscode.ProcessExecution;
      expect(selectedExecution.args[0]).toMatch(
        /selected-cache[/\\]bin[/\\]Microsoft.Azure.Workflows.BuildTasks.DebugSymbolGenerator.dll$/
      );
      expect(selectedExecution.options?.env).toEqual({ OTHER: 'preserved' });
      throw new Error('test stopped at debug-symbol task boundary');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('test stopped at debug-symbol task boundary');
    expect(savedSymbols.execution).toBe(execution);
    expect(serializeTask(savedSymbols)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
    expect(serializeTask(savedHost)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
  });

  it('accepts immediate symbol completion only from the selected workspace and reaches the bound host', async () => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    const savedSymbols = fetchedTask(debugTask.name, new vscode.ProcessExecution('dotnet', ['${input:getDebugSymbolDll}']));
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost, savedSymbols]);
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/selected' },
    });
    const listeners = new Set<(event: vscode.TaskProcessEndEvent) => void>();
    vi.mocked(vscode.tasks.onDidEndTaskProcess).mockImplementation((listener) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    });
    vi.mocked(vscode.tasks.executeTask).mockImplementation(async (task) => {
      expect(serializeTask(task)).toMatchObject({ kind: 'task', scope: workspaceFolder });
      expect(listeners.size).toBe(1);
      const otherFolder = { ...workspaceFolder, uri: { fsPath: 'D:\\workspace\\OtherApp' } } as vscode.WorkspaceFolder;
      const otherTask = new ApiTask(task.definition, otherFolder, task.name, task.source, task.execution);
      for (const listener of listeners) {
        listener({ execution: { task: otherTask }, exitCode: 0 } as unknown as vscode.TaskProcessEndEvent);
      }
      await Promise.resolve();
      expect(executeIfNotActive).not.toHaveBeenCalled();
      expect(listeners.size).toBe(1);
      // A process can finish before executeTask's promise resolves.
      for (const listener of listeners) {
        listener({ execution: { task }, exitCode: 0 } as vscode.TaskProcessEndEvent);
      }
      return { task, terminate: vi.fn() };
    });
    vi.mocked(executeIfNotActive).mockImplementation(async (task) => {
      expect(serializeTask(task)).toMatchObject({
        kind: 'task',
        scope: workspaceFolder,
        env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/selected' },
      });
      throw new Error('reached bound host after symbol completion');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('reached bound host after symbol completion');
    expect(listeners.size).toBe(0);
    expect(serializeTask(savedSymbols)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
  });

  it('leaves custom symbol commands and their saved dependency graph caller-owned', async () => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    const savedSymbols = fetchedTask(debugTask.name, new vscode.ProcessExecution('dotnet', ['custom-symbol-generator.dll']));
    taskConfigurations[1].dependsOn = 'custom-setup';
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost, savedSymbols]);
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: {},
    });
    const dispose = vi.fn();
    vi.mocked(vscode.tasks.onDidEndTaskProcess).mockReturnValue({ dispose });
    vi.mocked(vscode.tasks.executeTask).mockImplementation(async (task) => {
      expect(task).toBe(savedSymbols);
      expect(serializeTask(task)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
      throw new Error('original custom symbol graph');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('original custom symbol graph');
    expect(dispose).toHaveBeenCalledOnce();
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'host string', label: 'func: host start', extra: { dependsOn: 'build' } },
    { name: 'host array', label: 'func: host start', extra: { dependsOn: ['clean', 'build'], dependsOrder: 'sequence' } },
    { name: 'host platform', label: 'func: host start', extra: { linux: { dependsOn: 'startAzurite' } } },
    { name: 'symbols', label: 'generateDebugSymbols', extra: { dependsOn: 'build' } },
  ])('refuses to silently drop the configured $name dependency graph', async ({ label, extra }) => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    const savedSymbols = fetchedTask(debugTask.name, new vscode.ProcessExecution('dotnet', ['${input:getDebugSymbolDll}']));
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost, savedSymbols]);
    taskConfigurations = taskConfigurations.map((configuration) =>
      configuration.label === label ? { ...configuration, ...extra } : configuration
    );
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: {},
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('with dependsOn without losing its prerequisites');
    expect(executeIfNotActive).not.toHaveBeenCalled();
    expect(vscode.tasks.executeTask).not.toHaveBeenCalled();
    expect(serializeTask(savedHost)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
    expect(serializeTask(savedSymbols)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
  });

  it.each(['missing', 'provider'])('fails closed for %s task configurations whose prerequisites cannot be verified', async (kind) => {
    vi.mocked(getProjFiles).mockResolvedValue([]);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost]);
    taskConfigurations = kind === 'missing' ? [] : [{ label: funcTask.name, type: 'func' }];
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'selected-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: {},
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name, noDebug: true },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('explicit workspace shell or process task');
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it.each(['nuget', 'nonexperimental-bundle'])('preserves the original saved dependency graph for %s', async (kind) => {
    vi.mocked(getProjFiles).mockResolvedValue(kind === 'nuget' ? ['app.csproj'] : []);
    const savedHost = fetchedTask(funcTask.name, new vscode.ProcessExecution('func', ['host', 'start']));
    taskConfigurations[0].dependsOn = ['build', 'startAzurite'];
    vi.mocked(vscode.tasks.fetchTasks).mockResolvedValue([savedHost]);
    vi.mocked(executeIfNotActive).mockImplementation(async (task) => {
      expect(task).toBe(savedHost);
      expect(serializeTask(task)).toMatchObject({ kind: 'handle', scope: workspaceFolder });
      throw new Error('saved dependency graph delegated to VS Code');
    });
    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', preLaunchTask: funcTask.name, noDebug: true },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('saved dependency graph delegated to VS Code');
    expect(vscode.workspace.getConfiguration).not.toHaveBeenCalled();
    expect(preDebugValidate).toHaveBeenCalled();
    expect(publishCodefulProject).toHaveBeenCalled();
  });

  it('codeful project skips custom code build', async () => {
    (vscode.tasks.fetchTasks as any).mockResolvedValue([]);

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('Failed to find "func: host start" task.');

    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(projectPath);
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
    expect(publishCodefulProject).toHaveBeenCalledWith(expect.any(Object), workspaceFolder.uri, { skipIfBuildPopulatesCodeful: true });
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it('custom code project skips codeful publish', async () => {
    (hasCodefulWorkflowSetting as any).mockResolvedValue(false);
    (vscode.tasks.fetchTasks as any).mockResolvedValue([]);

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('Failed to find "func: host start" task.');

    expect(hasCodefulWorkflowSetting).toHaveBeenCalledWith(projectPath);
    expect(tryBuildCustomCodeFunctionsProject).toHaveBeenCalledWith(expect.any(Object), workspaceFolder.uri);
    expect(publishCodefulProject).not.toHaveBeenCalled();
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it('stops a previous func task before codeful publish', async () => {
    const events: string[] = [];
    (stopFuncTaskForWorkspace as any).mockImplementation(async () => {
      expect(publishCodefulProject).not.toHaveBeenCalled();
      events.push('stop-func');
    });
    (publishCodefulProject as any).mockImplementation(async () => {
      events.push('publish-codeful');
    });
    (vscode.tasks.fetchTasks as any).mockResolvedValue([]);

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('Failed to find "func: host start" task.');

    expect(stopFuncTaskForWorkspace).toHaveBeenCalledWith(workspaceFolder);
    expect(events).toEqual(['stop-func', 'publish-codeful']);
  });

  it('stops a previous func task before custom code build', async () => {
    const events: string[] = [];
    (hasCodefulWorkflowSetting as any).mockResolvedValue(false);
    (stopFuncTaskForWorkspace as any).mockImplementation(async () => {
      expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
      events.push('stop-func');
    });
    (tryBuildCustomCodeFunctionsProject as any).mockImplementation(async () => {
      events.push('build-custom-code');
    });
    (vscode.tasks.fetchTasks as any).mockResolvedValue([]);

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('Failed to find "func: host start" task.');

    expect(stopFuncTaskForWorkspace).toHaveBeenCalledWith(workspaceFolder);
    expect(events).toEqual(['stop-func', 'build-custom-code']);
  });

  it('starts the func task after publishing and returns the tracked workflow process id', async () => {
    (getProjFiles as any).mockImplementation(async () => {
      runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 1234 });
      return ['CodefulLogicApp.csproj'];
    });

    const result = await pickFuncProcessModule.pickFuncProcessInternal(
      context,
      { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
      workspaceFolder,
      projectPath
    );

    expect(result).toBe('1234');
    expect(vscode.tasks.fetchTasks).toHaveBeenCalled();
    expect(executeIfNotActive).toHaveBeenCalledWith(funcTask);
    expect(sendRequestWithTimeout).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ url: 'http://localhost:7071/admin/host/status' }),
      500,
      undefined
    );
  });

  it('waits for the func host task process to start before applying the host status timeout', async () => {
    (executeIfNotActive as any).mockResolvedValue(undefined);
    let delayCount = 0;
    (delay as any).mockImplementation(async () => {
      delayCount += 1;
      if (delayCount === 2) {
        runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 5678 });
      }
    });

    const result = await pickFuncProcessModule.pickFuncProcessInternal(
      context,
      { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
      workspaceFolder,
      projectPath
    );

    expect(result).toBe('5678');
    expect(sendRequestWithTimeout).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ url: 'http://localhost:7071/admin/host/status' }),
      500,
      undefined
    );
  });

  it('starts generateDebugSymbols for codeless NuGet launch configurations', async () => {
    (vscode.tasks.fetchTasks as any).mockResolvedValue([funcTask, debugTask]);
    (vscode.tasks.executeTask as any).mockResolvedValue(undefined);
    (vscode.tasks.onDidEndTaskProcess as any).mockImplementation((callback: (event: any) => void) => {
      setTimeout(() => callback({ execution: { task: debugTask }, exitCode: 0 }), 0);
      return { dispose: vi.fn() };
    });

    const result = await pickFuncProcessModule.pickFuncProcessInternal(
      context,
      { type: 'logicapp', isCodeless: true, preLaunchTask: 'func: host start' },
      workspaceFolder,
      projectPath
    );

    expect(result).toBe('1234');
    expect(vscode.tasks.executeTask).toHaveBeenCalledWith(debugTask);
    expect(executeIfNotActive).toHaveBeenCalledWith(funcTask);
  });

  it('stops before build and publish when pre-debug validation is cancelled', async () => {
    (preDebugValidate as any).mockResolvedValue(false);

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(context, { type: 'logicapp' }, workspaceFolder, projectPath)
    ).rejects.toThrow('Operation cancelled');

    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
    expect(publishCodefulProject).not.toHaveBeenCalled();
  });

  it('surfaces an invalid pick-process timeout before starting debug tasks', async () => {
    (getWorkspaceSetting as any).mockReturnValue('not-a-number');

    await expect(
      pickFuncProcessModule.pickFuncProcessInternal(
        context,
        { type: 'logicapp', isCodeless: false, preLaunchTask: 'func: host start' },
        workspaceFolder,
        projectPath
      )
    ).rejects.toThrow('The setting "pickProcessTimeout" must be a number');

    expect(publishCodefulProject).toHaveBeenCalledWith(expect.any(Object), workspaceFolder.uri, { skipIfBuildPopulatesCodeful: true });
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });
});

describe('pickFuncProcess', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  const workspaceFolder = { uri: { fsPath: projectPath }, name: 'CodefulLogicApp', index: 0 } as vscode.WorkspaceFolder;

  beforeEach(() => {
    vi.restoreAllMocks();
    (tryGetLogicAppProjectRoot as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the Logic App project root cannot be found', async () => {
    const { getMatchingWorkspaceFolder } = await import('../../debug/validatePreDebug');
    (getMatchingWorkspaceFolder as any).mockReturnValue(workspaceFolder);

    await expect(pickFuncProcessModule.pickFuncProcess({ telemetry: { properties: {} } } as any, { type: 'logicapp' })).rejects.toThrow(
      'Unable to find the project root.'
    );
  });
});

describe('pickWorkflowDebugProcess', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (vscode.window as any).activeTerminal = undefined;
    vi.mocked(ext.outputChannel.appendLog).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreProcessPlatform();
  });

  it('should prefer the deeper Windows host child when one exists', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === 100) {
        return [{ processId: 111, name: 'func.exe', parentProcessId: 100 }];
      }
      if (pid === 111) {
        return [{ processId: 222, name: 'dotnet.exe', parentProcessId: 111 }];
      }
      return [];
    });

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, true);

    expect(result).toBe('222');
    expect(taskInfo.childProcessId).toEqual(['111', '222']);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('selectedPid=222'));
  });

  it('should fall back to the immediate Windows child when no deeper host child exists', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === 100) {
        return [{ processId: 111, name: 'func.exe', parentProcessId: 100 }];
      }
      if (pid === 111) {
        return [{ processId: 333, name: 'conhost.exe', parentProcessId: 111 }];
      }
      return [];
    });

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, true);

    expect(result).toBe('111');
    expect(taskInfo.childProcessId).toEqual(['111', undefined]);
  });

  it('should keep the immediate Windows child when host-child preference is disabled', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === 100) {
        return [{ processId: 111, name: 'func.exe', parentProcessId: 100 }];
      }
      if (pid === 111) {
        return [{ processId: 222, name: 'dotnet.exe', parentProcessId: 111 }];
      }
      return [];
    });

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, false);

    expect(result).toBe('111');
    expect(taskInfo.childProcessId).toEqual(['111', '222']);
  });

  it('should fall back to the tracked task pid when no workflow child process matches', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockResolvedValue([{ processId: 444, name: 'node.exe', parentProcessId: 100 }]);

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo);

    expect(result).toBe('100');
    expect(taskInfo.childProcessId).toEqual(['100', undefined]);
  });

  it('should fall back to the active terminal pid when the tracked Windows task pid has no workflow child', async () => {
    setProcessPlatform('win32');
    (vscode.window as any).activeTerminal = {
      processId: Promise.resolve(300),
    };

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === 100) {
        return [];
      }
      if (pid === 300) {
        return [{ processId: 111, name: 'func.exe', parentProcessId: 300 }];
      }
      if (pid === 111) {
        return [{ processId: 222, name: 'dotnet.exe', parentProcessId: 111 }];
      }
      return [];
    });

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, true);

    expect(result).toBe('222');
    expect(taskInfo.processId).toBe(300);
    expect(taskInfo.childProcessId).toEqual(['111', '222']);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Falling back from tracked task PID "100" to active terminal PID "300"')
    );
  });

  it('should keep the immediate child selection on non-Windows hosts', async () => {
    setProcessPlatform('linux');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    // ps-tree returns all descendants of a given PID.
    // Set up hierarchy: 100 → func/111, 111 → dotnet/222
    const psTree = (await import('ps-tree')).default;
    vi.mocked(psTree).mockImplementation((pid: number, callback: any) => {
      if (pid === 100) {
        callback(null, [{ PPID: '100', PID: 111, STAT: 'S', COMMAND: 'func', COMM: 'func' }]);
      } else if (pid === 111) {
        callback(null, [{ PPID: '111', PID: 222, STAT: 'S', COMMAND: 'dotnet', COMM: 'dotnet' }]);
      } else {
        callback(null, []);
      }
      return undefined as any;
    });

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo);

    expect(result).toBe('111');
    expect(taskInfo.childProcessId).toEqual(['111', '222']);
  });

  it('should reuse cached child process ids when they are already present', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
      childProcessId: ['111', '222'],
    };

    const childProcessSpy = vi.spyOn(findChildProcessModule, 'getChildProcesses');

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, true);

    expect(result).toBe('222');
    expect(taskInfo.childProcessId).toEqual(['111', '222']);
    expect(childProcessSpy).not.toHaveBeenCalled();
  });

  it('should safely reuse a cached no-child-pids fallback without rediscovering processes', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
      childProcessId: ['100', undefined],
    };

    const childProcessSpy = vi.spyOn(findChildProcessModule, 'getChildProcesses');

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo);

    expect(result).toBe('100');
    expect(taskInfo.childProcessId).toEqual(['100', undefined]);
    expect(childProcessSpy).not.toHaveBeenCalled();
  });

  it('should safely fall back to the tracked task pid when no child pids are discovered', async () => {
    setProcessPlatform('win32');

    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: 100,
    };

    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockResolvedValue([]);

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo);

    expect(result).toBe('100');
    expect(taskInfo.childProcessId).toEqual(['100', undefined]);
  });
});

describe('findChildProcess', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setProcessPlatform('win32');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreProcessPlatform();
  });

  it('returns the innermost workflow child process', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockResolvedValue([{ processId: 111, name: 'func.exe', parentProcessId: 100 }]);

    const result = await pickFuncProcessModule.findChildProcess(100);

    expect(result).toBe('111');
  });
});

describe('getWindowsChildren', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(ext.outputChannel.appendLog).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve child processes using the PowerShell script', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockResolvedValue([
      { processId: 111, name: 'func.exe', parentProcessId: 100 },
      { processId: 222, name: 'dotnet.exe', parentProcessId: 100 },
    ]);

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([
      { command: 'func.exe', pid: 111 },
      { command: 'dotnet.exe', pid: 222 },
    ]);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Resolved Windows child processes'));
  });

  it('should return empty array when no child processes are found', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockResolvedValue([]);

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([]);
  });

  it('should propagate errors from the script so callers can retry', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockRejectedValue(new Error('script failed'));

    await expect(pickFuncProcessModule.getWindowsChildren(100)).rejects.toThrow('script failed');
  });
});

describe('custom code dual-attach', () => {
  // Realistic custom-code process tree:
  //   PowerShell (100)
  //     └── func.exe (111)
  //          └── dotnet.exe (222)   ← custom code .NET host
  const rootPid = 100;
  const funcPid = 111;
  const dotnetPid = 222;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (vscode.window as any).activeTerminal = undefined;
    vi.mocked(ext.outputChannel.appendLog).mockClear();
    setProcessPlatform('win32');

    // Script returns only DIRECT children of the queried PID
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === rootPid) {
        return [{ processId: funcPid, name: 'func.exe', parentProcessId: rootPid }];
      }
      if (pid === funcPid) {
        return [{ processId: dotnetPid, name: 'dotnet.exe', parentProcessId: funcPid }];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreProcessPlatform();
  });

  it('pickChildProcess should return the func.exe PID, not the deeper dotnet.exe', async () => {
    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: rootPid,
    };

    const result = await pickFuncProcessModule.pickChildProcess(taskInfo);

    // The workflow debugger must attach to func.exe (111), not dotnet.exe custom code .NET host (222).
    expect(result).toBe(String(funcPid));
  });

  it('pickWorkflowDebugProcess for custom code (preferHostChildProcess=false) should return func.exe', async () => {
    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: rootPid,
    };

    // Custom code debug configs set preferHostChildProcess=false because
    // customCodeRuntime is set (see pickFuncProcessInternal).
    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, false);

    expect(result).toBe(String(funcPid));
  });

  it('workflow and custom-code pickers should select DIFFERENT processes from the same tree', async () => {
    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: rootPid,
    };

    // Step 1: workflow debug process selection (what debugLogicApp does first)
    const workflowPid = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, false);

    // Step 2: custom-code net host selection (what debugLogicApp does second)
    const { pickCustomCodeWorkerChildProcess } = await import('../pickCustomCodeWorkerProcess');
    const customCodePid = await pickCustomCodeWorkerChildProcess(taskInfo, false /* isNetFxWorker */, true /* isCodeless */);

    // The workflow debugger should attach to func.exe
    expect(workflowPid).toBe(String(funcPid));

    // The custom-code debugger should attach to dotnet.exe
    expect(customCodePid).toBe(String(dotnetPid));

    // They must be different PIDs — attaching both to the same process means
    // one debugger is missing
    expect(workflowPid).not.toBe(customCodePid);
  });
});

/**
 * Tests for process trees with multiple dotnet.exe descendants.
 *
 * Some workflow configurations spawn multiple dotnet.exe processes under
 * func.exe (e.g. the workflow host worker + the custom-code language worker).
 * The process pickers must handle this without confusing the two.
 */
describe('multi-dotnet descendant trees', () => {
  // Process tree with two dotnet children:
  //   PowerShell (100)
  //     └── func.exe (111)
  //          ├── dotnet.exe (222)   ← workflow host worker
  //          └── dotnet.exe (333)   ← custom code .NET host
  const rootPid = 100;
  const funcPid = 111;
  const workflowDotnetPid = 222;
  const customCodeDotnetPid = 333;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (vscode.window as any).activeTerminal = undefined;
    vi.mocked(ext.outputChannel.appendLog).mockClear();
    setProcessPlatform('win32');

    // Script returns only DIRECT children of the queried PID
    vi.spyOn(findChildProcessModule, 'getChildProcesses').mockImplementation(async (pid: number) => {
      if (pid === rootPid) {
        return [{ processId: funcPid, name: 'func.exe', parentProcessId: rootPid }];
      }
      if (pid === funcPid) {
        return [
          { processId: workflowDotnetPid, name: 'dotnet.exe', parentProcessId: funcPid },
          { processId: customCodeDotnetPid, name: 'dotnet.exe', parentProcessId: funcPid },
        ];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreProcessPlatform();
  });

  it('pickWorkflowDebugProcess should return func.exe even when multiple dotnet descendants exist', async () => {
    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: rootPid,
    };

    const result = await pickFuncProcessModule.pickWorkflowDebugProcess(taskInfo, false);

    // Must pick func.exe, not either dotnet.exe
    expect(result).toBe(String(funcPid));
  });

  it('pickChildProcess should return func.exe, not any of the dotnet.exe grandchildren', async () => {
    const taskInfo: IRunningFuncTask = {
      startTime: Date.now(),
      processId: rootPid,
    };

    const result = await pickFuncProcessModule.pickChildProcess(taskInfo);

    expect(result).toBe(String(funcPid));
  });
});
