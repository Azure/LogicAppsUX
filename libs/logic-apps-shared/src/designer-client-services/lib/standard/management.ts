import { BaseExperimentationService } from '../base/experimentation';
import type { IExperimentationService } from '../experimentation';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';

export const standardDirectManagementFeatureGate = 'enableStandardDirectManagement';
export const standardManagementApiVersion = '2018-11-01';

const managementPath = '/runtime/webhooks/workflow/api/management';
const directPath = '/api/v1';
type SessionClass = 'reader' | 'contributor';
type Method = 'GET' | 'POST';
type FailurePhase = 'issuance' | 'business';

type OperationId =
  | 'callback.get'
  | 'workflow.validate'
  | 'connector.invoke'
  | 'run.cancel'
  | 'mcp.list'
  | 'run.get'
  | 'trigger.resubmit'
  | 'agent.draftKeys.get'
  | 'run.list'
  | 'trigger.run'
  | 'connector.operation.get'
  | 'connector.group.list'
  | 'operation.list'
  | 'workflow.runtimeList';

/** Trusted host discovery and signed-in identity, never values from an issuer response. */
export interface StandardManagementContext {
  resourceId: string;
  armOrigin: string;
  runtimeOrigin: string;
  tenantId: string;
  principalId: string;
  /** Change on sign-in/sign-out, delegated identity or authentication-context changes. Not an access token. */
  authContextKey: string;
}

export interface StandardManagementHttpClientOptions {
  armOnly?: false;
  armClient: IHttpClient;
  /** Optional isolated transport for token issuance; business requests always retain their original ARM transport. */
  directManagementArmClient?: IHttpClient;
  /** Must preserve explicit Authorization/noAuth, surface HTTP status and never replay mutations or follow redirects. */
  directClient: IHttpClient;
  experimentationService?: IExperimentationService;
  /** Host-configured positive circuit duration; there is deliberately no product default. */
  issuerFailureBackoffMs: number;
}

interface ArmOnlyManagementOptions {
  armOnly: true;
  armClient: IHttpClient;
}

interface Operation {
  id: OperationId;
  method: 'GET' | 'POST';
  path: RegExp;
  sessionClass: SessionClass;
  queries: readonly string[];
}

// This is an exact route catalog, not a general-purpose hostruntime proxy.
const operations: readonly Operation[] = [
  {
    id: 'callback.get',
    method: 'POST',
    path: /^\/workflows\/([^/]+)\/triggers\/([^/]+)\/listCallbackUrl$/,
    sessionClass: 'contributor',
    queries: [],
  },
  { id: 'workflow.validate', method: 'POST', path: /^\/workflows\/([^/]+)\/validate$/, sessionClass: 'contributor', queries: [] },
  {
    id: 'connector.invoke',
    method: 'POST',
    path: /^\/operationGroups\/([^/]+)\/operations\/([^/]+)\/dynamicInvoke$/,
    sessionClass: 'contributor',
    queries: [],
  },
  { id: 'run.cancel', method: 'POST', path: /^\/workflows\/([^/]+)\/runs\/([^/]+)\/cancel$/, sessionClass: 'contributor', queries: [] },
  { id: 'mcp.list', method: 'POST', path: /^\/listMcpServers$/, sessionClass: 'contributor', queries: [] },
  { id: 'run.get', method: 'GET', path: /^\/workflows\/([^/]+)\/runs\/([^/]+)$/, sessionClass: 'reader', queries: ['$expand'] },
  {
    id: 'trigger.resubmit',
    method: 'POST',
    path: /^\/workflows\/([^/]+)\/triggers\/([^/]+)\/histories\/([^/]+)\/resubmit$/,
    sessionClass: 'contributor',
    queries: [],
  },
  { id: 'agent.draftKeys.get', method: 'POST', path: /^\/workflows\/([^/]+)\/listDraftApiKeys$/, sessionClass: 'contributor', queries: [] },
  {
    id: 'run.list',
    method: 'GET',
    path: /^\/workflows\/([^/]+)\/runs$/,
    sessionClass: 'reader',
    queries: ['$filter', '$top', '$skiptoken'],
  },
  { id: 'trigger.run', method: 'POST', path: /^\/workflows\/([^/]+)\/triggers\/([^/]+)\/run$/, sessionClass: 'contributor', queries: [] },
  {
    id: 'connector.operation.get',
    method: 'GET',
    path: /^\/operationGroups\/([^/]+)\/operations\/([^/]+)$/,
    sessionClass: 'reader',
    queries: ['$expand'],
  },
  { id: 'connector.group.list', method: 'GET', path: /^\/operationGroups$/, sessionClass: 'reader', queries: [] },
  { id: 'operation.list', method: 'GET', path: /^\/operations$/, sessionClass: 'reader', queries: ['workflowKind'] },
  { id: 'workflow.runtimeList', method: 'GET', path: /^\/workflows$/, sessionClass: 'reader', queries: [] },
];

