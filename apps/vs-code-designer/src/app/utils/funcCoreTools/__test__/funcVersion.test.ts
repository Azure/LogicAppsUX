/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
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
import { FuncVersion, latestGAVersion } from '@microsoft/vscode-extension-logic-apps';
import { executeCommand } from '../cpUtils';
import { getGlobalSetting, getWorkspaceSettingFromAnyFolder, updateGlobalSetting } from '../../vsCodeConfig/settings';
import {
  addLocalFuncTelemetry,
  checkSupportedFuncVersion,
  getDefaultFuncVersion,
  getFunctionsCommand,
  getLocalFuncCoreToolsVersion,
  setFunctionsCommand,
  tryGetLocalFuncVersion,
  tryGetMajorVersion,
  tryParseFuncVersion,
} from '../funcVersion';

const BIN_ROOT = '/usr/local/azurelogicapps/dependencies';
const FUNC_DIR = path.join(BIN_ROOT, 'FuncCoreTools');
const FUNC_EXE = path.join(FUNC_DIR, 'func');

describe('funcVersion - command resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGlobalSetting).mockReset();
    vi.mocked(getWorkspaceSettingFromAnyFolder).mockReset();
    vi.mocked(updateGlobalSetting).mockReset();
    vi.mocked(executeCommand).mockReset();
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.chmodSync).mockReset();
  });

  describe('getFunctionsCommand', () => {
    it('returns the configured binary path when set', () => {
      vi.mocked(getGlobalSetting).mockImplementation(
        (key: string) => (key === 'funcCoreToolsBinaryPath' ? '/custom/path/to/func' : undefined) as any
      );

      expect(getFunctionsCommand()).toBe('/custom/path/to/func');
    });

    it('self-heals by inspecting the local binaries folder when the setting is empty', () => {
      vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
        if (key === 'funcCoreToolsBinaryPath') {
          return undefined;
        }
        if (key === 'autoRuntimeDependenciesPath') {
          return BIN_ROOT as any;
        }
        return undefined;
      });
      vi.mocked(fs.existsSync).mockImplementation((p: any) => p === FUNC_DIR || p === FUNC_EXE);

      expect(getFunctionsCommand()).toBe(FUNC_EXE);
    });

    it('throws when the setting is empty and the local binaries are not yet on disk', () => {
      vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
        if (key === 'funcCoreToolsBinaryPath') {
          return undefined;
        }
        if (key === 'autoRuntimeDependenciesPath') {
          return BIN_ROOT as any;
        }
        return undefined;
      });
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => getFunctionsCommand()).toThrow('Functions Core Tools Binary Path Setting is empty');
    });

    it('throws when neither the setting nor the dependency path is configured', () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined as any);

      expect(() => getFunctionsCommand()).toThrow('Functions Core Tools Binary Path Setting is empty');
    });
  });

  describe('setFunctionsCommand', () => {
    it('writes ext.funcCliPath when no binaries location is configured', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(undefined as any);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('writes ext.funcCliPath when the func binaries directory does not exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT as any);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_DIR);
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('writes the joined func path and chmods only the directory when the executable is missing', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT as any);
      vi.mocked(fs.existsSync).mockImplementation((p) => p === FUNC_DIR);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', FUNC_EXE);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_DIR, 0o777);
      expect(fs.chmodSync).not.toHaveBeenCalledWith(FUNC_EXE, 0o777);
    });

    it('writes the joined func path and chmods both the directory and the executable when both exist', async () => {
      vi.mocked(getGlobalSetting).mockReturnValue(BIN_ROOT as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await setFunctionsCommand();

      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', FUNC_EXE);
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_DIR);
      expect(fs.existsSync).toHaveBeenCalledWith(FUNC_EXE);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_DIR, 0o777);
      expect(fs.chmodSync).toHaveBeenCalledWith(FUNC_EXE, 0o777);
    });
  });
});

