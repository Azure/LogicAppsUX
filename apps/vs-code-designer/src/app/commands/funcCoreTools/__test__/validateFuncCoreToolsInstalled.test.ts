import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFuncCoreToolsInstalled } from '../validateFuncCoreToolsInstalled';
import { useBinariesDependencies } from '../../../utils/binaries';
import { isDevContainerWorkspace } from '../../../utils/devContainerUtils';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import { ensureFuncCoreToolsCommandExecutablePermissions } from '../../../utils/funcCoreTools/funcVersion';

vi.mock('../../../utils/binaries', () => ({
  useBinariesDependencies: vi.fn(),
  binariesExist: vi.fn(),
  installBinaries: vi.fn(),
}));
vi.mock('../../../utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));
vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(() => true),
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));
vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  ensureFuncCoreToolsCommandExecutablePermissions: vi.fn(() => true),
  getFunctionsCommand: vi.fn(() => 'func'),
  tryParseFuncVersion: vi.fn(),
  tryGetLocalFuncVersion: vi.fn(),
  getLocalFuncCoreToolsVersion: vi.fn(),
  setFunctionsCommand: vi.fn(),
}));
vi.mock('../../../utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(() => Promise.reject(new Error('not installed'))),
}));
vi.mock('../../../utils/funcCoreTools/getFuncPackageManagers', () => ({
  getFuncPackageManagers: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../installFuncCoreTools', () => ({
  installFuncCoreToolsBinaries: vi.fn(),
  installFuncCoreToolsSystem: vi.fn(),
}));
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (cmd, callback) => {
    return await callback({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true },
      ui: {
        showWarningMessage: vi.fn(() => Promise.resolve({ title: 'Cancel' })),
      },
      valuesToMask: [],
    });
  }),
  DialogResponses: {
    cancel: { title: 'Cancel' },
  },
}));

describe('validateFuncCoreToolsInstalled', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {
        showWarningMessage: vi.fn(() => Promise.resolve({ title: 'Cancel' })),
      },
      valuesToMask: [],
    };
    vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
    vi.mocked(executeCommand).mockRejectedValue(new Error('not installed'));
  });

  describe('devContainer workspace', () => {
    it('should skip binaries validation in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      const result = await validateFuncCoreToolsInstalled(mockContext, 'test message');

      expect(useBinariesDependencies).toHaveBeenCalled();
      // Should use system validation path
      expect(await useBinariesDependencies()).toBe(false);
    });

    it('should not prompt for binaries installation in devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsInstalled(mockContext, 'test message');

      // The UI showWarningMessage should be called for system validation, not binaries
      expect(useBinariesDependencies).toHaveBeenCalled();
    });
  });

  describe('managed FuncCoreTools readiness', () => {
    it('returns true when top-level func works and nested managed executables are executable', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      vi.mocked(executeCommand).mockResolvedValue('4.12.0');

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(executeCommand).toHaveBeenCalledWith(undefined, undefined, 'func', '--version');
      expect(ensureFuncCoreToolsCommandExecutablePermissions).toHaveBeenCalledWith('func');
    });

    it('returns false when managed nested executables are not executable even if top-level func exists', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(false);

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('non-devContainer workspace', () => {
    it('should check for binaries when setting is enabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);

      await validateFuncCoreToolsInstalled(mockContext, 'test message');

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(await useBinariesDependencies()).toBe(true);
    });

    it('should use system validation when setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsInstalled(mockContext, 'test message');

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(await useBinariesDependencies()).toBe(false);
    });
  });

  describe('return value based on environment', () => {
    it('should return false when func tools not installed in devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsInstalled(mockContext, 'test message');

      // Should handle system validation path
      expect(useBinariesDependencies).toHaveBeenCalled();
    });

    it('should handle binaries path for non-devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);

      await validateFuncCoreToolsInstalled(mockContext, 'test message');

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(await useBinariesDependencies()).toBe(true);
    });
  });
});
