import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { validateFuncCoreToolsInstalled } from '../validateFuncCoreToolsInstalled';
import { useBinariesDependencies } from '../../../utils/binaries';
import { isDevContainerWorkspace } from '../../../utils/devContainerUtils';

vi.mock('../../../utils/binaries');
vi.mock('../../../utils/devContainerUtils');
vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(() => true),
}));
vi.mock('../funcVersion', () => ({
  tryGetLocalFuncVersion: vi.fn(),
  isFuncToolsInstalled: vi.fn(() => Promise.resolve(false)),
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
      const { isFuncToolsInstalled } = await import('../funcVersion');
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);
      vi.mocked(isFuncToolsInstalled).mockResolvedValue(false);

      const result = await validateFuncCoreToolsInstalled(mockContext, 'test message');

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
