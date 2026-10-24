import * as assert from 'assert';
import * as http from 'http';

export interface LocalWorkflowManagementResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

export type LocalWorkflowManagementPhase = 'callback-url' | 'trigger-invocation' | 'run-status' | 'action-history';

/**
 * Read-only management calls can be retried by their polling owners, while the
 * trigger invocation remains a single fail-closed request so a timed-out
 * response cannot create an uncorrelated duplicate run.
 */
export const localWorkflowManagementRequestTimeoutMs: Readonly<Record<LocalWorkflowManagementPhase, number>> = Object.freeze({
  'callback-url': 30_000,
  'trigger-invocation': 20_000,
  'run-status': 20_000,
  'action-history': 30_000,
});

export const localWorkflowManagementTimeoutCode = 'LOCAL_WORKFLOW_MANAGEMENT_TIMEOUT';

export class LocalWorkflowManagementRequestError extends Error {
  constructor(
    readonly classification: 'deadline' | 'timeout' | 'error',
    readonly phase: LocalWorkflowManagementPhase,
    readonly method: string,
    readonly relativePath: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'LocalWorkflowManagementRequestError';
  }
}

export function isLocalWorkflowManagementTimeout(error: unknown): error is LocalWorkflowManagementRequestError {
  return error instanceof LocalWorkflowManagementRequestError && error.classification === 'timeout';
}

interface TransportRequest {
  url: URL;
  method: string;
  body?: string;
  timeoutMs: number;
}

interface LocalWorkflowManagementDependencies {
  now?: () => number;
  log?: (line: string) => void;
  transport?: (request: TransportRequest) => Promise<LocalWorkflowManagementResult>;
}

export interface LocalWorkflowManagementRequest {
  phase: LocalWorkflowManagementPhase;
  method: string;
  url: string;
  deadline: number;
  attempt: number;
  body?: string;
  /** Unit-only override. Production callers use the phase policy above. */
  timeoutMs?: number;
}

const managementPathPrefix = '/runtime/webhooks/workflow/api/management';
const localHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export async function requestLocalWorkflowManagement(
  request: LocalWorkflowManagementRequest,
  dependencies: LocalWorkflowManagementDependencies = {}
): Promise<LocalWorkflowManagementResult> {
  const now = dependencies.now ?? Date.now;
  const log = dependencies.log ?? console.log;
  const startedAt = now();
  const requestUrl = new URL(request.url);
  assert.ok(localHostnames.has(requestUrl.hostname), 'Local workflow management requests must remain on loopback');
  assert.ok(Number.isInteger(request.attempt) && request.attempt > 0, 'Local workflow management attempt must be positive');
  const method = request.method.toUpperCase();
  const relativePath = relativeLocalPath(requestUrl);
  const remainingFamilyMs = request.deadline - startedAt;
  if (!(Number.isFinite(remainingFamilyMs) && remainingFamilyMs > 0)) {
    const error = new LocalWorkflowManagementRequestError(
      'deadline',
      request.phase,
      method,
      relativePath,
      `Local workflow management ${request.phase} request rejected after the family deadline`
    );
    logManagement(log, {
      event: 'rejected',
      phase: request.phase,
      method,
      path: relativePath,
      attempt: request.attempt,
      startedAt,
      elapsedMs: 0,
      remainingFamilyMs: 0,
      requestTimeoutMs: 0,
      outcome: 'deadline',
    });
    throw error;
  }

  const configuredTimeoutMs = request.timeoutMs ?? localWorkflowManagementRequestTimeoutMs[request.phase];
  assert.ok(Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0, 'Local workflow management timeout must be positive');
  const requestTimeoutMs = Math.min(configuredTimeoutMs, remainingFamilyMs);
  logManagement(log, {
    event: 'start',
    phase: request.phase,
    method,
    path: relativePath,
    attempt: request.attempt,
    startedAt,
    elapsedMs: 0,
    remainingFamilyMs,
    requestTimeoutMs,
  });

  try {
    const result = await (dependencies.transport ?? nodeHttpTransport)({
      url: requestUrl,
      method,
      body: request.body,
      timeoutMs: requestTimeoutMs,
    });
    const finishedAt = now();
    logManagement(log, {
      event: 'finish',
      phase: request.phase,
      method,
      path: relativePath,
      attempt: request.attempt,
      startedAt,
      elapsedMs: Math.max(0, finishedAt - startedAt),
      remainingFamilyMs: Math.max(0, request.deadline - finishedAt),
      requestTimeoutMs,
      outcome: 'response',
      status: result.status,
    });
    return result;
  } catch (cause) {
    const finishedAt = now();
    const classification = isTransportTimeout(cause) ? 'timeout' : 'error';
    logManagement(log, {
      event: 'finish',
      phase: request.phase,
      method,
      path: relativePath,
      attempt: request.attempt,
      startedAt,
      elapsedMs: Math.max(0, finishedAt - startedAt),
      remainingFamilyMs: Math.max(0, request.deadline - finishedAt),
      requestTimeoutMs,
      outcome: classification,
      error: classification === 'timeout' ? 'request-timeout' : 'request-error',
    });
    throw new LocalWorkflowManagementRequestError(
      classification,
      request.phase,
      method,
      relativePath,
      classification === 'timeout'
        ? `Local workflow management ${request.phase} request timed out after ${requestTimeoutMs}ms`
        : `Local workflow management ${request.phase} request failed`,
      { cause }
    );
  }
}

function relativeLocalPath(url: URL): string {
  if (url.pathname.startsWith(managementPathPrefix)) {
    return url.pathname.slice(managementPathPrefix.length) || '/';
  }
  return url.pathname || '/';
}

function logManagement(log: (line: string) => void, fields: Record<string, unknown>): void {
  log(`[http-timeout][local-management] ${JSON.stringify(fields)}`);
}

function isTransportTimeout(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === localWorkflowManagementTimeoutCode;
}

function nodeHttpTransport(request: TransportRequest): Promise<LocalWorkflowManagementResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer: { value?: NodeJS.Timeout } = {};
    const finish = <T>(action: (value: T) => void, value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer.value) {
        clearTimeout(timer.value);
      }
      action(value);
    };
    const operation = http.request(
      {
        hostname: request.url.hostname,
        port: request.url.port,
        path: `${request.url.pathname}${request.url.search}`,
        method: request.method,
        headers:
          request.body === undefined
            ? undefined
            : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(request.body) },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('error', (error) => finish(reject, error));
        response.on('end', () =>
          finish(resolve, {
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
          })
        );
      }
    );
    operation.on('error', (error) => finish(reject, error));
    timer.value = setTimeout(() => {
      const error = new Error('Local workflow management transport timeout') as NodeJS.ErrnoException;
      error.code = localWorkflowManagementTimeoutCode;
      operation.destroy(error);
    }, request.timeoutMs);
    operation.end(request.body);
  });
}
