import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { getDependencyTimeout } from '../../../utils/binaries';
import { getDependenciesVersion } from '../../../utils/bundleFeed';
import { setDotNetCommand } from '../../../utils/dotnet/dotnet';
import { setFunctionsCommand } from '../../../utils/funcCoreTools/funcVersion';
import { installLSPSDK } from '../../../utils/languageServerProtocol';
import { setNodeJsCommand } from '../../../utils/nodeJs/nodeJsVersion';
import { runWithDurationTelemetry } from '../../../utils/telemetry';
import { timeout } from '../../../utils/timeout';
import { getGlobalSetting, updateGlobalSetting } from '../../../utils/vsCodeConfig/settings';
import { validateDotNetIsLatest } from '../../dotnet/validateDotNetIsLatest';
import { validateFuncCoreToolsIsLatest } from '../../funcCoreTools/validateFuncCoreToolsIsLatest';
import { validateNodeJsIsLatest } from '../../nodeJs/validateNodeJsIsLatest';
import { validateAndInstallBinaries } from '../validateAndInstallBinaries';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/binaries', () => ({
  getDependencyTimeout: vi.fn(),
}));

vi.mock('../../../utils/bundleFeed', () => ({
  getDependenciesVersion: vi.fn(),
}));

vi.mock('../../../utils/dotnet/dotnet', () => ({
  setDotNetCommand: vi.fn(),
}));

vi.mock('../../../utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
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

vi.mock('../../../utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(),
}));

vi.mock('../../../utils/timeout', () => ({
  timeout: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
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
    context = { telemetry: { properties: {}, measurements: {} } };
    progress = { report: vi.fn() };
    cancellationToken = { onCancellationRequested: vi.fn() };
    (vscode.window.withProgress as Mock).mockImplementation(async (_options: any, task: any) => task(progress, cancellationToken));
    (getDependencyTimeout as Mock).mockReturnValue(3);
    (getGlobalSetting as Mock).mockReturnValue(undefined);
    (updateGlobalSetting as Mock).mockResolvedValue(undefined);
    (getDependenciesVersion as Mock).mockResolvedValue({
      nodejs: '18.0.0',
      funcCoreTools: '4.0.0',
      dotnetVersions: ['8.0.100'],
    });
    (runWithDurationTelemetry as Mock).mockImplementation(async (_context: any, _eventName: string, callback: () => Promise<void>) =>
      callback()
    );
    (timeout as Mock).mockImplementation(async (validator: () => Promise<void>) => {
      await validator();
    });
    (validateNodeJsIsLatest as Mock).mockResolvedValue(undefined);
    (validateFuncCoreToolsIsLatest as Mock).mockResolvedValue(undefined);
    (validateDotNetIsLatest as Mock).mockResolvedValue(undefined);
    (installLSPSDK as Mock).mockResolvedValue(undefined);
    (setNodeJsCommand as Mock).mockResolvedValue(undefined);
    (setFunctionsCommand as Mock).mockResolvedValue(undefined);
    (setDotNetCommand as Mock).mockResolvedValue(undefined);
  });

  it('orchestrates dependency validation, command setup, and success logging', async () => {
    await validateAndInstallBinaries(context);

    expect(vscode.window.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating Runtime Dependency',
        cancellable: false,
      }),
      expect.any(Function)
    );
    expect(cancellationToken.onCancellationRequested).toHaveBeenCalledWith(expect.any(Function));
    expect(updateGlobalSetting).toHaveBeenCalledWith(autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue);
    expect(context.telemetry.properties).toMatchObject({
      dependencyTimeout: '3000 milliseconds',
      dependencyPath: defaultDependencyPathValue,
      dependenciesVersions: JSON.stringify({
        nodejs: '18.0.0',
        funcCoreTools: '4.0.0',
        dotnetVersions: ['8.0.100'],
      }),
    });
    expect(timeout).toHaveBeenCalledWith(validateNodeJsIsLatest, 'NodeJs', 3000, 'https://github.com/nodesource/distributions', '18.0.0');
    expect(timeout).toHaveBeenCalledWith(
      validateFuncCoreToolsIsLatest,
      'Functions Runtime',
      3000,
      'https://github.com/Azure/azure-functions-core-tools/releases',
      '4.0.0'
    );
    expect(timeout).toHaveBeenCalledWith(validateDotNetIsLatest, '.NET SDK', 3000, 'https://dotnet.microsoft.com/en-us/download/dotnet', [
      '8.0.100',
    ]);
    expect(timeout).toHaveBeenCalledWith(installLSPSDK, 'LSP SDK', 3000);
    expect(setNodeJsCommand).toHaveBeenCalled();
    expect(setFunctionsCommand).toHaveBeenCalled();
    expect(setDotNetCommand).toHaveBeenCalledTimes(2);
    expect(progress.report).toHaveBeenCalledWith({ increment: 20, message: 'NodeJS' });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Azure Logic Apps Standard Runtime Dependencies validation and installation completed successfully.'
    );
  });

  it('logs dependency validation errors and surfaces troubleshooting guidance', async () => {
    (timeout as Mock).mockRejectedValueOnce(new Error('Node validation failed'));

    await validateAndInstallBinaries(context);

    expect(context.telemetry.properties).toMatchObject({
      lastStep: 'validateNodeJsIsLatest',
      dependenciesError: 'Node validation failed',
    });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Error in dependencies validation and installation: "Node validation failed"...'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('The Validation and Installation of Runtime Dependencies encountered an error.')
    );
  });
});
