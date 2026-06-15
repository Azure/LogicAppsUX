import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fse from 'fs-extra';
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue } from '../../../constants';
import { ensureRuntimeDependenciesPath } from '../runtimeDependenciesPath';
import { getGlobalSetting, updateGlobalSetting } from '../vsCodeConfig/settings';

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

describe('ensureRuntimeDependenciesPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(updateGlobalSetting).mockResolvedValue(undefined);
  });

  it('defaults the dependency path setting and creates the default directory when unset', async () => {
    vi.mocked(getGlobalSetting).mockReturnValue(undefined);

    const result = await ensureRuntimeDependenciesPath();

    expect(result).toBe(defaultDependencyPathValue);
    expect(updateGlobalSetting).toHaveBeenCalledWith(autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue);
    expect(fse.ensureDir).toHaveBeenCalledWith(defaultDependencyPathValue);
  });

  it('preserves and creates a configured dependency path', async () => {
    const configuredPath = 'D:\\custom-dependencies';
    vi.mocked(getGlobalSetting).mockReturnValue(configuredPath);

    const result = await ensureRuntimeDependenciesPath();

    expect(result).toBe(configuredPath);
    expect(updateGlobalSetting).not.toHaveBeenCalled();
    expect(fse.ensureDir).toHaveBeenCalledWith(configuredPath);
  });
});
