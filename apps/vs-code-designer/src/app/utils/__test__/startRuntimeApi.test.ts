import { beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseReservedPort } from '../portReservation';
import { stopRuntimeApi } from '../startRuntimeApi';
import { ext } from '../../../extensionVariables';

vi.mock('../portReservation', () => ({
  releaseReservedPort: vi.fn(),
  reserveFreePort: vi.fn(),
}));

describe('stopRuntimeApi', () => {
  const projectPath = '/workspace/project';

  beforeEach(() => {
    vi.clearAllMocks();
    ext.runtimeInstances.clear();
  });

  it('no-ops when no runtime instance is tracked (stop after failed start / double stop)', () => {
    // Guard against the crash: with nothing tracked, get() returns undefined and the old
    // destructuring threw before any cleanup could run.
    expect(() => stopRuntimeApi(projectPath)).not.toThrow();
    expect(releaseReservedPort).not.toHaveBeenCalled();
    expect(ext.runtimeInstances.has(projectPath)).toBe(false);
  });

  it('releases the reserved port and clears the instance when the process is not running', () => {
    ext.runtimeInstances.set(projectPath, { process: undefined, childFuncPid: undefined, port: 8123 } as any);

    stopRuntimeApi(projectPath);

    expect(releaseReservedPort).toHaveBeenCalledWith(8123);
    expect(ext.runtimeInstances.has(projectPath)).toBe(false);
  });
});
