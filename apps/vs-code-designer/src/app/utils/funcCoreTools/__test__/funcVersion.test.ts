/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: vi.fn((_key: string, defaultValue: string) => defaultValue),
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSettingFromAnyFolder: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    funcCliPath: 'func',
  },
}));

vi.mock('../cpUtils', () => ({
  executeCommand: vi.fn(),
}));

import * as fs from 'fs';
import { FuncVersion, latestGAVersion } from '@microsoft/vscode-extension-logic-apps';
import { getGlobalSetting, getWorkspaceSettingFromAnyFolder, updateGlobalSetting } from '../../vsCodeConfig/settings';
import { executeCommand } from '../cpUtils';
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

describe('getFunctionsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the global setting value when it is populated', () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'funcCoreToolsBinaryPath') {
        return '/configured/func' as any;
      }
      return undefined;
    });

    expect(getFunctionsCommand()).toBe('/configured/func');
  });

  it('self-heals by inspecting the local binaries folder when the setting is empty', () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'funcCoreToolsBinaryPath') {
        return undefined;
      }
      if (key === 'autoRuntimeDependenciesPath') {
        return '/cache/dependencies' as any;
      }
      return undefined;
    });
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      const value = String(p);
      // path.join on Windows uses backslashes; on POSIX, forward slashes. Accept either.
      return value.includes('FuncCoreTools');
    });

    const command = getFunctionsCommand();
    expect(command).toContain('FuncCoreTools');
    expect(command.endsWith('func')).toBe(true);
  });

  it('throws when the setting is empty and the local binaries are not yet on disk', () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'funcCoreToolsBinaryPath') {
        return undefined;
      }
      if (key === 'autoRuntimeDependenciesPath') {
        return '/cache/dependencies' as any;
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

describe('function runtime version helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sets the function command from installed binaries or falls back to the bundled command', async () => {
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'autoRuntimeDependenciesPath') {
        return '/cache/dependencies' as any;
      }
      return undefined;
    });
    vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);

    await setFunctionsCommand();

    expect(fs.chmodSync).toHaveBeenCalledTimes(2);
    expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', expect.stringContaining('FuncCoreTools'));

    vi.clearAllMocks();
    vi.mocked(getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'autoRuntimeDependenciesPath') {
        return '/cache/dependencies' as any;
      }
      return undefined;
    });
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await setFunctionsCommand();

    expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
  });
});
