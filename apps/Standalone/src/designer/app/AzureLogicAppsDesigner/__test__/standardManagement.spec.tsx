// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { IHttpClient } from '@microsoft/logic-apps-shared';
import {
  StandardManagementError,
  StandardManagementHttpClient,
} from '../../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/standard/management';
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
  saveWorkflowStandard,
  validateWorkflowStandard,
} from '../Services/WorkflowAndArtifacts';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  legacyGet: vi.fn(),
  legacyPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mocks.get, post: mocks.post }),
    get: mocks.legacyGet,
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

function configuredManagement(): { client: StandardManagementHttpClient; direct: IHttpClient } {
  const direct: IHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    dispose: vi.fn(),
  };
  const client = new StandardManagementHttpClient({
    armClient: new AzureManagementArmClient(),
    directClient: direct,
    issuerFailureBackoffMs: 2000,
    experimentationService: { isFeatureEnabled: async () => true, getFeatureValue: async () => undefined },
  });
  client.setContext({
    resourceId,
    armOrigin: 'https://management.azure.com',
    runtimeOrigin: 'https://test.azurewebsites.net',
    tenantId: 'tenant',
    principalId: 'principal',
    authContextKey: 'synthetic-save-auth',
  });
  return { client, direct };
}

function saveWithManagement(client: StandardManagementHttpClient, throwError: boolean, clearDirtyState: () => void): Promise<unknown> {
  return saveWorkflowStandard(
    resourceId,
    [{ name: 'Order', workflow: { definition: { triggers: {}, actions: {} } } }],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    clearDirtyState,
    { standardManagement: client, throwError }
  );
}

