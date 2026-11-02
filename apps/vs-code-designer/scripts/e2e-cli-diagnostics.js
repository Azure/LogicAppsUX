/* global module, require, process, Buffer */
const crypto = require('node:crypto');
const fs = require('node:fs');
const writerProducers = new Map();
const funcProducers = new Map();
const diagnosticOperations = new Set([
  'debug-startup',
  'debug-startup-launch',
  'debug-startup-session',
  'func-events-register',
  'func-task-start-event',
  'func-task-end-event',
  'func-map-set',
  'func-map-delete',
  'func-task-execute',
  'func-wait-map',
  'func-map-found',
  'func-host-status',
  'func-candidate-discovery',
  'native-invocation',
  'native-launch',
  'native-original-closure-receipt',
  'native-owner-recovery-receipt',
  'product-activate',
  'subsequent-runtime-startup',
  'scoped-process-capture',
  'original-product-deactivate',
  'scoped-original-process-release',
  'scoped-socket-bind-release',
  'owned-host-process-capture',
  'owned-host-teardown-step',
  'owned-host-original-deactivate',
  'owned-host-process-finalize',
  'owned-host-product-deactivate-first',
  'owned-host-product-deactivate-second',
  'msn-debug-stop',
  'msn-debug-stopped-predicate',
  'msn-task-stop',
  'msn-task-stopped-predicate',
  'wait-predicate',
  'context-menu-match-dispatch',
  'context-menu-closed',
  'workbench.view.explorer',
  'workbench-command',
  'command-palette-visible',
  'multi-root-folder-create',
  'explorer-root-match',
  'explorer-root-focus',
  'explorer-context-menu-dispatch',
  'folder-menu-diagnostic',
  'folder-menu-screenshot',
  'retained-handle-control',
  'node-start',
  'node-start-error',
  'node-started',
  'node-exit',
  'node-exit-diagnostic-unavailable',
  'release-node-wait',
  'release-node-marker-observed',
  'release-handle-marker-observed',
  'retained-handle-disposed',
  'release-owned-node-marker-written',
  'release-handle-owner-marker-written',
  'retained-handle-receipt-unavailable',
  'observer-diagnostic-relay-unavailable',
  'native-closure-diagnostic-unavailable',
  'multi-root-form-state',
  'multi-root-key-input',
  'multi-root-pointer-input',
  'multi-root-text-input',
  'multi-root-cdp-send',
  'multi-root-workflow-type-select',
  'multi-root-next-enabled',
  'multi-root-population',
  'multi-root-population-sample',
  'multi-root-population-terminal',
  ...[
    'start',
    'response',
    'protocol-error',
    'evaluation-exception',
    'timeout',
    'late-response',
    'late-error',
    'unmatched-response',
    'disconnect',
    'socket-error',
    'connection-close',
    'write-error',
  ].flatMap((event) =>
    [
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
      'other',
      'none',
    ].map((method) => `cdp-${event}.${method}`)
  ),
]);
const diagnosticOperationId = (value) => {
  if (diagnosticOperations.has(value)) return value;
  // CDP appends only connection sequence and request ID to its static operation.
  // Do not admit arbitrary methods, expressions or suffixes into summaries.
  if (typeof value !== 'string' || !value.startsWith('cdp-')) return null;
  const operation = value.replace(/\.\d+\.\d+$/, '');
  return operation !== value && diagnosticOperations.has(operation) ? value : null;
};

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const identifier = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,96}$/.test(value) ? value : value == null ? null : hash(String(value).slice(0, 4096));

