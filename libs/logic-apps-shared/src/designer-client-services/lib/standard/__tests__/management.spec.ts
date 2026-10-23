import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpRequestOptions, IHttpClient } from '../../httpClient';
import { StandardManagementHttpClient, standardDirectManagementFeatureGate } from '../management';
import { StandardRunService } from '../run';
import { BaseResourceService } from '../../base/resource';
import { StandardConnectorService } from '../connector';
import { StandardOperationManifestService } from '../operationmanifest';
import { StandardSearchService } from '../search';
import { InitLoggerService } from '../../logger';

const resourceId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/sites/app';
const armOrigin = 'https://management.azure.com';
const runtimeOrigin = 'https://app.azurewebsites.net';
const armBase = `${armOrigin}${resourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
const endpoint = `${runtimeOrigin}/runtime/webhooks/workflow/api/management/v1`;
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
    extensionCode: 'extension-secret',
    accessToken: `${seconds.toString(16).padStart(8, '0')}.${'a'.repeat(43)}`,
    expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
  };
}

function failure(status: number, code: string): unknown {
  return { response: { status, data: { error: { code, message: 'Server diagnostic', target: 'app' } } } };
}

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

  it.each(paths)('dispatches catalog %s %s using the fixed %s profile', async (method, path, profile, entry) => {
    const body = method === 'POST' ? { existing: 'business payload' } : undefined;
    const options: HttpRequestOptions<unknown> = { uri: `${armBase}${path}?api-version=2022-05-01`, content: body };
    const namedMethod = vi.spyOn(client, entry);
    // BaseResourceService is the existing portal action/HTTP service, not a test-only dispatch entry point.
    await resources.executeHttpCall(options.uri, method as any, body);
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
          'x-functions-key': 'extension-secret',
          Authorization: `Bearer ${envelope()['accessToken']}`,
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
    const result = await client[entry](options);
    expect(result).toEqual(method === 'GET' ? { value: [] } : { status: 'Succeeded' });
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
    await disabled.get({ uri: `${armBase}/workflows/Order/runs` });
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

  it('preserves runtime inventory and resource-action response shapes', async () => {
    const listWorkflows = vi.spyOn(client, 'listWorkflows');
    const listMcpServers = vi.spyOn(client, 'listMcpServers');
    vi.mocked(direct.get).mockResolvedValueOnce([{ name: 'Order', triggers: { manual: { type: 'Request' } } }]);
    expect(await resources.listWorkflowsInApp('sub', 'rg', 'app')).toEqual([
      { id: `${resourceId}/workflows/Order`, name: 'Order', triggerType: 'Request' },
    ]);
    vi.mocked(direct.post).mockResolvedValueOnce({ value: [{ name: 'server' }] });
    expect(
      await resources.executeResourceAction(
        `${resourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers`,
        'POST' as any,
        { 'api-version': '2024-11-01' }
      )
    ).toEqual({ value: [{ name: 'server' }] });
    expect(listWorkflows).toHaveBeenCalledOnce();
    expect(listMcpServers).toHaveBeenCalledOnce();
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
    await resources.executeHttpCall(`${armBase}/workflows/Order/validate`, 'POST' as any, { definition: {} });
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
    await other.get({ uri: `${armBase}/workflows/Order/runs` });
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
    const one = client.post({ uri: `${armBase}/workflows/Order/validate` });
    const two = resources.executeHttpCall(`${armBase}/workflows/Other/validate`, 'POST' as any, { definition: {} });
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
    renewal.reject(failure(503, 'RuntimeUnavailable'));
    await Promise.resolve();
    await runService.getRuns();
    expect(direct.get).toHaveBeenCalledTimes(4);
    expect(arm.get).toHaveBeenCalledTimes(2);
  });

  it('invalidates the old session for future dispatch after definitive renewal denial', async () => {
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 240_000);
    const renewal = deferred<any>();
    vi.mocked(arm.get).mockReturnValue(renewal.promise);
    await runService.getRuns();
    renewal.reject(failure(403, 'ProfileNotAuthorized'));
    await vi.waitFor(() => expect(runService.getRuns()).rejects.toThrow());
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).toHaveBeenCalledTimes(2);
  });

  it('retries a transient synchronous issuer failure only after the configured circuit expires', async () => {
    vi.mocked(arm.get)
      .mockImplementationOnce(() => {
        throw failure(503, 'RuntimeUnavailable');
      })
      .mockResolvedValueOnce({ value: [] })
      .mockImplementation(async () => envelope() as any);
    await runService.getRuns();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 404, 429])('does not fall back for issuer status %s', async (status) => {
    vi.mocked(arm.get).mockRejectedValue(failure(status, 'ProfileNotAuthorized'));
    await expect(runService.getRuns()).rejects.toThrow();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each([
    [503, 'RuntimeUnavailable'],
    [500, 'SessionTokenPersistenceFailed'],
  ] as const)('falls back before dispatch on issuer %s %s and suppresses probes for configured backoff', async (status, code) => {
    vi.mocked(arm.get).mockRejectedValueOnce(failure(status, code)).mockResolvedValue({ value: [] });
    await runService.getRuns();
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(3);
    expect(arm.get).toHaveBeenLastCalledWith({ uri: `${armBase}/workflows/Order/runs?api-version=2022-05-01` });
    expect(direct.get).not.toHaveBeenCalled();
  });

  it.each([
    [503, 'RuntimeUnavailable'],
    [503, 'UnknownFailure'],
    [503, 'DirectManagementDisabled'],
    [500, 'SessionTokenPersistenceFailed'],
    [403, 'SessionTokenOperationNotAuthorized'],
    [429, 'SessionTokenAdmissionThrottled'],
    [401, 'InvalidSessionToken'],
    [404, 'NotFound'],
  ])('does not bypass or replay direct failure %s %s', async (status, code) => {
    vi.mocked(direct.post).mockRejectedValue(failure(status, code));
    await expect(resources.executeHttpCall(`${armBase}/workflows/Order/runs/run/cancel`, 'POST' as any)).rejects.toThrow();
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it('falls back once for exact disabled admission and waits for explicit positive enablement refresh', async () => {
    vi.mocked(direct.post).mockRejectedValueOnce(failure(503, 'SessionTokenDisabled'));
    const uri = `${armBase}/workflows/Order/runs/run/cancel`;
    await resources.executeHttpCall(uri, 'POST' as any);
    client.setContext({ ...context });
    await resources.executeHttpCall(uri, 'POST' as any);
    expect(direct.post).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledTimes(3);
    await client.refreshEnablement();
    await resources.executeHttpCall(uri, 'POST' as any);
    expect(direct.post).toHaveBeenCalledTimes(2);
  });

  it('does not replay an ambiguously completed mutation or expose credentials in the error', async () => {
    vi.mocked(direct.post).mockRejectedValue({ message: `lost ${envelope()['accessToken']}`, config: { headers: { secret: 'secret' } } });
    const result = resources.executeHttpCall(`${armBase}/workflows/Order/runs/run/cancel`, 'POST' as any);
    await expect(result).rejects.toThrow('management');
    await expect(result).rejects.not.toThrow(envelope()['accessToken']);
    expect(arm.post).toHaveBeenCalledOnce();
    expect(direct.post).toHaveBeenCalledOnce();
  });

  it('renews and retries only once for exact pre-dispatch expiry', async () => {
    vi.mocked(direct.post).mockRejectedValue(failure(401, 'SessionTokenExpired'));
    await expect(resources.executeHttpCall(`${armBase}/workflows/Order/runs/run/cancel`, 'POST' as any)).rejects.toThrow();
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
        headers: expect.objectContaining({ Authorization: `Bearer ${session['accessToken']}` }),
      })
    );
  });

  it.each([
    { endpoint: 'https://attacker.example/runtime/webhooks/workflow/api/management/v1' },
    { endpoint: `${endpoint}?code=secret` },
    { endpoint: `${endpoint}#fragment` },
    { endpoint: endpoint.replace('https:', 'http:') },
    { endpoint: endpoint.replace('https://', 'https://user:password@') },
    { expiresOn: 'not-a-date' },
    { expiresOn: '2026-10-21T18:05:00.000Z' },
    { expiresOn: '2026-10-21T18:04:59Z' },
    { accessToken: 'not-a-session' },
    { extensionCode: '' },
    { extensionCode: 'bad\r\nheader' },
    { unexpected: 'field' },
  ])('rejects an invalid or unsafe envelope without fallback: %j', async (fields) => {
    vi.mocked(arm.get).mockResolvedValue({ ...envelope(), ...fields });
    await expect(runService.getRuns()).rejects.toThrow();
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('rejects an already expired issue response, without reacquisition loops', async () => {
    vi.mocked(arm.get).mockResolvedValue(envelope(Date.now() - 1000));
    await expect(runService.getRuns()).rejects.toThrow(/expired|clock/i);
    expect(arm.get).toHaveBeenCalledOnce();
    expect(direct.get).not.toHaveBeenCalled();
    await expect(runService.getRuns()).rejects.toThrow(/expired|clock/i);
    expect(arm.get).toHaveBeenCalledOnce();
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
    await client.get({ uri: `${armBase}/workflows/Order/runs/run/actions` });
    await client.get({ uri: `${armBase.replace('/sites/app/', '/sites/other/')}/workflows/Order/runs` });
    await client.get({ uri: `${armBase}/workflows/Order/runs?unexpected=parameter` });
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
    await expect(client.get({ uri })).rejects.toThrow(/context/i);
    client.setContext({ ...context, resourceId: resourceId.replace('/app', '/other'), runtimeOrigin: 'https://other.azurewebsites.net' });
    await expect(client.get({ uri })).rejects.toThrow(/context/i);
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('rejects late enablement results after the context changes', async () => {
    const enabled = deferred<boolean>();
    isFeatureEnabled.mockReturnValue(enabled.promise);
    const work = client.get({ uri: `${armBase}/workflows/Order/runs` });
    const rejection = expect(work).rejects.toThrow(/context/i);
    client.setContext(undefined);
    enabled.resolve(true);
    await rejection;
    expect(arm.get).not.toHaveBeenCalled();
    expect(direct.get).not.toHaveBeenCalled();
  });

  it('honors issuer Retry-After on subsequent work without ARM fallback', async () => {
    const error = failure(429, 'SessionTokenAdmissionThrottled') as any;
    error.response.headers = { 'retry-after': '10' };
    vi.mocked(arm.get).mockRejectedValueOnce(error);
    await expect(client.get({ uri: `${armBase}/workflows/Order/runs` })).rejects.toMatchObject({ status: 429, retryAfter: '10' });
    await expect(client.get({ uri: `${armBase}/workflows/Order/runs` })).rejects.toThrow();
    expect(arm.get).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(arm.get).toHaveBeenCalledTimes(2);
    expect(direct.get).toHaveBeenCalledOnce();
  });

  it('honors direct Retry-After without a new issuer request or ARM fallback', async () => {
    const error = failure(429, 'SessionTokenAdmissionThrottled') as any;
    error.response.headers = { 'retry-after': '10' };
    vi.mocked(direct.get).mockRejectedValueOnce(error);
    await expect(runService.getRuns()).rejects.toThrow();
    await expect(runService.getRuns()).rejects.toThrow();
    expect(direct.get).toHaveBeenCalledOnce();
    expect(arm.get).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + 10_000);
    await runService.getRuns();
    expect(direct.get).toHaveBeenCalledTimes(2);
    expect(arm.get).toHaveBeenCalledOnce();
  });

  it('does not retry an exhausted expiry recovery through ARM when renewal fails', async () => {
    vi.mocked(direct.post).mockRejectedValueOnce(failure(401, 'SessionTokenExpired'));
    vi.mocked(arm.post).mockResolvedValueOnce(envelope()).mockRejectedValueOnce(failure(503, 'RuntimeUnavailable'));
    await expect(resources.executeHttpCall(`${armBase}/workflows/Order/runs/run/cancel`, 'POST' as any)).rejects.toThrow();
    expect(direct.post).toHaveBeenCalledOnce();
    expect(arm.post).toHaveBeenCalledTimes(2);
  });
});
