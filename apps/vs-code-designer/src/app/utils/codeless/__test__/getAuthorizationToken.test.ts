import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthorizationToken, getAuthorizationTokenFromNode, getCloudHost } from '../getAuthorizationToken';

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

  it('should return empty string when session returns no accessToken', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    const token = await getAuthorizationToken();
    expect(token).toBe('');
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