// No arbitrary strings/keys enter the stream. Dynamic UI data and error text
// are capped then hashed, never retained as paths, commands, code or secrets.
function diagnosticState(value, depth = 0) {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return { sha256: hash(value.slice(0, 4096)), length: value.length, capped: value.length > 4096 };
  if (depth >= 4) return { capped: true };
  if (Array.isArray(value)) return { count: value.length, items: value.slice(0, 12).map((item) => diagnosticState(item, depth + 1)) };
  if (typeof value === 'object') {
    const keys = [
      'selected',
      'focused',
      'roots',
      'ready',
      'owned',
      'shellOwned',
      'active',
      'point',
      'x',
      'y',
      'menuCount',
      'candidates',
      'enabled',
      'hitTestable',
      'text',
      'activeElement',
      'tag',
      'role',
      'className',
      'quickInputVisible',
      'activeTabs',
      'visibleWebviews',
      'debugToolbar',
      'bytes',
      'sha256',
      'exists',
      'pid',
      'exitCode',
      'signal',
      'argvCount',
      'matches',
      'attempts',
      'released',
      'observed',
      'count',
      'lastState',
      'nativeSequence',
      'nativeWallTimeMs',
      'nativeMonotonicMs',
      'exited',
      'capped',
      'hresult',
      'dropped',
      'originProducer',
      'originOperation',
      'originParentOperation',
      'ok',
      'found',
      'disabled',
      'options',
      'optionIndex',
      'workspace',
      'expectedCount',
      'admittedExecutable',
      'samples',
      'races',
      'failures',
      'complete',
      'nativePasses',
      'totalRows',
      'inspectedRows',
      'procProbe',
      'procFault',
      'operationCode',
      'stateCode',
      'errorCode',
      'launcherPathCount',
      'workerPathCount',
      'unknownPathCount',
      'ownedCount',
      'unknownOwnershipCount',
      'ancestryProven',
      'commandProven',
      'workspaceProven',
      'durationMs',
      'collectionIntervalMs',
      'processes',
      'birth',
      'executable',
      'parentPid',
      'launchId',
      'requireHostRunning',
      'launchPending',
      'launchStarted',
      'launchRejected',
      'liveOwnedSessions',
      'settled',
      'started',
      'apiId',
      'launch',
      'invocation',
      'name',
      'type',
      'request',
      'taskId',
      'executionId',
      'scopePresent',
      'scopeMatches',
      'scopeExact',
      'classified',
      'shell',
      'commandPresent',
      'commandPlaceholder',
      'commandPhysical',
      'commandLinePlaceholder',
      'definitionCommandPlaceholder',
      'commandStructured',
      'mapCount',
      'trackedPid',
      'childCount',
      'responseState',
      'requestTimeoutMs',
      'timeout',
      'attempt',
      'mutationApplied',
    ];
    return Object.fromEntries(
      keys
        .filter((key) => Object.hasOwn(value, key))
        .map((key) => [
          key,
          key === 'sha256' && typeof value[key] === 'string' && /^[a-f0-9]{64}$/.test(value[key])
            ? value[key]
            : diagnosticState(value[key], depth + 1),
        ])
    );
  }
  return { unsupported: true };
}

function diagnosticError(error) {
  try {
    const known = new Set(['Error', 'AssertionError', 'AggregateError', 'TypeError', 'RangeError', 'SyntaxError']);
    const name = known.has(error?.name) ? error.name : 'OtherError';
    const code = /^(?:E[A-Z0-9_]{1,40}|ERR_[A-Z0-9_]{1,40})$/.test(error?.code) ? error.code : null;
    return { name, code, digest: diagnosticState(formatErrorForDiagnostics(error)) };
  } catch {
    return { name: 'UninspectableError' };
  }
}

function diagnosticBinding(env = process.env) {
  // Pick identity fields only. Never enumerate or log the environment.
  return {
    sourceSha: /^[a-f0-9]{40}$/i.test(env.BUILD_SOURCEVERSION || '') ? env.BUILD_SOURCEVERSION : null,
    run: /^\d{1,20}$/.test(env.BUILD_BUILDID || '') ? env.BUILD_BUILDID : null,
    suite: identifier(env.LA_E2E_CLI_SUITE_ID || env.LA_E2E_CLI_DIRECT_WRAPPED_SUITE || env.LA_E2E_CLI_LABEL),
    phase: identifier(env.LA_E2E_CLI_DIAGNOSTIC_PHASE || env.LA_E2E_CLI_PROFILE_PHASE || env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE),
    nativeInvocation: identifier(env.LA_E2E_LIFECYCLE_INVOCATION),
    parent: identifier(env.LA_E2E_LIFECYCLE_PARENT_INVOCATION),
  };
}

