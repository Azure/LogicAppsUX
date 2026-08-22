/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import * as childProcess from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('../../../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
}));

import { createFileSystemConnection } from '../fileSystemConnection';
import { localize } from '../../../../../../localize';

class FakeChildProcess extends EventEmitter {
  public readonly stdin = new Writable({
    write: (_chunk, _encoding, callback) => callback(),
  });

  public readonly stdinEnd = vi.spyOn(this.stdin, 'end');
}

const createConnectionInfo = (
  rootFolder = String.raw`\\server\share`,
  username = 'domain\\user',
  password = 'password'
): FileSystemConnectionInfo => ({
  displayName: 'File system connection',
  connectionParameters: {
    rootFolder,
    username,
    password,
  },
});

const spawnFake = (): FakeChildProcess => {
  const child = new FakeChildProcess();
  vi.mocked(childProcess.spawn).mockReturnValue(child as unknown as childProcess.ChildProcessWithoutNullStreams);
  return child;
};

const getSpawnArguments = (): string[] => vi.mocked(childProcess.spawn).mock.calls[0][1] as string[];

describe('createFileSystemConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.report, 'getReport').mockReturnValue({
      sharedObjects: [String.raw`D:\Windows\System32\KERNEL32.DLL`],
    } as ReturnType<typeof process.report.getReport>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('passes credentials through stdin instead of the process command line', async () => {
    const rootFolder = String.raw`\\server\share & "quoted"`;
    const username = String.raw`domain\user|name`;
    const password = 'secret & | % ^ ` $(command) "value"';
    const connectionInfo = createConnectionInfo(rootFolder, username, password);
    const child = spawnFake();

    const resultPromise = createFileSystemConnection(connectionInfo);
    const spawnArguments = getSpawnArguments();
    const encodedCommand = spawnArguments.at(-1);
    const decodedCommand = Buffer.from(encodedCommand ?? '', 'base64').toString('utf16le');

    expect(childProcess.spawn).toHaveBeenCalledWith(
      String.raw`D:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', expect.any(String)],
      {
        shell: false,
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
      }
    );
    expect(JSON.stringify(spawnArguments)).not.toContain(rootFolder);
    expect(JSON.stringify(spawnArguments)).not.toContain(username);
    expect(JSON.stringify(spawnArguments)).not.toContain(password);
    expect(decodedCommand).toContain('[Console]::OpenStandardInput()');
    expect(decodedCommand).toContain('WNetAddConnection2');
    expect(decodedCommand).not.toContain(rootFolder);
    expect(decodedCommand).not.toContain(username);
    expect(decodedCommand).not.toContain(password);
    expect(child.stdinEnd).toHaveBeenCalledWith(JSON.stringify({ rootFolder, username, password }), 'utf8');

    child.emit('close', 0);
    const result = await resultPromise;
    expect(result).toEqual({
      connection: {
        ...connectionInfo,
        connectionParameters: { mountPath: rootFolder },
      },
    });
    expect(JSON.stringify(result)).not.toContain(username);
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it('uses identical process arguments for different credentials', async () => {
    const firstChild = new FakeChildProcess();
    const secondChild = new FakeChildProcess();
    vi.mocked(childProcess.spawn)
      .mockReturnValueOnce(firstChild as unknown as childProcess.ChildProcessWithoutNullStreams)
      .mockReturnValueOnce(secondChild as unknown as childProcess.ChildProcessWithoutNullStreams);

    const firstResult = createFileSystemConnection(createConnectionInfo(String.raw`\\first\share`, 'first-user', 'first-password'));
    const firstArguments = vi.mocked(childProcess.spawn).mock.calls[0][1];
    firstChild.emit('close', 0);

    const secondResult = createFileSystemConnection(createConnectionInfo(String.raw`\\second\share`, 'second-user', 'second-password'));
    const secondArguments = vi.mocked(childProcess.spawn).mock.calls[1][1];
    secondChild.emit('close', 0);

    await Promise.all([firstResult, secondResult]);
    expect(firstArguments).toEqual(secondArguments);
  });

  it('returns a stable error without exposing process errors', async () => {
    const connectionInfo = createConnectionInfo();
    const { rootFolder, username, password } = connectionInfo.connectionParameters ?? {};
    const child = spawnFake();

    const resultPromise = createFileSystemConnection(connectionInfo);
    child.emit('error', new Error(`Command failed for ${rootFolder} ${username} ${password}`));

    const result = await resultPromise;
    expect(result).toEqual({
      errorMessage: 'Unable to connect to the file system. Verify the connection details and try again.',
    });
    expect(JSON.stringify(result)).not.toContain(rootFolder);
    expect(JSON.stringify(result)).not.toContain(username);
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it('returns a stable error for nonzero exit codes', async () => {
    const connectionInfo = createConnectionInfo();
    const { rootFolder, username, password } = connectionInfo.connectionParameters ?? {};
    const child = spawnFake();

    const resultPromise = createFileSystemConnection(connectionInfo);
    child.emit('close', 1);

    const result = await resultPromise;
    expect(result).toEqual({
      errorMessage: 'Unable to connect to the file system. Verify the connection details and try again.',
    });
    expect(JSON.stringify(result)).not.toContain(rootFolder);
    expect(JSON.stringify(result)).not.toContain(username);
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it('does not spawn a process when required parameters are missing', async () => {
    const result = await createFileSystemConnection({ connectionParameters: {} });

    expect(result).toEqual({
      errorMessage: 'Unable to connect to the file system. Verify the connection details and try again.',
    });
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  it('ignores an overridden system root when selecting PowerShell', async () => {
    vi.stubEnv('SystemRoot', String.raw`C:\Users\attacker\..\redirected`);
    const child = spawnFake();

    const resultPromise = createFileSystemConnection(createConnectionInfo());
    child.emit('close', 0);

    await expect(resultPromise).resolves.toHaveProperty('connection');
    expect(childProcess.spawn).toHaveBeenCalledWith(
      String.raw`D:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`,
      expect.any(Array),
      expect.any(Object)
    );
  });

  it('does not spawn a process when the OS system directory cannot be resolved', async () => {
    vi.mocked(process.report.getReport).mockReturnValue({
      sharedObjects: [],
    } as ReturnType<typeof process.report.getReport>);

    const result = await createFileSystemConnection(createConnectionInfo());

    expect(result).toEqual({
      errorMessage: 'Unable to connect to the file system. Verify the connection details and try again.',
    });
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  it('localizes sanitized errors', async () => {
    const result = await createFileSystemConnection({ connectionParameters: {} });

    expect(localize).toHaveBeenCalledWith(
      'fileSystemConnectionFailed',
      'Unable to connect to the file system. Verify the connection details and try again.'
    );
    expect(result.errorMessage).toBe('Unable to connect to the file system. Verify the connection details and try again.');
  });
});
