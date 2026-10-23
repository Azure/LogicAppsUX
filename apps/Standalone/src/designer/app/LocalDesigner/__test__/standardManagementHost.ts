import {
  BaseResourceService,
  HTTP_METHODS,
  StandardConnectorService,
  StandardManagementHttpClient,
  StandardOperationManifestService,
  StandardRunService,
  StandardSearchService,
  standardDirectManagementFeatureGate,
  type HttpRequestOptions,
  type IExperimentationService,
  type StandardManagementContext,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../httpClient';

export const standardManagementOperations = [
  'callback.get',
  'workflow.validate',
  'connector.invoke',
  'run.cancel',
  'mcp.list',
  'run.get',
  'trigger.resubmit',
  'agent.draftKeys.get',
  'run.list',
  'trigger.run',
  'connector.operation.get',
  'connector.group.list',
  'operation.list',
  'workflow.runtimeList',
] as const;
export type SyntheticManagementOperation = (typeof standardManagementOperations)[number];
export const standardManagementScenarios = [
  'healthy',
  'issuer503',
  'storage503',
  'direct-disabled',
  'forbidden',
  'throttled',
  'ambiguous',
  'unsafe-endpoint',
] as const;
export type SyntheticManagementScenario = (typeof standardManagementScenarios)[number];
export interface SyntheticManagementIdentity {
  app: 'one' | 'two';
  tenant: 'one' | 'two';
  account: 'one' | 'two';
  authority: 'one' | 'two';
}
export interface SyntheticManagementEvent {
  channel: 'issuer' | 'ARM' | 'direct';
  method: 'GET' | 'POST';
  path: string;
}

const armOrigin = 'https://management.example.invalid';
const managementPath = '/runtime/webhooks/workflow/api/management';
const apiVersion = '2018-11-01';
const workflowName = 'Order';
const initialIdentity: SyntheticManagementIdentity = { app: 'one', tenant: 'one', account: 'one', authority: 'one' };
const discovery = {
  one: {
    resourceId: '/subscriptions/synthetic/resourceGroups/fixtures/providers/Microsoft.Web/sites/one',
    runtimeOrigin: 'https://one.example.invalid',
  },
  two: {
    resourceId: '/subscriptions/synthetic/resourceGroups/fixtures/providers/Microsoft.Web/sites/two',
    runtimeOrigin: 'https://two.example.invalid',
  },
};

/** An offline fixture transport: it has no fetch, Axios, ARM token or network fallback. */
class SyntheticHttpClient extends HttpClient {
  constructor(private readonly handle: (method: 'GET' | 'POST', options: HttpRequestOptions<unknown>) => Promise<unknown>) {
    super();
  }

  override async get<T>(options: HttpRequestOptions<unknown>): Promise<T> {
    return this.handle('GET', options) as Promise<T>;
  }

  override async post<T, B>(options: HttpRequestOptions<B>): Promise<T> {
    return this.handle('POST', options) as Promise<T>;
  }
}

/** Composes real services with offline transports for management-routing tests. */
export class SyntheticStandardManagementHost {
  readonly client: StandardManagementHttpClient;
  readonly flags: IExperimentationService;
  holdIssuance = false;
  scenario: SyntheticManagementScenario = 'healthy';
  private enabled = false;
  private signedIn = true;
  private disposed = false;
  private serial = 0;
  private identity = { ...initialIdentity };
  private readonly armClient: SyntheticHttpClient;
  private pendingIssuance: Array<() => void> = [];
  private services!: {
    run: StandardRunService;
    connector: StandardConnectorService;
    manifest: StandardOperationManifestService;
    search: StandardSearchService;
    resource: BaseResourceService;
  };

  constructor(private readonly onEvent: (event: SyntheticManagementEvent) => void) {
    this.flags = {
      isFeatureEnabled: async (name: string): Promise<boolean> => name === standardDirectManagementFeatureGate && this.enabled,
      getFeatureValue: async (): Promise<undefined> => undefined,
    };
    this.armClient = new SyntheticHttpClient((method, options) => this.handleArm(method, options));
    const directClient = new SyntheticHttpClient((method, options) => this.handleDirect(method, options));
    this.client = new StandardManagementHttpClient({
      armClient: this.armClient,
      directClient,
      experimentationService: this.flags,
      // Explicit fixture configuration, not a production operational recommendation.
      issuerFailureBackoffMs: 10_000,
    });
    this.setIdentity(initialIdentity);
  }

  private composeServices(): void {
    const target = discovery[this.identity.app];
    const baseUrl = `${armOrigin}${target.resourceId}/hostruntime${managementPath}`;
    const common = { apiVersion, baseUrl, httpClient: this.armClient, standardManagement: this.client };
    this.services = {
      run: new StandardRunService({ ...common, workflowName }),
      connector: new StandardConnectorService({
        ...common,
        workflowName,
        getConfiguration: async () => ({ connection: { fixture: true } }),
        clientSupportedOperations: [],
        schemaClient: {},
        valuesClient: {},
      }),
      manifest: new StandardOperationManifestService(common),
      search: new StandardSearchService({
        ...common,
        showStatefulOperations: true,
        apiHubServiceDetails: { apiVersion, subscriptionId: 'synthetic', location: 'fixture' },
      }),
      resource: new BaseResourceService({ ...common, baseUrl: armOrigin }),
    };
  }

  setIdentity(identity: SyntheticManagementIdentity): void {
    this.identity = { ...identity };
    this.signedIn = true;
    const target = discovery[identity.app];
    const context: StandardManagementContext = {
      ...target,
      armOrigin,
      tenantId: `synthetic-tenant-${identity.tenant}`,
      principalId: `synthetic-account-${identity.account}`,
      authContextKey: `https://authority-${identity.authority}.example.invalid/tenant-${identity.tenant}`,
    };
    this.client.setContext(context);
    this.composeServices();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await this.client.refreshEnablement();
  }

  signOut(): void {
    this.signedIn = false;
    this.client.setContext(undefined);
  }

  releaseIssuance(): void {
    const pending = this.pendingIssuance;
    this.pendingIssuance = [];
    pending.forEach((release) => release());
  }

  dispose(): void {
    this.disposed = true;
    this.client.dispose();
    this.releaseIssuance();
  }

  async execute(operation: SyntheticManagementOperation): Promise<unknown> {
    if (!this.signedIn || this.disposed) {
      throw new Error('The synthetic management context is signed out or disposed.');
    }
    const { run, connector, manifest, search, resource } = this.services;
    const base = `${discovery[this.identity.app].resourceId}/hostruntime${managementPath}`;
    const workflow = `${base}/workflows/${workflowName}`;
    switch (operation) {
      case 'callback.get':
        return resource.executeResourceAction(`${workflow}/triggers/manual/listCallbackUrl`, HTTP_METHODS.POST, {
          'api-version': apiVersion,
        });
      case 'workflow.validate':
        return resource.executeResourceAction(
          `${workflow}/validate`,
          HTTP_METHODS.POST,
          { 'api-version': apiVersion },
          {
            definition: { triggers: {}, actions: {}, contentVersion: '1.0.0.0' },
          }
        );
      case 'connector.invoke':
        return connector.getListDynamicValues(
          'fixture',
          'fixture',
          'fixtureOperation',
          { table: 'fixture' },
          { operationId: 'fixtureOperation' }
        );
      case 'run.cancel':
        return run.cancelRun(`/workflows/${workflowName}/runs/run-one`);
      case 'mcp.list':
        return resource.executeResourceAction(`${base}/listMcpServers`, HTTP_METHODS.POST, { 'api-version': apiVersion });
      case 'run.get':
        return run.getRun('run-one');
      case 'trigger.resubmit':
        return run.resubmitRun('history-one', 'manual');
      case 'agent.draftKeys.get':
        return resource.executeResourceAction(
          `${workflow}/listDraftApiKeys`,
          HTTP_METHODS.POST,
          { 'api-version': apiVersion },
          {
            expiry: new Date(Date.now() + 86_400_000).toISOString(),
            keyType: 'Primary',
          }
        );
      case 'run.list':
        return run.getRuns();
      case 'trigger.run':
        return run.runTrigger({ method: 'POST', value: `${armOrigin}${workflow}/triggers/manual/run` }, { body: { fixture: true } });
      case 'connector.operation.get':
        return manifest.getOperation('fixture', 'fixtureOperation');
      case 'connector.group.list':
        return search.getBuiltInConnectors();
      case 'operation.list':
        return search.getBuiltInOperations();
      case 'workflow.runtimeList':
        return resource.listWorkflowsInApp('synthetic', 'fixtures', this.identity.app);
    }
  }

  private record(channel: SyntheticManagementEvent['channel'], method: SyntheticManagementEvent['method'], path: string): void {
    if (!this.disposed) {
      this.onEvent({ channel, method, path });
    }
  }

  private async handleArm(method: 'GET' | 'POST', options: HttpRequestOptions<unknown>): Promise<unknown> {
    const url = new URL(options.uri);
    if (url.origin !== armOrigin) {
      throw new Error('Only offline synthetic ARM fixture URLs are permitted.');
    }
    const target = Object.values(discovery).find((item) => url.pathname.startsWith(`${item.resourceId}/hostruntime${managementPath}/`));
    if (!target) {
      throw new Error('The request is outside the synthetic app fixtures.');
    }
    const path = url.pathname.slice(`${target.resourceId}/hostruntime${managementPath}`.length);
    const issuer = path === '/tokens/reader' || path === '/getContributorToken';
    this.record(issuer ? 'issuer' : 'ARM', method, path);
    if (!issuer) {
      return businessResponse(path, target.runtimeOrigin);
    }
    if (options.content !== undefined || options.queryParameters?.['api-version'] !== apiVersion) {
      throw httpFailure(400, 'BadRequest');
    }
    if (this.scenario === 'issuer503') {
      throw httpFailure(503, 'ServiceTemporarilyUnavailable');
    }
    const expires = Math.floor((Date.now() + 300_000) / 1000);
    const token = `${expires.toString(16)}.${`fixture_session_${++this.serial}`.padEnd(43, 'A')}`;
    const response = {
      endpoint: `${this.scenario === 'unsafe-endpoint' ? 'https://untrusted.example.invalid' : target.runtimeOrigin}${managementPath}/v1`,
      extensionCode: 'synthetic-extension-not-a-real-key',
      accessToken: token,
      expiresOn: new Date(expires * 1000).toISOString().replace('.000Z', 'Z'),
    };
    if (this.holdIssuance) {
      await new Promise<void>((resolve) => this.pendingIssuance.push(resolve));
    }
    return response;
  }

  private async handleDirect(method: 'GET' | 'POST', options: HttpRequestOptions<unknown>): Promise<unknown> {
    const url = new URL(options.uri);
    if (!Object.values(discovery).some((item) => item.runtimeOrigin === url.origin) || !url.pathname.startsWith(`${managementPath}/v1/`)) {
      throw new Error('Only offline discovered synthetic runtime URLs are permitted.');
    }
    if (
      options.noAuth !== true ||
      options.includeAuth !== false ||
      options.headers?.['x-functions-key'] !== 'synthetic-extension-not-a-real-key' ||
      typeof options.headers?.['Authorization'] !== 'string' ||
      !options.headers['Authorization'].startsWith('Bearer ')
    ) {
      throw new Error('The synthetic transport requires the separate session and host-admission headers.');
    }
    const path = url.pathname.slice(`${managementPath}/v1`.length);
    this.record('direct', method, path);
    switch (this.scenario) {
      case 'storage503':
        throw httpFailure(503, 'ServiceTemporarilyUnavailable');
      case 'direct-disabled':
        throw httpFailure(503, 'DirectAccessDisabled');
      case 'forbidden':
        throw httpFailure(403, 'RequestUnauthorized');
      case 'throttled':
        throw httpFailure(429, 'DirectAccessRequestThrottled', '1');
      case 'ambiguous':
        throw new Error('Synthetic response loss; mutation outcome is unknown.');
      default:
        return businessResponse(path, url.origin);
    }
  }
}

function httpFailure(status: number, code: string, retryAfter?: string): unknown {
  return {
    status,
    error: { code, message: 'Synthetic fixture failure.', target: 'sessionToken' },
    ...(retryAfter ? { headers: { 'Retry-After': retryAfter } } : {}),
  };
}

function businessResponse(path: string, runtimeOrigin: string): unknown {
  if (path === '/operations' || path === '/operationGroups') {
    return { value: [] };
  }
  if (path === '/workflows') {
    return [{ name: workflowName, triggers: { manual: { type: 'Request' } } }];
  }
  if (path === '/listMcpServers') {
    return { value: [{ name: 'synthetic-server' }] };
  }
  if (path.endsWith('/dynamicInvoke')) {
    return { response: { statusCode: 'OK', body: [{ value: 'synthetic-table' }], headers: {} } };
  }
  if (path.startsWith('/operationGroups/')) {
    return { properties: { api: { properties: { displayName: 'Synthetic connector' } }, description: 'Offline fixture' } };
  }
  if (path.endsWith('/runs')) {
    return { value: [{ name: 'run-one', properties: { status: 'Succeeded' } }] };
  }
  if (path.endsWith('/runs/run-one')) {
    return { name: 'run-one', properties: { status: 'Succeeded' } };
  }
  if (path.endsWith('/listCallbackUrl')) {
    return { method: 'POST', value: `${runtimeOrigin}/synthetic-callback` };
  }
  if (path.endsWith('/listDraftApiKeys')) {
    return { endpoint: `${runtimeOrigin}/synthetic-agent`, key: 'not-a-real-key' };
  }
  return { status: 'Succeeded' };
}
