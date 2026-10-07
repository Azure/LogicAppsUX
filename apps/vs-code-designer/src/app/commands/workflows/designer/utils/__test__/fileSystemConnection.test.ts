import { ChildProcess, type ExecFileException, type ExecFileOptions } from 'child_process';
import { platform } from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExtensionAssetPath } from '../../../../../utils/extensionAssets';
import { createFileSystemConnection } from '../fileSystemConnection';

const { mockExecFile } = vi.hoisted(() => ({ mockExecFile: vi.fn() }));

vi.mock('child_process', async () => ({
  ...(await vi.importActual<typeof import('child_process')>('child_process')),
  execFile: mockExecFile,
}));

vi.mock('os', () => ({ platform: vi.fn() }));
vi.mock('../../../../../utils/extensionAssets', () => ({ getExtensionAssetPath: vi.fn() }));
vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

const credentials = {
  rootFolder: '\\\\server\\share folder\\caf\u00e9',
  username: 'DOMAIN\\user name',
  password: 'CWE532-CANARY \u00e9 "&|<>^%!\r\n$()',
};
const connectionInfo = { displayName: 'SMB connection', connectionParameters: credentials };
const genericFailure = {
  errorMessage:
    'Unable to create the file system connection. Check the SMB share and credentials, and ensure Windows PowerShell is available.',
};