interface Session {
  sessionClass: SessionClass;
  endpoint: string;
  apiKey: string;
  expiresOn: number;
}

interface ContextState {
  context: Readonly<StandardManagementContext>;
  supported: boolean;
  enabled?: Promise<boolean>;
  disabled: boolean;
  sessions: Map<SessionClass, Session>;
  pending: Map<SessionClass, Promise<Session | undefined>>;
  blockedUntil: Map<SessionClass, number>;
  failures: Map<SessionClass, StandardManagementError>;
  directThrottle?: { until: number; error: unknown };
}

interface RequestTarget {
  operation: Operation;
  path: string;
  query: Record<string, string | number>;
  direct: boolean;
}

const directErrors = new WeakSet<object>();

/** Identifies routing and direct-endpoint errors without modifying the original transport error. */
export function isStandardManagementError(error: unknown): boolean {
  return error instanceof StandardManagementError || (typeof error === 'object' && error !== null && directErrors.has(error));
}

/** Safe client/issuance diagnostics; direct-endpoint errors are propagated unchanged. */
export class StandardManagementError extends Error {
  readonly error: { code: string; message: string };
  readonly retryAfterUntil?: number;

  constructor(
    code: string,
    message: string,
    readonly status?: number,
    readonly retryAfter?: string,
    readonly phase?: FailurePhase,
    retryAfterUntil = retryAfterTime(retryAfter)
  ) {
    super(message);
    this.name = 'StandardManagementError';
    this.error = { code, message };
    this.retryAfterUntil = retryAfterUntil;
  }
}

/**
 * One instance per portal tab/authentication lifecycle, shared by Standard services.
 * The host owns the transports and must call setContext(undefined) on sign-out/discard.
 */
export class StandardManagementHttpClient {
  private state?: ContextState;
  private disposed = false;
  private readonly experimentationService: IExperimentationService;

  constructor(private readonly options: StandardManagementHttpClientOptions | ArmOnlyManagementOptions) {
    if (options.armOnly !== true && (!Number.isFinite(options.issuerFailureBackoffMs) || options.issuerFailureBackoffMs <= 0)) {
      throw new Error('A positive issuerFailureBackoffMs must be configured for Standard direct management.');
    }
    this.experimentationService =
      options.armOnly === true ? new BaseExperimentationService() : (options.experimentationService ?? new BaseExperimentationService());
  }

  /** A permanently ARM-only entry layer for hosts without a configured direct-management lifecycle. */
  static createArmOnly(armClient: IHttpClient): StandardManagementHttpClient {
    return new StandardManagementHttpClient({ armOnly: true, armClient });
  }

