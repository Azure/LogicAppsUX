import type { CompleteFileSystemConnectionData } from '@microsoft/vscode-extension-logic-apps';
import { ChildProcess, type SpawnOptions } from 'child_process';
import { platform } from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFileSystemConnection } from '../fileSystemConnection';

const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));

vi.mock('child_process', async () => ({
  ...(await vi.importActual<typeof import('child_process')>('child_process')),
  spawn: mockSpawn,
}));

vi.mock('os', () => ({ platform: vi.fn() }));
vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

const credentials = {
  rootFolder: '\\\\CWE532-ROOT\\share folder\\caf\u00e9',
  username: 'CWE532-USER\\user name',
  password: 'CWE532-PASSWORD \u00e9 "&|<>^%!\r\n$()',
};
const connectionInfo = { displayName: 'SMB connection', connectionParameters: credentials };
const genericFailure = {
  errorMessage: 'Unable to create the file system connection. Check the SMB share, credentials, network access, and existing connections.',
};

describe('createFileSystemConnection', () => {
  let child: ChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SystemRoot', 'C:\\Windows');
    vi.mocked(platform).mockReturnValue('win32');
    child = new ChildProcess();
    mockSpawn.mockReturnValue(child);
  });

  afterEach(() => {
    child.removeAllListeners();
    vi.unstubAllEnvs();
  });

  it('runs net.exe without a shell or diagnostic pipes and preserves the credential-free success contract', async () => {
    const result = createFileSystemConnection(connectionInfo);

    expect(mockSpawn).toHaveBeenCalledWith(
      path.join('C:\\Windows', 'System32', 'net.exe'),
      ['use', credentials.rootFolder, credentials.password, `/user:${credentials.username}`],
      { shell: false, windowsHide: true, stdio: 'ignore' }
    );
    child.emit('close', 0, null);
    expect(await result).toEqual({
      errorMessage: '',
      connection: { displayName: connectionInfo.displayName, connectionParameters: { mountPath: credentials.rootFolder } },
    });
    expect(JSON.stringify(await result)).not.toContain('CWE532-PASSWORD');
    expect(JSON.stringify(await result)).not.toContain('CWE532-USER');
    expect(connectionInfo.connectionParameters).toEqual(credentials);
  });

  it.each(['', '*', '/persistent:no', '"quoted"\\'])(
    'passes password %j as a separate argument without shell interpolation',
    async (password) => {
      const result = createFileSystemConnection({ connectionParameters: { ...credentials, password } });
      expect(mockSpawn.mock.lastCall?.[1]).toEqual(['use', credentials.rootFolder, password, `/user:${credentials.username}`]);
      child.emit('close', 0, null);
      expect(await result).toHaveProperty('connection.connectionParameters.mountPath', credentials.rootFolder);
    }
  );

  it('returns an error string compatible with the completion message contract on success', async () => {
    const result = createFileSystemConnection(connectionInfo);
    child.emit('close', 0, null);
    const { connection, errorMessage } = await result;
    const completion: CompleteFileSystemConnectionData = {
      connectionName: 'smb-connection',
      connection,
      error: errorMessage,
    };
    expect(completion.error).toBe('');
    expect(completion.connection).toEqual({
      displayName: connectionInfo.displayName,
      connectionParameters: { mountPath: credentials.rootFolder },
    });
  });

  it.each([1, 2, 5, 53, 1219, null])('returns only the fixed safe failure for exit code %s', async (code) => {
    const result = createFileSystemConnection(connectionInfo);
    child.emit('close', code, null);
    expect(await result).toEqual(genericFailure);
  });

  it('fails on signal termination, even if a zero exit code is reported', async () => {
    const result = createFileSystemConnection(connectionInfo);
    child.emit('close', 0, 'SIGTERM');
    expect(await result).toEqual(genericFailure);
  });

  it.each(['ENOENT', 'EACCES', 'EINVAL'])('contains all diagnostics for process error %s', async (code) => {
    const result = createFileSystemConnection(connectionInfo);
    const error = Object.assign(new Error(`Command failed: net use ${JSON.stringify(credentials)}`), {
      code,
      path: credentials.rootFolder,
      spawnargs: [credentials.password, credentials.username],
      stdout: credentials.password,
      stderr: credentials.password,
      cause: new Error(credentials.password),
    });
    child.emit('error', error);
    child.emit('close', null, null);
    expect(await result).toEqual(genericFailure);
  });

  it('does not inspect or serialize raw errors', async () => {
    const error = new Error();
    Object.defineProperty(error, 'message', {
      get: () => {
        throw new Error(credentials.password);
      },
    });
    const result = createFileSystemConnection(connectionInfo);
    child.emit('error', error);
    child.emit('close', 1, null);
    expect(await result).toEqual(genericFailure);
  });

  it('does not turn a process error into success or expose subsequent errors', async () => {
    const result = createFileSystemConnection(connectionInfo);
    child.emit('error', new Error(credentials.password));
    child.emit('close', 0, null);
    child.emit('error', new Error(credentials.username));
    expect(await result).toEqual(genericFailure);
  });

  it('contains synchronous launch exceptions', async () => {
    mockSpawn.mockImplementation(() => {
      throw new Error(credentials.password);
    });
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
  });

  it.each([undefined, ''])('reports a safe failure when the Windows system directory is %j', async (systemRoot) => {
    vi.stubEnv('SystemRoot', systemRoot);
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it.each(['linux', 'darwin'] as const)('does not launch net.exe on %s', async (os) => {
    vi.mocked(platform).mockReturnValue(os);
    expect(await createFileSystemConnection(connectionInfo)).toEqual({
      errorMessage: 'File system connections to SMB shares are supported only on Windows.',
    });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    {},
    { ...credentials, rootFolder: undefined },
    { ...credentials, rootFolder: 123 },
    { ...credentials, rootFolder: 'C:\\local' },
    { ...credentials, rootFolder: `${credentials.rootFolder}\0` },
    { ...credentials, username: undefined },
    { ...credentials, username: '' },
    { ...credentials, username: 123 },
    { ...credentials, username: `${credentials.username}\0` },
    { ...credentials, password: undefined },
    { ...credentials, password: 123 },
    { ...credentials, password: `${credentials.password}\0` },
  ])('rejects invalid parameters without echoing them or starting a process: %j', async (connectionParameters) => {
    const result = await createFileSystemConnection({ connectionParameters });
    expect(result).toEqual({
      errorMessage: 'Provide a valid UNC root folder, username, and password for the SMB share.',
    });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it.each([credentials.password, ''])(
    'preserves arguments and discards sensitive output through a real child process: %j',
    async (password) => {
      const cp = await vi.importActual<typeof import('child_process')>('child_process');
      const expectedArgs = ['use', credentials.rootFolder, password, `/user:${credentials.username}`];
      const script = `const expected = ${JSON.stringify(expectedArgs)};
      console.log(expected);
      console.error(expected);
      process.exit(JSON.stringify(process.argv.slice(1)) === JSON.stringify(expected) ? 0 : 1);`;
      mockSpawn.mockImplementation((_file: string, args: string[], options: SpawnOptions) => {
        child = cp.spawn(process.execPath, ['-e', script, '--', ...args], options);
        return child;
      });

      expect(await createFileSystemConnection({ connectionParameters: { ...credentials, password } })).toEqual({
        errorMessage: '',
        connection: { connectionParameters: { mountPath: credentials.rootFolder } },
      });
      expect(child.stdin).toBeNull();
      expect(child.stdout).toBeNull();
      expect(child.stderr).toBeNull();
    },
    10000
  );

  it('contains a real child-process launch error with sensitive spawnargs', async () => {
    const cp = await vi.importActual<typeof import('child_process')>('child_process');
    mockSpawn.mockImplementation((_file: string, args: string[], options: SpawnOptions) => {
      child = cp.spawn(path.join(__dirname, 'CWE532-missing-net.exe'), args, options);
      return child;
    });
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
  }, 10000);

  it.skipIf(process.platform !== 'win32')(
    'contains a real net.exe local-option failure without contacting a share',
    async () => {
      const cp = await vi.importActual<typeof import('child_process')>('child_process');
      mockSpawn.mockImplementation((file: string, _args: string[], options: SpawnOptions) => {
        child = cp.spawn(file, ['use', '/__logicapps_invalid_option__'], options);
        return child;
      });
      expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
    },
    10000
  );
});
