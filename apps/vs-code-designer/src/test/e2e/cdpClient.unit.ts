import * as assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import { mock } from 'node:test';
import { createDiagnosticProducer } from '../../../scripts/e2e-cli-diagnostics';
import { setCdpDiagnosticEmitterForTests } from './cdpDiagnostics';
import {
  CdpConnection,
  chooseVsCodeWorkbenchTargetForCapture,
  connectToVsCodeWorkbenchCdp,
  setCdpSocketFactoryForTests,
  type CdpTarget,
  waitForDevToolsActivePort,
  waitForCreateWorkspaceFrameContext,
  waitForWebviewFrameContext,
} from './cdpClient';

async function main(): Promise<void> {
  await testInvocationOwnedDevToolsActivePort();
  testUniqueWorkbenchTarget();
  testAmbiguousWorkbenchTargets();
  testNonWorkbenchTargetsRejected();
  testSocketCloseInvalidatesGeneration();
  await testCreateWorkspaceContextRequiresOwnDocumentControls();
  await testWorkbenchDiscoveryFetchTimesOut();
  await testWorkbenchDiscoveryJsonBodyTimesOut();
  await testConnectAndHandshakeShareDeadline();
  await testHandshakeFailureDestroysSocket();
  await testEvaluateTimeoutKeepsConnectionUsableAndIgnoresLateResponse();
  await testDiagnosticTimeoutResponseAndDifferentId();
  await testWebviewDiscoveryEnableHonorsOriginalDeadline();
  await testDiagnosticProtocolErrorAndDisconnect();
  await testDiagnosticFailurePreservesPrimaryOutcomes();
  await testDiagnosticBoundsAndLateHistory();
  testPrivateRendererConsoleAndExceptions();
  console.log('[cdpClient.unit] all tests passed');
}

function diagnosticHarness(maxEvents = 256) {
  const records: any[] = [];
  const trace = createDiagnosticProducer({
    producer: 'native-cdp-transport',
    binding: { sourceSha: 'a'.repeat(40), run: '15890740', suite: 'createWorkspaceBehavior', nativeInvocation: 'control-invocation' },
    maxEvents,
    sink: (line) => records.push(JSON.parse(line)),
  });
  const restore = setCdpDiagnosticEmitterForTests(trace.emit.bind(trace));
  const socket = new FakeSocket();
  const connection: CdpConnection = Reflect.construct(CdpConnection, [socket, 'private-target', 'private-workspace-path']);
  const event = (name: string, id: number) =>
    records.find((record) => record.operation.startsWith(`cdp-${name}.`) && record.state.selected === id);
  return { records, restore, socket, connection, event };
}

function respond(socket: FakeSocket, message: unknown): void {
  const payload = Buffer.from(JSON.stringify(message));
  assert.ok(payload.length < 65536);
  const header =
    payload.length < 126 ? Buffer.from([0x81, payload.length]) : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 255]);
  socket.emit('data', Buffer.concat([header, payload]));
}

function testPrivateRendererConsoleAndExceptions(): void {
  const h = diagnosticHarness();
  const observed: unknown[] = [];
  let listenerFailures = 0;
  try {
    const remove = h.connection.onConsoleDiagnostic((event) => observed.push(event));
    h.connection.onConsoleDiagnostic(
      () => {
        throw new Error('secondary observer failure');
      },
      () => {
        listenerFailures++;
      }
    );
    respond(h.socket, {
      method: 'Runtime.consoleAPICalled',
      params: { type: 'warning', timestamp: 123, args: [{ value: 'private-console-argument' }] },
    });
    respond(h.socket, {
      method: 'Log.entryAdded',
      params: { entry: { level: 'error', timestamp: 124, text: 'private-log-message', url: 'https://private.test/' } },
    });
    respond(h.socket, {
      method: 'Runtime.exceptionThrown',
      params: {
        timestamp: 125,
        exceptionDetails: {
          text: 'private-exception-message',
          url: 'https://private.test/',
          stackTrace: { callFrames: ['private-stack'] },
        },
      },
    });
    assert.deepStrictEqual(observed, [
      { source: 'runtime', type: 'warning', severity: 'warning', timestamp: 123 },
      { source: 'log', type: 'entry', severity: 'error', timestamp: 124 },
      { source: 'runtime', type: 'exception', severity: 'error', timestamp: 125 },
    ]);
    assert.ok(!JSON.stringify(observed).includes('private-'));
    assert.strictEqual(listenerFailures, 3, 'Observer failures are counted without interrupting the CDP transport');
    remove();
    respond(h.socket, { method: 'Runtime.exceptionThrown', params: { timestamp: 126, exceptionDetails: { text: 'private-again' } } });
    assert.strictEqual(observed.length, 3, 'A detached observer must not receive later events');
  } finally {
    h.restore();
    h.connection.dispose();
  }
}

