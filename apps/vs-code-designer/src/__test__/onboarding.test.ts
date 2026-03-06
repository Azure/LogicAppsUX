import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onboardBinaries } from '../onboarding';
import { useBinariesDependencies } from '../app/utils/binaries';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { validateTasksJson } from '../app/utils/vsCodeConfig/tasks';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

// Factory mocks required to break problematic import chains:
// - binaries: circular dep with onboarding.ts
// - startDesignTimeApi: breaks chain → common.ts → azureConnectorWizard.ts → AzureWizardPromptStep
vi.mock('../app/utils/binaries', () => ({
  installBinaries: vi.fn(),
  useBinariesDependencies: vi.fn(),
  binariesExist: vi.fn(),
}));
vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
}));
// Auto-mocks: no problematic transitive imports once the above chains are broken.
vi.mock('../app/commands/binaries/validateAndInstallBinaries');
vi.mock('../app/utils/vsCodeConfig/tasks');
vi.mock('../app/utils/devContainerUtils');
vi.mock('../app/utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (ctx, cmd, callback) => await callback()),
}));
// @microsoft/vscode-azext-utils is already mocked in test-setup.ts with AzureWizardPromptStep, etc.

describe('onboardBinaries', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      telemetry: {
        properties: {},
        measurements: {},
      },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    } as any;
  });

  describe('devContainer workspace behavior', () => {
    it('should skip binaries validation in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await onboardBinaries(mockContext);

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      expect(validateTasksJson).not.toHaveBeenCalled();
    });

    it('should not set lastStep when skipping in devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await onboardBinaries(mockContext);

      expect(mockContext.telemetry.properties.lastStep).toBeUndefined();
    });
  });

  describe('non-devContainer workspace behavior', () => {
    it('should validate and install binaries when setting is enabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(useBinariesDependencies).toHaveBeenCalled();
      expect(validateAndInstallBinaries).toHaveBeenCalled();
      expect(validateTasksJson).toHaveBeenCalled();
    });

    it('should set telemetry lastStep when validating binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(mockContext.telemetry.properties.lastStep).toBeDefined();
    });

    it('should not validate when setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      expect(validateTasksJson).not.toHaveBeenCalled();
    });
  });

  describe('validateTasksJson integration', () => {
    it('should call validateTasksJson with workspace folders when binaries are enabled', async () => {
      const vscode = await import('vscode');
      const mockWorkspaceFolders = [{ uri: { fsPath: '/test/path' } }];
      (vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(validateTasksJson).toHaveBeenCalledWith(expect.any(Object), mockWorkspaceFolders);
    });

    it('should not call validateTasksJson in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);

      await onboardBinaries(mockContext);

      expect(validateTasksJson).not.toHaveBeenCalled();
    });
  });
});