  setContext(context: StandardManagementContext | undefined): void {
    const previous = this.state?.context;
    if (
      previous &&
      context &&
      previous.resourceId === context.resourceId &&
      previous.armOrigin === context.armOrigin &&
      previous.runtimeOrigin === context.runtimeOrigin &&
      previous.tenantId === context.tenantId &&
      previous.principalId === context.principalId &&
      previous.authContextKey === context.authContextKey
    ) {
      return;
    }
    this.clearContext();
    if (!context) {
      return;
    }
    if (this.disposed || !context.tenantId || !context.principalId || !context.authContextKey) {
      throw contextError();
    }
    if (!isHttpsOrigin(context.armOrigin) || !isHttpsOrigin(context.runtimeOrigin)) {
      throw new StandardManagementError('InvalidManagementContext', 'Standard management requires trusted HTTPS ARM and runtime origins.');
    }
    const supported =
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Web\/sites\/[^/]+$/i.test(context.resourceId) &&
      safePath(context.resourceId);
    this.state = {
      context: Object.freeze({ ...context }),
      supported,
      disabled: false,
      sessions: new Map(),
      pending: new Map(),
      blockedUntil: new Map(),
      failures: new Map(),
    };
  }

  /** Call on an explicit host enablement refresh. Only a positive result releases runtime-disable routing. */
  async refreshEnablement(): Promise<void> {
    const context = this.state?.context;
    if (!context) {
      return;
    }
    this.clearContext();
    this.setContext(context);
    const state = this.state!;
    await this.getEnablement(state);
    this.assertCurrent(state);
  }

  dispose(): void {
    this.clearContext();
    this.disposed = true;
  }

