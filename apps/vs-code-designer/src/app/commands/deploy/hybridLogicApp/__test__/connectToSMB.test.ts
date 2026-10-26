import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs-extra', () => ({
  copy: vi.fn(() => Promise.resolve()),
  ensureDir: vi.fn(() => Promise.resolve()),
  pathExists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/\{(\d+)\}/g, (_match: string, index: string) => String(args[Number(index)]))
  ),
}));

vi.mock('../../../../utils/funcCoreTools/cpUtils', () => ({
  executeCommandWithSanityLogging: vi.fn(() => Promise.resolve('')),
}));

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

vi.mock('../../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(() => Promise.resolve('project')),
}));

vi.mock('../../../workflows/switchDebugMode/switchDebugMode', () => ({
  getWorkspaceFolderPath: vi.fn(() => Promise.resolve('workspace')),
}));

vi.mock('../../../../utils/codeless/common', () => ({
  getArtifactsPathInLocalProject: vi.fn(() =>
    Promise.resolve({
      maps: [{ path: 'project/artifacts/map.xslt', name: 'map.xslt' }],
      rules: [{ path: 'project/artifacts/rule.json', name: 'rule.json' }],
      schemas: [{ path: 'project/artifacts/schema.json', name: 'schema.json' }],
    })
  ),
  getWorkflowsPathInLocalProject: vi.fn(() => Promise.resolve([{ path: 'project/workflows/workflowA', name: 'workflowA' }])),
}));

import * as fse from 'fs-extra';
import * as path from 'path';
import { executeCommandWithSanityLogging } from '../../../../utils/funcCoreTools/cpUtils';
import { tryGetLogicAppProjectRoot } from '../../../../utils/verifyIsProject';
import { ext } from '../../../../../extensionVariables';
import { connectToSMB } from '../connectToSMB';

const originalPlatform = process.platform;

const setPlatform = (platform: string): void => {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
};

const credential = 'credential-value';
const node = {
  fileShare: {
    hostName: 'storage',
    password: credential,
    path: 'share',
    userName: 'storage-user',
  },
};

describe('connectToSMB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fse.pathExists).mockResolvedValue(true);
    vi.mocked(executeCommandWithSanityLogging).mockResolvedValue('');
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('mounts Windows SMB shares with sanitized logging and uploads project files', async () => {
    setPlatform('win32');

    await connectToSMB({} as any, node as any, 'site/wwwroot', 'Z:');

    expect(executeCommandWithSanityLogging).toHaveBeenCalledWith(
      undefined,
      undefined,
      'net use Z: \\\\storage\\share /user:storage-user',
      `net use Z: \\\\storage\\share ${credential} /user:storage-user`
    );
    const [sanitizedCommand, rawCommand] = vi.mocked(executeCommandWithSanityLogging).mock.calls[0].slice(2);
    expect(sanitizedCommand).not.toContain(credential);
    expect(rawCommand).toContain(credential);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Connecting to logic app SMB storage...');
    expect(fse.ensureDir).toHaveBeenCalledWith(path.join('Z:', 'site/wwwroot'));
    expect(fse.copy).toHaveBeenCalledWith('project/workflows/workflowA', path.join('Z:', 'site/wwwroot', 'workflowA', 'workflow.json'), {
      overwrite: true,
    });
    expect(fse.copy).toHaveBeenCalledWith('project/artifacts/map.xslt', path.join('Z:', 'site/wwwroot', 'Artifacts', 'Maps', 'map.xslt'), {
      overwrite: true,
    });
    expect(fse.copy).toHaveBeenCalledWith(path.join('project', 'lib'), path.join('Z:', 'site/wwwroot', 'lib'), { overwrite: true });
  });

  it('sanitizes macOS SMB mount commands', async () => {
    setPlatform('darwin');

    await connectToSMB({} as any, node as any, 'site/wwwroot', '/Volumes/logicapp');

    expect(executeCommandWithSanityLogging).toHaveBeenCalledWith(
      undefined,
      undefined,
      'open smb://storage-user@storage/share',
      `open smb://storage-user:${credential}@storage/share`
    );
  });

  it('sanitizes Linux CIFS mount command logging', async () => {
    setPlatform('linux');

    await connectToSMB({} as any, node as any, 'site/wwwroot', '/mnt/logicapp');

    const [, , sanitizedCommand, rawCommand] = vi.mocked(executeCommandWithSanityLogging).mock.calls[0];
    expect(sanitizedCommand).toContain('mount -t cifs //storage/share /mnt/test -o username=storage-user');
    expect(sanitizedCommand).toContain('pass=REDACTED');
    expect(sanitizedCommand).toContain('dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30');
    expect(sanitizedCommand).not.toContain(credential);
    expect(rawCommand).toContain('mount -t cifs');
    expect(rawCommand).toContain('username=storage-user');
    expect(rawCommand).toContain(`pass=${credential}`);
  });

  it('wraps mount failures with upload context and skips project discovery', async () => {
    setPlatform('win32');
    vi.mocked(executeCommandWithSanityLogging).mockRejectedValue(new Error('mount denied'));

    await expect(connectToSMB({} as any, node as any, 'site/wwwroot', 'Z:')).rejects.toThrow('Error uploading files to SMB: mount denied');

    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(fse.ensureDir).not.toHaveBeenCalled();
  });
});
