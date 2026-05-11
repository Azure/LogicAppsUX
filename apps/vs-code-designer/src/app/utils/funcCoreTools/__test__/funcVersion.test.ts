import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    funcCliPath: 'func',
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSettingFromAnyFolder: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../cpUtils', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../../../constants', async () => {
  const actual = await vi.importActual<typeof import('../../../../constants')>('../../../../constants');
  return {
    ...actual,
    autoRuntimeDependenciesPathSettingKey: 'autoRuntimeDependenciesPath',
    funcCoreToolsBinaryPathSettingKey: 'funcCoreToolsBinaryPath',
    funcDependencyName: 'FuncCoreTools',
  };
});

import * as fs from 'fs';
import * as path from 'path';
import { setFunctionsCommand, getFunctionsCommand } from '../funcVersion';
import { getGlobalSetting, updateGlobalSetting } from '../../vsCodeConfig/settings';

const BIN_ROOT = '/usr/local/azurelogicapps/dependencies';
const FUNC_DIR = path.join(BIN_ROOT, 'FuncCoreTools');
const FUNC_EXE = path.join(FUNC_DIR, 'func');

describe('funcVersion - command resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setFunctionsCommand', () => {
    it('writes ext.funcCliPath when no binaries location is configured', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('writes ext.funcCliPath when the func binaries directory does not exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_DIR);
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('writes the joined func path and chmods only the directory when the executable is missing', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockImplementation((p) => p === FUNC_DIR);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', FUNC_EXE);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_DIR, 0o777);
      expect(fs.chmodSync).not.toHaveBeenCalledWith(FUNC_EXE, 0o777);
    });

    it('writes the joined func path and chmods both the directory and the executable when both exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', FUNC_EXE);
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_DIR);
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_EXE);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_DIR, 0o777);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_EXE, 0o777);
    });
  });

  describe('getFunctionsCommand', () => {
    it('returns the configured binary path when set', () => {
      vi.mocked(getGlobalSetting).mockReturnValue('/custom/path/to/func');
      expect(getFunctionsCommand()).toBe('/custom/path/to/func');
    });

    it('throws when the binary path setting is empty', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined);
      expect(() => getFunctionsCommand()).toThrow('Functions Core Tools Binary Path Setting is empty');
    });
  });
});