function createDiagnosticProducer({ sink, binding = {}, producer = 'diagnostic', maxEvents = 256, maxBytes = 262144 } = {}) {
  const origin = process.hrtime.bigint();
  const producerId = crypto.randomUUID();
  let sequence = 0;
  let emitted = 0;
  let bytes = 0;
  let operations = 0;
  let dropped = 0;
  let firstFailedGate = null;
  let lastGood = null;
  const safeBinding = {};
  for (const key of ['sourceSha', 'run', 'suite', 'phase', 'nativeInvocation', 'parent']) safeBinding[key] = identifier(binding[key]);
  const now = () => Number(process.hrtime.bigint() - origin) / 1e6;
  const emit = (operation, status, details = {}) => {
    try {
      if (status === 'failure') firstFailedGate ??= identifier(operation);
      if (status === 'end') lastGood = identifier(operation);
      const record = {
        kind: 'diagnostic-operation',
        schemaVersion: 1,
        ...safeBinding,
        producer: identifier(producer),
        producerId,
        sequence: ++sequence,
        wallTime: new Date().toISOString(),
        monotonicMs: now(),
        operation: identifier(operation),
        status,
        operationId: details.operationId ?? null,
        parentOperation: details.parentOperation ?? null,
        ...(details.startedMs !== undefined ? { durationMs: Math.max(0, now() - details.startedMs) } : {}),
        ...(details.state !== undefined ? { state: diagnosticState(details.state) } : {}),
        ...(details.error !== undefined ? { error: diagnosticError(details.error) } : {}),
        ...(status === 'summary' ? { firstFailedGate, lastGood, body: details.body, harness: details.harness, dropped } : {}),
      };
      const line = `${JSON.stringify(record)}\n`;
      const size = Buffer.byteLength(line);
      // Reserve bounded capacity for late failures/summary after routine polling.
      const eventLimit = Math.min(maxEvents, 512);
      const byteLimit = Math.min(maxBytes, 1048576);
      const important = status === 'failure' || status === 'summary';
      const availableEvents = important ? eventLimit : Math.max(0, eventLimit - Math.min(32, Math.floor(eventLimit / 4)));
      const availableBytes = important ? byteLimit : Math.max(0, byteLimit - Math.min(16384, Math.floor(byteLimit / 4)));
      if (emitted >= availableEvents || size > 8192 || bytes + size > availableBytes) {
        dropped++;
        return;
      }
      emitted++;
      bytes += size;
      sink?.(line);
    } catch {
      dropped++; // Secondary telemetry must not change control flow or error identity.
    }
  };
  const start = (operation, state, parentOperation = null) => {
    const operationId = `${producerId}:${++operations}`;
    const startedMs = now();
    emit(operation, 'start', { operationId, parentOperation, state });
    let finished = false;
    return {
      id: operationId,
      end: (state) => {
        if (!finished) {
          finished = true;
          lastGood = identifier(operation);
          emit(operation, 'end', { operationId, parentOperation, startedMs, state });
        }
      },
      fail: (error, state) => {
        if (!finished) {
          finished = true;
          firstFailedGate ??= identifier(operation);
          emit(operation, 'failure', { operationId, parentOperation, startedMs, error, state });
        }
      },
    };
  };
  return {
    emit,
    start,
    fork(producer) {
      return createDiagnosticProducer({ sink, binding, producer, maxEvents, maxBytes });
    },
    async run(operation, body, state, parentOperation) {
      const span = start(operation, state, parentOperation);
      try {
        const result = await body();
        span.end();
        return result;
      } catch (error) {
        span.fail(error);
        throw error;
      }
    },
    summary(body, harness) {
      const outcome = (value) => (['passed', 'failed', 'not-reached', 'unknown'].includes(value) ? value : 'unknown');
      emit('failure-summary', 'summary', { body: outcome(body), harness: outcome(harness) });
    },
  };
}

