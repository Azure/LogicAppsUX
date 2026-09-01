import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthData, getAuthorizationToken, getAuthorizationTokenFromNode, getCloudHost } from '../getAuthorizationToken';

// The module-level mock for '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode'
// is aliased via vitest.config.ts to '__mocks__/vscode-azext-azureauth.ts'.
// We import and spy on it to control return values per test.
import * as azureAuth from '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode';
import * as vscode from 'vscode';

vi.mock('@microsoft/vscode-azext-azureauth', () => ({
  getConfiguredAzureEnv: vi.fn(() => ({
    managementEndpointUrl: 'https://management.azure.com',
  })),
}));

describe('getAuthorizationToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN;
    delete process.env.LA_E2E_CLI_AZURE_TENANT_ID;
    delete process.env.VSCODE_RUNNING_TESTS;
    // Mock vscode.workspace.getConfiguration to return a config with get()
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => false),
    } as any);
  });

  it('should return a Bearer token when session has an accessToken', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      accessToken: 'test-token-123',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    const token = await getAuthorizationToken('test-tenant');
    expect(token).toBe('Bearer test-token-123');
  });

  it('should return "Bearer undefined" when session returns no accessToken', async () => {
    // Note: getAuthorizationToken does not guard against undefined accessToken.
    // The token refresh interval in openDesignerForLocalProject guards against this
    // by checking for "undefined" in the returned string before propagating it.
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    const token = await getAuthorizationToken();
    expect(token).toBe('Bearer undefined');
  });

  it('should propagate errors when session acquisition fails', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockRejectedValue(new Error('Auth session expired'));

    await expect(getAuthorizationToken()).rejects.toThrow('Auth session expired');
  });

  it('should pass tenantId to getSessionFromVSCode', async () => {
    const spy = vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      accessToken: 'tenant-token',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    await getAuthorizationToken('specific-tenant-id');
    expect(spy).toHaveBeenCalledWith(undefined, 'specific-tenant-id', expect.any(Object));
  });

  it('uses a test-gated Azure CLI token fallback when silent auth has no cached session', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => true),
    } as any);
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue(undefined as any);
    process.env.VSCODE_RUNNING_TESTS = '1';
    process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN = 'azure-cli-token';

    const authData = await getAuthData('tenant-1');

    expect(authData?.accessToken).toBe('azure-cli-token');
    expect(authData?.account.id).toBe('e2e-cli.tenant-1');
  });

  it('does not use the Azure CLI token fallback outside extension tests', async () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => true),
    } as any);
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue(undefined as any);
    process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN = 'azure-cli-token';

    const authData = await getAuthData('tenant-1');

    expect(authData).toBeUndefined();
  });
});

describe('getAuthorizationTokenFromNode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('should return Bearer token from node subscription credentials', async () => {
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
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      accessToken: 'fallback-token',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

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
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      accessToken: 'fallback-token-2',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

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