async function testWebviewDiscoveryEnableHonorsOriginalDeadline(): Promise<void> {
  const h = diagnosticHarness();
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const result = assert.rejects(
      waitForWebviewFrameContext(h.connection, { allTextIncludes: ['Source schema'], description: 'Mapper', timeoutMs: 1000 }),
      /Timed out waiting for CDP Runtime.enable response after 1000ms/
    );
    mock.timers.tick(1000);
    await result;
    assert.strictEqual(h.event('timeout', 1).state.options.durationMs, 1000);
  } finally {
    mock.timers.reset();
    h.restore();
    h.connection.dispose();
  }
}

async function testDiagnosticTimeoutResponseAndDifferentId(): Promise<void> {
  const h = diagnosticHarness();
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const expression = 'private-code-and-customer-content';
    const timedOut = assert.rejects(
      h.connection.evaluate(undefined, expression, { timeoutMs: 2000 }),
      /^Error: Timed out waiting for CDP Runtime\.evaluate response after 2000ms$/
    );
    const second = h.connection.evaluate(undefined, 'second-private-expression', { timeoutMs: 10000 });
    mock.timers.tick(1999);
    assert.strictEqual(h.event('timeout', 1), undefined, 'Diagnostics must not shorten the original request budget');
    mock.timers.tick(1);
    await timedOut;
    assert.strictEqual(h.event('start', 1).state.active, 1);
    assert.strictEqual(h.event('start', 2).state.active, 2);
    const timeout = h.event('timeout', 1);
    assert.strictEqual(timeout.state.active, 1);
    assert.strictEqual(timeout.state.options.durationMs, 2000);
    assert.strictEqual(timeout.error.name, 'Error');
    assert.strictEqual(timeout.state.sha256, createHash('sha256').update(expression).digest('hex'));
    assert.strictEqual(timeout.state.argvCount, JSON.stringify({ expression, awaitPromise: true, returnByValue: true }).length);
    assert.ok(timeout.state.durationMs >= 0);
    assert.ok(timeout.state.lastState.durationMs >= 0 && timeout.state.lastState.durationMs <= 2000);
    respond(h.socket, { id: 1, result: { result: { value: 'private-late-result' } } });
    respond(h.socket, { id: 99, result: { value: 'private-unmatched-result' } });
    assert.strictEqual(h.event('late-response', 1).state.active, 1);
    assert.strictEqual(h.event('late-response', 1).state.sha256, timeout.state.sha256);
    assert.strictEqual(h.event('unmatched-response', 99).state.active, 1);
    respond(h.socket, { id: 2, result: { result: { value: 'ok' } } });
    assert.strictEqual(await second, 'ok', 'A late or different response cannot settle the active request');
    assert.strictEqual(h.event('response', 2).state.active, 0);
    assert.strictEqual(h.socket.writes.length, 2, 'Telemetry must not retry a request');
    const serialized = JSON.stringify(h.records);
    for (const forbidden of [
      expression,
      'second-private-expression',
      'private-late-result',
      'private-unmatched-result',
      'private-target',
      'private-workspace-path',
    ]) {
      assert.ok(!serialized.includes(forbidden), `Diagnostic leaked ${forbidden}`);
    }
    assert.strictEqual(timeout.sourceSha, 'a'.repeat(40));
    assert.strictEqual(timeout.run, '15890740');
    assert.strictEqual(timeout.suite, 'createWorkspaceBehavior');
    assert.strictEqual(timeout.nativeInvocation, 'control-invocation');
    assert.ok(h.records.every((record, index) => record.sequence === index + 1));
  } finally {
    mock.timers.reset();
    h.restore();
    h.connection.dispose();
  }
}

