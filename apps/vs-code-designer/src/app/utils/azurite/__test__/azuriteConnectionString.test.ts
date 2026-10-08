/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { azureWebJobsStorageKey, azuriteExtensionPrefix, localEmulatorConnectionString } from '../../../../constants';
import { getLocalSettingsJson, isLocalSettingsEncrypted, setLocalAppSetting } from '../../appSettings/localSettings';
import { getWorkspaceSetting } from '../../vsCodeConfig/settings';
import { MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';
import {
  createAzuriteDevelopmentConnectionString,
  isAzuriteDevelopmentConnectionString,
  synchronizeAzuriteConnectionString,
} from '../azuriteConnectionString';

const { workspaceState, workspaceStateUpdate } = vi.hoisted(() => {
  const state = new Map<string, string>();
  return {
    workspaceState: state,
    workspaceStateUpdate: vi.fn(async (key: string, value: string | undefined) => {
      if (value === undefined) {
        state.delete(key);
      } else {
        state.set(key, value);
      }
    }),
  };
});

vi.mock('../../appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn(),
  isLocalSettingsEncrypted: vi.fn(),
  setLocalAppSetting: vi.fn(),
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      workspaceState: {
        get: (key: string) => workspaceState.get(key),
        update: workspaceStateUpdate,
      },
    },
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, message: string, ...args: unknown[]) =>
    message.replace(/\{(\d+)\}/g, (token, index) => (args[Number(index)] === undefined ? token : String(args[Number(index)]))),
}));

const projectPath = 'D:\\workspace\\LogicApp';
const context = { telemetry: { properties: {}, measurements: {} } } as any;

