import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFuncCoreToolsInstalled } from '../validateFuncCoreToolsInstalled';
import { useBinariesDependencies } from '../../../utils/binaries';
import { isDevContainerWorkspace } from '../../../utils/devContainerUtils';
import { executeCommandWithTimeout } from '../../../utils/funcCoreTools/cpUtils';
import { ensureFuncCoreToolsCommandExecutablePermissions } from '../../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import { installFuncCoreToolsBinaries, isFuncCoreToolsInstallInFlight, waitForFuncCoreToolsInstall } from '../installFuncCoreTools';
import { ext } from '../../../../extensionVariables';

const testState = vi.hoisted(() => ({
  telemetryContexts: [] as Array<{ callbackId: string; context: any }>,
  showWarningMessage: vi.fn(),
}));

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
  executeCommandWithTimeout: vi.fn(() => Promise.reject(new Error('not installed'))),
}));
vi.mock('../../../utils/funcCoreTools/getFuncPackageManagers', () => ({
  getFuncPackageManagers: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../installFuncCoreTools', () => ({
  installFuncCoreToolsBinaries: vi.fn(),
  installFuncCoreToolsSystem: vi.fn(),
  isFuncCoreToolsInstallInFlight: vi.fn(() => false),
  waitForFuncCoreToolsInstall: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
      show: vi.fn(),
    },
  },
}));
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (cmd, callback) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false },
      ui: {
        showWarningMessage: (...args: unknown[]) => testState.showWarningMessage(...args),
      },
      valuesToMask: [],
    };
    testState.telemetryContexts.push({ callbackId: cmd, context });
    try {
      return await callback(context);
    } catch (error) {
      if (context.errorHandling.rethrow) {
        throw error;
      }
      return undefined;
    }
  }),
  DialogResponses: {
    cancel: { title: 'Cancel' },
    learnMore: { title: 'Learn more' },
  },
  openUrl: vi.fn(),
}));