  getCallbackUrl<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'callback.get', legacyRequest);
  }

  validateWorkflow<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'workflow.validate', legacyRequest);
  }

  invokeConnector<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'connector.invoke', legacyRequest);
  }

  cancelRun<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'run.cancel', legacyRequest);
  }

  listMcpServers<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'mcp.list', legacyRequest);
  }

  getRun<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'run.get', legacyRequest);
  }

  resubmitTrigger<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'trigger.resubmit', legacyRequest);
  }

  getDraftAgentKeys<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'agent.draftKeys.get', legacyRequest);
  }

  listRuns<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'run.list', legacyRequest);
  }

  runTrigger<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('POST', options, 'trigger.run', legacyRequest);
  }

  getConnectorOperation<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'connector.operation.get', legacyRequest);
  }

  listConnectorGroups<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'connector.group.list', legacyRequest);
  }

  listOperations<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'operation.list', legacyRequest);
  }

  listWorkflows<T, B = unknown>(options: HttpRequestOptions<B>, legacyRequest?: () => Promise<T>): Promise<T> {
    return this.request('GET', options, 'workflow.runtimeList', legacyRequest);
  }

  /** Callers must select their unchanged legacy implementation when this returns false. */
  async isEnabled(): Promise<boolean> {
    if (this.disposed) {
      throw contextError();
    }
    const state = this.state;
    if (this.options.armOnly === true || !state?.supported) {
      return false;
    }
    const enabled = await this.getEnablement(state);
    this.assertCurrent(state);
    return enabled;
  }

  private clearContext(): void {
    this.state?.sessions.clear();
    this.state?.pending.clear();
    this.state?.failures.clear();
    this.state?.blockedUntil.clear();
    this.state = undefined;
  }

  private assertCurrent(state: ContextState): void {
    if (this.disposed || this.state !== state) {
      throw contextError();
    }
  }

  private getEnablement(state: ContextState): Promise<boolean> {
    state.enabled ??= this.experimentationService
      .isFeatureEnabled(standardDirectManagementFeatureGate)
      .then((enabled) => enabled === true)
      .catch(() => false);
    return state.enabled;
  }

  private async request<T>(
    method: Method,
    options: HttpRequestOptions<unknown>,
    operationId: OperationId,
    legacyRequest?: () => Promise<T>
  ): Promise<T> {
    if (this.disposed) {
      throw contextError();
    }
    const state = this.state;
    const directUrl = isDirectManagementUrl(options.uri);
    if (!state || !state.supported) {
      if (directUrl) {
        throw contextError();
      }
      return legacyRequest ? legacyRequest() : send(this.options.armClient, method, options);
    }
    const enabled = await this.getEnablement(state);
    this.assertCurrent(state);
    // Do not interpret or change legacy ARM requests while the feature is off.
    if (!enabled && !directUrl) {
      return legacyRequest ? legacyRequest() : send(this.options.armClient, method, options);
    }
    const target = getTarget(state.context, method, options);
    if (!target) {
      if (directUrl) {
        throw new StandardManagementError(
          'InvalidManagementRequest',
          'The direct management endpoint does not match the current app context.'
        );
      }
      return legacyRequest ? legacyRequest() : send(this.options.armClient, method, options);
    }
    if (target.operation.id !== operationId) {
      throw new StandardManagementError('InvalidManagementRequest', 'The request does not match the selected management API.');
    }
    checkThrottle(state);
    if (!enabled || state.disabled) {
      return this.sendArm(state, method, options, target, legacyRequest);
    }
    const session = await this.getSession(state, target.operation.sessionClass);
    this.assertCurrent(state);
    if (!session) {
      return this.sendArm(state, method, options, target, legacyRequest);
    }
    return this.sendDirect(state, method, options, target, session, true, legacyRequest);
  }

  private async sendArm<T>(
    state: ContextState,
    method: Method,
    options: HttpRequestOptions<unknown>,
    target: RequestTarget,
    legacyRequest?: () => Promise<T>
  ): Promise<T> {
    this.assertCurrent(state);
    checkThrottle(state);
    const request = target.direct
      ? {
          ...options,
          uri: `${state.context.armOrigin}${state.context.resourceId}/hostruntime${managementPath}${target.path}`,
          queryParameters: target.query,
          noAuth: false,
          includeAuth: true,
          headers: businessHeaders(options.headers),
        }
      : options;
    let response: T;
    try {
      response = await (legacyRequest && !target.direct ? legacyRequest() : send<T>(this.options.armClient, method, request));
    } catch (error) {
      this.assertCurrent(state);
      throw error;
    }
    this.assertCurrent(state);
    return response;
  }

  private async getSession(state: ContextState, requiredClass: SessionClass): Promise<Session | undefined> {
    const contributor = state.sessions.get('contributor');
    const sessionClass = requiredClass === 'reader' && contributor && Date.now() < contributor.expiresOn ? 'contributor' : requiredClass;
    const failure = getIssuerFailure(state, sessionClass);
    if (failure) {
      return undefined;
    }
    const cached = state.sessions.get(sessionClass);
    if (cached && Date.now() < cached.expiresOn) {
      if (Date.now() >= cached.expiresOn - 60_000) {
        // Work is never blocked on renewal, and no timer keeps an idle tab alive.
        this.acquire(state, sessionClass).catch(() => undefined);
      }
      return cached;
    }
    state.sessions.delete(sessionClass);
    return this.acquire(state, sessionClass);
  }

  private acquire(state: ContextState, sessionClass: SessionClass): Promise<Session | undefined> {
    const options = this.options;
    if (options.armOnly === true) {
      throw contextError();
    }
    this.assertCurrent(state);
    if (state.disabled) {
      return Promise.resolve(undefined);
    }
    const pending = state.pending.get(sessionClass);
    if (pending) {
      return pending;
    }
    const failure = getIssuerFailure(state, sessionClass);
    if (failure) {
      return Promise.resolve(undefined);
    }
    if (Date.now() < (state.blockedUntil.get(sessionClass) ?? 0)) {
      return Promise.resolve(undefined);
    }
    const request: HttpRequestOptions<unknown> = {
      uri: `${state.context.armOrigin}${state.context.resourceId}/hostruntime${managementPath}/${sessionClass === 'reader' ? 'tokens/reader' : 'getContributorToken'}`,
      queryParameters: { 'api-version': standardManagementApiVersion },
      headers: { 'Cache-Control': 'no-store' },
      skipBatch: true,
    };
    const work = Promise.resolve().then(async (): Promise<Session | undefined> => {
      try {
        this.assertCurrent(state);
        const response = await send<unknown>(
          options.directManagementArmClient ?? options.armClient,
          sessionClass === 'reader' ? 'GET' : 'POST',
          request
        );
        this.assertCurrent(state);
        if (state.disabled) {
          throw contextError();
        }
        const session = validateEnvelope(response, state.context, sessionClass);
        state.sessions.set(sessionClass, session);
        state.blockedUntil.delete(sessionClass);
        return session;
      } catch (error) {
        this.assertCurrent(state);
        const safeError = safeFailure(error, 'issuance');
        const { status } = safeError;
        console.warn('Standard management token acquisition failed; requests without a usable session will use the original ARM request.', {
          sessionClass,
          status,
          code: safeError.error.code,
        });
        if (status === undefined || status >= 500) {
          state.blockedUntil.set(sessionClass, Date.now() + options.issuerFailureBackoffMs);
          return undefined;
        }
        state.failures.set(sessionClass, safeError);
        if (status === 401 || status === 403) {
          state.sessions.delete(sessionClass);
        }
        return undefined;
      } finally {
        state.pending.delete(sessionClass);
      }
    });
    state.pending.set(sessionClass, work);
    return work;
  }

  private async sendDirect<T>(
    state: ContextState,
    method: Method,
    options: HttpRequestOptions<unknown>,
    target: RequestTarget,
    session: Session,
    retryExpiry: boolean,
    legacyRequest?: () => Promise<T>
  ): Promise<T> {
    const transportOptions = this.options;
    if (transportOptions.armOnly === true) {
      throw contextError();
    }
    this.assertCurrent(state);
    if (state.disabled) {
      return this.sendArm(state, method, options, target, legacyRequest);
    }
    const failure = getIssuerFailure(state, session.sessionClass);
    if (failure) {
      return this.sendArm(state, method, options, target, legacyRequest);
    }
    if (Date.now() >= session.expiresOn) {
      return this.sendArm(state, method, options, target, legacyRequest);
    }
    checkThrottle(state);
    let response: T;
    try {
      response = await send<T>(transportOptions.directClient, method, {
        ...options,
        uri: `${session.endpoint}${target.path}`,
        queryParameters: { ...target.query, 'api-version': standardManagementApiVersion },
        headers: {
          ...businessHeaders(options.headers),
          'X-API-Key': session.apiKey,
        },
        noAuth: true,
        includeAuth: false,
        skipBatch: true,
      });
    } catch (error) {
      this.assertCurrent(state);
      const { status, code } = readFailure(error);
      if (status === 503 && code === 'DirectAccessDisabled') {
        state.disabled = true;
        state.sessions.clear();
        return this.sendArm(state, method, options, target, legacyRequest);
      }
      if (status === 401 && code === 'SessionTokenExpired' && retryExpiry) {
        if (state.sessions.get(session.sessionClass) === session) {
          state.sessions.delete(session.sessionClass);
        }
        const renewed = await this.getSession(state, session.sessionClass);
        this.assertCurrent(state);
        if (renewed) {
          return this.sendDirect(state, method, options, target, renewed, false, legacyRequest);
        }
        return this.sendArm(state, method, options, target, legacyRequest);
      }
      if (typeof error === 'object' && error !== null) {
        directErrors.add(error);
      }
      const until = retryAfterTime(readFailure(error).retryAfter);
      if (status === 429 && until !== undefined) {
        state.directThrottle = { until, error };
      }
      throw error;
    }
    this.assertCurrent(state);
    validatePaging(response, state.context, target);
    return response;
  }
}