async function testDiagnosticProtocolErrorAndDisconnect(): Promise<void> {
  const h = diagnosticHarness();
  try {
    const protocol = assert.rejects(
      h.connection.send('Runtime.evaluate', { expression: 'secret-code' }),
      /^Error: private-protocol-error$/
    );
    respond(h.socket, { id: 1, error: { message: 'private-protocol-error' } });
    await protocol;
    assert.strictEqual(h.event('protocol-error', 1).error.name, 'Error');

    const exception = assert.rejects(h.connection.evaluate(undefined, 'secret-code'), /CDP evaluation failed/);
    respond(h.socket, { id: 2, result: { exceptionDetails: { text: 'private-exception' } } });
    await exception;
    assert.ok(h.event('evaluation-exception', 2));

    const original = new TypeError('private-socket-error');
    const disconnected = assert.rejects(h.connection.send('private-method-with-content'), (error) => error === original);
    h.socket.emit('error', original);
    await disconnected;
    assert.strictEqual(h.event('disconnect', 3).error.name, 'TypeError');
    assert.ok(h.event('start', 3).operation.includes('.other.'));
    h.socket.emit('close');
    assert.strictEqual(h.event('connection-close', 0).state.active, 0);
    assert.strictEqual(h.event('connection-close', 0).status, 'observed', 'An idle close must not be reported as a failed request');

    const closeSocket = new FakeSocket();
    const closeConnection: CdpConnection = Reflect.construct(CdpConnection, [closeSocket]);
    const closed = assert.rejects(closeConnection.send('Page.captureScreenshot'), /^Error: CDP WebSocket closed$/);
    closeSocket.emit('close');
    await closed;
    assert.strictEqual(h.event('connection-close', 0).state.selected, 0);
    assert.ok(h.records.some((record) => record.operation.startsWith('cdp-connection-close.') && record.state.active === 1));
    assert.ok(!JSON.stringify(h.records).includes('private-'));
    assert.ok(!JSON.stringify(h.records).includes('secret-code'));
  } finally {
    h.restore();
    h.connection.dispose();
  }
}

async function testDiagnosticFailurePreservesPrimaryOutcomes(): Promise<void> {
  const restore = setCdpDiagnosticEmitterForTests(() => {
    throw new Error('secondary diagnostic failure');
  });
  const socket = new FakeSocket();
  const connection: CdpConnection = Reflect.construct(CdpConnection, [socket]);
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const timeout = assert.rejects(
      connection.evaluate(undefined, 'private-expression', { timeoutMs: 2000 }),
      /^Error: Timed out waiting for CDP Runtime\.evaluate response after 2000ms$/
    );
    mock.timers.tick(2000);
    await timeout;
    const success = connection.evaluate(undefined, 'private-expression');
    respond(socket, { id: 2, result: { result: { value: 'success' } } });
    assert.strictEqual(await success, 'success');
    const original = new Error('primary disconnect');
    const disconnect = assert.rejects(connection.send('Page.enable'), (error) => error === original);
    socket.emit('error', original);
    await disconnect;
    socket.emit('close');
    assert.strictEqual(socket.writes.length, 3);
    assert.strictEqual(socket.destroyCalls, 0);
  } finally {
    mock.timers.reset();
    restore();
    connection.dispose();
  }
}

async function testDiagnosticBoundsAndLateHistory(): Promise<void> {
  const h = diagnosticHarness();
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const timeouts = Array.from({ length: 65 }, () =>
      assert.rejects(h.connection.send('Runtime.evaluate', undefined, { timeoutMs: 2000 }), /after 2000ms/)
    );
    mock.timers.tick(2000);
    await Promise.all(timeouts);
    respond(h.socket, { id: 1, result: {} });
    respond(h.socket, { id: 2, error: { message: 'private-late-error' } });
    assert.ok(h.event('unmatched-response', 1), 'Old tombstones must be bounded, not retained indefinitely');
    assert.ok(h.event('late-error', 2), 'Retained tombstones must classify late protocol errors');
    assert.ok(!JSON.stringify(h.records).includes('private-late-error'));
  } finally {
    mock.timers.reset();
    h.restore();
    h.connection.dispose();
  }

  const bounded = diagnosticHarness(8);
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (let id = 1; id <= 10; id++) {
      const request = bounded.connection.send('Page.enable');
      respond(bounded.socket, { id, result: {} });
      await request;
    }
    const timeout = assert.rejects(bounded.connection.send('Runtime.evaluate', undefined, { timeoutMs: 2000 }), /after 2000ms/);
    mock.timers.tick(2000);
    await timeout;
    assert.ok(bounded.event('timeout', 11), 'Routine polling must leave the existing producer failure reserve available');
    respond(bounded.socket, { id: 11, result: {} });
    assert.ok(bounded.event('late-response', 11), 'The same failure reserve must retain a belated reply after polling is capped');
    assert.ok(bounded.records.length <= 8);
  } finally {
    mock.timers.reset();
    bounded.restore();
    bounded.connection.dispose();
  }
}

