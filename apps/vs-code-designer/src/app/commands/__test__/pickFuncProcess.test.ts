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
  getFuncPortFromTaskOrProject: vi.fn(),
  isFuncHostTask: vi.fn(),
  runningFuncTaskMap: new Map(),
}));

vi.mock('../../utils/taskUtils', () => ({
  executeIfNotActive: vi.fn(),
}));

vi.mock('../../utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn((_context: unknown, _eventName: string, callback: () => Promise<unknown>) => callback()),
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
import { getFuncPortFromTaskOrProject, runningFuncTaskMap } from '../../utils/funcCoreTools/funcHostTask';
import { executeIfNotActive } from '../../utils/taskUtils';
import { delay } from '../../utils/delay';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import * as pickFuncProcessModule from '../pickFuncProcess';
import { publishCodefulProject } from '../publishCodefulProject';
import { refreshConnectionKeys } from '../../utils/appSettings/connectionKeys';

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

describe('pickFuncProcessInternal', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  const workspaceFolder = { uri: { fsPath: projectPath }, name: 'CodefulLogicApp', index: 0 } as vscode.WorkspaceFolder;
  const funcTask = {
    name: 'func: host start',
    scope: workspaceFolder,
    definition: { command: 'func host start --port 7071' },
  } as vscode.Task;
  const context: any = {
    telemetry: { properties: {}, measurements: {} },
    errorHandling: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    setProcessPlatform('linux');
    context.telemetry = { properties: {}, measurements: {} };
    context.errorHandling = {};
    runningFuncTaskMap.clear();
    (preDebugValidate as any).mockResolvedValue(true);
    (hasCodefulWorkflowSetting as any).mockResolvedValue(true);
    (tryBuildCustomCodeFunctionsProject as any).mockResolvedValue(true);
    (publishCodefulProject as any).mockResolvedValue(undefined);
    (delay as any).mockResolvedValue(undefined);
    (getProjFiles as any).mockResolvedValue(['CodefulLogicApp.csproj']);
    (getWorkspaceSetting as any).mockReturnValue(1);
    (getFuncPortFromTaskOrProject as any).mockResolvedValue('7071');
    (sendRequestWithTimeout as any).mockResolvedValue({ parsedBody: { state: 'Running' } });
    (executeIfNotActive as any).mockImplementation(async () => {
      runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 1234 });
    });
    (vscode.EventEmitter as any).mockImplementation(() => ({ fire: vi.fn() }));
    (vscode.tasks as any) = {
      fetchTasks: vi.fn().mockResolvedValue([funcTask]),
      executeTask: vi.fn().mockResolvedValue(undefined),
      onDidEndTaskProcess: vi.fn(() => ({ dispose: vi.fn() })),
    };
  });

  afterEach(() => {
    runningFuncTaskMap.clear();
    vi.restoreAllMocks();
    restoreProcessPlatform();
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
    expect(publishCodefulProject).toHaveBeenCalledWith(context, workspaceFolder.uri, { skipIfBuildPopulatesCodeful: true });
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
    expect(tryBuildCustomCodeFunctionsProject).toHaveBeenCalledWith(context, workspaceFolder.uri);
    expect(publishCodefulProject).not.toHaveBeenCalled();
    expect(executeIfNotActive).not.toHaveBeenCalled();
  });

  it('waits for a previous func task to stop before codeful publish', async () => {
    const events: string[] = [];
    runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 5678 });
    (delay as any).mockImplementationOnce(async () => {
      expect(publishCodefulProject).not.toHaveBeenCalled();
      events.push('waited-for-stop');
      runningFuncTaskMap.clear();
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

    expect(events).toEqual(['waited-for-stop', 'publish-codeful']);
  });

  it('waits for a previous func task to stop before custom code build', async () => {
    const events: string[] = [];
    (hasCodefulWorkflowSetting as any).mockResolvedValue(false);
    runningFuncTaskMap.set(workspaceFolder, { startTime: Date.now(), processId: 5678 });
    (delay as any).mockImplementationOnce(async () => {
      expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
      events.push('waited-for-stop');
      runningFuncTaskMap.clear();
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

    expect(events).toEqual(['waited-for-stop', 'build-custom-code']);
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

    expect(publishCodefulProject).toHaveBeenCalledWith(context, workspaceFolder.uri, { skipIfBuildPopulatesCodeful: true });
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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([
      { processId: 444, name: 'node.exe', parentProcessId: 100 },
    ]);

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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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

    const childProcessSpy = vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript');

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

    const childProcessSpy = vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript');

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

    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([]);

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
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([
      { processId: 111, name: 'func.exe', parentProcessId: 100 },
    ]);

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
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([
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
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([]);

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([]);
  });

  it('should return empty array and log when the script throws', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockRejectedValue(new Error('script failed'));

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([]);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve Windows child processes for PID "100"')
    );
  });
});

/**
 * Regression tests for the custom-code dual-attach bug.
 *
 * Before the fix, the PowerShell child-process script returned ALL descendants
 * in depth-first order. The .reverse().find() pattern in pickChildProcess then
 * selected the deepest match (dotnet.exe) instead of the direct child (func.exe).
 * This caused debugLogicApp to attach the workflow debugger to the .NET host
 * process, and the custom-code picker couldn't find a dotnet child beneath it.
 *
 * After the fix, the script returns only DIRECT children (like process-tree),
 * so pickChildProcess correctly finds func.exe at the first level, and the
 * custom-code picker finds dotnet.exe by querying func.exe's children separately.
 */
describe('custom code dual-attach regression', () => {
  // Realistic custom-code process tree:
  //   PowerShell (100)
  //     └── func.exe (111)
  //          └── dotnet.exe (222)   ← custom code .NET host
  //
  // After fix: getChildProcessesWithScript(100) returns only direct children:
  //   [func.exe/111]
  // And getChildProcessesWithScript(111) returns:
  //   [dotnet.exe/222]
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
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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

    // The workflow debugger must attach to func.exe (111), not dotnet.exe (222).
    // dotnet.exe is the custom-code .NET host — it should only be picked by
    // pickCustomCodeWorkerChildProcess for the second debugger.
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
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockImplementation(async (pid: number) => {
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
