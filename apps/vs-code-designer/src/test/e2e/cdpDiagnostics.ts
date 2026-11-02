import { createHash } from 'crypto';
import { createDiagnosticProducer, diagnosticBinding } from '../../../scripts/e2e-cli-diagnostics';

// Separate bounded producer so routine UI polling cannot consume other producers'
// failure reserve. This is native stdout/code.log evidence, not an acceptance gate.
const trace = createDiagnosticProducer({
  producer: 'native-cdp-transport',
  binding: diagnosticBinding(),
  sink: (line) => console.log(`[e2e-operation] ${line.trim()}`),
});

// Never admit a caller-supplied method string into the diagnostic operation.
const methods = new Set([
  'Runtime.evaluate',
  'Runtime.enable',
  'Runtime.callFunctionOn',
  'Page.enable',
  'Page.getFrameTree',
  'Page.captureScreenshot',
  'Page.getLayoutMetrics',
  'Page.bringToFront',
  'DOM.enable',
  'DOM.getDocument',
  'DOM.getFrameOwner',
  'DOM.getBoxModel',
  'DOM.getContentQuads',
  'DOM.getNodeForLocation',
  'DOM.resolveNode',
  'DOM.describeNode',
  'DOM.scrollIntoViewIfNeeded',
  'Input.dispatchMouseEvent',
  'Input.dispatchKeyEvent',
  'Input.insertText',
  'Target.getTargetInfo',
  'Target.activateTarget',
]);

export interface CdpRequestDiagnostic {
  method: string;
  startedAt: number;
  argsLength: number;
  expressionHash?: string;
  timeoutMs?: number;
}

type Event =
  | 'start'
  | 'response'
  | 'protocol-error'
  | 'evaluation-exception'
  | 'timeout'
  | 'late-response'
  | 'late-error'
  | 'unmatched-response'
  | 'disconnect'
  | 'socket-error'
  | 'connection-close'
  | 'write-error';

let connectionSequence = 0;
const defaultEmit = trace.emit.bind(trace);
let emit = defaultEmit;

export function nextCdpDiagnosticConnection(): number {
  return ++connectionSequence;
}

export function setCdpDiagnosticEmitterForTests(replacement: typeof emit): () => void {
  const previous = emit;
  emit = replacement;
  return () => {
    emit = previous;
  };
}

export function cdpRequestDiagnostic(message: string, method: string, timeoutMs?: number): CdpRequestDiagnostic | undefined {
  try {
    // Inspect the already serialized wire message, never original getters or
    // another serialization of caller-owned params. Retain no code or values.
    const params = JSON.parse(message).params;
    return {
      method: methods.has(method) ? method : 'other',
      startedAt: performance.now(),
      argsLength: JSON.stringify(params ?? {}).length,
      ...(typeof params?.expression === 'string' ? { expressionHash: createHash('sha256').update(params.expression).digest('hex') } : {}),
      timeoutMs,
    };
  } catch {
    return undefined;
  }
}

export function recordCdpDiagnostic(
  connection: number,
  requestId: number,
  event: Event,
  outstanding: number,
  request?: CdpRequestDiagnostic,
  error?: unknown
): void {
  try {
    // Existing shared producer field contract (no shared schema changes):
    // operation = event.static-method.connection-sequence.request-ID
    // selected = request ID, active = current outstanding request count,
    // argvCount = serialized args character length, sha256 = expression only,
    // options.durationMs = original caller timeout / request budget (unchanged),
    // lastState.durationMs = remaining request budget at this observation,
    // durationMs = monotonic elapsed. No outer fixture deadline is inferred.
    const durationMs = request ? Math.max(0, performance.now() - request.startedAt) : 0;
    const failure = ['protocol-error', 'evaluation-exception', 'timeout', 'disconnect', 'socket-error', 'write-error'];
    // Late replies still belong to an already failed (timed-out) request. Keep
    // them in the failure reserve too, rather than losing them to UI polling.
    // A normal idle/disposed connection closing is not a failed request.
    const failed =
      failure.includes(event) || event === 'late-response' || event === 'late-error' || (event === 'connection-close' && outstanding > 0);
    emit(
      `cdp-${event}.${request?.method ?? 'none'}.${connection}.${requestId}`,
      failed ? 'failure' : event === 'response' ? 'end' : event === 'start' ? 'start' : 'observed',
      {
        state: {
          selected: requestId,
          active: outstanding,
          ...(request
            ? {
                argvCount: request.argsLength,
                sha256: request.expressionHash,
                options: { durationMs: request.timeoutMs ?? null },
                lastState: { durationMs: request.timeoutMs ? Math.max(0, request.timeoutMs - durationMs) : null },
                durationMs,
              }
            : {}),
        },
        // Class only, never the original message/stack/protocol error content.
        ...(error !== undefined ? { error: { name: error instanceof Error ? error.name : 'OtherError' } } : {}),
      }
    );
  } catch {
    // Even a broken secondary diagnostic sink must preserve the primary error.
  }
}
