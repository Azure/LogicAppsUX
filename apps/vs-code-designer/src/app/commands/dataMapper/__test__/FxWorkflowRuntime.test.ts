/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Uri } from 'vscode';
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../extensionVariables';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  designerStartApi,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  hostFileContent,
  hostFileName,
  localSettingsFileName,
  logicAppKind,
  workerRuntimeKey,
} from '../../../../constants';
import { startBackendRuntime } from '../FxWorkflowRuntime';
import {
  createJsonFile,
  getOrCreateDesignTimeDirectory,
  isDesignTimeUp,
  startDesignTimeProcess,
  waitForDesignTimeStartUp,
} from '../../../utils/codeless/startDesignTimeApi';
import { reserveFreePort } from '../../../utils/portReservation';
import { useNodeDesignTimeWorker } from '../../../utils/vsCodeConfig/settings';
import { addOrUpdateLocalAppSettings } from '../../../utils/appSettings/localSettings';
import { generateDesignTimeLocalSettingsJson } from '../../../utils/vsCodeConfig/generators';
import { getFunctionsCommand } from '../../../utils/funcCoreTools/funcVersion';
import { backendRuntimeBaseUrl } from '../extensionConfig';

// The direct collaborators are mocked so the tests exercise startBackendRuntime's own control flow.
// vscode (window.withProgress/ProgressLocation/Uri), ext (outputChannel/designTimeInstances) and
// localize come from the global test-setup.ts mocks.
vi.mock('../../../utils/codeless/startDesignTimeApi', () => ({
  getOrCreateDesignTimeDirectory: vi.fn(),
  isDesignTimeUp: vi.fn(),
  createJsonFile: vi.fn(),
  startDesignTimeProcess: vi.fn(),
  waitForDesignTimeStartUp: vi.fn(),
}));

vi.mock('../../../utils/portReservation', () => ({
  reserveFreePort: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/settings', () => ({
  useNodeDesignTimeWorker: vi.fn(),
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
}));

vi.mock('../../../utils/vsCodeConfig/generators', () => ({
  generateDesignTimeLocalSettingsJson: vi.fn(() => ({ Values: {} })),
}));

vi.mock('../../../utils/funcCoreTools/funcVersion', () => ({
  getFunctionsCommand: vi.fn(() => 'func'),
}));