function send<T>(client: IHttpClient, method: Method, options: HttpRequestOptions<unknown>): Promise<T> {
  switch (method) {
    case 'GET':
      return client.get<T>(options);
    case 'POST':
      return client.post<T, unknown>(options);
  }
}

function getTarget(context: StandardManagementContext, method: Method, options: HttpRequestOptions<unknown>): RequestTarget | undefined {
  let url: URL;
  try {
    url = new URL(options.uri, context.armOrigin);
  } catch {
    return undefined;
  }
  const armPath = `${context.resourceId}/hostruntime${managementPath}`;
  const direct = url.origin === context.runtimeOrigin && url.pathname.startsWith(`${directPath}/`);
  const arm = url.origin === context.armOrigin && url.pathname.slice(0, armPath.length).toLowerCase() === armPath.toLowerCase();
  if (!direct && !arm) {
    return undefined;
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    (direct && !options.uri.startsWith(`${context.runtimeOrigin}/`)) ||
    (options.type && options.type !== method)
  ) {
    throw new StandardManagementError('InvalidManagementRequest', 'The management request URL or method is unsafe.');
  }
  const path = url.pathname.slice(direct ? directPath.length : armPath.length);
  const operation = operations.find((item) => item.method === method && item.path.test(path));
  if (!operation || !safePath(path)) {
    if (direct) {
      throw new StandardManagementError('InvalidManagementRequest', 'The direct management route is not in the fixed catalog.');
    }
    return undefined;
  }
  const query: Record<string, string | number> = {};
  let valid = true;
  const add = (key: string, value: string | number): void => {
    if (Object.prototype.hasOwnProperty.call(query, key) || (key !== 'api-version' && !operation.queries.includes(key))) {
      valid = false;
    }
    query[key] = value;
  };
  url.searchParams.forEach((value, key) => add(key, value));
  Object.entries(options.queryParameters ?? {}).forEach(([key, value]) => add(key, value));
  if (!valid || (direct && query['api-version'] !== standardManagementApiVersion)) {
    if (direct) {
      throw new StandardManagementError('InvalidManagementRequest', 'The direct management query is outside the supported contract.');
    }
    return undefined;
  }
  query['api-version'] = standardManagementApiVersion;
  return { operation, path, query, direct };
}

