/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/\{(\d+)\}/g, (_match: string, index: string) => String(args[Number(index)]))
  ),
}));

import { EventEmitter } from 'events';
import * as cp from 'child_process';
import { executeCommandWithTimeout, tryExecuteCommand } from '../cpUtils';

class FakeChildProcess extends EventEmitter {
  public stdout = new EventEmitter();
  public stderr = new EventEmitter();
  public pid = 4242;
  public kill = vi.fn();
}

const originalPlatform = process.platform;

const setPlatform = (platform: string): void => {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
};

const spawnFake = (): FakeChildProcess => {
  const child = new FakeChildProcess();
  vi.mocked(cp.spawn).mockReturnValue(child as unknown as cp.ChildProcess);
  return child;
};

describe('cpUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    setPlatform(originalPlatform);
  });

  describe('executeCommandWithTimeout', () => {
    it('rejects and kills the whole tree on Windows when the command never exits', async () => {
      setPlatform('win32');
      const child = spawnFake();

      const promise = executeCommandWithTimeout(undefined, undefined, 5000, 'func', '--version');
      const rejection = expect(promise).rejects.toThrow(/did not complete within 5000 ms/);
      await vi.advanceTimersByTimeAsync(5000);
      await rejection;

      // `shell: true` means the tracked pid is the shell, so killing only it would leave the real
      // command running and still holding a handle on the binary under test.
      expect(cp.exec).toHaveBeenCalledWith('taskkill /pid 4242 /t /f');
    });

    it('rejects and signals the process on non-Windows when the command never exits', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommandWithTimeout(undefined, undefined, 5000, 'func', '--version');
      const rejection = expect(promise).rejects.toThrow(/did not complete within 5000 ms/);
      await vi.advanceTimersByTimeAsync(5000);
      await rejection;

      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
      expect(cp.exec).not.toHaveBeenCalled();
    });

    it('resolves normally and never kills a command that finishes inside the timeout', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommandWithTimeout(undefined, undefined, 5000, 'func', '--version');
      child.stdout.emit('data', '4.12.0');
      child.emit('close', 0);

      await expect(promise).resolves.toContain('4.12.0');

      await vi.advanceTimersByTimeAsync(60000);
      expect(child.kill).not.toHaveBeenCalled();
      expect(cp.exec).not.toHaveBeenCalled();
    });

    it('rejects with the command output when the command exits non-zero', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommandWithTimeout(undefined, undefined, 5000, 'func', '--version');
      child.stderr.emit('data', 'not a valid application');
      child.emit('close', 1);

      await expect(promise).rejects.toThrow(/not a valid application/);
    });
  });

  describe('tryExecuteCommand', () => {
    it('waits indefinitely when no timeout is supplied', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = tryExecuteCommand(undefined, undefined, 'func', '--version');

      // Well past any bounded probe: an unbounded command must still be running.
      await vi.advanceTimersByTimeAsync(600000);
      expect(child.kill).not.toHaveBeenCalled();

      child.emit('close', 0);
      await expect(promise).resolves.toMatchObject({ code: 0 });
    });
  });
});