describe('startBackendRuntime', () => {
  const projectPath = '/workspace/logic-app';
  const context = {} as IActionContext;
  const designTimeDir = Uri.file('/workspace/logic-app/workflow-designtime');
  const settingsSchemaSentinel = { Values: { SENTINEL: 'schema-content' } };
  const mockedAppendLine = vi.mocked(ext.outputChannel.appendLine);

  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();

    vi.mocked(getOrCreateDesignTimeDirectory).mockResolvedValue(designTimeDir);
    vi.mocked(isDesignTimeUp).mockResolvedValue(false);
    vi.mocked(reserveFreePort).mockResolvedValue(7071);
    vi.mocked(useNodeDesignTimeWorker).mockReturnValue(false);
    vi.mocked(generateDesignTimeLocalSettingsJson).mockReturnValue(settingsSchemaSentinel as any);
    vi.mocked(getFunctionsCommand).mockReturnValue('func');
    vi.mocked(waitForDesignTimeStartUp).mockResolvedValue(undefined as any);
  });

  it('starts the runtime with the dotnet worker on a fresh project (happy path)', async () => {
    await startBackendRuntime(context, projectPath);

    // A fresh project reserves exactly one port and records it on the design-time instance.
    expect(reserveFreePort).toHaveBeenCalledTimes(1);
    expect(ext.designTimeInstances.get(projectPath)?.port).toBe(7071);

    const expectedUrl = `${backendRuntimeBaseUrl}7071${designerStartApi}`;
    expect(isDesignTimeUp).toHaveBeenCalledWith(expectedUrl);

    // Design-time settings are built for the dotnet worker (useNodeWorker === false).
    expect(generateDesignTimeLocalSettingsJson).toHaveBeenCalledWith(projectPath, undefined, false);

    // Both baseline files are written to the design-time directory.
    expect(createJsonFile).toHaveBeenCalledWith(designTimeDir, hostFileName, hostFileContent);
    expect(createJsonFile).toHaveBeenCalledWith(designTimeDir, localSettingsFileName, settingsSchemaSentinel);

    // The dotnet worker upserts the in-process .NET 8 flag alongside the base runtime settings.
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(
      context,
      designTimeDir.fsPath,
      {
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
        [workerRuntimeKey]: WorkerRuntime.Dotnet,
        [functionsInprocNet8Enabled]: functionsInprocNet8EnabledTrue,
      },
      true
    );

    // The func host is launched with the reserved port and the runtime is awaited.
    expect(startDesignTimeProcess).toHaveBeenCalledWith(ext.outputChannel, designTimeDir.fsPath, 'func', 'host', 'start', '--port 7071');
    expect(waitForDesignTimeStartUp).toHaveBeenCalledWith(context, projectPath, expectedUrl, true);
  });

  it('starts the runtime with the node worker and omits the in-process .NET 8 flag', async () => {
    vi.mocked(useNodeDesignTimeWorker).mockReturnValue(true);

    await startBackendRuntime(context, projectPath);

    expect(generateDesignTimeLocalSettingsJson).toHaveBeenCalledWith(projectPath, undefined, true);
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(
      context,
      designTimeDir.fsPath,
      {
        [appKindSetting]: logicAppKind,
        [ProjectDirectoryPathKey]: projectPath,
        [workerRuntimeKey]: WorkerRuntime.Node,
      },
      true
    );

    // The node worker must NOT set the in-process .NET 8 flag.
    const runtimeSettings = vi.mocked(addOrUpdateLocalAppSettings).mock.calls[0][2] as Record<string, string>;
    expect(runtimeSettings).not.toHaveProperty(functionsInprocNet8Enabled);
  });

  it('exits early and logs when the runtime is already running', async () => {
    vi.mocked(isDesignTimeUp).mockResolvedValue(true);

    await startBackendRuntime(context, projectPath);

    expect(mockedAppendLine).toHaveBeenCalledWith('Backend runtime is already running');
    // Nothing is created or started when the runtime is already up.
    expect(createJsonFile).not.toHaveBeenCalled();
    expect(addOrUpdateLocalAppSettings).not.toHaveBeenCalled();
    expect(startDesignTimeProcess).not.toHaveBeenCalled();
    expect(waitForDesignTimeStartUp).not.toHaveBeenCalled();
  });

  it('reuses an existing design-time instance port without reserving a new one', async () => {
    ext.designTimeInstances.set(projectPath, { port: 9999 } as any);

    await startBackendRuntime(context, projectPath);

    expect(reserveFreePort).not.toHaveBeenCalled();
    expect(isDesignTimeUp).toHaveBeenCalledWith(`${backendRuntimeBaseUrl}9999${designerStartApi}`);
    expect(startDesignTimeProcess).toHaveBeenCalledWith(ext.outputChannel, designTimeDir.fsPath, 'func', 'host', 'start', '--port 9999');
  });

  it('backfills a port when an existing instance has none', async () => {
    ext.designTimeInstances.set(projectPath, { port: undefined } as any);

    await startBackendRuntime(context, projectPath);

    expect(reserveFreePort).toHaveBeenCalledTimes(1);
    expect(ext.designTimeInstances.get(projectPath)?.port).toBe(7071);
    expect(isDesignTimeUp).toHaveBeenCalledWith(`${backendRuntimeBaseUrl}7071${designerStartApi}`);
  });

  it('logs a failure and does not start a process when the design-time directory is missing', async () => {
    vi.mocked(getOrCreateDesignTimeDirectory).mockResolvedValue(undefined);

    await startBackendRuntime(context, projectPath);

    expect(mockedAppendLine).toHaveBeenCalledWith('Backend runtime failed to start. Error: "Workflow folder doesn\'t exist".');
    expect(createJsonFile).not.toHaveBeenCalled();
    expect(startDesignTimeProcess).not.toHaveBeenCalled();
  });

  it('logs the error message when startup throws an Error', async () => {
    vi.mocked(waitForDesignTimeStartUp).mockRejectedValue(new Error('boom'));

    await startBackendRuntime(context, projectPath);

    expect(mockedAppendLine).toHaveBeenCalledWith('Backend runtime failed to start. Error: "boom".');
  });

  it('logs the raw string when a non-Error string is thrown', async () => {
    vi.mocked(waitForDesignTimeStartUp).mockRejectedValue('string failure');

    await startBackendRuntime(context, projectPath);

    expect(mockedAppendLine).toHaveBeenCalledWith('Backend runtime failed to start. Error: "string failure".');
  });

  it('logs "Unknown error" when a non-Error, non-string value is thrown', async () => {
    vi.mocked(waitForDesignTimeStartUp).mockRejectedValue({ unexpected: true });

    await startBackendRuntime(context, projectPath);

    expect(mockedAppendLine).toHaveBeenCalledWith('Backend runtime failed to start. Error: "Unknown error".');
  });
});
