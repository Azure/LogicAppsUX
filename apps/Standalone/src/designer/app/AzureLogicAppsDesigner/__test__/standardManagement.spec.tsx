import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { IHttpClient } from '@microsoft/logic-apps-shared';
import { StandardManagementHttpClient } from '../../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/standard/management';
import {
  AzureManagementArmClient,
  armOnlyStandardManagement,
  getStandardManagementCacheKey,
  useAzureStandardManagement,
} from '../Services/StandardManagement';
import {
  fetchA2AAuthKey,
  getRunInstanceStandard,
  listCallbackUrl,
  listMcpServers,
  validateWorkflowStandard,
} from '../Services/WorkflowAndArtifacts';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  legacyPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mocks.get, post: mocks.post }),
    post: mocks.legacyPost,
  },
}));
vi.mock('axios-retry', () => ({ default: vi.fn() }));
vi.mock('../../../../environments/environment', () => ({ environment: {} }));
vi.mock('@microsoft/logic-apps-shared', async () => ({
  ...(await import('../../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/standard/management')),
  equals: (a: unknown, b: unknown) => a === b,
}));
vi.mock('@microsoft/logic-apps-designer', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return {
    getReactQueryClient: () => queryClient,
    runsQueriesKeys: { useRunInstance: 'run' },
  };
});

const resourceId = '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test';
const workflowId = `${resourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/Order`;
const armWorkflow = `https://management.azure.com${workflowId}`;

