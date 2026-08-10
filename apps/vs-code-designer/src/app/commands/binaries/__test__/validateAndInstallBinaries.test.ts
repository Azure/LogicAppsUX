import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { defaultDependencyPathValue } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { getDependencyTimeout, ensureRuntimeDependenciesDir } from '../../../utils/binaries';
import { ensureExtensionBundleHealthy, getDependenciesVersion } from '../../../utils/bundleFeed';
import { recordDependencyUpdateCheck, shouldCheckForDependencyUpdates } from '../../../state/dependencies';
import { setDotNetCommand } from '../../../utils/dotnet/dotnet';
import { setFunctionsCommand } from '../../../utils/funcCoreTools/funcVersion';
import { installLSPSDK } from '../../../utils/languageServerProtocol';
import { setNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { shouldRequireStrictDependencyValidation } from '../../../utils/strictDependencyValidation';
import { runWithTimeout } from '../../../utils/timeout';
import { validateDotNetIsLatest } from '../../dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../../funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../../nodeJs/validateNodeJsIsLatest';
import { validateAndInstallBinaries } from '../validateAndInstallBinaries';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/binaries', () => ({
  getDependencyTimeout: vi.fn(),
  ensureRuntimeDependenciesDir: vi.fn(),
}));

vi.mock('../../../utils/bundleFeed', () => ({
  getDependenciesVersion: vi.fn(),
  ensureExtensionBundleHealthy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../state/dependencies', () => ({
  recordDependencyUpdateCheck: vi.fn(),
  shouldCheckForDependencyUpdates: vi.fn(),
}));

vi.mock('../../../utils/dotnet/dotnet', () => ({
  setDotNetCommand: vi.fn(),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  setFunctionsCommand: vi.fn(),
}));

vi.mock('../../../utils/languageServerProtocol', () => ({
  installLSPSDK: vi.fn(),
}));

vi.mock('../../../utils/nodeJs/nodeJsVersion', () => ({
  setNodeJsCommand: vi.fn(),
}));

vi.mock('../../../utils/strictDependencyValidation', () => ({
  shouldRequireStrictDependencyValidation: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true, rethrow: true, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    return await callback(context);
  }),
}));

vi.mock('../../../utils/timeout', () => ({
  runWithTimeout: vi.fn(),
}));

vi.mock('../../dotnet/validateDotNetIsLatest', () => ({
  validateDotNetIsLatest: vi.fn(),
}));

vi.mock('../../funcCoreTools/validateFuncCoreToolsIsLatest', () => ({
  validateFuncCoreToolsIsLatest: vi.fn(),
}));

vi.mock('../../nodeJs/validateNodeJsIsLatest', () => ({
  validateNodeJsIsLatest: vi.fn(),
}));

