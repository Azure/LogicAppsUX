import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetChildProcessesWithScript = vi.fn();

vi.mock('../../utils/findChildProcess/findChildProcess', () => ({
  getChildProcessesWithScript: mockGetChildProcessesWithScript,
}));

const pickFuncProcessModule = await import('../pickFuncProcess');

describe('findChildProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the func.exe descendant pid on Windows', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    mockGetChildProcessesWithScript.mockResolvedValue([
      { processId: 6312, name: 'conhost.exe', parentProcessId: 17884 },
      { processId: 31696, name: 'func.exe', parentProcessId: 17884 },
      { processId: 33904, name: 'node.exe', parentProcessId: 31696 },
    ]);

    const result = await pickFuncProcessModule.findChildProcess(17884);

    expect(result).toBe('31696');
    expect(mockGetChildProcessesWithScript).toHaveBeenCalledWith(17884);
  });

  it('returns undefined on Windows when no func.exe descendant is found', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    mockGetChildProcessesWithScript.mockResolvedValue([
      { processId: 6312, name: 'conhost.exe', parentProcessId: 17884 },
      { processId: 33904, name: 'node.exe', parentProcessId: 31696 },
    ]);

    const result = await pickFuncProcessModule.findChildProcess(17884);

    expect(result).toBeUndefined();
  });

  it('returns a matching child pid on Unix and does not fall back to the parent pid', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    vi.spyOn(pickFuncProcessModule, 'getUnixChildren').mockResolvedValue([
      { command: 'bash', pid: 1000 },
      { command: 'func', pid: 2000 },
      { command: 'dotnet', pid: 3000 },
    ]);

    const result = await pickFuncProcessModule.findChildProcess(1234);

    expect(result).toBe('3000');
  });

  it('returns undefined on Unix when no matching child process is found', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    vi.spyOn(pickFuncProcessModule, 'getUnixChildren').mockResolvedValue([{ command: 'bash', pid: 1000 }]);

    const result = await pickFuncProcessModule.findChildProcess(1234);

    expect(result).toBeUndefined();
  });
});
