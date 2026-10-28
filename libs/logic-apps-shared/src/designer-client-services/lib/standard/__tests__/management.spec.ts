import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpRequestOptions, IHttpClient } from '../../httpClient';
import { isStandardManagementError, StandardManagementHttpClient, standardDirectManagementFeatureGate } from '../management';
import { StandardRunService } from '../run';
import { BaseResourceService } from '../../base/resource';
import { StandardConnectorService } from '../connector';
import { StandardOperationManifestService } from '../operationmanifest';
import { StandardSearchService } from '../search';
import { InitLoggerService } from '../../logger';
import { HTTP_METHODS } from '../../../../utils/src';

const resourceId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/sites/app';
const armOrigin = 'https://management.azure.com';
const runtimeOrigin = 'https://app.azurewebsites.net';
const armBase = `${armOrigin}${resourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
const endpoint = `${runtimeOrigin}/api/v1`;
const context = { resourceId, armOrigin, runtimeOrigin, tenantId: 'tenant', principalId: 'user', authContextKey: 'sign-in-1' };
const paths = [
  ['POST', '/workflows/Order/triggers/manual/listCallbackUrl', 'contributor', 'getCallbackUrl'],
  ['POST', '/workflows/Order/validate', 'contributor', 'validateWorkflow'],
  ['POST', '/operationGroups/sql/operations/query/dynamicInvoke', 'contributor', 'invokeConnector'],
  ['POST', '/workflows/Order/runs/run/cancel', 'contributor', 'cancelRun'],
  ['POST', '/listMcpServers', 'contributor', 'listMcpServers'],
  ['GET', '/workflows/Order/runs/run', 'reader', 'getRun'],
  ['POST', '/workflows/Order/triggers/manual/histories/history/resubmit', 'contributor', 'resubmitTrigger'],
  ['POST', '/workflows/Order/listDraftApiKeys', 'contributor', 'getDraftAgentKeys'],
  ['GET', '/workflows/Order/runs', 'reader', 'listRuns'],
  ['POST', '/workflows/Order/triggers/manual/run', 'contributor', 'runTrigger'],
  ['GET', '/operationGroups/sql/operations/query', 'reader', 'getConnectorOperation'],
  ['GET', '/operationGroups', 'reader', 'listConnectorGroups'],
  ['GET', '/operations', 'reader', 'listOperations'],
  ['GET', '/workflows', 'reader', 'listWorkflows'],
] as const;

function httpClient(): IHttpClient {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), dispose: vi.fn() };
}

function envelope(expires = Date.now() + 300_000): Record<string, string> {
  const seconds = Math.floor(expires / 1000);
  return {
    endpoint,
    apiKey: 'synthetic-signed-management-credential',
    expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
  };
}

function failure(status: number, code: string): unknown {
  return {
    message: 'Internal transport diagnostic',
    response: { status, data: { error: { code, message: 'Server diagnostic', target: 'app' } } },
  };
}

const throttleFailures = ['retry-after', 'Retry-After', 'rEtRy-AfTeR'].flatMap((header) => [
  {
    shape: 'nested',
    header,
    error: { response: { status: 429, headers: { [header]: '10' }, data: { error: { code: 'DirectAccessRequestThrottled' } } } },
  },
  {
    shape: 'top-level',
    header,
    error: { statusCode: 429, headers: { [header]: '10' }, error: { code: 'DirectAccessRequestThrottled' } },
  },
]);

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Standard direct management through existing services', () => {
  let arm: IHttpClient;
  let direct: IHttpClient;
  let client: StandardManagementHttpClient;
  let isFeatureEnabled: ReturnType<typeof vi.fn>;
  let runService: StandardRunService;
  let resources: BaseResourceService;

  beforeEach(() => {
    InitLoggerService([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T18:00:00Z'));
    arm = httpClient();
    direct = httpClient();
    isFeatureEnabled = vi.fn().mockResolvedValue(true);
    client = new StandardManagementHttpClient({
      armClient: arm,
      directClient: direct,
      experimentationService: { isFeatureEnabled, getFeatureValue: vi.fn() },
      issuerFailureBackoffMs: 10_000,
    });
    client.setContext(context);
    vi.mocked(arm.get).mockImplementation(async () => envelope() as any);
    vi.mocked(arm.post).mockImplementation(async () => envelope() as any);
    vi.mocked(direct.get).mockResolvedValue({ value: [] });
    vi.mocked(direct.post).mockResolvedValue({ status: 'Succeeded' });
    runService = new StandardRunService({
      baseUrl: armBase,
      apiVersion: '2022-05-01',
      workflowName: 'Order',
      httpClient: arm,
      standardManagement: client,
    });
    resources = new BaseResourceService({
      baseUrl: armOrigin,
      apiVersion: '2020-06-01',
      httpClient: arm,
      standardManagement: client,
    });
  });

  afterEach(() => {
    client.dispose();
    vi.useRealTimers();
  });

  it('exposes named management APIs instead of a generic HTTP adapter', () => {
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'routeRequest']) {
      expect(method in client).toBe(false);
    }
  });

  it('lets callers check enablement without acquiring credentials or dispatching work', async () => {
    await expect(client.isEnabled()).resolves.toBe(true);
    await expect(client.isEnabled()).resolves.toBe(true);
    expect(isFeatureEnabled).toHaveBeenCalledOnce();
    expect(arm.get).not.toHaveBeenCalled();
    expect(arm.post).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('does not offer an enabled management facade without a supported context', async () => {
    client.setContext(undefined);
    await expect(client.isEnabled()).resolves.toBe(false);
    client.setContext({ ...context, resourceId: `${resourceId}/slots/staging` });
    await expect(client.isEnabled()).resolves.toBe(false);
    const armOnly = StandardManagementHttpClient.createArmOnly(arm);
    armOnly.setContext(context);
    await expect(armOnly.isEnabled()).resolves.toBe(false);
    armOnly.dispose();
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it.each(paths)('never intercepts generic resource %s %s requests (%s)', async (method, path, _profile, entry) => {
    const named = vi.spyOn(client, entry);
    const enabled = vi.spyOn(client, 'isEnabled');
    const uri = `${armBase}${path}?api-version=2022-05-01`;
    const content = method === 'POST' ? { original: 'body' } : undefined;
    const response = { original: 'response' };
    const transport = vi.mocked(method === 'POST' ? arm.post : arm.get);
    transport.mockResolvedValueOnce(response);
    await expect(resources.executeHttpCall(uri, method as HTTP_METHODS, content)).resolves.toBe(response);
    expect(transport).toHaveBeenCalledExactlyOnceWith(method === 'POST' ? { uri, content } : { uri });
    expect(named).not.toHaveBeenCalled();
    expect(enabled).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('does not send a direct continuation URL to the legacy transport after disablement', async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const named = vi.spyOn(client, 'listRuns');
    await expect(runService.getMoreRuns(`${endpoint}/workflows/Order/runs?api-version=2018-11-01&$skiptoken=next`)).rejects.toThrow(
      'Refresh run history'
    );
    expect(named).not.toHaveBeenCalled();
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('maps a direct continuation back to ARM after confirmed runtime disablement', async () => {
    vi.mocked(direct.get).mockRejectedValueOnce(failure(503, 'DirectAccessDisabled'));
    vi.mocked(arm.get).mockResolvedValueOnce(envelope()).mockResolvedValueOnce({ value: [] });
    await expect(runService.getMoreRuns(`${endpoint}/workflows/Order/runs?api-version=2018-11-01&$skiptoken=next`)).resolves.toEqual({
      runs: [],
      nextLink: undefined,
    });
    expect(arm.get).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uri: `${armBase}/workflows/Order/runs`,
        queryParameters: { 'api-version': '2018-11-01', $skiptoken: 'next' },
      })
    );
  });

  it.each(paths)('dispatches catalog %s %s using the fixed %s profile', async (method, path, profile, entry) => {
    const body = method === 'POST' ? { existing: 'business payload' } : undefined;
    const options: HttpRequestOptions<unknown> = { uri: `${armBase}${path}?api-version=2022-05-01`, content: body };
    const namedMethod = vi.spyOn(client, entry);
    if (await client.isEnabled()) {
      await client[entry](options);
    } else {
      await resources.executeHttpCall(options.uri, method as HTTP_METHODS, body);
    }
    expect(namedMethod).toHaveBeenCalledOnce();
    const issuer = profile === 'reader' ? vi.mocked(arm.get) : vi.mocked(arm.post);
    expect(issuer).toHaveBeenCalledOnce();
    expect(issuer).toHaveBeenCalledWith({
      uri: `${armBase}/${profile === 'reader' ? 'tokens/reader' : 'getContributorToken'}`,
      queryParameters: { 'api-version': '2018-11-01' },
      headers: { 'Cache-Control': 'no-store' },
      skipBatch: true,
    });
    const transport = method === 'GET' ? vi.mocked(direct.get) : vi.mocked(direct.post);
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: `${endpoint}${path}`,
        queryParameters: { 'api-version': '2018-11-01' },
        ...(method === 'POST' ? { content: body } : {}),
        noAuth: true,
        includeAuth: false,
        skipBatch: true,
        headers: expect.objectContaining({
          'X-API-Key': envelope()['apiKey'],
        }),
      })
    );
    expect(isFeatureEnabled).toHaveBeenCalledWith(standardDirectManagementFeatureGate);
  });

  it.each(paths)('exposes a named entry for %s %s with the %s profile', async (method, path, profile, entry) => {
    const content = { existing: 'payload' };
    const options = {
      uri: `${armBase}${path}`,
      queryParameters: { 'api-version': '2022-05-01' },
      headers: { 'x-ms-client-request-id': 'business-request' },
      ...(method === 'POST' ? { content } : {}),
    };
    const response = method === 'GET' ? { value: [] } : { status: 'Succeeded' };
    vi.mocked(method === 'GET' ? direct.get : direct.post).mockResolvedValueOnce(response);
    const result = await client[entry](options);
    expect(result).toBe(response);
    const issuer = profile === 'reader' ? arm.get : arm.post;
    expect(issuer).toHaveBeenCalledOnce();
    const transport = method === 'GET' ? direct.get : direct.post;
    expect(transport).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        uri: `${endpoint}${path}`,
        headers: expect.objectContaining({ 'x-ms-client-request-id': 'business-request' }),
        ...(method === 'POST' ? { content } : {}),
      })
    );
  });

  it.each(paths)('preserves the exact legacy request for %s %s when disabled (%s)', async (method, path, _profile, entry) => {
    isFeatureEnabled.mockResolvedValue(false);
    const options = {
      uri: `${armBase}${path}?api-version=2022-05-01`,
      headers: { 'If-Match': '*', 'x-ms-client-request-id': 'business-request' },
      content: method === 'POST' ? { existing: 'payload' } : undefined,
      returnHeaders: true,
      skipBatch: false,
    };
    await client[entry](options);
    const transport = method === 'GET' ? arm.get : arm.post;
    expect(transport).toHaveBeenCalledExactlyOnceWith(options);
    expect(vi.mocked(transport).mock.calls[0][0]).toBe(options);
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it.each(paths)('supports ARM-only hosts without direct configuration for %s %s (%s)', async (method, path, _profile, entry) => {
    const armOnly = StandardManagementHttpClient.createArmOnly(arm);
    armOnly.setContext(context);
    await armOnly.refreshEnablement();
    const options = { uri: `${armBase}${path}?api-version=2022-05-01`, content: method === 'POST' ? { existing: 'payload' } : undefined };
    await armOnly[entry](options);
    expect(method === 'GET' ? arm.get : arm.post).toHaveBeenCalledExactlyOnceWith(options);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
    armOnly.dispose();
    expect(arm.dispose).not.toHaveBeenCalled();
  });

  it.each(paths)('preserves legacy response and error identity for disabled %s %s (%s)', async (_method, path, _profile, entry) => {
    isFeatureEnabled.mockResolvedValue(false);
    const response = { existing: 'response' };
    const error = { error: { code: 'ExistingError', message: 'Existing message' } };
    const legacyRequest = vi.fn().mockResolvedValueOnce(response).mockRejectedValueOnce(error);
    const options = { uri: `${armBase}${path}` };
    await expect(client[entry](options, legacyRequest)).resolves.toBe(response);
    await expect(client[entry](options, legacyRequest)).rejects.toBe(error);
    expect(legacyRequest).toHaveBeenCalledTimes(2);
    expect(arm.get).not.toHaveBeenCalled();
    expect(arm.post).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it.each(paths)('uses the original ARM-only callback for %s %s (%s)', async (_method, path, _profile, entry) => {
    const armOnly = StandardManagementHttpClient.createArmOnly(arm);
    const error = { response: { status: 404, data: { error: { code: 'OriginalError' } } } };
    const legacyRequest = vi.fn().mockRejectedValue(error);
    await expect(armOnly[entry]({ uri: `${armBase}${path}` }, legacyRequest)).rejects.toBe(error);
    expect(legacyRequest).toHaveBeenCalledOnce();
    expect(arm.get).not.toHaveBeenCalled();
    expect(arm.post).not.toHaveBeenCalled();
    armOnly.dispose();
  });

  it('isolates issuance while preserving original disabled, unrelated and fallback transports', async () => {
    const isolated = httpClient();
    const managed = new StandardManagementHttpClient({
      armClient: arm,
      directManagementArmClient: isolated,
      directClient: direct,
      experimentationService: { isFeatureEnabled, getFeatureValue: vi.fn() },
      issuerFailureBackoffMs: 10_000,
    });
    managed.setContext(context);
    const request = { uri: `${armBase}/workflows/Order/runs` };
    const legacyRequest = vi.fn().mockResolvedValue({ value: [] });
    isFeatureEnabled.mockResolvedValue(false);
    await managed.listRuns(request);
    expect(arm.get).toHaveBeenCalledExactlyOnceWith(request);
    expect(isolated.get).not.toHaveBeenCalled();
    isFeatureEnabled.mockResolvedValue(true);
    await managed.refreshEnablement();
    const unrelated = { uri: `${armOrigin}${resourceId}/hostruntime/admin/vfs/connections.json` };
    await resources.executeHttpCall(unrelated.uri, HTTP_METHODS.GET);
    expect(arm.get).toHaveBeenLastCalledWith(unrelated);
    vi.mocked(isolated.get).mockResolvedValueOnce(envelope());
    vi.mocked(direct.get).mockRejectedValueOnce(failure(503, 'DirectAccessDisabled'));
    await expect(managed.listRuns(request, legacyRequest)).resolves.toEqual({ value: [] });
    expect(isolated.get).toHaveBeenCalledOnce();
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(legacyRequest).toHaveBeenCalledOnce();
    managed.dispose();
  });

  it.each(
    paths.flatMap(([method, path, profile, entry]) =>
      ([401, 403, 404, 429, 500, 503, 'network', 'invalid', 'expired'] as const).map((issuanceFailure) => ({
        method,
        path,
        profile,
        entry,
        issuanceFailure,
      }))
    )
  )(
    'runs only the original $entry request when $profile issuance fails with $issuanceFailure',
    async ({ method, path, profile, entry, issuanceFailure }) => {
      const isolated = httpClient();
      const issuer = vi.mocked(profile === 'reader' ? isolated.get : isolated.post);
      if (issuanceFailure === 'invalid') {
        issuer.mockResolvedValue({ ...envelope(), endpoint: 'https://untrusted.example.invalid' });
      } else if (issuanceFailure === 'expired') {
        issuer.mockResolvedValue(envelope(Date.now() - 1000));
      } else {
        issuer.mockRejectedValue(
          issuanceFailure === 'network' ? new TypeError('Synthetic network failure') : failure(issuanceFailure, 'AuthorizationFailed')
        );
      }
      const managed = new StandardManagementHttpClient({
        armClient: arm,
        directManagementArmClient: isolated,
        directClient: direct,
        experimentationService: { isFeatureEnabled, getFeatureValue: vi.fn() },
        issuerFailureBackoffMs: 10_000,
      });
      managed.setContext(context);
      const response = { existing: 'legacy response' };
      const original = vi.fn().mockResolvedValue(response);
      const options = {
        uri: `${armBase}${path}?api-version=2022-05-01`,
        ...(method === 'POST' ? { content: { existing: 'business payload' } } : {}),
      };
      await expect(managed[entry](options, original)).resolves.toBe(response);
      expect(original).toHaveBeenCalledOnce();
      expect(issuer).toHaveBeenCalledOnce();
      expect(arm.get).not.toHaveBeenCalled();
      expect(arm.post).not.toHaveBeenCalled();
      expect(direct.get).not.toHaveBeenCalled();
      expect(direct.post).not.toHaveBeenCalled();
      managed.dispose();
    }
  );

  it('preserves raw fallback errors and does not issue another token or replay the business request', async () => {
    vi.mocked(arm.post).mockRejectedValueOnce(new TypeError('Synthetic network failure'));
    const rawError = { response: { status: 403, data: { error: { code: 'OriginalAuthorizationError' } } } };
    const original = vi.fn().mockRejectedValue(rawError);
    await expect(client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` }, original)).rejects.toBe(rawError);
    expect(original).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('recovers direct access after the configured backoff for a token acquisition network failure', async () => {
    vi.mocked(arm.get).mockRejectedValueOnce(new TypeError('Synthetic network failure')).mockResolvedValueOnce({ value: [] });
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it('coalesces failed issuance but executes each original request exactly once', async () => {
    const pending = deferred<unknown>();
    vi.mocked(arm.post).mockReturnValueOnce(pending.promise);
    const originalOne = vi.fn().mockResolvedValue({ name: 'one' });
    const originalTwo = vi.fn().mockResolvedValue({ name: 'two' });
    const options = { uri: `${armBase}/workflows/Order/validate`, content: { properties: {} } };
    const work = Promise.all([client.validateWorkflow(options, originalOne), client.validateWorkflow(options, originalTwo)]);
    await vi.waitFor(() => expect(arm.post).toHaveBeenCalledOnce());
    pending.reject(failure(403, 'AuthorizationFailed'));
    await expect(work).resolves.toEqual([{ name: 'one' }, { name: 'two' }]);
    expect(originalOne).toHaveBeenCalledOnce();
    expect(originalTwo).toHaveBeenCalledOnce();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('does not fall back after pending issuance fails under a discarded context', async () => {
    const pending = deferred<unknown>();
    vi.mocked(arm.get).mockReturnValueOnce(pending.promise);
    const original = vi.fn();
    const work = client.listRuns({ uri: `${armBase}/workflows/Order/runs` }, original);
    const rejected = expect(work).rejects.toMatchObject({ error: { code: 'ManagementContextChanged' } });
    await vi.waitFor(() => expect(arm.get).toHaveBeenCalledOnce());
    client.setContext(undefined);
    pending.reject(new TypeError('Synthetic network failure'));
    await rejected;
    expect(original).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('reports acquisition failure without logging credentials or unsafe issuer details', async () => {
    const session = { ...envelope(), endpoint: 'https://untrusted.example.invalid' };
    vi.mocked(arm.get).mockResolvedValueOnce(session);
    const original = vi.fn().mockResolvedValue({ value: [] });
    await client.listRuns({ uri: `${armBase}/workflows/Order/runs` }, original);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
      sessionClass: 'reader',
      status: undefined,
      code: 'InvalidManagementSessionResponse',
    });
    const diagnostics = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(diagnostics).not.toContain(session.apiKey);
    expect(diagnostics).not.toContain(session.endpoint);
  });

  it('rejects direct URLs without trusted context and work after ARM-only disposal', async () => {
    const armOnly = StandardManagementHttpClient.createArmOnly(arm);
    await expect(armOnly.listRuns({ uri: `${endpoint}/workflows/Order/runs?api-version=2018-11-01` })).rejects.toThrow();
    armOnly.dispose();
    await expect(armOnly.listRuns({ uri: `${armBase}/workflows/Order/runs` })).rejects.toThrow();
    expect(arm.get).not.toHaveBeenCalled();
  });

  it('rejects another catalog operation passed to a named entry before acquisition or dispatch', async () => {
    await expect(client.cancelRun({ uri: `${armBase}/workflows/Order/validate` })).rejects.toMatchObject({
      error: { code: 'InvalidManagementRequest' },
    });
    expect(arm.post).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('shares one Contributor session across different named entry points', async () => {
    await client.validateWorkflow({ uri: `${armBase}/workflows/Order/validate`, content: { definition: {} } });
    await client.getConnectorOperation({ uri: `${armBase}/operationGroups/sql/operations/query` });
    await client.listRuns({ uri: `${armBase}/workflows/Order/runs` });
    await client.listWorkflows({ uri: `${armBase}/workflows` });
    expect(arm.post).toHaveBeenCalledOnce();
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.post).toHaveBeenCalledOnce();
    expect(direct.get).toHaveBeenCalledTimes(3);
  });

  it('uses existing ARM run behavior unchanged while disabled', async () => {
    isFeatureEnabled.mockResolvedValue(false);
    await runService.getRuns({ status: 'Failed' });
    expect(arm.get).toHaveBeenCalledExactlyOnceWith({
      uri: `${armBase}/workflows/Order/runs?api-version=2022-05-01&$filter=status%20eq%20'Failed'`,
    });
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('defaults to the existing disabled experimentation implementation', async () => {
    const disabled = new StandardManagementHttpClient({ armClient: arm, directClient: direct, issuerFailureBackoffMs: 10_000 });
    disabled.setContext(context);
    await expect(disabled.isEnabled()).resolves.toBe(false);
    await arm.get({ uri: `${armBase}/workflows/Order/runs` });
    expect(arm.get).toHaveBeenCalledExactlyOnceWith({ uri: `${armBase}/workflows/Order/runs` });
    expect(direct.get).not.toHaveBeenCalled();
    disabled.dispose();
  });

  it('wires metadata, search and connector invocation through their real Standard methods', async () => {
    const listOperations = vi.spyOn(client, 'listOperations');
    const listConnectorGroups = vi.spyOn(client, 'listConnectorGroups');
    const getConnectorOperation = vi.spyOn(client, 'getConnectorOperation');
    const invokeConnector = vi.spyOn(client, 'invokeConnector');
    const options = { httpClient: arm, standardManagement: client, apiVersion: '2020-06-01', baseUrl: armBase };
    const search = new StandardSearchService({
      ...options,
      showStatefulOperations: true,
      apiHubServiceDetails: { apiVersion: '2016-06-01', location: 'eastus', subscriptionId: 'sub' },
      locale: 'en-US',
    });
    await search.getBuiltInOperations();
    await search.getBuiltInConnectors();
    expect(direct.get).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: `${endpoint}/operations`,
        queryParameters: { 'api-version': '2018-11-01', workflowKind: 'Stateful' },
        headers: expect.objectContaining({ 'Accept-Language': 'en-US' }),
      })
    );
    const manifests = new StandardOperationManifestService(options);
    vi.mocked(direct.get).mockResolvedValueOnce({ properties: { api: { properties: { displayName: 'SQL' } }, description: 'Query' } });
    expect(await manifests.getOperation('sql', 'executeQuery')).toEqual({
      properties: { connector: { properties: { displayName: 'SQL' } }, description: 'Query', brandColor: undefined, iconUri: undefined },
    });
    const connector = new StandardConnectorService({
      ...options,
      getConfiguration: async () => ({ connection: { connectionString: 'business-secret' } }),
      clientSupportedOperations: [],
      schemaClient: {},
      valuesClient: {},
    });
    vi.mocked(direct.post).mockResolvedValueOnce({ response: { statusCode: 'OK', body: [{ value: 'table' }], headers: {} } });
    expect(await connector.getListDynamicValues('sql', 'sql', 'query', { query: 'select' }, { operationId: 'query' })).toEqual([
      { value: 'table' },
    ]);
    expect(direct.post).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: `${endpoint}/operationGroups/sql/operations/query/dynamicInvoke`,
        content: { parameters: { query: 'select' }, configuration: { connection: { connectionString: 'business-secret' } } },
      })
    );
    expect(arm.get).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledOnce();
    expect(listOperations).toHaveBeenCalledOnce();
    expect(listConnectorGroups).toHaveBeenCalledOnce();
    expect(getConnectorOperation).toHaveBeenCalledOnce();
    expect(invokeConnector).toHaveBeenCalledOnce();
  });

  it('preserves runtime inventory while generic resource actions retain the legacy transport', async () => {
    const listWorkflows = vi.spyOn(client, 'listWorkflows');
    const listMcpServers = vi.spyOn(client, 'listMcpServers');
    vi.mocked(direct.get).mockResolvedValueOnce([{ name: 'Order', triggers: { manual: { type: 'Request' } } }]);
    expect(await resources.listWorkflowsInApp('sub', 'rg', 'app')).toEqual([
      { id: `${resourceId}/workflows/Order`, name: 'Order', triggerType: 'Request' },
    ]);
    vi.mocked(arm.post).mockResolvedValueOnce({ value: [{ name: 'server' }] });
    expect(
      await resources.executeResourceAction(
        `${resourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers`,
        'POST' as any,
        { 'api-version': '2024-11-01' }
      )
    ).toEqual({ value: [{ name: 'server' }] });
    expect(listWorkflows).toHaveBeenCalledOnce();
    expect(listMcpServers).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('keeps unrelated resource requests on their original transport', async () => {
    const enabled = vi.spyOn(client, 'isEnabled');
    const response = { original: true };
    vi.mocked(arm.get).mockResolvedValueOnce(response);
    vi.mocked(arm.put).mockResolvedValue(response);
    vi.mocked(arm.delete).mockResolvedValue(response);
    await expect(resources.getResource(resourceId, { 'api-version': '2020-06-01' })).resolves.toBe(response);
    await expect(resources.executeResourceAction(resourceId, HTTP_METHODS.PUT, {}, response)).resolves.toBe(response);
    await expect(resources.executeHttpCall(`${armOrigin}${resourceId}`, HTTP_METHODS.DELETE)).resolves.toBe(response);
    expect(enabled).not.toHaveBeenCalled();
    expect(isFeatureEnabled).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('routes actual run service methods and paging through their corresponding named entries', async () => {
    const getRun = vi.spyOn(client, 'getRun');
    const listRuns = vi.spyOn(client, 'listRuns');
    const cancelRun = vi.spyOn(client, 'cancelRun');
    const resubmitTrigger = vi.spyOn(client, 'resubmitTrigger');
    const runTrigger = vi.spyOn(client, 'runTrigger');
    await runService.getRun('run');
    await runService.getRuns();
    await runService.getMoreRuns(`${endpoint}/workflows/Order/runs?api-version=2018-11-01&$skiptoken=next`);
    await runService.cancelRun('/workflows/Order/runs/run');
    await runService.resubmitRun('history', 'manual');
    await runService.runTrigger({ method: 'POST', value: `${armBase}/workflows/Order/triggers/manual/run` });
    expect(getRun).toHaveBeenCalledOnce();
    expect(listRuns).toHaveBeenCalledTimes(2);
    expect(cancelRun).toHaveBeenCalledOnce();
    expect(resubmitTrigger).toHaveBeenCalledOnce();
    expect(runTrigger).toHaveBeenCalledOnce();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.get).toHaveBeenCalledTimes(3);
    expect(direct.post).toHaveBeenCalledTimes(3);
  });

  it('does not acquire or attach sessions to signed callback URLs or run content', async () => {
    const callback = 'https://callback.example.invalid/invoke?sig=business-signature';
    const content = 'https://content.example.invalid/output?sig=content-signature';
    vi.mocked(arm.get).mockResolvedValueOnce({ body: 'content' });
    await runService.runTrigger({ method: 'POST', value: callback });
    expect(await runService.getContent({ uri: content, contentSize: 10 })).toEqual({ body: 'content' });
    expect(arm.post).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        uri: callback.split('?')[0],
        noAuth: true,
        queryParameters: { sig: 'business-signature' },
      })
    );
    expect(arm.get).toHaveBeenCalledExactlyOnceWith({
      uri: content,
      noAuth: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('keeps Reader for reads and acquires Contributor independently for an action', async () => {
    await runService.getRuns();
    await client.validateWorkflow({ uri: `${armBase}/workflows/Order/validate`, content: { definition: {} } });
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledOnce();
  });

  it('retains coalescing and credentials when a host repeats the same context', async () => {
    await runService.getRuns();
    client.setContext({ ...context });
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).toHaveBeenCalledTimes(2);
  });

  it('does not share sessions or acquisition across independent tab clients', async () => {
    await runService.getRuns();
    const other = new StandardManagementHttpClient({
      armClient: arm,
      directClient: direct,
      experimentationService: { isFeatureEnabled, getFeatureValue: vi.fn() },
      issuerFailureBackoffMs: 10_000,
    });
    other.setContext(context);
    await other.listRuns({ uri: `${armBase}/workflows/Order/runs` });
    expect(arm.get).toHaveBeenCalledTimes(2);
    other.dispose();
  });

  it.each([239_000, 240_000, 241_000])('renews on work only at expiry minus 60 seconds: elapsed %s', async (elapsed) => {
    await runService.getRuns();
    vi.setSystemTime(Date.now() + elapsed);
    expect(arm.get).toHaveBeenCalledOnce();
    const renewal = deferred<any>();
    vi.mocked(arm.get).mockReturnValue(renewal.promise);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(elapsed < 240_000 ? 1 : 2);
    expect(direct.get).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    renewal.resolve(envelope());
  });

  it('coalesces across services and workflow changes, reusing Contributor for reads', async () => {
    const pending = deferred<any>();
    vi.mocked(arm.post).mockReturnValue(pending.promise);
    const one = client.validateWorkflow({ uri: `${armBase}/workflows/Order/validate` });
    const two = client.validateWorkflow({ uri: `${armBase}/workflows/Other/validate`, content: { definition: {} } });
    await vi.waitFor(() => expect(arm.post).toHaveBeenCalledOnce());
    pending.resolve(envelope());
    await Promise.all([one, two]);
    await runService.getRuns();
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it('dispatches with a still-valid session immediately while renewing, without idle timers', async () => {
    await runService.getRuns();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(Date.now() + 240_000);
    const renewal = deferred<any>();
    vi.mocked(arm.get).mockReturnValue(renewal.promise);
    await Promise.all([runService.getRuns(), runService.getRuns()]);
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).toHaveBeenCalledTimes(3);
    renewal.reject(failure(503, 'ServiceTemporarilyUnavailable'));
    await Promise.resolve();
    await runService.getRuns();
    expect(direct.get).toHaveBeenCalledTimes(4);
    expect(arm.get).toHaveBeenCalledTimes(2);
  });

  it('uses the original request for future work after definitive renewal denial', async () => {
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 240_000);
    const renewal = deferred<any>();
    vi.mocked(arm.get).mockReturnValueOnce(renewal.promise).mockResolvedValue({ value: [] });
    await runService.getRuns();
    renewal.reject(failure(403, 'AuthorizationFailed'));
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledOnce());
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(direct.get).toHaveBeenCalledTimes(2);
  });

  it('retries a transient synchronous issuer failure only after the configured circuit expires', async () => {
    vi.mocked(arm.get)
      .mockImplementationOnce(() => {
        throw failure(503, 'ServiceTemporarilyUnavailable');
      })
      .mockResolvedValueOnce({ value: [] })
      .mockImplementation(async () => envelope() as any);
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 404, 429])('uses the original ARM request for issuer status %s', async (status) => {
    vi.mocked(arm.get).mockRejectedValueOnce(failure(status, 'AuthorizationFailed')).mockResolvedValue({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each(paths)('preserves the original error for %s %s without fallback', async (method, path, _profile, entry) => {
    const details = [{ code: 'InvalidExpression', message: "The expression in action 'Compose' is invalid." }];
    const error = Object.freeze({
      status: 400,
      data: { error: { code: 'WorkflowValidationFailed', message: 'Correct the workflow definition.', details } },
    });
    vi.mocked(method === 'GET' ? direct.get : direct.post).mockRejectedValueOnce(error);
    const legacyRequest = vi.fn();
    await expect(client[entry]({ uri: `${armBase}${path}` }, legacyRequest)).rejects.toBe(error);
    expect(isStandardManagementError(error)).toBe(true);
    expect(error.data.error.details).toBe(details);
    expect(Object.keys(error)).toEqual(['status', 'data']);
    expect(legacyRequest).not.toHaveBeenCalled();
    expect(direct.get).toHaveBeenCalledTimes(method === 'GET' ? 1 : 0);
    expect(direct.post).toHaveBeenCalledTimes(method === 'POST' ? 1 : 0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each(['list', 'more', 'get', 'cancel', 'resubmit', 'trigger'] as const)(
    'preserves direct errors through the %s run service method',
    async (operation) => {
      const error = failure(400, 'WorkflowValidationFailed');
      vi.mocked(direct.get).mockRejectedValueOnce(error);
      vi.mocked(direct.post).mockRejectedValueOnce(error);
      const requests = {
        list: () => runService.getRuns(),
        more: () => runService.getMoreRuns(`${endpoint}/workflows/Order/runs?api-version=2018-11-01&$skiptoken=next`),
        get: () => runService.getRun('run'),
        cancel: () => runService.cancelRun('/workflows/Order/runs/run'),
        resubmit: () => runService.resubmitRun('history', 'manual'),
        trigger: () => runService.runTrigger({ method: 'POST', value: `${armBase}/workflows/Order/triggers/manual/run` }),
      };
      await expect(requests[operation]()).rejects.toBe(error);
    }
  );

  it.each([
    [503, 'ServiceTemporarilyUnavailable'],
    [503, 'ServerTimeout'],
    [502, 'BadGateway'],
    [504, 'GatewayTimeout'],
  ] as const)('falls back before dispatch on issuer %s %s and suppresses probes for configured backoff', async (status, code) => {
    vi.mocked(arm.get).mockRejectedValueOnce(failure(status, code)).mockResolvedValue({ value: [] });
    await runService.getRuns();
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(arm.get).toHaveBeenLastCalledWith({ uri: `${armBase}/workflows/Order/runs?api-version=2022-05-01` });
    expect(direct.get).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 10_000);
    vi.mocked(arm.get).mockResolvedValueOnce(envelope());
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(4);
    expect(arm.get).toHaveBeenLastCalledWith(expect.objectContaining({ uri: `${armBase}/tokens/reader` }));
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it.each(
    [
      { status: 500, code: 'InternalServerError' },
      { status: 503, code: 'UnknownFailure' },
      { status: 404, code: 'DirectAccessDisabled' },
      { status: 400, code: 'BadRequest' },
    ].flatMap(({ status, code }) => ['reader', 'contributor'].map((profile) => ({ status, code, profile })))
  )('uses the original request while issuer $status $code for $profile is cached', async ({ status, code, profile }) => {
    const issuer = vi.mocked(profile === 'reader' ? arm.get : arm.post);
    issuer.mockRejectedValue(failure(status, code));
    const response = { existing: 'response' };
    const legacyRequest = vi.fn().mockResolvedValue(response);
    const request = () =>
      profile === 'reader'
        ? client.listRuns({ uri: `${armBase}/workflows/Order/runs` }, legacyRequest)
        : client.validateWorkflow({ uri: `${armBase}/workflows/Order/validate` }, legacyRequest);
    await expect(request()).resolves.toBe(response);
    await expect(request()).resolves.toBe(response);
    expect(issuer).toHaveBeenCalledOnce();
    expect(legacyRequest).toHaveBeenCalledTimes(2);
    const diagnostics = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(diagnostics).not.toContain('Server diagnostic');
    expect(diagnostics).not.toContain('Internal transport diagnostic');
    expect(profile === 'reader' ? arm.post : arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it.each([
    [503, 'ServiceTemporarilyUnavailable'],
    [503, 'ServerTimeout'],
    [503, 'UnknownFailure'],
    [503, 'DirectManagementDisabled'],
    [500, 'InternalServerError'],
    [400, 'BadRequest'],
    [403, 'RequestUnauthorized'],
    [429, 'DirectAccessRequestThrottled'],
    [401, 'InvalidSessionToken'],
    [404, 'NotFound'],
  ])('does not bypass or replay direct failure %s %s', async (status, code) => {
    const original = failure(status, code);
    vi.mocked(direct.post).mockRejectedValue(original);
    const error = await client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` }).catch((error: unknown) => error);
    expect(error).toBe(original);
    expect(isStandardManagementError(error)).toBe(true);
    expect(error).toMatchObject({ response: { status, data: { error: { code, message: 'Server diagnostic', target: 'app' } } } });
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it.each(['RequestUnauthorized', 'AuthorizationFailed'])('preserves original denial details for %s without replay', async (code) => {
    const error = failure(403, code);
    vi.mocked(direct.post).mockRejectedValue(error);
    const request = client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` });
    await expect(request).rejects.toBe(error);
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it('preserves the original ARM authorization error after an issuer authorization denial', async () => {
    const armError = failure(403, 'AuthorizationFailed');
    vi.mocked(arm.post).mockRejectedValueOnce(failure(403, 'RequestUnauthorized')).mockRejectedValueOnce(armError);
    const request = client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` });
    await expect(request).rejects.toBe(armError);
    expect(arm.post).toHaveBeenCalledTimes(2);
    expect(direct.post).not.toHaveBeenCalled();
  });

  it('falls back once for exact disabled admission and waits for explicit positive enablement refresh', async () => {
    vi.mocked(direct.post).mockRejectedValueOnce(failure(503, 'DirectAccessDisabled'));
    const uri = `${armBase}/workflows/Order/runs/run/cancel`;
    await client.cancelRun({ uri });
    client.setContext({ ...context });
    await client.cancelRun({ uri });
    expect(direct.post).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledTimes(3);
    await client.refreshEnablement();
    await client.cancelRun({ uri });
    expect(direct.post).toHaveBeenCalledTimes(2);
  });

  it('preserves an ambiguous transport failure without logging it or replaying the mutation', async () => {
    const error = new TypeError('The connection was lost.');
    vi.mocked(direct.post).mockRejectedValue(error);
    const result = client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` });
    await expect(result).rejects.toBe(error);
    expect(console.warn).not.toHaveBeenCalled();
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it.each(['cancel', 'resubmit'] as const)('retains the original %s error-return behavior when ARM fallback fails', async (operation) => {
    vi.mocked(arm.post).mockResolvedValueOnce(envelope()).mockRejectedValueOnce(failure(403, 'AuthorizationFailed'));
    vi.mocked(direct.post).mockRejectedValueOnce(failure(503, 'DirectAccessDisabled'));
    const request =
      operation === 'cancel' ? runService.cancelRun('/workflows/Order/runs/run') : runService.resubmitRun('history', 'manual');
    await expect(request).resolves.toBeInstanceOf(Error);
    expect(arm.post).toHaveBeenCalledTimes(2);
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it('renews and retries only once for exact pre-dispatch expiry', async () => {
    const error = failure(401, 'SessionTokenExpired');
    vi.mocked(direct.post).mockRejectedValue(error);
    await expect(client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` })).rejects.toBe(error);
    expect(direct.post).toHaveBeenCalledTimes(2);
    expect(arm.post).toHaveBeenCalledTimes(2);
  });

  it('uses the server expiry when the configured lifetime exceeds five minutes', async () => {
    const session = envelope(Date.now() + 600_000);
    vi.mocked(arm.get).mockResolvedValue(session);
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 360_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).toHaveBeenCalledTimes(2);
    expect(direct.get).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': session['apiKey'] }),
      })
    );
  });

  it.each([1, 52, 1024, 16384])('passes an opaque API key of length %i without decoding it', async (length) => {
    const session = envelope();
    session['apiKey'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.repeat(Math.ceil(length / 64)).slice(0, length);
    vi.mocked(arm.get).mockResolvedValue(session);
    await runService.getRuns();
    expect(direct.get).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ headers: { 'X-API-Key': session['apiKey'] } }));
  });

  it('replaces caller credentials case-insensitively while retaining business headers', async () => {
    const request = {
      uri: `${armBase}/workflows/Order/runs`,
      headers: {
        aUtHoRiZaTiOn: 'Bearer stale-arm-token',
        'X-Functions-Key': 'stale-extension-code',
        'x-api-key': 'stale-api-key',
        'x-API-KEY': 'another-stale-api-key',
        'x-ms-client-request-id': 'business-request',
      },
    };
    const originalHeaders = { ...request.headers };
    await client.listRuns(request);
    expect(direct.get).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        uri: `${endpoint}/workflows/Order/runs`,
        headers: { 'X-API-Key': envelope()['apiKey'], 'x-ms-client-request-id': 'business-request' },
        noAuth: true,
        includeAuth: false,
      })
    );
    expect(request.headers).toEqual(originalHeaders);
  });

  it.each(['legacy', 'mixed', 'missing-api-key'] as const)(
    'rejects the %s issuer contract and uses the original ARM request',
    async (shape) => {
      const { apiKey, ...fields } = envelope();
      const legacy = { extensionCode: 'old-extension-code', accessToken: 'old-session-token' };
      const response = shape === 'legacy' ? { ...fields, ...legacy } : shape === 'mixed' ? { ...fields, apiKey, ...legacy } : fields;
      const request = { uri: `${armBase}/workflows/Order/runs` };
      vi.mocked(arm.get).mockResolvedValueOnce(response).mockResolvedValueOnce({ value: [] });
      await expect(client.listRuns(request)).resolves.toEqual({ value: [] });
      expect(arm.get).toHaveBeenCalledTimes(2);
      expect(arm.get).toHaveBeenLastCalledWith(request);
      expect(direct.get).not.toHaveBeenCalled();
    }
  );

  it.each(['\n', '\r', '\r\n'])('falls back instead of using a token with trailing line breaks %j', async (suffix) => {
    const session = envelope();
    session['apiKey'] += suffix;
    vi.mocked(arm.get).mockResolvedValueOnce(session).mockResolvedValue({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each(['=', '.', '/', '+', ' ', '\t'])('falls back instead of using invalid API-key characters %s', async (lastCharacter) => {
    const session = envelope();
    session['apiKey'] = session['apiKey'].slice(0, -1) + lastCharacter;
    vi.mocked(arm.get).mockResolvedValueOnce(session).mockResolvedValue({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('rejects API keys exceeding the runtime limit of 16,384 characters', async () => {
    vi.mocked(arm.get)
      .mockResolvedValueOnce({ ...envelope(), apiKey: 'A'.repeat(16385) })
      .mockResolvedValueOnce({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each([
    { endpoint: `${runtimeOrigin}/runtime/webhooks/workflow/api/management/v1` },
    { endpoint: 'https://attacker.example/runtime/webhooks/workflow/api/management/v1' },
    { endpoint: `${endpoint}?code=secret` },
    { endpoint: `${endpoint}#fragment` },
    { endpoint: endpoint.replace('https:', 'http:') },
    { endpoint: endpoint.replace('https://', 'https://user:password@') },
    { expiresOn: 'not-a-date' },
    { expiresOn: '2026-10-21T18:05:00.000Z' },
    { expiresOn: '2026-10-21T17:59:59Z' },
    { accessToken: 'not-a-session' },
    { apiKey: '' },
    { apiKey: 'bad\r\nheader' },
    { unexpected: 'field' },
  ])('falls back instead of using an invalid or unsafe envelope: %j', async (fields) => {
    vi.mocked(arm.get)
      .mockResolvedValueOnce({ ...envelope(), ...fields })
      .mockResolvedValue({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('uses ARM for an already expired issue response without reacquisition loops', async () => {
    vi.mocked(arm.get)
      .mockResolvedValueOnce(envelope(Date.now() - 1000))
      .mockResolvedValue({ value: [] });
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).not.toHaveBeenCalled();
    await expect(runService.getRuns()).resolves.toEqual({ nextLink: undefined, runs: [] });
    expect(arm.get).toHaveBeenCalledTimes(3);
  });

  it.each(
    (['reader', 'contributor'] as const).flatMap((profile) =>
      ['sign-out', 'authentication', 'dispose'].map((change) => ({ profile, change }))
    )
  )('does not dispatch queued $profile acquisition after $change', async ({ profile, change }) => {
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 300_001);
    vi.mocked(arm.get).mockClear();
    vi.mocked(arm.post).mockClear();
    vi.mocked(direct.get).mockClear();
    vi.mocked(direct.post).mockClear();

    const work =
      profile === 'reader'
        ? client.listRuns({ uri: `${armBase}/workflows/Order/runs` })
        : client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` });
    const rejection = expect(work).rejects.toThrow(/context/i);
    await Promise.resolve().then(() => {
      if (change === 'dispose') {
        client.dispose();
      } else {
        client.setContext(change === 'sign-out' ? undefined : { ...context, authContextKey: 'sign-in-2' });
      }
    });

    await rejection;
    expect(arm.get).not.toHaveBeenCalled();
    expect(arm.post).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
    expect(direct.post).not.toHaveBeenCalled();
  });

  it.each(['sign-out', 'principal', 'tenant', 'app', 'authentication', 'dispose'])(
    'rejects late work after %s context discard',
    async (change) => {
      const pending = deferred<any>();
      vi.mocked(arm.get).mockReturnValue(pending.promise);
      const work = runService.getRuns();
      const rejection = expect(work).rejects.toThrow(/context/i);
      await vi.waitFor(() => expect(arm.get).toHaveBeenCalledOnce());
      if (change === 'dispose') {
        client.dispose();
      } else {
        client.setContext(
          change === 'sign-out'
            ? undefined
            : {
                ...context,
                ...(change === 'principal' ? { principalId: 'other' } : {}),
                ...(change === 'tenant' ? { tenantId: 'other' } : {}),
                ...(change === 'app' ? { resourceId: resourceId.replace('/app', '/other') } : {}),
                ...(change === 'authentication' ? { authContextKey: 'sign-in-2' } : {}),
              }
        );
      }
      pending.resolve(envelope());
      await rejection;
      expect(direct.get).not.toHaveBeenCalled();
    }
  );

  it('validates direct next links and preserves the collection envelope without leaking credentials', async () => {
    const nextLink = `${endpoint}/workflows/Order/runs?api-version=2018-11-01&$skiptoken=opaque`;
    vi.mocked(direct.get)
      .mockResolvedValueOnce({ nextLink, value: [{ name: 'run' }] })
      .mockResolvedValueOnce({ value: [] });
    expect(await runService.getRuns()).toEqual({ nextLink, runs: [{ name: 'run' }] });
    await runService.getMoreRuns(nextLink);
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).toHaveBeenCalledTimes(2);
  });

  it.each([
    'https://attacker.example/page',
    `${endpoint}/workflows/Order/runs?api-version=2018-11-01&code=secret`,
    `${endpoint}/workflows/Order/runs?api-version=2018-11-01&api-version=2018-11-01`,
    `${endpoint}/workflows/Order/runs?api-version=other`,
    `${endpoint}/workflows/Other/runs?api-version=2018-11-01`,
  ])('rejects unsafe direct paging link %s', async (nextLink) => {
    vi.mocked(direct.get).mockResolvedValue({ nextLink, value: [] });
    await expect(runService.getRuns()).rejects.toThrow(/paging/i);
    expect(arm.get).toHaveBeenCalledOnce();
  });

  it('does not attach session credentials to routes outside the catalog or another app', async () => {
    await resources.executeHttpCall(`${armBase}/workflows/Order/runs/run/actions`, HTTP_METHODS.GET);
    await resources.executeHttpCall(`${armBase.replace('/sites/app/', '/sites/other/')}/workflows/Order/runs`, HTTP_METHODS.GET);
    await resources.executeHttpCall(`${armBase}/workflows/Order/runs?unexpected=parameter`, HTTP_METHODS.GET);
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('does not issue or dispatch direct requests for nonproduction slots', async () => {
    client.setContext({ ...context, resourceId: `${resourceId}/slots/staging` });
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledExactlyOnceWith({ uri: `${armBase}/workflows/Order/runs?api-version=2022-05-01` });
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('rejects old direct paging URLs after context discard or app/environment change', async () => {
    const uri = `${endpoint}/workflows/Order/runs?api-version=2018-11-01`;
    client.setContext(undefined);
    await expect(client.listRuns({ uri })).rejects.toThrow(/context/i);
    client.setContext({ ...context, resourceId: resourceId.replace('/app', '/other'), runtimeOrigin: 'https://other.azurewebsites.net' });
    await expect(client.listRuns({ uri })).rejects.toThrow(/context/i);
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('rejects late enablement results after the context changes', async () => {
    const enabled = deferred<boolean>();
    isFeatureEnabled.mockReturnValue(enabled.promise);
    const work = client.listRuns({ uri: `${armBase}/workflows/Order/runs` });
    const rejection = expect(work).rejects.toThrow(/context/i);
    client.setContext(undefined);
    enabled.resolve(true);
    await rejection;
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each(throttleFailures)('honors issuer $shape $header until another acquisition is allowed', async ({ error }) => {
    vi.mocked(arm.get).mockRejectedValueOnce(error).mockResolvedValueOnce({ value: [] }).mockResolvedValueOnce({ value: [] });
    await expect(client.listRuns({ uri: `${armBase}/workflows/Order/runs` })).resolves.toEqual({ value: [] });
    await expect(client.listRuns({ uri: `${armBase}/workflows/Order/runs` })).resolves.toEqual({ value: [] });
    expect(arm.get).toHaveBeenCalledTimes(3);
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(4);
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it.each(throttleFailures)('honors direct $shape $header without a new issuer request or ARM fallback', async ({ error }) => {
    vi.mocked(direct.get).mockRejectedValueOnce(error);
    await expect(client.listRuns({ uri: `${armBase}/workflows/Order/runs` })).rejects.toBe(error);
    await expect(runService.getRuns()).rejects.toBe(error);
    expect(direct.get).toHaveBeenCalledOnce();
    expect(arm.get).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(direct.get).toHaveBeenCalledTimes(2);
    expect(arm.get).toHaveBeenCalledOnce();
  });

  it('uses the original request if acquisition fails after confirmed pre-dispatch expiry', async () => {
    vi.mocked(direct.post).mockRejectedValueOnce(failure(401, 'SessionTokenExpired'));
    vi.mocked(arm.post)
      .mockResolvedValueOnce(envelope())
      .mockRejectedValueOnce(failure(503, 'ServiceTemporarilyUnavailable'))
      .mockResolvedValueOnce({ status: 'legacySucceeded' });
    await expect(client.cancelRun({ uri: `${armBase}/workflows/Order/runs/run/cancel` })).resolves.toEqual({
      status: 'legacySucceeded',
    });
    expect(direct.post).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledTimes(3);
  });
});