describe('azuriteConnectionString', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceState.clear();
    context.telemetry.properties = {};
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: localEmulatorConnectionString },
    });
    vi.mocked(isLocalSettingsEncrypted).mockResolvedValue(false);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      switch (key) {
        case 'blobHost':
        case 'queueHost':
        case 'tableHost':
          return '127.0.0.1';
        case 'blobPort':
          return 10000;
        case 'queuePort':
          return 10001;
        case 'tablePort':
          return 10002;
        case 'cert':
          return '';
        default:
          return undefined;
      }
    });
  });

  it('replaces the shorthand when the Azurite queue port is customized', async () => {
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      if (key === 'queuePort') {
        return 10003;
      }
      if (key.endsWith('Host')) {
        return '127.0.0.1';
      }
      if (key === 'blobPort') {
        return 10000;
      }
      if (key === 'tablePort') {
        return 10002;
      }
      if (key === 'cert') {
        return '';
      }
      return undefined;
    });

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(getWorkspaceSetting).toHaveBeenCalledWith('queuePort', projectPath, azuriteExtensionPrefix);
    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      projectPath,
      azureWebJobsStorageKey,
      expect.stringContaining('QueueEndpoint=http://127.0.0.1:10003/devstoreaccount1'),
      MismatchBehavior.Overwrite
    );
    const updatedConnectionString = vi.mocked(setLocalAppSetting).mock.calls[0][3];
    expect(updatedConnectionString).toContain('BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1');
    expect(updatedConnectionString).toContain('QueueEndpoint=http://127.0.0.1:10003/devstoreaccount1');
    expect(updatedConnectionString).toContain('TableEndpoint=http://127.0.0.1:10002/devstoreaccount1');
    expect(updatedConnectionString).not.toContain('QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1');
    expect(workspaceStateUpdate).toHaveBeenCalledWith(expect.stringContaining(projectPath), updatedConnectionString);
    expect(context.telemetry.properties.azuriteConnectionStringUpdated).toBe('true');
    expect(context.telemetry.properties.azuriteQueuePort).toBe('10003');
  });

  it('keeps the shorthand when all Azurite endpoints use their defaults', async () => {
    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(setLocalAppSetting).not.toHaveBeenCalled();
    expect(workspaceStateUpdate).not.toHaveBeenCalled();
  });

  it('preserves a missing storage setting', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} });

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(setLocalAppSetting).not.toHaveBeenCalled();
    expect(workspaceStateUpdate).not.toHaveBeenCalled();
  });

  it('resynchronizes an extension-managed connection string after the queue port changes', async () => {
    const previousConnectionString = createAzuriteDevelopmentConnectionString({
      blobHost: '127.0.0.1',
      blobPort: 10000,
      queueHost: '127.0.0.1',
      queuePort: 10003,
      tableHost: '127.0.0.1',
      tablePort: 10002,
      useHttps: false,
    });
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: previousConnectionString },
    });
    workspaceState.set(`managedAzuriteConnectionString:${projectPath}`, previousConnectionString);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      if (key === 'queuePort') {
        return 10004;
      }
      if (key.endsWith('Host')) {
        return '127.0.0.1';
      }
      if (key === 'blobPort') {
        return 10000;
      }
      if (key === 'tablePort') {
        return 10002;
      }
      if (key === 'cert') {
        return '';
      }
      return undefined;
    });

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      projectPath,
      azureWebJobsStorageKey,
      expect.stringContaining('QueueEndpoint=http://127.0.0.1:10004/devstoreaccount1'),
      MismatchBehavior.Overwrite
    );
  });

  it('keeps explicit endpoints when extension-managed ports return to their defaults', async () => {
    const previousConnectionString = createAzuriteDevelopmentConnectionString({
      blobHost: '127.0.0.1',
      blobPort: 10000,
      queueHost: '127.0.0.1',
      queuePort: 10003,
      tableHost: '127.0.0.1',
      tablePort: 10002,
      useHttps: false,
    });
    const stateKey = `managedAzuriteConnectionString:${projectPath}`;
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: previousConnectionString },
    });
    workspaceState.set(stateKey, previousConnectionString);

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(setLocalAppSetting).toHaveBeenCalledWith(
      context,
      projectPath,
      azureWebJobsStorageKey,
      createAzuriteDevelopmentConnectionString({
        blobHost: '127.0.0.1',
        blobPort: 10000,
        queueHost: '127.0.0.1',
        queuePort: 10001,
        tableHost: '127.0.0.1',
        tablePort: 10002,
        useHttps: false,
      }),
      MismatchBehavior.Overwrite
    );
    expect(workspaceStateUpdate).toHaveBeenCalledWith(
      stateKey,
      createAzuriteDevelopmentConnectionString({
        blobHost: '127.0.0.1',
        blobPort: 10000,
        queueHost: '127.0.0.1',
        queuePort: 10001,
        tableHost: '127.0.0.1',
        tablePort: 10002,
        useHttps: false,
      })
    );
  });

  it('preserves an explicit customer storage connection string', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: 'DefaultEndpointsProtocol=https;AccountName=customerstorage;AccountKey=secret' },
    });
    vi.mocked(getWorkspaceSetting).mockReturnValue(10003);

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(setLocalAppSetting).not.toHaveBeenCalled();
  });

  it('preserves a user-edited explicit connection string when the managed marker is stale', async () => {
    const previousConnectionString = createAzuriteDevelopmentConnectionString({
      blobHost: '127.0.0.1',
      blobPort: 10000,
      queueHost: '127.0.0.1',
      queuePort: 10003,
      tableHost: '127.0.0.1',
      tablePort: 10002,
      useHttps: false,
    });
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: 'DefaultEndpointsProtocol=https;AccountName=customerstorage;AccountKey=secret' },
    });
    workspaceState.set(`managedAzuriteConnectionString:${projectPath}`, previousConnectionString);

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(setLocalAppSetting).not.toHaveBeenCalled();
    expect(workspaceStateUpdate).not.toHaveBeenCalled();
  });

  it('preserves an untracked explicit Azurite development connection string', async () => {
    const customerConnectionString = createAzuriteDevelopmentConnectionString({
      blobHost: '127.0.0.1',
      blobPort: 11000,
      queueHost: '127.0.0.1',
      queuePort: 11001,
      tableHost: '127.0.0.1',
      tablePort: 11002,
      useHttps: false,
    });
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: { [azureWebJobsStorageKey]: customerConnectionString },
    });

    await synchronizeAzuriteConnectionString(context, projectPath);

    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(setLocalAppSetting).not.toHaveBeenCalled();
  });

  it('does not rewrite encrypted local settings', async () => {
    vi.mocked(isLocalSettingsEncrypted).mockResolvedValue(true);
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      IsEncrypted: false,
      Values: { [azureWebJobsStorageKey]: localEmulatorConnectionString },
    });
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      if (key === 'queuePort') {
        return 10003;
      }
      if (key.endsWith('Host')) {
        return '127.0.0.1';
      }
      if (key === 'blobPort') {
        return 10000;
      }
      if (key === 'tablePort') {
        return 10002;
      }
      return '';
    });

    await expect(synchronizeAzuriteConnectionString(context, projectPath)).rejects.toThrow(/local.settings.json is encrypted/);

    expect(setLocalAppSetting).not.toHaveBeenCalled();
  });

  it('recognizes both shorthand and explicit Azurite development connection strings', () => {
    const explicitConnectionString = createAzuriteDevelopmentConnectionString({
      blobHost: '127.0.0.1',
      blobPort: 10000,
      queueHost: '127.0.0.1',
      queuePort: 10003,
      tableHost: '127.0.0.1',
      tablePort: 10002,
      useHttps: false,
    });

    expect(isAzuriteDevelopmentConnectionString(localEmulatorConnectionString)).toBe(true);
    expect(isAzuriteDevelopmentConnectionString(` ${localEmulatorConnectionString}; `)).toBe(true);
    expect(isAzuriteDevelopmentConnectionString(explicitConnectionString)).toBe(true);
    expect(isAzuriteDevelopmentConnectionString('DefaultEndpointsProtocol=https;AccountName=customerstorage;AccountKey=secret')).toBe(
      false
    );
  });
});
