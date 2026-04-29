import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import type { IRunningFuncTask } from '../../utils/funcCoreTools/funcHostTask';
import * as findChildProcessModule from '../../utils/findChildProcess/findChildProcess';
import * as windowsProcessModule from '../../utils/windowsProcess';

// Mock ps-tree to prevent spawning `ps` on Windows hosts.
vi.mock('ps-tree', () => ({
  default: vi.fn((_pid: number, callback: (err: Error | null, result: any[]) => void) => {
    callback(null, []);
  }),
}));

import * as pickFuncProcessModule from '../pickFuncProcess';

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

describe('getWindowsChildren', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(ext.outputChannel.appendLog).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should prefer the PowerShell child-process script on Windows', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockResolvedValue([
      { processId: 111, name: 'func.exe', parentProcessId: 100 },
      { processId: 222, name: 'dotnet.exe', parentProcessId: 111 },
    ]);
    const getWindowsProcessSpy = vi.spyOn(windowsProcessModule, 'getWindowsProcess').mockResolvedValue([]);

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([
      { command: 'func.exe', pid: 111 },
      { command: 'dotnet.exe', pid: 222 },
    ]);
    expect(getWindowsProcessSpy).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Resolved Windows child processes for PID "100" using the PowerShell child-process script.')
    );
  });

  it('should fall back to process-tree when the PowerShell child-process script fails', async () => {
    vi.spyOn(findChildProcessModule, 'getChildProcessesWithScript').mockRejectedValue(new Error('script failed'));
    vi.spyOn(windowsProcessModule, 'getWindowsProcess').mockResolvedValue([
      { name: 'func.exe', pid: 111 } as any,
      { name: 'dotnet.exe', pid: 222 } as any,
    ]);

    const result = await pickFuncProcessModule.getWindowsChildren(100);

    expect(result).toEqual([
      { command: 'func.exe', pid: 111 },
      { command: 'dotnet.exe', pid: 222 },
    ]);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Falling back to process-tree for Windows child process resolution on PID "100". Error: script failed')
    );
  });
});