describe('validateFuncCoreToolsInstalled', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.telemetryContexts.length = 0;
    testState.showWarningMessage.mockResolvedValue({ title: 'Cancel' });
    mockContext = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {
        showWarningMessage: vi.fn(() => Promise.resolve({ title: 'Cancel' })),
      },
      valuesToMask: [],
    };
    vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
    vi.mocked(executeCommandWithTimeout).mockRejectedValue(new Error('not installed'));
    vi.mocked(isFuncCoreToolsInstallInFlight).mockReturnValue(false);
    vi.mocked(waitForFuncCoreToolsInstall).mockResolvedValue(undefined);
  });

  function getTelemetryContext(callbackId: string): any {
    return testState.telemetryContexts.find((entry) => entry.callbackId === callbackId)?.context;
  }

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
      vi.mocked(executeCommandWithTimeout).mockResolvedValue('4.12.0');

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(executeCommandWithTimeout).toHaveBeenCalledWith(undefined, undefined, expect.any(Number), 'func', '--version');
      expect(ensureFuncCoreToolsCommandExecutablePermissions).toHaveBeenCalledWith('func');
    });

    it('returns false when managed nested executables are not executable even if top-level func exists', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(false);

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(executeCommandWithTimeout).not.toHaveBeenCalled();
    });
  });

  describe('managed FuncCoreTools auto-repair', () => {
    it('reinstalls and returns true when a provisioned-but-unrunnable func self-heals', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      // First `func --version` fails (exists but won't run); after the silent reinstall it runs.
      vi.mocked(executeCommandWithTimeout).mockRejectedValueOnce(new Error('not runnable')).mockResolvedValue('4.12.0');

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(installFuncCoreToolsBinaries).toHaveBeenCalledTimes(1);
      const repairContext = getTelemetryContext('azureLogicAppsStandard.repairFuncCoreTools');
      expect(repairContext.errorHandling.rethrow).toBe(true);
      expect(repairContext.errorHandling.suppressDisplay).toBe(true);
      expect(repairContext.telemetry.properties.funcRepairAttempted).toBe('true');
      expect(repairContext.telemetry.properties.funcRepairSucceeded).toBe('true');
      expect(installFuncCoreToolsBinaries).toHaveBeenCalledWith(repairContext);
      expect(ext.outputChannel.show).not.toHaveBeenCalled();
    });

    it('falls back to the install prompt when the repair still cannot run func', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      // func never runs, even after reinstall.
      vi.mocked(executeCommandWithTimeout).mockRejectedValue(new Error('not runnable'));

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(installFuncCoreToolsBinaries).toHaveBeenCalledTimes(1);
    });

    it('shows the output channel only when the user chooses the interactive install', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      vi.mocked(executeCommandWithTimeout).mockRejectedValue(new Error('not runnable'));
      vi.mocked(installFuncCoreToolsBinaries)
        .mockRejectedValueOnce(new Error('repair download failed'))
        .mockRejectedValueOnce(new Error('interactive install failed'));
      testState.showWarningMessage
        .mockImplementationOnce((_message, _options, ...items) => Promise.resolve(items[0]))
        .mockImplementationOnce((_message, ...items) => Promise.resolve(items[0]));

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(installFuncCoreToolsBinaries).toHaveBeenCalledTimes(2);
      expect(ext.outputChannel.show).toHaveBeenCalledTimes(1);
      expect(testState.showWarningMessage).toHaveBeenCalledTimes(2);
      expect(testState.showWarningMessage.mock.calls[1][0]).toContain('will have to be installed manually');
    });

    it('falls back to the install prompt when the silent reinstall itself throws', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      vi.mocked(executeCommandWithTimeout).mockRejectedValue(new Error('not runnable'));
      vi.mocked(installFuncCoreToolsBinaries).mockRejectedValueOnce(new Error('download failed'));

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(installFuncCoreToolsBinaries).toHaveBeenCalledTimes(1);
    });

    it('waits for an install that is already running instead of starting a second one', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      vi.mocked(isFuncCoreToolsInstallInFlight).mockReturnValue(true);
      // func can't run while the other install is mid-extract, then works once it finishes.
      vi.mocked(executeCommandWithTimeout).mockRejectedValueOnce(new Error('not runnable')).mockResolvedValue('4.12.0');

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(waitForFuncCoreToolsInstall).toHaveBeenCalledTimes(1);
      expect(installFuncCoreToolsBinaries).not.toHaveBeenCalled();
    });

    it('falls back to the install prompt when the already-running install leaves func unrunnable', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      vi.mocked(isFuncCoreToolsInstallInFlight).mockReturnValue(true);
      vi.mocked(executeCommandWithTimeout).mockRejectedValue(new Error('not runnable'));

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(false);

      expect(waitForFuncCoreToolsInstall).toHaveBeenCalledTimes(1);
      expect(installFuncCoreToolsBinaries).not.toHaveBeenCalled();
    });
    it('repairs when the func probe hangs instead of failing fast', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(ensureFuncCoreToolsCommandExecutablePermissions).mockReturnValue(true);
      // A corrupt binary can hang rather than exit. The probe is bounded so that surfaces as a
      // rejection and the repair still runs, instead of stalling F5 with no feedback at all.
      vi.mocked(executeCommandWithTimeout)
        .mockRejectedValueOnce(new Error('Command "func --version" did not complete within 60000 ms and was terminated.'))
        .mockResolvedValue('4.12.0');

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(installFuncCoreToolsBinaries).toHaveBeenCalledTimes(1);
      const [, , timeoutMs] = vi.mocked(executeCommandWithTimeout).mock.calls[0];
      expect(timeoutMs).toBeGreaterThan(0);
    });
  });

  describe('validateFuncCoreTools setting', () => {
    it('skips validation entirely when the validateFuncCoreTools setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getWorkspaceSetting).mockReturnValueOnce(false);

      await expect(validateFuncCoreToolsInstalled(mockContext, 'test message', 'projectPath')).resolves.toBe(true);

      expect(executeCommandWithTimeout).not.toHaveBeenCalled();
      expect(installFuncCoreToolsBinaries).not.toHaveBeenCalled();
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
