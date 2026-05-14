import { describe, expect, it, vi } from 'vitest';
import {
  createFileSystemConnection,
  initializeLanguageServer,
  languageServerSlice,
  updateFileSystemConnection,
} from '../LanguageServerSlice';

describe('LanguageServerSlice', () => {
  it('returns the initial language server state', () => {
    expect(languageServerSlice.reducer(undefined, { type: 'unknown' })).toMatchObject({
      apiVersion: '2018-11-01',
      baseUrl: '/url',
      connectionData: {},
      fileSystemConnections: {},
      hostVersion: '',
      isLocal: true,
      oauthRedirectUrl: '',
      panelMetaData: null,
      workflowRuntimeBaseUrl: '',
    });
  });

  it('initializes from the language server payload', () => {
    const panelMetadata = { panelId: 'panel-1', workflowName: 'workflow' };
    const connectionData = { managedApiConnections: {} };
    const apiHubServiceDetails = {
      apiVersion: '2018-07-01-preview',
      baseUrl: 'https://management.azure.com',
      httpClient: null,
      location: 'westus',
      resourceGroup: 'rg',
      subscriptionId: 'sub',
      tenantId: 'tenant',
    };
    const connector = {
      currentConnectionId: 'connection-1',
      name: 'filesystem',
      type: 'serviceProvider',
    };

    const state = languageServerSlice.reducer(
      undefined,
      initializeLanguageServer({
        apiHubServiceDetails,
        apiVersion: '2024-01-01',
        baseUrl: 'https://logic.azure.com',
        connectionData,
        connector,
        hostVersion: '4.0.1',
        oauthRedirectUrl: 'https://redirect',
        panelMetadata,
        workflowRuntimeBaseUrl: 'https://runtime',
      })
    );

    expect(state.panelMetaData).toBe(panelMetadata);
    expect(state.connectionData).toBe(connectionData);
    expect(state.baseUrl).toBe('https://logic.azure.com');
    expect(state.workflowRuntimeBaseUrl).toBe('https://runtime');
    expect(state.apiVersion).toBe('2024-01-01');
    expect(state.apiHubServiceDetails).toBe(apiHubServiceDetails);
    expect(state.isLocal).toBe(true);
    expect(state.oauthRedirectUrl).toBe('https://redirect');
    expect(state.hostVersion).toBe('4.0.1');
    expect(state.connector).toBe(connector);
  });

  it('defaults workflowRuntimeBaseUrl when initialization omits it', () => {
    const state = languageServerSlice.reducer(
      undefined,
      initializeLanguageServer({
        apiHubServiceDetails: {},
        apiVersion: '2024-01-01',
        baseUrl: 'https://logic.azure.com',
        connectionData: {},
        connector: { currentConnectionId: '', name: '', type: '' },
        hostVersion: '',
        oauthRedirectUrl: '',
        panelMetadata: null,
      })
    );

    expect(state.workflowRuntimeBaseUrl).toBe('');
  });

  it('stores file system connection promise callbacks by connection name', () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    const state = languageServerSlice.reducer(undefined, createFileSystemConnection({ connectionName: 'share', reject, resolve }));

    expect(state.fileSystemConnections.share.resolveConnection).toBe(resolve);
    expect(state.fileSystemConnections.share.rejectConnection).toBe(reject);
  });

  it('resolves and cleans up a pending file system connection', () => {
    const resolve = vi.fn();
    const reject = vi.fn();
    const connection = { id: 'connection-1' };
    const stateWithConnection = languageServerSlice.reducer(
      undefined,
      createFileSystemConnection({ connectionName: 'share', reject, resolve })
    );

    const state = languageServerSlice.reducer(
      stateWithConnection,
      updateFileSystemConnection({ connectionName: 'share', connection, error: '' })
    );

    expect(resolve).toHaveBeenCalledWith(connection);
    expect(reject).not.toHaveBeenCalled();
    expect(state.fileSystemConnections.share).toBeUndefined();
  });

  it('rejects and cleans up a pending file system connection', () => {
    const resolve = vi.fn();
    const reject = vi.fn();
    const stateWithConnection = languageServerSlice.reducer(
      undefined,
      createFileSystemConnection({ connectionName: 'share', reject, resolve })
    );

    const state = languageServerSlice.reducer(
      stateWithConnection,
      updateFileSystemConnection({ connectionName: 'share', connection: undefined, error: 'Unable to connect' })
    );

    expect(resolve).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledWith({ message: 'Unable to connect' });
    expect(state.fileSystemConnections.share).toBeUndefined();
  });
});
