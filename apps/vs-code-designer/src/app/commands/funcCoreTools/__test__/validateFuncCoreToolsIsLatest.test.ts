import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { validateFuncCoreToolsIsLatest } from '../validateFuncCoreToolsIsLatest';
import { useBinariesDependencies, binariesExist } from '../../../utils/binaries';
import { isDevContainerWorkspace } from '../../../utils/devContainerUtils';

vi.mock('../../../utils/binaries');
vi.mock('../../../utils/devContainerUtils');
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (cmd, callback) => {
    return await callback({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true },
      ui: {},
      valuesToMask: [],
    });
  }),
}));

describe('validateFuncCoreToolsIsLatest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('devContainer workspace', () => {
    it('should skip binaries validation in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);
      vi.mocked(binariesExist).mockResolvedValue(false);

      // Should not throw and should call system validation
      await validateFuncCoreToolsIsLatest('4');

      expect(useBinariesDependencies).toHaveBeenCalled();
      // binariesExist should not be called because useBinariesDependencies returned false
      expect(binariesExist).not.toHaveBeenCalled();
    });

    it('should use system validation when devContainer is detected', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsIsLatest();

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(await useBinariesDependencies()).toBe(false);
    });
  });

  describe('non-devContainer workspace', () => {
    it('should use binaries validation when setting is enabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(binariesExist).mockResolvedValue(true);

      await validateFuncCoreToolsIsLatest('4');

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(binariesExist).toHaveBeenCalled();
    });

    it('should use system validation when setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsIsLatest();

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(await useBinariesDependencies()).toBe(false);
    });
  });

  describe('binariesExist behavior', () => {
    it('should call binariesExist when using binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(binariesExist).mockResolvedValue(true);

      await validateFuncCoreToolsIsLatest('4');

      expect(binariesExist).toHaveBeenCalledWith('func');
    });

    it('should not call binariesExist when not using binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsIsLatest();

      expect(binariesExist).not.toHaveBeenCalled();
    });
  });
});