describe('Azure-connected Standard management helper entrypoints', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({ status: 200, data: { name: 'run' }, headers: {} });
    mocks.post.mockReset().mockResolvedValue({ status: 200, data: {}, headers: {} });
    mocks.legacyPost.mockReset();
  });
  afterEach(cleanup);

  it('uses the centralized callback entry and retains legacy callback shape', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getCallbackUrl');
    mocks.post.mockResolvedValueOnce({ data: { value: 'https://callback.example.invalid/signed', method: 'POST' } });
    await expect(listCallbackUrl(workflowId, 'manual')).resolves.toEqual({
      value: 'https://callback.example.invalid/signed',
      method: 'POST',
    });
    expect(entry).toHaveBeenCalledWith(
      expect.objectContaining({ uri: `${armWorkflow}/triggers/manual/listCallbackUrl?api-version=2020-06-01`, content: null })
    );
    expect(mocks.legacyPost).not.toHaveBeenCalled();
  });

  it('uses centralized validation with all existing payload fields', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'validateWorkflow');
    const connections = { managedApiConnections: {} };
    await validateWorkflowStandard(resourceId, 'Order', { definition: {} }, connections, {}, { setting: 'value' });
    expect(entry).toHaveBeenCalledWith({
      uri: `${armWorkflow}/validate?api-version=2020-06-01`,
      content: { properties: { definition: {}, connections, parameters: {}, appsettings: { Values: { setting: 'value' } } } },
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('uses centralized run GET and preserves expansion/version options', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getRun');
    await expect(getRunInstanceStandard('Order', resourceId, 'run')).resolves.toEqual({ name: 'run' });
    expect(entry).toHaveBeenCalledWith({
      uri: `${armWorkflow}/runs/run?api-version=2018-11-01&$expand=properties/actions,workflow/properties`,
    });
  });

  it('uses centralized MCP enumeration and retains response projection', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'listMcpServers');
    mocks.post.mockResolvedValueOnce({ data: { value: [{ name: 'server' }] } });
    await expect(listMcpServers(resourceId)).resolves.toEqual([{ name: 'server' }]);
    expect(entry).toHaveBeenCalledWith({
      uri: `https://management.azure.com${resourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers?api-version=2024-11-01`,
    });
  });

  it('uses centralized draft keys but leaves published keys on their original path', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getDraftAgentKeys');
    await fetchA2AAuthKey(resourceId, 'Order', true);
    expect(entry).toHaveBeenCalledWith({
      uri: `${armWorkflow}/listDraftApiKeys?api-version=2018-11-01`,
      content: { expiry: expect.any(String), keyType: 'Primary' },
    });
    mocks.legacyPost.mockResolvedValueOnce({ data: { key: 'published' } });
    await expect(fetchA2AAuthKey(resourceId, 'Order', false)).resolves.toEqual({ key: 'published' });
    expect(entry).toHaveBeenCalledOnce();
    expect(mocks.legacyPost).toHaveBeenCalledOnce();
  });

  it('retains consumption callback routing outside the Standard catalog', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getCallbackUrl');
    mocks.legacyPost.mockResolvedValueOnce({ data: { value: 'https://callback.example.invalid/consumption', method: 'GET' } });
    await listCallbackUrl('/subscriptions/test/providers/Microsoft.Logic/workflows/consumption', 'manual', true);
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledOnce();
  });

  it('does not flatten transport errors or replay failed ARM mutations', async () => {
    const error = { response: { status: 403, data: { error: { code: 'AuthorizationFailed' } } } };
    mocks.post.mockRejectedValueOnce(error);
    await expect(validateWorkflowStandard(resourceId, 'Order', {})).rejects.toBe(error);
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it('preserves explicit authorization/noAuth and never adds a bearer to signed GETs', async () => {
    const client = new AzureManagementArmClient();
    await client.post({ uri: `${armWorkflow}/validate`, noAuth: true, headers: { Authorization: 'explicit' } });
    expect(mocks.post).toHaveBeenLastCalledWith(
      `${armWorkflow}/validate`,
      undefined,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'explicit' }) })
    );
    await client.get({ uri: 'https://signed.example.invalid/content' });
    expect(mocks.get.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('is default-off without invented operational configuration', async () => {
    const context = {
      resourceId,
      runtimeHostName: 'test.azurewebsites.net',
      tenantId: 'tenant',
      principalId: 'principal',
      isHybrid: false,
    };
    const { result, unmount } = renderHook(() => useAzureStandardManagement(context));
    await getRunInstanceStandard('Order', resourceId, 'run', result.current);
    expect(mocks.get).toHaveBeenCalledOnce();
    expect(mocks.post).not.toHaveBeenCalled();
    unmount();
  });

  it('shares one configured Contributor session across actual callback, validation, MCP, run GET and draft-key helpers', async () => {
    const expirySeconds = Math.floor(Date.now() / 1000) + 300;
    mocks.post.mockResolvedValueOnce({
      data: {
        endpoint: 'https://test.azurewebsites.net/runtime/webhooks/workflow/api/management/v1',
        extensionCode: 'fixture-extension',
        accessToken: `${expirySeconds.toString(16).padStart(8, '0')}.${'A'.repeat(43)}`,
        expiresOn: new Date(expirySeconds * 1000).toISOString().replace('.000Z', 'Z'),
      },
    });
    const directPost = vi.fn(async (options: { uri: string }) => {
      if (options.uri.endsWith('/listCallbackUrl')) {
        return { value: 'https://callback.example.invalid/configured', method: 'POST' };
      }
      if (options.uri.endsWith('/listMcpServers')) {
        return { value: [{ name: 'configured-server' }] };
      }
      return {};
    });
    const directGet = vi.fn().mockResolvedValue({ name: 'configured-run' });
    const directClient = { get: directGet, post: directPost, dispose: vi.fn() } as unknown as IHttpClient;
    const { result, unmount } = renderHook(() =>
      useAzureStandardManagement(
        { resourceId, runtimeHostName: 'test.azurewebsites.net', isHybrid: false },
        {
          directClient,
          issuerFailureBackoffMs: 2_000,
          tenantId: 'tenant',
          principalId: 'principal',
          authContextKey: 'fixture-auth',
          experimentationService: { isFeatureEnabled: async () => true, getFeatureValue: async () => undefined },
        }
      )
    );
    const client = result.current;
    await listCallbackUrl(workflowId, 'manual', false, client);
    await validateWorkflowStandard(resourceId, 'Order', {}, undefined, undefined, undefined, client);
    await expect(listMcpServers(resourceId, client)).resolves.toEqual([{ name: 'configured-server' }]);
    await expect(getRunInstanceStandard('Order', resourceId, 'run', client)).resolves.toEqual({ name: 'configured-run' });
    await fetchA2AAuthKey(resourceId, 'Order', true, client);
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(directPost).toHaveBeenCalledTimes(4);
    expect(directGet).toHaveBeenCalledOnce();
    expect(mocks.post.mock.calls[0][0]).toContain('/getContributorToken');
    unmount();
  });

  it('rejects pending real helper issuance after route teardown without a business dispatch', async () => {
    let release!: (response: unknown) => void;
    mocks.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const directGet = vi.fn();
    const directClient = { get: directGet, dispose: vi.fn() } as unknown as IHttpClient;
    const { result, unmount } = renderHook(() =>
      useAzureStandardManagement(
        { resourceId, runtimeHostName: 'test.azurewebsites.net', isHybrid: false },
        {
          directClient,
          issuerFailureBackoffMs: 2_000,
          tenantId: 'tenant',
          principalId: 'principal',
          authContextKey: 'fixture-auth',
          experimentationService: { isFeatureEnabled: async () => true, getFeatureValue: async () => undefined },
        }
      )
    );
    const pending = getRunInstanceStandard('Order', resourceId, 'run', result.current);
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    unmount();
    const rejected = expect(pending).rejects.toMatchObject({ error: { code: 'ManagementContextChanged' } });
    release({ data: {} });
    await rejected;
    expect(directGet).not.toHaveBeenCalled();
  });

  it('binds trusted discovery and invalidates client/cache identity on auth changes and teardown', () => {
    const setContext = vi.spyOn(StandardManagementHttpClient.prototype, 'setContext');
    const directClient = { dispose: vi.fn() } as unknown as IHttpClient;
    const discovery = {
      resourceId,
      runtimeHostName: 'test.azurewebsites.net',
      tenantId: 'tenant',
      principalId: 'principal',
      isHybrid: false,
    };
    const configuration = {
      directClient,
      issuerFailureBackoffMs: 2_000,
      tenantId: 'tenant',
      principalId: 'principal',
      authContextKey: 'auth-one',
    };
    const { result, rerender, unmount } = renderHook(
      ({ authContextKey }) => useAzureStandardManagement(discovery, { ...configuration, authContextKey }),
      { initialProps: { authContextKey: 'auth-one' } }
    );
    const first = result.current;
    const firstCacheKey = getStandardManagementCacheKey(first);
    expect(setContext).toHaveBeenCalledWith({
      resourceId,
      armOrigin: 'https://management.azure.com',
      runtimeOrigin: 'https://test.azurewebsites.net',
      tenantId: 'tenant',
      principalId: 'principal',
      authContextKey: 'auth-one',
    });
    rerender({ authContextKey: 'auth-two' });
    expect(result.current).not.toBe(first);
    expect(getStandardManagementCacheKey(result.current)).not.toBe(firstCacheKey);
    expect(setContext).toHaveBeenCalledWith(undefined);
    unmount();
    expect(setContext).toHaveBeenLastCalledWith(undefined);
  });

  it('keeps a StrictMode owner usable during effect replay and disposes it on permanent teardown', async () => {
    const { result, unmount } = renderHook(
      () => useAzureStandardManagement({ resourceId, runtimeHostName: 'test.azurewebsites.net', isHybrid: false }),
      { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> }
    );
    const client = result.current;
    await Promise.resolve();
    await expect(getRunInstanceStandard('Order', resourceId, 'run', client)).resolves.toEqual({ name: 'run' });
    unmount();
    await Promise.resolve();
    await expect(getRunInstanceStandard('Order', resourceId, 'run', client)).rejects.toMatchObject({
      error: { code: 'ManagementContextChanged' },
    });
    expect(mocks.get).toHaveBeenCalledOnce();
  });
});
