/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
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
import { getGlobalSetting } from '../../vsCodeConfig/settings';
import { getFunctionsCommand } from '../funcVersion';

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
