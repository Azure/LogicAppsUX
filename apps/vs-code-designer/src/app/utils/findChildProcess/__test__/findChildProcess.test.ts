import * as cp from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ext } from '../../../../extensionVariables';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('../../extensionAssets', () => ({
  getExtensionAssetPath: vi.fn(),
}));

import { getExtensionAssetPath } from '../../extensionAssets';
import { getChildProcessesWithScript } from '../findChildProcess';

describe('getChildProcessesWithScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ext.outputChannel.appendLog).mockClear();
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: (...args: any[]) => void) => {
      fn();
      return 0 as any;
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse PowerShell output into process info objects', async () => {
    vi.mocked(getExtensionAssetPath).mockReturnValue('C:\\mock\\get-child-processes.ps1');
    vi.mocked(cp.exec).mockImplementation(((_command, _options, callback) => {
      callback?.(
        null as any,
        '[{"ProcessId":111,"Name":"func.exe","ParentProcessId":100},{"ProcessId":222,"Name":"dotnet.exe","ParentProcessId":111}]',
        ''
      );
      return {
        killed: true,
        kill: vi.fn(),
      } as any;
    }) as any);

    await expect(getChildProcessesWithScript(100)).resolves.toEqual([
      { processId: 111, name: 'func.exe', parentProcessId: 100 },
      { processId: 222, name: 'dotnet.exe', parentProcessId: 111 },
    ]);
  });

  it('should wrap non-Error failures using String(error)', async () => {
    vi.mocked(getExtensionAssetPath).mockImplementation(() => {
      throw 'boom';
    });

    await expect(getChildProcessesWithScript(100)).rejects.toThrow(
      'Failed to execute Powershell script to get the func child process: boom'
    );
  });
});