function isDirectManagementUrl(uri: string): boolean {
  try {
    const path = new URL(uri).pathname;
    return path === directPath || path.startsWith(`${directPath}/`);
  } catch {
    return false;
  }
}

function safePath(path: string): boolean {
  try {
    return path
      .split('/')
      .slice(1)
      .every((part) => {
        const decoded = decodeURIComponent(part);
        return decoded !== '.' && decoded !== '..' && !/[/\\?#%]/.test(decoded) && !hasControlCharacter(decoded, false);
      });
  } catch {
    return false;
  }
}

function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value && !url.username && !url.password;
  } catch {
    return false;
  }
}

function businessHeaders(headers: HttpRequestOptions<unknown>['headers']): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => !['authorization', 'x-functions-key', 'x-api-key', 'cookie', 'host', 'proxy-authorization'].includes(name.toLowerCase())
    )
  );
}

function validateEnvelope(value: unknown, context: StandardManagementContext, sessionClass: SessionClass): Session {
  const invalid = (): StandardManagementError =>
    new StandardManagementError(
      'InvalidManagementSessionResponse',
      'The management session response is invalid or has an unsafe endpoint.'
    );
  if (!value || typeof value !== 'object') {
    throw invalid();
  }
  const envelope = value as Record<string, unknown>;
  if (
    Object.keys(envelope).length !== 3 ||
    envelope['endpoint'] !== `${context.runtimeOrigin}${directPath}` ||
    typeof envelope['apiKey'] !== 'string' ||
    !/^[A-Za-z0-9_-]{1,16384}$/.test(envelope['apiKey']) ||
    typeof envelope['expiresOn'] !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(envelope['expiresOn'])
  ) {
    throw invalid();
  }
  const expiresOn = Date.parse(envelope['expiresOn']);
  if (!Number.isFinite(expiresOn) || new Date(expiresOn).toISOString().replace('.000Z', 'Z') !== envelope['expiresOn']) {
    throw invalid();
  }
  if (expiresOn <= Date.now()) {
    throw new StandardManagementError(
      'SessionTokenExpired',
      'The issued management session already appears expired; check the browser clock.'
    );
  }
  return {
    sessionClass,
    endpoint: envelope['endpoint'],
    apiKey: envelope['apiKey'],
    expiresOn,
  };
}

