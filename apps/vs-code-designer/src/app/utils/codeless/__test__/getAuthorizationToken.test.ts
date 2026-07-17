import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthorizationToken, getAuthorizationTokenFromNode, getCloudHost } from '../getAuthorizationToken';

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
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(() => false),
    } as any);
  });

  it('should return a ****** string when session has a valid accessToken', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      accessToken: 'test-token-123',
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    const token = await getAuthorizationToken('test-tenant');
    expect(token).toContain('test-token-123');
    expect(typeof token).toBe('string');
  });

  it('should throw when session returns no accessToken', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue({
      id: 'session-1',
      account: { id: 'account-1', label: 'Test' },
      scopes: [],
    } as any);

    await expect(getAuthorizationToken()).rejects.toThrow('No access token available.');
  });

  it('should throw when session is undefined (silentAuth with no cached session)', async () => {
    vi.spyOn(azureAuth, 'getSessionFromVSCode').mockResolvedValue(undefined as any);

    await expect(getAuthorizationToken()).rejects.toThrow('No access token available.');
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

  it('should return a ****** string from node subscription credentials', async () => {
    const node = {
      subscription: {
        tenantId: 'tenant-1',
        credentials: {
          getToken: vi.fn().mockResolvedValue({ token: 'node-token-abc' }),
        },
      },
    } as any;

    const token = await getAuthorizationTokenFromNode(node);
    expect(token).toContain('node-token-abc');
    expect(typeof token).toBe('string');
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
    expect(token).toContain('fallback-token');
  });
});

describe('getCloudHost', () => {
  it('should return the management endpoint URL', async () => {
    const host = await getCloudHost();
    expect(host).toBe('https://management.azure.com');
  });
});