async function testInvocationOwnedDevToolsActivePort(): Promise<void> {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-active-port-'));
  try {
    fs.writeFileSync(path.join(profile, 'DevToolsActivePort'), '43123\n/devtools/browser/invocation-token\n');
    assert.strictEqual(await waitForDevToolsActivePort(profile, Date.now() + 1000), 43123);
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

async function testCreateWorkspaceContextRequiresOwnDocumentControls(): Promise<void> {
  const cdp = new FakeContextConnection([
    {
      id: 1,
      diagnostics: {
        ownText: 'Create logic app workspace Workspace parent folder path Workspace name',
        text: 'Create logic app workspace Workspace parent folder path Workspace name',
        readyState: 'complete',
        location: 'vscode-webview://outer-host/',
        html: '<iframe></iframe>',
        scripts: [],
        links: [],
        frames: [
          {
            id: 'inner',
            src: 'vscode-webview://inner/',
            location: 'vscode-webview://inner/',
            readyState: 'complete',
            text: 'Create logic app workspace Workspace parent folder path Workspace name',
            html: '<input aria-label="Workspace parent folder path">',
          },
        ],
        requiredSelectorFound: false,
      },
    },
    {
      id: 2,
      diagnostics: {
        ownText: 'Create logic app workspace Workspace parent folder path Workspace name',
        text: 'Create logic app workspace Workspace parent folder path Workspace name',
        readyState: 'complete',
        location: 'vscode-webview://create-workspace/',
        html: '<input aria-label="Workspace parent folder path">',
        scripts: [],
        links: [],
        frames: [],
        requiredSelectorFound: true,
      },
    },
  ]);

  const contextId = await waitForCreateWorkspaceFrameContext(cdp as unknown as CdpConnection, 50);

  assert.strictEqual(contextId, 2, 'Create Workspace context must be the document that owns the controls');
}

function testUniqueWorkbenchTarget(): void {
  const targets: CdpTarget[] = [
    { type: 'iframe', url: 'vscode-webview://example', webSocketDebuggerUrl: 'ws://127.0.0.1/iframe' },
    {
      id: 'workbench',
      type: 'page',
      title: 'Workspace [Extension Development Host]',
      url: 'vscode-file://vscode-app/out/vs/workbench/workbench.html',
      webSocketDebuggerUrl: 'ws://127.0.0.1/workbench',
    },
  ];

  assert.strictEqual(chooseVsCodeWorkbenchTargetForCapture(targets)?.id, 'workbench');
}

function testAmbiguousWorkbenchTargets(): void {
  const targets: CdpTarget[] = [
    {
      id: 'first',
      type: 'page',
      title: 'First [Extension Development Host]',
      url: 'vscode-file://vscode-app/out/vs/workbench/workbench.html',
      webSocketDebuggerUrl: 'ws://127.0.0.1/first',
    },
    {
      id: 'second',
      type: 'page',
      title: 'Second [Extension Development Host]',
      url: 'vscode-file://vscode-app/out/vs/workbench/workbench.html',
      webSocketDebuggerUrl: 'ws://127.0.0.1/second',
    },
  ];

  assert.strictEqual(chooseVsCodeWorkbenchTargetForCapture(targets), undefined);
}

function testNonWorkbenchTargetsRejected(): void {
  const targets: CdpTarget[] = [
    {
      id: 'page',
      type: 'page',
      title: 'Ordinary page',
      url: 'https://example.invalid/',
      webSocketDebuggerUrl: 'ws://127.0.0.1/page',
    },
  ];

  assert.strictEqual(chooseVsCodeWorkbenchTargetForCapture(targets), undefined);
}

function testSocketCloseInvalidatesGeneration(): void {
  const socket = new FakeSocket();
  const connection = Reflect.construct(CdpConnection as unknown as new (socket: FakeSocket, targetId?: string) => CdpConnection, [
    socket,
    'target',
  ]) as CdpConnection;

  assert.strictEqual(connection.contextGeneration, 0);
  socket.emit('close');
  assert.strictEqual(connection.contextGeneration, 1);
}

async function testWorkbenchDiscoveryFetchTimesOut(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = '65534';
  globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('fetch aborted')));
    })) as typeof fetch;
  const startedAt = Date.now();
  try {
    await assert.rejects(connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 10 }), /abort|deadline|timed out/i);
    assert.ok(Date.now() - startedAt < 250, 'Workbench discovery should honor the supplied timeout');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPort === undefined) {
      delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
    } else {
      process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = originalPort;
    }
  }
}