function validatePaging(response: unknown, context: StandardManagementContext, target: RequestTarget): void {
  if (!response || typeof response !== 'object' || !('nextLink' in response) || !response.nextLink) {
    return;
  }
  try {
    if (typeof response.nextLink !== 'string') {
      throw new Error();
    }
    const link = getTarget(context, 'GET', { uri: response.nextLink });
    if (!link?.direct || link.path !== target.path || link.operation.id !== target.operation.id) {
      throw new Error();
    }
  } catch {
    throw new StandardManagementError('InvalidManagementPagingLink', 'The management response contains an unsafe paging link.');
  }
}

function contextError(): StandardManagementError {
  return new StandardManagementError(
    'ManagementContextChanged',
    'The management context was discarded; this work cannot be dispatched or reused.'
  );
}

function checkThrottle(state: ContextState): void {
  if (state.directThrottle && Date.now() < state.directThrottle.until) {
    throw state.directThrottle.error;
  }
}

function hasControlCharacter(value: string, includeSpace: boolean): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) < (includeSpace ? 33 : 32) || character.charCodeAt(0) === 127);
}

function readRetryAfter(headers: unknown): unknown {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  return Object.entries(headers).find(([name]) => name.toLowerCase() === 'retry-after')?.[1];
}

function readFailure(error: unknown): { status?: number; code?: string; retryAfter?: string } {
  const value = error as any;
  const status = value?.response?.status ?? value?.status ?? value?.statusCode;
  const body = value?.response?.data ?? value?.data ?? value;
  const retryAfter = readRetryAfter(value?.response?.headers) ?? readRetryAfter(value?.headers) ?? value?.retryAfter;
  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof body?.error?.code === 'string' ? body.error.code : undefined,
    retryAfter: typeof retryAfter === 'string' && !/[\r\n]/.test(retryAfter) ? retryAfter : undefined,
  };
}

function safeFailure(error: unknown, phase: FailurePhase): StandardManagementError {
  if (error instanceof StandardManagementError) {
    return error.phase
      ? error
      : new StandardManagementError(error.error.code, error.message, error.status, error.retryAfter, phase, error.retryAfterUntil);
  }
  const { status, code, retryAfter } = readFailure(error);
  const knownCodes = [
    'InvalidSessionToken',
    'SessionTokenExpired',
    'RequestUnauthorized',
    'DirectAccessDisabled',
    'InternalServerError',
    'ServiceTemporarilyUnavailable',
    'ServerTimeout',
    'TooManyConcurrentRequests',
    'BadRequest',
    'InvalidApiVersionParameter',
    'DirectAccessRequestThrottled',
  ];
  const safeCode = code && knownCodes.includes(code) ? code : 'ManagementRequestFailed';
  let message = `The management request failed${status ? ` (HTTP ${status})` : ' with an unknown outcome'}.`;
  if (status === 403) {
    message +=
      phase === 'business' && code === 'RequestUnauthorized'
        ? ' This management operation requires a Contributor session token. Refresh the management session and retry.'
        : ' Your account is not authorized for this management operation.';
  } else if (status === 429) {
    message += ' Wait before retrying; management requests are throttled.';
  } else if (status === 503) {
    message += ' The management service is unavailable. Try again later.';
  } else if (!status) {
    message += ' Check the operation result before retrying an action.';
  }
  return new StandardManagementError(safeCode, message, status, retryAfter, phase);
}

function retryAfterTime(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const until = /^\d+$/.test(value) ? Date.now() + Number(value) * 1000 : Date.parse(value);
  return Number.isFinite(until) ? until : undefined;
}

function getIssuerFailure(state: ContextState, sessionClass: SessionClass): StandardManagementError | undefined {
  const failure = state.failures.get(sessionClass);
  if (failure?.status === 429) {
    const until = failure.retryAfterUntil;
    if (until !== undefined && Date.now() >= until) {
      state.failures.delete(sessionClass);
      return undefined;
    }
  }
  return failure;
}