function fileDiagnosticSnapshot(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) return { bytes: stat.size, observed: false };
    const content = fs.readFileSync(file);
    return { exists: true, bytes: content.length, sha256: hash(content) };
  } catch {
    return { observed: false };
  }
}

function relayObserverDiagnostics(directory, trace) {
  try {
    const funcRelays = new Map();
    const operations = new Set([
      'product-activate',
      'subsequent-runtime-startup',
      'scoped-process-capture',
      'original-product-deactivate',
      'scoped-original-process-release',
      'scoped-socket-bind-release',
      'msn-debug-stop',
      'msn-task-stop',
      'failure-summary',
      'func-events-register',
      'func-task-start-event',
      'func-task-end-event',
      'func-map-set',
      'func-map-delete',
      'func-task-execute',
      'func-wait-map',
      'func-map-found',
      'func-host-status',
      'func-candidate-discovery',
    ]);
    for (const name of fs
      .readdirSync(directory)
      .filter((name) => /^[a-f0-9-]{36}\.(?:observer|func-events|func-startup)\.jsonl$/.test(name))
      .slice(0, 16)) {
      const file = require('node:path').join(directory, name);
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1048576) continue;
      for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(0, 512)) {
        if (line.length > 8192) continue;
        const record = JSON.parse(line);
        if (record.kind !== 'diagnostic-operation' || !operations.has(record.operation)) continue;
        // Keep task noise out of the startup budget at the relay boundary too.
        const channel = name.endsWith('.func-events.jsonl') ? 'events' : name.endsWith('.func-startup.jsonl') ? 'startup' : null;
        if (channel && !funcRelays.has(channel)) funcRelays.set(channel, trace.fork(`native-func-${channel}-relay`));
        const relay = channel ? funcRelays.get(channel) : trace;
        relay.emit(
          record.operation,
          ['start', 'end', 'failure', 'summary', 'sample', 'observer-installed', 'session-started', 'session-terminated'].includes(
            record.status
          )
            ? record.status
            : 'unknown',
          {
            state: {
              nativeSequence: record.sequence,
              nativeWallTimeMs: Date.parse(record.wallTime),
              nativeMonotonicMs: record.monotonicMs,
              lastState: record.state,
              originProducer: record.producerId,
              originOperation: record.operationId,
              originParentOperation: record.parentOperation,
              invocation: record.nativeInvocation,
            },
            ...(record.error ? { error: { name: record.error.name, code: record.error.code } } : {}),
          }
        );
      }
    }
  } catch (error) {
    trace.emit('observer-diagnostic-relay-unavailable', 'failure', { error });
  }
}

// Supplemental owner receipts, admitted only in the existing native MSN
// diagnostic environment. No producer, file access or output in ordinary use.
// Task event noise has a separate hard budget from the pending startup trace.
function getFuncDiagnosticProducer(channel, env = process.env) {
  try {
    if (
      env.VSCODE_RUNNING_TESTS !== '1' ||
      env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE !== 'msn-weather-run' ||
      !env.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR ||
      !env.LA_E2E_LIFECYCLE_DIR ||
      !/^[a-f0-9-]{36}$/.test(env.LA_E2E_LIFECYCLE_INVOCATION || '') ||
      !['events', 'startup'].includes(channel)
    )
      return undefined;
    const destination = require('node:path').join(env.LA_E2E_LIFECYCLE_DIR, `${env.LA_E2E_LIFECYCLE_INVOCATION}.func-${channel}.jsonl`);
    if (!require('node:path').isAbsolute(destination)) return undefined;
    let trace = funcProducers.get(destination);
    if (!trace && funcProducers.size < 32) {
      trace = createDiagnosticProducer({
        binding: diagnosticBinding(env),
        producer: `native-func-${channel}`,
        maxEvents: channel === 'events' ? 96 : 128,
        maxBytes: channel === 'events' ? 65536 : 98304,
        sink: (line) => fs.appendFileSync(destination, line),
      });
      funcProducers.set(destination, trace);
    }
    return trace;
  } catch {
    return undefined;
  }
}