async function testWorkbenchDiscoveryJsonBodyTimesOut(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = '65534';
  globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        new Promise<unknown>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('body aborted')));
        }),
    } as Response)) as typeof fetch;
  const startedAt = Date.now();
  try {
    await assert.rejects(connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 10 }), /abort|deadline|timed out/i);
    assert.ok(Date.now() - startedAt < 250, 'Workbench discovery should keep the abort budget through JSON body parsing');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPort === undefined) {
      delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
    } else {
      process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = originalPort;
    }
  }
}

async function testConnectAndHandshakeShareDeadline(): Promise<void> {
  const restoreSocketFactory = setCdpSocketFactoryForTests(() => {
    const socket = new FakeSocket();
    setTimeout(() => socket.emit('connect'), 25);
    setTimeout(() => socket.emit('data', Buffer.from('HTTP/1.1 101 Switching Protocols\r\n\r\n')), 60);
    return socket as never;
  });
  const startedAt = Date.now();
  try {
    await assert.rejects(CdpConnection.connect('ws://127.0.0.1/devtools/page/1', 'target', 40), /handshake|deadline|timed out/i);
    assert.ok(Date.now() - startedAt < 250, 'CDP connect should not grant a fresh full timeout to the handshake after TCP connect');
  } finally {
    restoreSocketFactory();
  }
}

async function testHandshakeFailureDestroysSocket(): Promise<void> {
  let socket: FakeSocket | undefined;
  const restoreSocketFactory = setCdpSocketFactoryForTests(() => {
    socket = new FakeSocket();
    setTimeout(() => socket?.emit('connect'), 0);
    return socket as never;
  });
  try {
    await assert.rejects(CdpConnection.connect('ws://127.0.0.1/devtools/page/1', 'target', 10), /deadline|handshake|timed out/i);
    assert.strictEqual(socket?.destroyCalls, 1, 'Handshake failures must destroy the socket before callers retry CDP attach');
  } finally {
    restoreSocketFactory();
  }
}

async function testEvaluateTimeoutKeepsConnectionUsableAndIgnoresLateResponse(): Promise<void> {
  const socket = new FakeSocket();
  const connection: CdpConnection = Reflect.construct(CdpConnection, [socket, 'target']);
  try {
    await assert.rejects(
      connection.evaluate(undefined, 'initial-read', { timeoutMs: 1 }),
      /Timed out waiting for CDP Runtime\.evaluate response after 1ms/
    );
    assert.strictEqual(socket.destroyCalls, 0);
    assert.strictEqual(socket.endCalls, 0);

    const retry = connection.evaluate<string>(undefined, 'retry-read', { timeoutMs: 100 });
    for (const [id, value] of [
      [1, 'late-response'],
      [2, 'recovered'],
    ]) {
      const payload = Buffer.from(JSON.stringify({ id, result: { result: { value } } }));
      assert.ok(payload.length < 126, 'Synthetic server response should fit a short WebSocket frame');
      socket.emit('data', Buffer.concat([Buffer.from([0x81, payload.length]), payload]));
    }
    assert.strictEqual(await retry, 'recovered', 'Late timed-out response must not satisfy the next read');
    assert.strictEqual(socket.writes.length, 2);
  } finally {
    connection.dispose();
  }
  assert.strictEqual(socket.endCalls, 1);
}

class FakeSocket extends EventEmitter {
  destroyCalls = 0;
  endCalls = 0;
  readonly writes: Array<Buffer | string> = [];

  write(data: Buffer | string): boolean {
    this.writes.push(data);
    return true;
  }

  end(): void {
    this.endCalls++;
  }

  destroy(): void {
    this.destroyCalls++;
  }
}

class FakeContextConnection {
  private listeners: Array<(context: { id: number }) => void> = [];

  constructor(private readonly contexts: Array<{ id: number; diagnostics: unknown }>) {}

  onExecutionContextCreated(listener: (context: { id: number }) => void): void {
    this.listeners.push(listener);
  }

  async send(): Promise<Record<string, never>> {
    for (const context of this.contexts) {
      for (const listener of this.listeners) {
        listener({ id: context.id });
      }
    }
    return {};
  }

  async evaluate(contextId: number): Promise<unknown> {
    const context = this.contexts.find((candidate) => candidate.id === contextId);
    assert.ok(context, `Unexpected context ${contextId}`);
    return context.diagnostics;
  }
}

const watchdog = setTimeout(() => {
  console.error('[cdpClient.unit] timed out before completing all tests');
  process.exit(1);
}, 5000);

main()
  .then(() => clearTimeout(watchdog))
  .catch((error) => {
    clearTimeout(watchdog);
    console.error(error);
    process.exitCode = 1;
  });