describe('Azure-connected Standard management helper entrypoints', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({ status: 200, data: { name: 'run' }, headers: {} });
    mocks.post.mockReset().mockResolvedValue({ status: 200, data: {}, headers: {} });
    mocks.legacyGet.mockReset().mockResolvedValue({ status: 200, data: { name: 'run' }, headers: {} });
    mocks.legacyPost.mockReset().mockResolvedValue({ status: 200, data: {}, headers: {} });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(cleanup);

  it('selects named helper operations when management is enabled', async () => {
    const { client } = configuredManagement();
    const callback = vi.spyOn(client, 'getCallbackUrl').mockResolvedValue({ value: 'https://callback.example.invalid', method: 'POST' });
    const validate = vi.spyOn(client, 'validateWorkflow').mockResolvedValue(undefined);
    const run = vi.spyOn(client, 'getRun').mockResolvedValue({ name: 'run' });
    const mcp = vi.spyOn(client, 'listMcpServers').mockResolvedValue({ value: [{ name: 'server' }] });
    const keys = vi.spyOn(client, 'getDraftAgentKeys').mockResolvedValue({ key: 'synthetic-key' });
    try {
      await listCallbackUrl(workflowId, 'manual', false, client);
      await validateWorkflowStandard(resourceId, 'Order', { definition: {} }, undefined, undefined, undefined, client);
      await getRunInstanceStandard('Order', resourceId, 'run', client);
      await listMcpServers(resourceId, client);
      await fetchA2AAuthKey(resourceId, 'Order', true, client);
      for (const entry of [callback, validate, run, mcp, keys]) {
        expect(entry).toHaveBeenCalledOnce();
        expect(entry).toHaveBeenCalledWith(expect.objectContaining({ uri: expect.stringContaining('/management/') }), expect.any(Function));
      }
      expect(mocks.legacyGet).not.toHaveBeenCalled();
      expect(mocks.legacyPost).not.toHaveBeenCalled();
    } finally {
      client.dispose();
    }
  });

  it('bypasses management when disabled and retains legacy callback shape', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getCallbackUrl');
    mocks.legacyPost.mockResolvedValueOnce({ data: { value: 'https://callback.example.invalid/signed', method: 'POST' } });
    await expect(listCallbackUrl(workflowId, 'manual')).resolves.toEqual({
      value: 'https://callback.example.invalid/signed',
      method: 'POST',
    });
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledExactlyOnceWith(
      `${armWorkflow}/triggers/manual/listCallbackUrl?api-version=2020-06-01`,
      null,
      { headers: { Authorization: 'Bearer undefined' } }
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('bypasses management when disabled and retains validation with all existing payload fields', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'validateWorkflow');
    const connections = { managedApiConnections: {} };
    await validateWorkflowStandard(resourceId, 'Order', { definition: {} }, connections, {}, { setting: 'value' });
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledExactlyOnceWith(
      `${armWorkflow}/validate?api-version=2020-06-01`,
      { properties: { definition: {}, connections, parameters: {}, appsettings: { Values: { setting: 'value' } } } },
      { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer undefined' } }
    );
  });

  it('bypasses management when disabled and preserves run expansion/version options', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getRun');
    await expect(getRunInstanceStandard('Order', resourceId, 'run')).resolves.toEqual({ name: 'run' });
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyGet).toHaveBeenCalledExactlyOnceWith(
      `${armWorkflow}/runs/run?api-version=2018-11-01&$expand=properties/actions,workflow/properties`,
      { headers: { Authorization: 'Bearer undefined' } }
    );
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('bypasses management when disabled and retains MCP response projection', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'listMcpServers');
    mocks.legacyPost.mockResolvedValueOnce({ data: { value: [{ name: 'server' }] } });
    await expect(listMcpServers(resourceId)).resolves.toEqual([{ name: 'server' }]);
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledExactlyOnceWith(
      `https://management.azure.com${resourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers?api-version=2024-11-01`,
      undefined,
      { headers: { Authorization: 'Bearer undefined' } }
    );
  });

  it('bypasses management when disabled for draft keys and leaves published keys on their original path', async () => {
    const entry = vi.spyOn(armOnlyStandardManagement, 'getDraftAgentKeys');
    await fetchA2AAuthKey(resourceId, 'Order', true);
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledExactlyOnceWith(
      `${armWorkflow}/listDraftApiKeys?api-version=2018-11-01`,
      { expiry: expect.any(String), keyType: 'Primary' },
      { headers: { Authorization: 'Bearer undefined' } }
    );
    mocks.legacyPost.mockResolvedValueOnce({ data: { key: 'published' } });
    await expect(fetchA2AAuthKey(resourceId, 'Order', false)).resolves.toEqual({ key: 'published' });
    expect(entry).not.toHaveBeenCalled();
    expect(mocks.legacyPost).toHaveBeenCalledTimes(2);
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
    mocks.legacyPost.mockRejectedValueOnce(error);
    await expect(validateWorkflowStandard(resourceId, 'Order', {})).rejects.toBe(error);
    expect(mocks.legacyPost).toHaveBeenCalledOnce();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([201, 202, 204])('preserves legacy validation rejection for HTTP %s', async (status) => {
    const response = { status, data: {} };
    mocks.legacyPost.mockResolvedValueOnce(response);
    await expect(validateWorkflowStandard(resourceId, 'Order', {})).rejects.toBe(response);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([undefined, 403, 404, 503].flatMap((status) => [false, true].map((throwError) => [status, throwError] as const)))(
    'rejects session validation failure %s, throwError=%s, without deploying or clearing dirty state',
    async (status, throwError) => {
      const error = new StandardManagementError('ManagementRequestFailed', 'Synthetic session failure', status);
      const { client } = configuredManagement();
      vi.spyOn(client, 'validateWorkflow').mockRejectedValueOnce(error);
      const clearDirtyState = vi.fn();
      await expect(
        saveWorkflowStandard(
          resourceId,
          [{ name: 'Order', workflow: { definition: {} } }],
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          clearDirtyState,
          { standardManagement: client, throwError }
        )
      ).rejects.toBe(error);
      expect(mocks.legacyPost).not.toHaveBeenCalled();
      expect(clearDirtyState).not.toHaveBeenCalled();
      client.dispose();
    }
  );

  it.each(
    [
      { status: 404, code: 'DirectAccessDisabled' },
      { status: 500, code: 'InternalServerError' },
      { status: 403, code: 'AuthorizationFailed' },
    ].flatMap(({ status, code }) => [false, true].map((throwError) => ({ status, code, throwError })))
  )(
    'validates and saves through the original requests on issuer $status with throwError=$throwError',
    async ({ status, code, throwError }) => {
      const { client, direct } = configuredManagement();
      const clearDirtyState = vi.fn();
      mocks.post.mockRejectedValueOnce({ response: { status, data: { error: { code } } } });
      try {
        await expect(saveWithManagement(client, throwError, clearDirtyState)).resolves.toHaveProperty(['files', 'Order/workflow.json']);
        expect(mocks.post).toHaveBeenCalledOnce();
        expect(mocks.post.mock.calls[0][0]).toContain('/getContributorToken');
        expect(direct.post).not.toHaveBeenCalled();
        expect(mocks.legacyPost).toHaveBeenCalledTimes(2);
        expect(mocks.legacyPost.mock.calls[0][0]).toContain('/workflows/Order/validate?');
        expect(mocks.legacyPost.mock.calls[1][0]).toContain('/deployWorkflowArtifacts?');
        expect(clearDirtyState).toHaveBeenCalledOnce();
      } finally {
        client.dispose();
      }
    }
  );

  it.each([false, true])('uses original validation and save on an invalid issuer envelope with throwError=%s', async (throwError) => {
    const { client, direct } = configuredManagement();
    const clearDirtyState = vi.fn();
    mocks.post.mockResolvedValueOnce({ data: { endpoint: 'https://test.azurewebsites.net' } });
    try {
      await expect(saveWithManagement(client, throwError, clearDirtyState)).resolves.toHaveProperty(['files', 'Order/workflow.json']);
      expect(mocks.post).toHaveBeenCalledOnce();
      expect(direct.post).not.toHaveBeenCalled();
      expect(mocks.legacyPost).toHaveBeenCalledTimes(2);
      expect(clearDirtyState).toHaveBeenCalledOnce();
    } finally {
      client.dispose();
    }
  });

  it.each(['direct', 'ARM fallback'].flatMap((transport) => [false, true].map((throwError) => ({ transport, throwError }))))(
    'handles a confirmed $transport validation-route 404 with throwError=$throwError',
    async ({ transport, throwError }) => {
      const { client, direct } = configuredManagement();
      const clearDirtyState = vi.fn();
      const notFound = { status: 404, response: { status: 404, data: { error: { code: 'NotFound' } } } };
      if (transport === 'direct') {
        const seconds = Math.floor(Date.now() / 1000) + 300;
        mocks.post.mockResolvedValueOnce({
          data: {
            endpoint: 'https://test.azurewebsites.net/api/v1',
            apiKey: 'synthetic-signed-management',
            expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
          },
        });
        vi.mocked(direct.post).mockRejectedValueOnce(notFound);
      } else {
        mocks.post.mockRejectedValueOnce({ response: { status: 503, data: { error: { code: 'ServiceTemporarilyUnavailable' } } } });
        mocks.legacyPost.mockRejectedValueOnce(notFound);
      }
      mocks.legacyPost.mockResolvedValueOnce({ status: 200, data: {} });
      try {
        const save = saveWithManagement(client, throwError, clearDirtyState);
        if (throwError && transport === 'direct') {
          await expect(save).rejects.toBe(notFound);
          expect(mocks.legacyPost).not.toHaveBeenCalled();
          expect(clearDirtyState).not.toHaveBeenCalled();
        } else {
          await expect(save).resolves.toHaveProperty(['files', 'Order/workflow.json']);
          expect(mocks.legacyPost).toHaveBeenCalledTimes(transport === 'direct' ? 1 : 2);
          expect(mocks.legacyPost.mock.lastCall?.[0]).toContain('/deployWorkflowArtifacts?');
          expect(clearDirtyState).toHaveBeenCalledOnce();
        }
        if (transport === 'direct') {
          expect(mocks.post).toHaveBeenCalledOnce();
          expect(direct.post).toHaveBeenCalledWith(
            expect.objectContaining({ uri: expect.stringMatching(/\/workflows\/Order\/validate$/) })
          );
        } else {
          expect(mocks.post).toHaveBeenCalledOnce();
          expect(mocks.legacyPost.mock.calls[0][0]).toContain('/workflows/Order/validate?');
          expect(direct.post).not.toHaveBeenCalled();
        }
      } finally {
        client.dispose();
      }
    }
  );

  it.each([false, true])('preserves direct validation errors through save with throwError=%s', async (throwError) => {
    const { client, direct } = configuredManagement();
    const clearDirtyState = vi.fn();
    const seconds = Math.floor(Date.now() / 1000) + 300;
    mocks.post.mockResolvedValueOnce({
      data: {
        endpoint: 'https://test.azurewebsites.net/api/v1',
        apiKey: 'synthetic-signed-management',
        expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
      },
    });
    const error = Object.freeze({
      status: 400,
      data: {
        error: { code: 'WorkflowValidationFailed', message: 'The Compose expression is invalid.', details: [{ target: 'Compose' }] },
      },
    });
    vi.mocked(direct.post).mockRejectedValueOnce(error);
    try {
      await expect(saveWithManagement(client, throwError, clearDirtyState)).rejects.toBe(error);
      expect(mocks.legacyPost).not.toHaveBeenCalled();
      expect(clearDirtyState).not.toHaveBeenCalled();
      expect(direct.post).toHaveBeenCalledOnce();
    } finally {
      client.dispose();
    }
  });

  it('preserves a direct MCP enumeration error instead of returning an empty list', async () => {
    const { client, direct } = configuredManagement();
    const seconds = Math.floor(Date.now() / 1000) + 300;
    mocks.post.mockResolvedValueOnce({
      data: {
        endpoint: 'https://test.azurewebsites.net/api/v1',
        apiKey: 'synthetic-signed-management',
        expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
      },
    });
    const error = { status: 403, data: { error: { code: 'AuthorizationFailed', message: 'MCP enumeration is not permitted.' } } };
    vi.mocked(direct.post).mockRejectedValueOnce(error);
    try {
      await expect(listMcpServers(resourceId, client)).rejects.toBe(error);
      expect(mocks.legacyPost).not.toHaveBeenCalled();
    } finally {
      client.dispose();
    }
  });

  it('returns the original run helper result when Reader token acquisition fails', async () => {
    const { client, direct } = configuredManagement();
    mocks.get.mockRejectedValueOnce(new TypeError('Synthetic offline'));
    try {
      await expect(getRunInstanceStandard('Order', resourceId, 'run', client)).resolves.toEqual({ name: 'run' });
      expect(mocks.get).toHaveBeenCalledOnce();
      expect(mocks.get.mock.calls[0][0]).toContain('/tokens/reader?');
      expect(mocks.legacyGet).toHaveBeenCalledExactlyOnceWith(
        `${armWorkflow}/runs/run?api-version=2018-11-01&$expand=properties/actions,workflow/properties`,
        { headers: { Authorization: 'Bearer undefined' } }
      );
      expect(direct.get).not.toHaveBeenCalled();
    } finally {
      client.dispose();
    }
  });

  it.each([false, true])('preserves ARM-only validation-route 404 handling with throwError=%s', async (throwError) => {
    const client = StandardManagementHttpClient.createArmOnly(new AzureManagementArmClient());
    const clearDirtyState = vi.fn();
    const notFound = { status: 404 };
    mocks.legacyPost.mockRejectedValueOnce(notFound).mockResolvedValueOnce({ status: 200, data: {} });
    try {
      const save = saveWithManagement(client, throwError, clearDirtyState);
      await expect(save).resolves.toHaveProperty(['files', 'Order/workflow.json']);
      expect(clearDirtyState).toHaveBeenCalledOnce();
      expect(mocks.legacyPost).toHaveBeenCalledTimes(2);
      expect(mocks.legacyPost.mock.calls[0][0]).toContain('/workflows/Order/validate?');
      expect(mocks.post).not.toHaveBeenCalled();
    } finally {
      client.dispose();
    }
  });

  it.each([undefined, 403, 503].flatMap((status) => [false, true].map((throwError) => ({ status, throwError }))))(
    'preserves legacy save stopping on validation failure $status with throwError=$throwError',
    async ({ status, throwError }) => {
      const client = StandardManagementHttpClient.createArmOnly(new AzureManagementArmClient());
      const clearDirtyState = vi.fn();
      mocks.legacyPost.mockRejectedValueOnce({ status });
      try {
        await expect(saveWithManagement(client, throwError, clearDirtyState)).resolves.toBeUndefined();
        expect(mocks.legacyPost).toHaveBeenCalledOnce();
        expect(mocks.legacyPost.mock.calls[0][0]).toContain('/workflows/Order/validate?');
        expect(mocks.post).not.toHaveBeenCalled();
        expect(clearDirtyState).not.toHaveBeenCalled();
      } finally {
        client.dispose();
      }
    }
  );

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
    expect(mocks.legacyGet).toHaveBeenCalledOnce();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    unmount();
  });

  it('shares one configured Contributor session across actual callback, validation, MCP, run GET and draft-key helpers', async () => {
    const expirySeconds = Math.floor(Date.now() / 1000) + 300;
    mocks.post.mockResolvedValueOnce({
      data: {
        endpoint: 'https://test.azurewebsites.net/api/v1',
        apiKey: 'synthetic-signed-management',
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
    expect(mocks.legacyGet).toHaveBeenCalledOnce();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
