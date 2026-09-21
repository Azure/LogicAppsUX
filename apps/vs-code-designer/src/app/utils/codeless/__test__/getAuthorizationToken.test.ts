import { getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';
import { getAuthData, getAuthorizationToken, getAuthorizationTokenFromNode, getCloudHost } from '../getAuthorizationToken';

const mocks = vi.hoisted(() => ({
  getSessionFromVSCode: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureauth', () => ({
  getConfiguredAzureEnv: vi.fn(() => ({
    managementEndpointUrl: 'https://management.azure.com',
  })),
  getSessionFromVSCode: mocks.getSessionFromVSCode,
}));

const federatedEnvKeys = [
  'FC_SERVICE_CONNECTION_NAME',
  'FC_SERVICE_CONNECTION_ID',
  'FC_SERVICE_CONNECTION_TENANT_ID',
  'FC_SERVICE_CONNECTION_CLIENT_ID',
  'AzCode_UseAzureFederatedCredentials',
  'AzCode_ServiceConnectionID',
  'AzCode_ServiceConnectionDomain',
  'AzCode_ServiceConnectionClientID',
];

describe('getAuthorizationToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getSessionFromVSCode.mockReset();
    for (const key of federatedEnvKeys) {
      delete process.env[key];
    }
    ext.subscriptionProvider = undefined as any;
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => false),
    } as any);
  });

  it('should return a bearer token when session has an accessToken', async () => {
    mocks.getSessionFromVSCode.mockResolvedValue({
      accessToken: 'test-token-123',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    });

    const token = await getAuthorizationToken('test-tenant');
    expect(token).toBe('Bearer test-token-123');
  });

  it('should preserve existing fallback behavior when session returns no accessToken', async () => {
    mocks.getSessionFromVSCode.mockResolvedValue({
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    });

    const token = await getAuthorizationToken();
    expect(token).toBe('Bearer undefined');
  });

  it('should propagate errors when session acquisition fails', async () => {
    mocks.getSessionFromVSCode.mockRejectedValue(new Error('Auth session expired'));

    await expect(getAuthorizationToken()).rejects.toThrow('Auth session expired');
  });

  it('should pass tenantId to getSessionFromVSCode', async () => {
    mocks.getSessionFromVSCode.mockResolvedValue({
      accessToken: 'tenant-token',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    });

    await getAuthorizationToken('specific-tenant-id');
    expect(getSessionFromVSCode).toHaveBeenCalledWith(undefined, 'specific-tenant-id', expect.any(Object));
  });

  it('should preserve silentAuth by passing silent options to VS Code session acquisition', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => true),
    } as any);
    mocks.getSessionFromVSCode.mockResolvedValue(undefined);

    await getAuthData('silent-tenant-id');

    expect(getSessionFromVSCode).toHaveBeenCalledWith(undefined, 'silent-tenant-id', { silent: true });
  });

  it('should use provider-backed auth when Azure DevOps federated credentials are configured', async () => {
    process.env.FC_SERVICE_CONNECTION_NAME = 'logicapps-e2e';
    process.env.FC_SERVICE_CONNECTION_ID = 'service-connection-id';
    process.env.FC_SERVICE_CONNECTION_TENANT_ID = 'tenant-id';
    process.env.FC_SERVICE_CONNECTION_CLIENT_ID = 'client-id';
    const getSession = vi.fn().mockResolvedValue({
      accessToken: 'provider-token',
      id: 'provider-session',
      account: { id: 'client-id.tenant-id', label: 'ADO' },
      scopes: [],
    });
    ext.subscriptionProvider = {
      isSignedIn: vi.fn().mockResolvedValue(true),
      signIn: vi.fn().mockResolvedValue(true),
      getSubscriptions: vi.fn().mockResolvedValue([
        {
          tenantId: 'tenant-id',
          authentication: { getSession },
        },
      ]),
    } as any;

    const token = await getAuthorizationToken('tenant-id');

    expect(token).toBe('Bearer provider-token');
    expect(ext.subscriptionProvider.getSubscriptions).toHaveBeenCalledWith({ tenantId: 'tenant-id' });
    expect(getSession).toHaveBeenCalled();
    expect(getSessionFromVSCode).not.toHaveBeenCalled();
  });
});

describe('getAuthorizationTokenFromNode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getSessionFromVSCode.mockReset();
    for (const key of federatedEnvKeys) {
      delete process.env[key];
    }
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => false),
    } as any);
  });

  it('should throw when node is null/undefined', async () => {
    await expect(getAuthorizationTokenFromNode(null as any)).rejects.toThrow();
  });

  it('should throw when node has no subscription', async () => {
    const node = {} as any;
    await expect(getAuthorizationTokenFromNode(node)).rejects.toThrow();
  });

  it('should return bearer token from node subscription credentials', async () => {
    const node = {
      subscription: {
        tenantId: 'tenant-1',
        credentials: {
          getToken: vi.fn().mockResolvedValue({ token: 'node-token-abc' }),
        },
      },
    } as any;

    const token = await getAuthorizationTokenFromNode(node);
    expect(token).toBe('Bearer node-token-abc');
  });

  it('should fall back to getAuthorizationToken when credentials.getToken returns null', async () => {
    mocks.getSessionFromVSCode.mockResolvedValue({
      accessToken: 'fallback-token',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    });

    const node = {
      subscription: {
        tenantId: 'tenant-1',
        credentials: {
          getToken: vi.fn().mockResolvedValue(null),
        },
      },
    } as any;

    const token = await getAuthorizationTokenFromNode(node);
    expect(token).toBe('Bearer fallback-token');
  });

  it('should fall back to getAuthorizationToken when no credentials exist', async () => {
    mocks.getSessionFromVSCode.mockResolvedValue({
      accessToken: 'fallback-token-2',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    });

    const node = {
      subscription: {
        tenantId: 'tenant-2',
        credentials: undefined,
      },
    } as any;

    const token = await getAuthorizationTokenFromNode(node);
    expect(token).toBe('Bearer fallback-token-2');
  });
});

describe('getCloudHost', () => {
  it('should return the managementEndpointUrl from configured environment', async () => {
    const host = await getCloudHost();
    expect(host).toBe('https://management.azure.com');
  });
});