describe('createFileSystemConnection', () => {
  let child: ChildProcess;
  let input: PassThrough;
  let complete: (error: ExecFileException | null, stdout: string, stderr: string) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SystemRoot', 'C:\\Windows');
    vi.mocked(platform).mockReturnValue('win32');
    vi.mocked(getExtensionAssetPath).mockReturnValue('C:\\extension path\\assets\\scripts\\connect-smb-share.ps1');
    child = new ChildProcess();
    input = new PassThrough();
    child.stdin = input;
    mockExecFile.mockImplementation((_file: string, _args: string[], _options: ExecFileOptions, callback: typeof complete) => {
      complete = callback;
      return child;
    });
  });

  afterEach(() => {
    input.destroy();
    vi.unstubAllEnvs();
  });

  it('passes literal credentials only through stdin and preserves the credential-free success contract', async () => {
    const end = vi.spyOn(input, 'end');
    const result = createFileSystemConnection(connectionInfo);

    expect(mockExecFile).toHaveBeenCalledWith(
      path.join('C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        'C:\\extension path\\assets\\scripts\\connect-smb-share.ps1',
      ],
      { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 1024 },
      expect.any(Function)
    );
    expect(end).toHaveBeenCalledWith(JSON.stringify(credentials), 'utf8');
    expect(JSON.stringify(mockExecFile.mock.calls[0].slice(0, 3))).not.toContain('CWE532-CANARY');
    expect(mockExecFile.mock.calls[0][1]).not.toContain(credentials.username);
    expect(mockExecFile.mock.calls[0][1]).not.toContain(credentials.rootFolder);
    expect(getExtensionAssetPath).toHaveBeenCalledWith('scripts', 'connect-smb-share.ps1');

    complete(null, '0\r\n', '');
    expect(await result).toEqual({
      connection: { displayName: connectionInfo.displayName, connectionParameters: { mountPath: credentials.rootFolder } },
    });
    expect(JSON.stringify(await result)).not.toContain('CWE532-CANARY');
    expect(connectionInfo.connectionParameters).toEqual(credentials);
  });

  it('supports an explicitly empty password without prompting', async () => {
    const end = vi.spyOn(input, 'end');
    const result = createFileSystemConnection({ connectionParameters: { ...credentials, password: '' } });
    expect(end).toHaveBeenCalledWith(JSON.stringify({ ...credentials, password: '' }), 'utf8');
    complete(null, '0', '');
    expect(await result).toHaveProperty('connection.connectionParameters.mountPath', credentials.rootFolder);
  });

  it.each(['5', '86', '1326', '2202', '1219', '53', '67', '1231'])('returns a fixed message for Windows status %s', async (status) => {
    const result = createFileSystemConnection(connectionInfo);
    complete(null, `${status}\r\n`, credentials.password);
    const response = await result;
    expect(response.connection).toBeUndefined();
    expect(response.errorMessage).toBeTruthy();
    expect(response.errorMessage).not.toEqual(genericFailure.errorMessage);
    expect(JSON.stringify(response)).not.toContain('CWE532-CANARY');
  });

  it.each(['', 'unknown', '9999', '0\nextra', credentials.password])('does not forward unexpected helper output %j', async (stdout) => {
    const result = createFileSystemConnection(connectionInfo);
    complete(null, stdout, credentials.password);
    expect(await result).toEqual(genericFailure);
  });

  it.each(['command failure', 'spawn failure', 'timeout', 'output overflow'])('contains all diagnostics on %s', async (failure) => {
    const result = createFileSystemConnection(connectionInfo);
    const error = Object.assign(new Error(`${failure}: ${credentials.password}`), {
      code: 'ENOENT',
      killed: true,
      cmd: credentials.password,
      spawnargs: [credentials.password],
      cause: new Error(credentials.password),
    });
    complete(error, credentials.password, credentials.password);
    expect(await result).toEqual(genericFailure);
  });

  it('contains synchronous launch exceptions', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error(credentials.password);
    });
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
  });

  it('contains synchronous input-write exceptions', async () => {
    vi.spyOn(input, 'end').mockImplementation(() => {
      throw new Error(credentials.password);
    });
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
    complete(null, '0', '');
  });

  it('contains asynchronous input errors, even if the process later reports success', async () => {
    const result = createFileSystemConnection(connectionInfo);
    input.emit('error', new Error(credentials.password));
    complete(null, '0', '');
    expect(await result).toEqual(genericFailure);
  });

  it('reports failure if the credential pipe is unavailable', async () => {
    child.stdin = null;
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
  });

  it('contains asset-resolution exceptions', async () => {
    vi.mocked(getExtensionAssetPath).mockImplementation(() => {
      throw new Error(credentials.password);
    });
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('reports failure when the Windows system directory is unavailable', async () => {
    vi.stubEnv('SystemRoot', undefined);
    expect(await createFileSystemConnection(connectionInfo)).toEqual(genericFailure);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it.each(['linux', 'darwin'] as const)('does not launch the Windows adapter on %s', async (os) => {
    vi.mocked(platform).mockReturnValue(os);
    expect(await createFileSystemConnection(connectionInfo)).toEqual({
      errorMessage: 'File system connections to SMB shares are supported only on Windows.',
    });
    expect(mockExecFile).not.toHaveBeenCalled();
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
    expect(mockExecFile).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('CWE532-CANARY');
  });
});

describe.skipIf(process.platform !== 'win32')('bundled Windows SMB helper', () => {
  function getScriptPath(): string {
    return path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'assets', 'scripts', 'connect-smb-share.ps1');
  }

  async function getScript(): Promise<string> {
    const fs = await vi.importActual<typeof import('fs')>('fs');
    return fs.readFileSync(getScriptPath(), 'utf8');
  }

  async function runScript(script: string, input: string): Promise<{ code: number | string | undefined; stdout: string; stderr: string }> {
    const cp = await vi.importActual<typeof import('child_process')>('child_process');
    return new Promise((resolve, reject) => {
      const child = cp.execFile(
        path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
        { encoding: 'utf8', timeout: 15000, windowsHide: true },
        (error, stdout, stderr) => resolve({ code: error?.code ?? undefined, stdout, stderr })
      );
      child.stdin?.on('error', reject);
      child.stdin?.end(input, 'utf8');
    });
  }

  function withFakeApi(script: string, body: string): string {
    return script.replace(
      /Add-Type -TypeDefinition @'[\s\S]*?\r?\n'@/,
      `Add-Type -TypeDefinition @'\nusing System;\nusing System.Text;\npublic static class LogicAppsSmbConnection {\npublic static uint Connect(string rootFolder, string username, string password) {\n${body}\n}\n}\n'@`
    );
  }

  it('contains a real native failure through the production process and stdin path', async () => {
    const cp = await vi.importActual<typeof import('child_process')>('child_process');
    mockExecFile.mockImplementation(cp.execFile);
    vi.mocked(platform).mockReturnValue('win32');
    vi.mocked(getExtensionAssetPath).mockReturnValue(getScriptPath());
    const response = await createFileSystemConnection({ connectionParameters: { ...credentials, rootFolder: '\\\\' } });
    expect(response.connection).toBeUndefined();
    expect(response.errorMessage).toBeTruthy();
    expect(JSON.stringify(response)).not.toContain('CWE532-CANARY');
    expect(JSON.stringify(mockExecFile.mock.lastCall?.slice(0, 3))).not.toContain('CWE532-CANARY');
  }, 20000);

  it('preserves Unicode and shell metacharacters through the real PowerShell stdin reader', async () => {
    const expectedBytes = Buffer.from([credentials.rootFolder, credentials.username, credentials.password].join('\0'), 'utf8');
    const script = withFakeApi(
      await getScript(),
      `var expected = new byte[] { ${expectedBytes.join(', ')} };
      var actual = Encoding.UTF8.GetBytes(rootFolder + "\\0" + username + "\\0" + password);
      if (actual.Length != expected.Length) { throw new Exception("Credentials were not transported intact."); }
      for (var index = 0; index < expected.Length; index++) {
        if (actual[index] != expected[index]) { throw new Exception("Credentials were not transported intact."); }
      }
      return 0;`
    );
    expect(await runScript(script, JSON.stringify(credentials))).toEqual({ code: undefined, stdout: '0\r\n', stderr: '' });
  }, 20000);

  it('returns only the numeric API status', async () => {
    const script = withFakeApi(await getScript(), 'return 1219;');
    expect(await runScript(script, JSON.stringify(credentials))).toEqual({ code: undefined, stdout: '1219\r\n', stderr: '' });
  }, 20000);

  it('suppresses exceptions containing credentials in the helper itself', async () => {
    const script = withFakeApi(await getScript(), 'throw new Exception(password);');
    expect(await runScript(script, JSON.stringify(credentials))).toEqual({
      code: 1,
      stdout: '',
      stderr: 'Unable to create the file system connection.\r\n',
    });
  }, 20000);

  it('suppresses malformed JSON diagnostics', async () => {
    expect(await runScript(await getScript(), credentials.password)).toEqual({
      code: 1,
      stdout: '',
      stderr: 'Unable to create the file system connection.\r\n',
    });
  }, 20000);

  it('compiles the shipped P/Invoke and reports an invalid resource without contacting an SMB server', async () => {
    const script = await getScript();
    const interop = script.match(/Add-Type -TypeDefinition @'[\s\S]*?\r?\n'@/)?.[0];
    expect(interop).toBeTruthy();
    const result = await runScript(
      `${interop}\n[Console]::Out.WriteLine([LogicAppsSmbConnection]::Connect('invalid-resource', '', ''))`,
      ''
    );
    expect(result.code).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toMatch(/^[1-9]\d*$/);
  }, 20000);
});
