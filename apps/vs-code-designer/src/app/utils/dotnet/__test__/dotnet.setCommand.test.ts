import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  chmodSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('semver', () => ({
  clean: vi.fn(),
  maxSatisfying: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzExtFsExtra: { pathExists: vi.fn(), readFile: vi.fn() },
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    dotNetCliPath: 'dotnet',
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  updateWorkspaceSetting: vi.fn(),
}));

vi.mock('../../workspace', () => ({
  findFiles: vi.fn().mockResolvedValue([]),
  getWorkspaceLogicAppFolders: vi.fn(),
}));

vi.mock('../../funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../telemetry', () => ({
  runWithDurationTelemetry: (_ctx: unknown, _name: string, fn: () => unknown) => fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));

vi.mock('../../../../constants', async () => {
  const actual = await vi.importActual<typeof import('../../../../constants')>('../../../../constants');
  return {
    ...actual,
    autoRuntimeDependenciesPathSettingKey: 'autoRuntimeDependenciesPath',
    dotNetBinaryPathSettingKey: 'dotNetBinaryPath',
    dotnetDependencyName: 'DotNetSDK',
  };
});

import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { setDotNetCommand, getDotNetCommand, getLocalDotNetVersionFromBinaries } from '../dotnet';
import { getGlobalSetting, updateGlobalSetting, updateWorkspaceSetting } from '../../vsCodeConfig/settings';
import { getWorkspaceLogicAppFolders } from '../../workspace';

const BIN_ROOT = '/usr/local/azurelogicapps/dependencies';
const DOTNET_DIR = path.join(BIN_ROOT, 'DotNetSDK');

describe('dotnet command resolution', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform) => {
    vi.stubGlobal('process', { ...process, platform });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue([]);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    vi.unstubAllGlobals();
  });

  describe('setDotNetCommand', () => {
    it('writes ext.dotNetCliPath and short-circuits when no binaries location is configured', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', 'dotnet');
      expect(getWorkspaceLogicAppFolders).not.toHaveBeenCalled();
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('writes ext.dotNetCliPath when the dotnet binaries directory does not exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', 'dotnet');
      expect(fs.chmodSync).not.toHaveBeenCalled();
      expect(getWorkspaceLogicAppFolders).not.toHaveBeenCalled();
    });

    it('writes <dotNetBinariesPath>/dotnet.exe on Windows and updates terminal.integrated.env.windows for each workspace', async () => {
      setPlatform(Platform.windows as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue(['C:/projects/logic-app']);

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', path.join(DOTNET_DIR, 'dotnet.exe'));
      expect(fs.chmodSync).toHaveBeenCalledWith(DOTNET_DIR, 0o777);
      expect(updateWorkspaceSetting).toHaveBeenCalledWith(
        'integrated.env.windows',
        expect.objectContaining({ PATH: expect.stringContaining(DOTNET_DIR) }),
        'C:/projects/logic-app',
        'terminal'
      );
      expect(updateWorkspaceSetting).toHaveBeenCalledWith('dotNetCliPaths', [DOTNET_DIR], 'C:/projects/logic-app', 'omnisharp');
    });

    it('writes <dotNetBinariesPath>/dotnet on Linux and updates terminal.integrated.env.linux', async () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue(['/home/me/logic-app']);

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', path.join(DOTNET_DIR, 'dotnet'));
      expect(updateWorkspaceSetting).toHaveBeenCalledWith(
        'integrated.env.linux',
        expect.objectContaining({ PATH: expect.stringContaining(DOTNET_DIR) }),
        '/home/me/logic-app',
        'terminal'
      );
    });

    it('writes <dotNetBinariesPath>/dotnet on macOS and updates terminal.integrated.env.osx', async () => {
      setPlatform(Platform.mac as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue(['/Users/me/logic-app']);

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', path.join(DOTNET_DIR, 'dotnet'));
      expect(updateWorkspaceSetting).toHaveBeenCalledWith(
        'integrated.env.osx',
        expect.objectContaining({ PATH: expect.stringContaining(DOTNET_DIR) }),
        '/Users/me/logic-app',
        'terminal'
      );
    });

    it('still writes the global setting when getWorkspaceLogicAppFolders throws', async () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(getWorkspaceLogicAppFolders).mockRejectedValue(new Error('boom'));

      await setDotNetCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotNetBinaryPath', path.join(DOTNET_DIR, 'dotnet'));
    });
  });

  describe('getDotNetCommand', () => {
    it('returns the configured binary path when set', () => {
      vi.mocked(getGlobalSetting).mockReturnValue('/custom/path/to/dotnet');
      expect(getDotNetCommand()).toBe('/custom/path/to/dotnet');
    });

    it('falls back to ext.dotNetCliPath when the setting is undefined', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);
      expect(getDotNetCommand()).toBe('dotnet');
    });
  });

  describe('getLocalDotNetVersionFromBinaries', () => {
    it('returns null when no binaries location is configured and no major version is provided', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);

      const result = await getLocalDotNetVersionFromBinaries();

      expect(result).toBeNull();
    });

    it('returns null when a major version is provided but the sdk folder does not exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await getLocalDotNetVersionFromBinaries('8');

      expect(result).toBeNull();
    });

    it('returns the matching version when a major version is provided and a matching folder exists', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: '8.0.100', isDirectory: () => true },
        { name: 'host', isDirectory: () => false },
      ] as never);
      vi.mocked(semver.maxSatisfying).mockReturnValue('8.0.100' as never);

      const result = await getLocalDotNetVersionFromBinaries('8');

      expect(result).toBe('8.0.100');
    });

    it('returns null when a major version is provided but no folder satisfies the range', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([{ name: '6.0.100', isDirectory: () => true }] as never);
      vi.mocked(semver.maxSatisfying).mockReturnValue(null as never);

      const result = await getLocalDotNetVersionFromBinaries('8');

      expect(result).toBeNull();
    });
  });
});
