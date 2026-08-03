import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { shouldValidateAndInstallRuntimeDependencies } from '../app/utils/vsCodeConfig/settings';

vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  shouldValidateAndInstallRuntimeDependencies: vi.fn(),
}));

describe('useBinariesDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(true);
  });
});