describe('function runtime version helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGlobalSetting).mockReset();
    vi.mocked(getWorkspaceSettingFromAnyFolder).mockReset();
    vi.mocked(executeCommand).mockReset();
  });

  it('parses major versions and supported function versions', () => {
    expect(tryGetMajorVersion('~4')).toBe('4');
    expect(tryGetMajorVersion('v3.0.0')).toBe('3');
    expect(tryGetMajorVersion('not-a-version')).toBeUndefined();
    expect(tryParseFuncVersion('4.0.0')).toBe(FuncVersion.v4);
    expect(tryParseFuncVersion(undefined)).toBeUndefined();
  });

  it('gets the default version from workspace setting, local CLI, or backup', async () => {
    const context = { telemetry: { properties: {}, measurements: {} } } as any;
    vi.mocked(getWorkspaceSettingFromAnyFolder).mockReturnValueOnce('~3' as any);
    await expect(getDefaultFuncVersion(context)).resolves.toBe(FuncVersion.v3);
    expect(context.telemetry.properties.runtimeSource).toBe('VSCodeSetting');

    vi.mocked(getWorkspaceSettingFromAnyFolder).mockReturnValueOnce(undefined as any);
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => (key === 'funcCoreToolsBinaryPath' ? 'func' : undefined) as any);
    vi.mocked(executeCommand).mockResolvedValueOnce('4.0.5198');
    await expect(getDefaultFuncVersion(context)).resolves.toBe(FuncVersion.v4);
    expect(context.telemetry.properties.runtimeSource).toBe('LocalFuncCli');

    vi.mocked(getWorkspaceSettingFromAnyFolder).mockReturnValueOnce(undefined as any);
    vi.mocked(executeCommand).mockRejectedValueOnce(new Error('not installed'));
    await expect(getDefaultFuncVersion(context)).resolves.toBe(latestGAVersion);
    expect(context.telemetry.properties.runtimeSource).toBe('Backup');
  });

  it('gets local function CLI versions from semver output and legacy command output', async () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => (key === 'funcCoreToolsBinaryPath' ? 'func' : undefined) as any);
    vi.mocked(executeCommand).mockResolvedValueOnce('4.0.5198');

    await expect(getLocalFuncCoreToolsVersion()).resolves.toBe('4.0.5198');

    vi.mocked(executeCommand).mockResolvedValueOnce('Azure Functions Core Tools (220.0.0-beta.0)');
    await expect(getLocalFuncCoreToolsVersion()).resolves.toBe('2.0.1-beta.25');

    vi.mocked(executeCommand).mockResolvedValueOnce('Azure Functions Core Tools (3.0.3904)');
    await expect(tryGetLocalFuncVersion()).resolves.toBe(FuncVersion.v3);

    vi.mocked(executeCommand).mockResolvedValueOnce('unparseable output');
    await expect(getLocalFuncCoreToolsVersion()).resolves.toBeNull();

    vi.mocked(executeCommand).mockRejectedValueOnce(new Error('version failed'));
    await expect(getLocalFuncCoreToolsVersion()).resolves.toBeNull();
  });

  it('adds local function telemetry asynchronously', async () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => (key === 'funcCoreToolsBinaryPath' ? 'func' : undefined) as any);
    vi.mocked(executeCommand).mockResolvedValueOnce('4.0.5198');
    const context = { telemetry: { properties: {}, measurements: {} } } as any;

    addLocalFuncTelemetry(context);
    await vi.waitFor(() => expect(context.telemetry.properties.funcCliVersion).toBe('4.0.5198'));

    vi.mocked(executeCommand).mockResolvedValueOnce('unparseable output');
    addLocalFuncTelemetry(context);
    await vi.waitFor(() => expect(context.telemetry.properties.funcCliVersion).toBe('none'));
  });

  it('validates supported versions', () => {
    expect(() => checkSupportedFuncVersion(FuncVersion.v4)).not.toThrow();
    expect(() => checkSupportedFuncVersion('~1' as FuncVersion)).toThrow('not supported');
  });
});
