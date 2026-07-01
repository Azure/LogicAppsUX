import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    npmCliPath: 'npm',
    nodeJsCliPath: 'node',
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../../funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../../../constants', async () => {
  const actual = await vi.importActual<typeof import('../../../../constants')>('../../../../constants');
  return {
    ...actual,
    autoRuntimeDependenciesPathSettingKey: 'autoRuntimeDependenciesPath',
    nodeJsBinaryPathSettingKey: 'nodeJsBinaryPath',
    nodeJsDependencyName: 'NodeJs',
  };
});

import * as fs from 'fs';
import * as path from 'path';
import { getNpmCommand, getNodeJsCommand, setNodeJsCommand } from '../nodeJsVersion';
import { getGlobalSetting, updateGlobalSetting } from '../../vsCodeConfig/settings';

const BIN_ROOT = '/usr/local/azurelogicapps/dependencies';
const NODE_DIR = path.join(BIN_ROOT, 'NodeJs');
const NODE_VER_FOLDER = 'node-v18.0.0-linux-x64';

describe('nodeJsVersion - cross-platform binary path resolution', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform) => {
    vi.stubGlobal('process', { ...process, platform });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getNpmCommand', () => {
    it('returns the system npm when no binaries location is configured', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);

      expect(getNpmCommand()).toBe('npm');
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('returns the system npm when the binaries directory does not exist', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(getNpmCommand()).toBe('npm');
      expect(fs.existsSync).toHaveBeenCalledWith(NODE_DIR);
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('returns the root-level npm path on Windows when binaries exist', () => {
      setPlatform(Platform.windows as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(getNpmCommand()).toBe(path.join(NODE_DIR, 'npm'));
      // Critical assertion: on Windows we never look for the node-v* subfolder
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('returns the <node-v*>/bin/npm path on Linux and reads the binaries directory (not an executable path)', () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['node-v18.0.0-linux-x64.tar.gz', NODE_VER_FOLDER, 'README.md'] as never);
      vi.mocked(fs.statSync).mockImplementation((p) => ({ isDirectory: () => String(p).endsWith(NODE_VER_FOLDER) }) as fs.Stats);

      const result = getNpmCommand();

      expect(result).toBe(path.join(NODE_DIR, NODE_VER_FOLDER, 'bin', 'npm'));
      // Regression guard: getNodeSubFolder must read the binaries directory,
      // not the executable path joined earlier.
      expect(fs.readdirSync).toHaveBeenCalledWith(NODE_DIR);
      expect(fs.readdirSync).not.toHaveBeenCalledWith(path.join(NODE_DIR, 'npm'));
    });

    it('returns the <node-v*>/bin/npm path on macOS', () => {
      setPlatform(Platform.mac as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([NODE_VER_FOLDER] as never);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      expect(getNpmCommand()).toBe(path.join(NODE_DIR, NODE_VER_FOLDER, 'bin', 'npm'));
      expect(fs.readdirSync).toHaveBeenCalledWith(NODE_DIR);
      expect(fs.readdirSync).not.toHaveBeenCalledWith(path.join(NODE_DIR, 'npm'));
    });

    it('falls back to the system npm on Linux when no node-v* subfolder is found', () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['something-else'] as never);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      expect(getNpmCommand()).toBe('npm');
    });

    it('falls back to the system npm on Linux when readdirSync throws', () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('permission denied');
      });

      expect(getNpmCommand()).toBe('npm');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'permission denied');
    });
  });

  describe('setNodeJsCommand', () => {
    it('writes ext.nodeJsCliPath when no binaries location is configured', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', 'node');
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('writes ext.nodeJsCliPath when the binaries directory does not exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', 'node');
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('writes the root-level node path on Windows and does not chmod the binaries directory', async () => {
      setPlatform(Platform.windows as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', path.join(NODE_DIR, 'node.exe'));
      expect(fs.chmodSync).not.toHaveBeenCalled();
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('writes the <node-v*>/bin/node path on Linux, reads the binaries directory, and chmods it', async () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([NODE_VER_FOLDER] as never);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', path.join(NODE_DIR, NODE_VER_FOLDER, 'bin', 'node'));
      expect(fs.readdirSync).toHaveBeenCalledWith(NODE_DIR);
      expect(fs.readdirSync).not.toHaveBeenCalledWith(path.join(NODE_DIR, 'node'));
      expect(fs.chmodSync).toHaveBeenCalledWith(NODE_DIR, 0o777);
    });

    it('writes the <node-v*>/bin/node path on macOS and chmods the binaries directory', async () => {
      setPlatform(Platform.mac as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([NODE_VER_FOLDER] as never);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', path.join(NODE_DIR, NODE_VER_FOLDER, 'bin', 'node'));
      expect(fs.chmodSync).toHaveBeenCalledWith(NODE_DIR, 0o777);
      expect(fs.readdirSync).toHaveBeenCalledWith(NODE_DIR);
      expect(fs.readdirSync).not.toHaveBeenCalledWith(path.join(NODE_DIR, 'node'));
    });

    it('writes ext.nodeJsCliPath on Linux when no node-v* subfolder is found', async () => {
      setPlatform(Platform.linux as NodeJS.Platform);
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['something-else'] as never);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      await setNodeJsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', 'node');
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });
  });

  describe('getNodeJsCommand', () => {
    it('returns the workspace setting when set', () => {
      vi.mocked(getGlobalSetting).mockReturnValue('/custom/path/to/node');
      expect(getNodeJsCommand()).toBe('/custom/path/to/node');
    });

    it('falls back to ext.nodeJsCliPath when the setting is undefined', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);
      expect(getNodeJsCommand()).toBe('node');
    });
  });
});
