import * as assert from 'assert';
import { EventEmitter } from 'events';
import {
  CdpConnection,
  chooseVsCodeWorkbenchTargetForCapture,
  connectToVsCodeWorkbenchCdp,
  setCdpSocketFactoryForTests,
  type CdpTarget,
  waitForCreateWorkspaceFrameContext,
} from './cdpClient';

async function main(): Promise<void> {
  testUniqueWorkbenchTarget();
  testAmbiguousWorkbenchTargets();
  testNonWorkbenchTargetsRejected();
  testSocketCloseInvalidatesGeneration();
  await testCreateWorkspaceContextRequiresOwnDocumentControls();
  await testWorkbenchDiscoveryFetchTimesOut();
  await testWorkbenchDiscoveryJsonBodyTimesOut();
  await testConnectAndHandshakeShareDeadline();
  console.log('[cdpClient.unit] all tests passed');
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

class FakeSocket extends EventEmitter {
  write(): boolean {
    return true;
  }

  end(): void {}

  destroy(): void {}
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