describe('validateAndInstallBinaries', () => {
  let context: any;
  let progress: { report: Mock };
  let cancellationToken: { onCancellationRequested: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      telemetry: { properties: {}, measurements: {}, suppressIfSuccessful: false, suppressAll: false },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    progress = { report: vi.fn() };
    cancellationToken = { onCancellationRequested: vi.fn() };
    (vscode.window.withProgress as Mock).mockImplementation(async (_options: any, task: any) => task(progress, cancellationToken));
    (getDependencyTimeout as Mock).mockReturnValue(3);
    (ensureRuntimeDependenciesDir as Mock).mockResolvedValue(defaultDependencyPathValue);
    (shouldRequireStrictDependencyValidation as Mock).mockReturnValue(false);
    (shouldCheckForDependencyUpdates as Mock).mockReturnValue(true);
    (recordDependencyUpdateCheck as Mock).mockResolvedValue(undefined);
    (getDependenciesVersion as Mock).mockResolvedValue({
      nodejs: '18.0.0',
      funcCoreTools: '4.0.0',
      dotnetVersions: '8.0.100',
    });
    (runWithTimeout as Mock).mockImplementation(async (validator: () => Promise<void>) => {
      await validator();
    });
    (validateNodeJsIsLatest as Mock).mockResolvedValue(undefined);
    (validateFuncCoreToolsIsLatest as Mock).mockResolvedValue(undefined);
    (validateDotNetIsLatest as Mock).mockResolvedValue(undefined);
    (installLSPSDK as Mock).mockResolvedValue(undefined);
    (setNodeJsCommand as Mock).mockResolvedValue(undefined);
    (setFunctionsCommand as Mock).mockResolvedValue(undefined);
    (setDotNetCommand as Mock).mockResolvedValue(undefined);
    (ensureExtensionBundleHealthy as Mock).mockResolvedValue(undefined);
  });

  it('orchestrates dependency validation, command setup, and success logging', async () => {
    await validateAndInstallBinaries(context);

    expect(vscode.window.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        location: vscode.ProgressLocation.Window,
        title: 'Validating Runtime Dependency',
        cancellable: false,
      }),
      expect.any(Function)
    );
    expect(cancellationToken.onCancellationRequested).toHaveBeenCalledWith(expect.any(Function));
    expect(context.telemetry.properties).toMatchObject({
      dependencyTimeoutMs: '3000',
      dependencyPath: defaultDependencyPathValue,
      performedDependencyUpdateCheck: 'true',
      dependenciesVersions: JSON.stringify({
        nodejs: '18.0.0',
        funcCoreTools: '4.0.0',
        dotnetVersions: '8.0.100',
      }),
    });
    expect(callWithTelemetryAndErrorHandling).toHaveBeenCalledTimes(4);
    expect(runWithTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 'NodeJs', 3000, 'https://github.com/nodesource/distributions');
    expect(runWithTimeout).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      'Functions Runtime',
      3000,
      'https://github.com/Azure/azure-functions-core-tools/releases'
    );
    expect(runWithTimeout).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      '.NET SDK',
      3000,
      'https://dotnet.microsoft.com/en-us/download/dotnet'
    );
    expect(runWithTimeout).toHaveBeenNthCalledWith(4, expect.any(Function), 'SDK LSP Server', 3000);
    expect(validateNodeJsIsLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        errorHandling: expect.objectContaining({ rethrow: true }),
      }),
      '18.0.0'
    );
    expect(validateFuncCoreToolsIsLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        errorHandling: expect.objectContaining({ rethrow: true }),
      }),
      '4.0.0'
    );
    expect(validateDotNetIsLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        errorHandling: expect.objectContaining({ rethrow: true }),
      }),
      '8.0.100'
    );
    expect(installLSPSDK).toHaveBeenCalled();
    expect(setNodeJsCommand).toHaveBeenCalled();
    expect(setFunctionsCommand).toHaveBeenCalled();
    expect(setDotNetCommand).toHaveBeenCalledTimes(2);
    expect(ensureExtensionBundleHealthy).toHaveBeenCalledWith(context, { requireInstalled: false });
    expect(recordDependencyUpdateCheck).toHaveBeenCalledOnce();
    expect(progress.report).toHaveBeenCalledWith({ increment: 20, message: 'NodeJS' });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Azure Logic Apps Standard Runtime Dependencies validation and installation completed successfully.'
    );
  });

  it('logs dependency validation errors and surfaces troubleshooting guidance', async () => {
    (runWithTimeout as Mock).mockRejectedValueOnce(new Error('Node validation failed'));

    await validateAndInstallBinaries(context);

    expect(context.telemetry.properties).toMatchObject({
      lastStep: 'validateDependencies',
    });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Error in dependencies validation and installation: "Node validation failed"...'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('The Validation and Installation of Runtime Dependencies encountered an error.')
    );
    expect(recordDependencyUpdateCheck).not.toHaveBeenCalled();
  });

  it('requires an installed bundle and rethrows dependency validation errors in strict E2E mode', async () => {
    (shouldRequireStrictDependencyValidation as Mock).mockReturnValue(true);
    (ensureExtensionBundleHealthy as Mock).mockRejectedValueOnce(new Error('Bundle sidecar missing'));

    await expect(validateAndInstallBinaries(context)).rejects.toThrow('Bundle sidecar missing');

    expect(ensureExtensionBundleHealthy).toHaveBeenCalledWith(context, { requireInstalled: true });
    expect(context.telemetry.properties).toMatchObject({
      lastStep: 'ensureExtensionBundleHealthy',
    });
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(
      'Azure Logic Apps Standard Runtime Dependencies validation and installation completed successfully.'
    );
  });
});

