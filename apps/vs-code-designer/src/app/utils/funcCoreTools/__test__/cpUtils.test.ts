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
import { executeCommand, executeCommandWithSanityLogging, tryExecuteCommand } from '../cpUtils';

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

const createOutputChannel = () =>
  ({
    append: vi.fn(),
    appendLog: vi.fn(),
    show: vi.fn(),
  }) as any;

describe('cpUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    setPlatform(originalPlatform);
  });

  describe('executeCommand options', () => {
    it('preserves string-only executeCommand callers without arming a timeout', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommand(undefined, undefined, 'func', '--version');
      child.stdout.emit('data', '4.12.0');
      child.emit('close', 0);

      await vi.advanceTimersByTimeAsync(600000);
      await expect(promise).resolves.toContain('4.12.0');
      expect(cp.spawn).toHaveBeenCalledWith('func', ['--version'], expect.objectContaining({ shell: true }));
      expect(child.kill).not.toHaveBeenCalled();
      expect(cp.exec).not.toHaveBeenCalled();
    });

    it('rejects and kills the whole tree on Windows when the command never exits', async () => {
      setPlatform('win32');
      spawnFake();

      const promise = executeCommand(undefined, undefined, 'func', '--version', { timeoutMs: 5000 });
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

      const promise = executeCommand(undefined, undefined, 'func', '--version', { timeoutMs: 5000 });
      const rejection = expect(promise).rejects.toThrow(/did not complete within 5000 ms/);
      await vi.advanceTimersByTimeAsync(5000);
      await rejection;

      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
      expect(cp.exec).not.toHaveBeenCalled();
    });

    it('resolves normally and never kills a command that finishes inside the timeout', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommand(undefined, undefined, 'func', '--version', { timeoutMs: 5000 });
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

      const promise = executeCommand(undefined, undefined, 'func', '--version', { timeoutMs: 5000 });
      child.stderr.emit('data', 'not a valid application');
      child.emit('close', 1);

      await expect(promise).rejects.toThrow(/not a valid application/);
    });

    it('strips command options before spawning the command', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommand(undefined, undefined, 'func', '--version', { timeoutMs: 5000 });
      child.stdout.emit('data', '4.12.0');
      child.emit('close', 0);

      await expect(promise).resolves.toContain('4.12.0');
      expect(cp.spawn).toHaveBeenCalledWith('func', ['--version'], expect.objectContaining({ shell: true }));
    });

    it('uses sanitized command text when reporting command failures', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommand(undefined, undefined, 'run-secret password', {
        sanitizedCommandForLogging: 'run-secret ******',
      });
      child.stderr.emit('data', 'failed');
      child.emit('close', 1);

      let error: unknown;
      try {
        await promise;
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('run-secret ******');
      expect((error as Error).message).not.toContain('password');
    });

    it('keeps the sanitized logging wrapper credential-safe', async () => {
      setPlatform('linux');
      const child = spawnFake();

      const promise = executeCommandWithSanityLogging(undefined, undefined, 'run-secret ******', 'run-secret password');
      child.stderr.emit('data', 'failed');
      child.emit('close', 1);

      let error: unknown;
      try {
        await promise;
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('run-secret ******');
      expect((error as Error).message).not.toContain('password');
    });

    it('preserves sanitized wrapper logging while still passing raw args to spawn', async () => {
      setPlatform('linux');
      const child = spawnFake();
      const outputChannel = createOutputChannel();

      const promise = executeCommandWithSanityLogging(
        outputChannel,
        undefined,
        'run-secret --password ******',
        'run-secret',
        '--password',
        'secret-password'
      );
      child.stdout.emit('data', 'done');
      child.emit('close', 0);

      await expect(promise).resolves.toContain('done');
      expect(cp.spawn).toHaveBeenCalledWith('run-secret', ['--password', 'secret-password'], expect.objectContaining({ shell: true }));
      expect(outputChannel.appendLog).toHaveBeenCalledWith('Running command: "run-secret --password ******"...');
      expect(outputChannel.appendLog).toHaveBeenCalledWith('Finished running command: "run-secret --password ******".');
      expect(outputChannel.appendLog.mock.calls.flat().join(' ')).not.toContain('secret-password');
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
