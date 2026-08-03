import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';

vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

describe('useBinariesDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(true);
  });
});
