import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { validateFuncCoreToolsIsLatest } from '../validateFuncCoreToolsIsLatest';
import {
  useBinariesDependencies,
  binariesExist,
  verifyDependencyIntegrity,
  getLatestFunctionCoreToolsVersion,
} from '../../../utils/binaries';
import { isDevContainerWorkspace } from '../../../utils/devContainerUtils';
import { getLocalFuncCoreToolsVersion } from '../../../utils/funcCoreTools/funcVersion';
import { installFuncCoreToolsBinaries } from '../installFuncCoreTools';

// Factory mocks required to break problematic import chains:
// - binaries: circular dep with onboarding.ts
// - startDesignTimeApi: breaks chain → common.ts → azureConnectorWizard.ts → AzureWizardPromptStep
vi.mock('../../../utils/binaries', () => ({
  useBinariesDependencies: vi.fn(),
  binariesExist: vi.fn(),
  getLatestFunctionCoreToolsVersion: vi.fn(),
  verifyDependencyIntegrity: vi.fn(),
  installBinaries: vi.fn(),
  getCpuArchitecture: vi.fn(),
}));
vi.mock('../../../utils/codeless/startDesignTimeApi', () => ({
  startAllDesignTimeApis: vi.fn(),
  stopAllDesignTimeApis: vi.fn(),
}));
// Auto-mocks for modules directly imported by validateFuncCoreToolsIsLatest.ts.
// Without these, the real code runs and hits unmocked vscode APIs (e.g. workspace.getConfiguration).
vi.mock('../../../utils/devContainerUtils');
vi.mock('../../../utils/vsCodeConfig/settings');
vi.mock('../../../utils/funcCoreTools/funcVersion');
vi.mock('../installFuncCoreTools');
vi.mock('../uninstallFuncCoreTools');
vi.mock('../updateFuncCoreTools');
vi.mock('../../../utils/funcCoreTools/getFuncPackageManagers');
vi.mock('../../../utils/funcCoreTools/getNpmDistTag');
vi.mock('../../../utils/funcCoreTools/getBrewPackageName');
vi.mock('../../../utils/requestUtils');
vi.mock('../../../functionsExtension/executeOnFunctionsExt');
// @microsoft/vscode-azext-utils is already mocked in test-setup.ts with
// AzureWizardPromptStep, DialogResponses, parseError, callWithTelemetryAndErrorHandling, etc.

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

      expect(binariesExist).toHaveBeenCalledWith('FuncCoreTools');
    });

    it('should not call binariesExist when not using binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await validateFuncCoreToolsIsLatest();

      expect(binariesExist).not.toHaveBeenCalled();
    });
  });

  describe('on-disk integrity behavior', () => {
    it('reinstalls when binaries exist but the on-disk integrity check fails', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(binariesExist).mockResolvedValue(true);
      vi.mocked(verifyDependencyIntegrity).mockReturnValue(false);

      await validateFuncCoreToolsIsLatest('4');

      expect(verifyDependencyIntegrity).toHaveBeenCalledWith(expect.anything(), 'FuncCoreTools');
      expect(getLocalFuncCoreToolsVersion).not.toHaveBeenCalled();
      expect(getLatestFunctionCoreToolsVersion).not.toHaveBeenCalled();
      expect(installFuncCoreToolsBinaries).toHaveBeenCalled();
    });

    it('does not reinstall when binaries exist, integrity passes, and the version is current', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(binariesExist).mockResolvedValue(true);
      vi.mocked(verifyDependencyIntegrity).mockReturnValue(true);
      vi.mocked(getLocalFuncCoreToolsVersion).mockResolvedValue('4.0.0');
      vi.mocked(getLatestFunctionCoreToolsVersion).mockResolvedValue('4.0.0');

      await validateFuncCoreToolsIsLatest('4');

      expect(installFuncCoreToolsBinaries).not.toHaveBeenCalled();
    });
  });
});