// API receipts unless this particular owner supplies an admitted owningBody.
// No global fs patch. Without admission return the original result unchanged.
function observeFileOperation(file, writer, operation, body, env = process.env, owningBody) {
  if (env.VSCODE_RUNNING_TESTS !== '1' || !env.LA_E2E_CLI_REGENERATION_WRITER_EVENTS || !/[\\/]\.gitignore$/.test(file)) return body();
  const destination = env.LA_E2E_CLI_REGENERATION_WRITER_EVENTS;
  const key = `${destination}:${writer}`;
  let trace = writerProducers.get(key);
  if (!trace) {
    if (writerProducers.size >= 32) return body();
    trace = createDiagnosticProducer({
      binding: diagnosticBinding(env),
      producer: writer,
      sink: (line) => fs.appendFileSync(destination, line),
    });
    writerProducers.set(key, trace);
  }
  return (async () => {
    const span = trace.start(operation, fileDiagnosticSnapshot(file));
    try {
      const result = await (owningBody ? owningBody(trace, span.id) : body());
      span.end(fileDiagnosticSnapshot(file));
      return result;
    } catch (error) {
      span.fail(error, fileDiagnosticSnapshot(file));
      throw error;
    }
  })();
}

// Test-only adapter for the owner's default UTF-8 writeFile(path, string).
// These are receipts around actual calls, not inferred watcher/syscall events.
// open('w') combines open/create/truncate: there is no separate truncate call.
// No rename is used. Partial writes continue the same write, without retries.
// io is per-call injection for deterministic controls, never a global patch.
async function writeFileWithDiagnostics(file, content, trace, parentOperation, io = fs.promises) {
  const bytes = Buffer.from(content, 'utf8');
  const open = trace.start('gitignore-open-w-create-truncate', fileDiagnosticSnapshot(file), parentOperation);
  let handle;
  try {
    handle = await io.open(file, 'w', 0o666);
    open.end(fileDiagnosticSnapshot(file));
  } catch (error) {
    open.fail(error, fileDiagnosticSnapshot(file));
    throw error;
  }
  let primary;
  let failed = false;
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const requested = bytes.subarray(offset, offset + Math.min(bytes.length - offset, 524288));
      const write = trace.start(
        'gitignore-write',
        { bytes: requested.length, sha256: hash(requested), lastState: fileDiagnosticSnapshot(file) },
        parentOperation
      );
      try {
        const { bytesWritten } = await handle.write(requested, 0, requested.length, null);
        write.end({
          bytes: bytesWritten,
          sha256: hash(requested.subarray(0, bytesWritten)),
          lastState: fileDiagnosticSnapshot(file),
        });
        offset += bytesWritten;
      } catch (error) {
        write.fail(error, fileDiagnosticSnapshot(file));
        throw error;
      }
    }
  } catch (error) {
    failed = true;
    primary = error;
  } finally {
    // Close exactly once even after a failed write. A close/sink failure must
    // not mask the original write error (including a non-Error thrown value).
    const close = trace.start('gitignore-close', fileDiagnosticSnapshot(file), parentOperation);
    try {
      await handle.close();
      close.end(fileDiagnosticSnapshot(file));
    } catch (error) {
      close.fail(error, fileDiagnosticSnapshot(file));
      if (!failed) {
        failed = true;
        primary = error;
      }
    }
  }
  if (failed) throw primary;
}

function formatErrorForDiagnostics(error) {
  if (error && typeof error === 'object' && typeof error.stack === 'string' && error.stack.trim()) {
    return error.stack.trim();
  }
  try {
    return String(error);
  } catch {
    return '<unprintable thrown value>';
  }
}

module.exports = {
  formatErrorForDiagnostics,
  createDiagnosticProducer,
  diagnosticBinding,
  diagnosticState,
  diagnosticError,
  fileDiagnosticSnapshot,
  observeFileOperation,
  writeFileWithDiagnostics,
  relayObserverDiagnostics,
  diagnosticOperationId,
  getFuncDiagnosticProducer,
};
