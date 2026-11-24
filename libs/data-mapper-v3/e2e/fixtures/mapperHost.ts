import { expect, test as base, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { MapDocument } from '../../src/model/mapModel';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../src/protocol/mapEditorProtocol';
import { coverageEnabled, createCoverageReport } from '../coverage';
import { MapperPage } from '../pages/mapperPage';
import { createInitPayload, type InitPayload } from './testData';

const bundlePath = path.resolve(__dirname, '../../out/webview/webview.js');
const pageUrl = 'https://webview.test/index.html';
const scriptUrl = 'https://webview.test/webview.js';
const nonce = 'e2e-nonce';

// Mirrors MapEditorProvider.getHtmlForWebview (CSP included) with a dark VS Code theme's CSS variables.
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:; font-src data:;">
  <style>
    :root {
      --vscode-font-family: 'Segoe UI', sans-serif;
      --vscode-font-size: 13px;
      --vscode-foreground: #cccccc;
      --vscode-editor-background: #1e1e1e;
      --vscode-panel-background: #181818;
      --vscode-panel-border: #2b2b2b;
      --vscode-descriptionForeground: #9d9d9d;
      --vscode-textLink-foreground: #4daafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    #app { width: 100%; height: 100%; display: flex; flex-direction: column; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUrl}"></script>
</body>
</html>`;

// Fluent UI dev-mode warning emitted by the app's own toolbar/class composition; not a regression signal.
const knownConsoleNoise = ['mergeClasses(): a passed string contains multiple identifiers of atomic classes'];

type MessageOf<T extends { type: string }, K extends T['type']> = Extract<T, { type: K }>;
type MessageHandler<K extends WebviewToHostMessage['type']> = (message: MessageOf<WebviewToHostMessage, K>) => void | Promise<void>;

interface Waiter {
  type: string;
  predicate: (message: WebviewToHostMessage) => boolean;
  resolve: (message: WebviewToHostMessage) => void;
}

/** Stands in for the VS Code extension host: records everything the webview posts and lets tests reply on their own schedule. */
export class MockHost {
  readonly received: WebviewToHostMessage[] = [];
  private readonly waiters: Waiter[] = [];
  private readonly handlers = new Map<string, Array<(message: WebviewToHostMessage) => void | Promise<void>>>();

  constructor(private readonly page: Page) {}

  /** Called (via the page binding) for every `vscode.postMessage` the webview makes. */
  record(message: WebviewToHostMessage): void {
    this.received.push(message);
    for (const waiter of [...this.waiters]) {
      if (waiter.type === message.type && waiter.predicate(message)) {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
    for (const handler of this.handlers.get(message.type) ?? []) {
      Promise.resolve(handler(message)).catch(() => undefined);
    }
  }

  /** Delivers a host -> webview message, exactly as VS Code's `webview.postMessage` would. */
  async send(message: HostToWebviewMessage): Promise<void> {
    await this.page.evaluate((data) => {
      window.dispatchEvent(new MessageEvent('message', { data }));
    }, message as never);
  }

  /** Registers an auto-responder that runs whenever the webview posts a message of `type`. */
  onMessage<K extends WebviewToHostMessage['type']>(type: K, handler: MessageHandler<K>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as (message: WebviewToHostMessage) => void | Promise<void>);
    this.handlers.set(type, list);
  }

  messages<K extends WebviewToHostMessage['type']>(type: K): MessageOf<WebviewToHostMessage, K>[] {
    return this.received.filter((message): message is MessageOf<WebviewToHostMessage, K> => message.type === type);
  }

  last<K extends WebviewToHostMessage['type']>(type: K): MessageOf<WebviewToHostMessage, K> | undefined {
    return this.messages(type).at(-1);
  }

  /** The map from the most recent `update` message: what the extension host would write to the .btm. */
  lastUpdatedMap(): MapDocument | undefined {
    return this.last('update')?.data;
  }

  clear(): void {
    this.received.length = 0;
  }

  /** Resolves with the next matching message posted after this call (already-received messages are ignored). */
  waitForNext<K extends WebviewToHostMessage['type']>(
    type: K,
    predicate: (message: MessageOf<WebviewToHostMessage, K>) => boolean = () => true,
    timeoutMs = 5_000
  ): Promise<MessageOf<WebviewToHostMessage, K>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for '${type}' message from the webview`)), timeoutMs);
      this.waiters.push({
        type,
        predicate: predicate as (message: WebviewToHostMessage) => boolean,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message as MessageOf<WebviewToHostMessage, K>);
        },
      });
    });
  }
}

export interface MapperFixture {
  host: MockHost;
  ui: MapperPage;
  pageErrors: string[];
  /** Loads the webview, waits for its `ready` handshake, then answers with `init`. */
  open(init?: Partial<InitPayload>): Promise<void>;
  /** Loads the webview and waits for `ready` but does not send `init`, so tests can control the first host message. */
  loadWithoutInit(): Promise<void>;
}

export const test = base.extend<{ mapper: MapperFixture }>({
  mapper: async ({ page }, provideMapper) => {
    const host = new MockHost(page);
    const ui = new MapperPage(page);
    const pageErrors: string[] = [];

    if (coverageEnabled) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    page.on('pageerror', (error) => pageErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !knownConsoleNoise.some((noise) => message.text().includes(noise))) {
        pageErrors.push(`console.error: ${message.text()}`);
      }
    });

    await page.exposeFunction('__mapperHostPost', (message: WebviewToHostMessage) => host.record(message));
    await page.addInitScript(() => {
      (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
        // Snapshot at post time: the webview keeps mutating the same map object after posting it.
        postMessage: (message: unknown) => {
          (window as unknown as { __mapperHostPost: (m: unknown) => Promise<void> })
            .__mapperHostPost(JSON.parse(JSON.stringify(message)))
            .catch(() => undefined);
        },
        getState: () => undefined,
        setState: () => undefined,
      });
    });
    await page.route(pageUrl, (route) => route.fulfill({ contentType: 'text/html', body: html }));
    await page.route(scriptUrl, (route) => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(bundlePath, 'utf8') }));

    const loadWithoutInit = async (): Promise<void> => {
      if (!fs.existsSync(bundlePath)) {
        throw new Error(`Webview bundle not found at ${bundlePath}. Run "pnpm run bundle:webview:dev" first.`);
      }
      const ready = host.waitForNext('ready');
      await page.goto(pageUrl);
      await ready;
    };

    const open = async (init: Partial<InitPayload> = {}): Promise<void> => {
      await loadWithoutInit();
      await host.send({ type: 'init', data: createInitPayload(init) } as HostToWebviewMessage);
      if (init.sourceSchema !== null && init.targetSchema !== null) {
        await ui.waitUntilReady();
      }
    };

    try {
      await provideMapper({ host, ui, pageErrors, open, loadWithoutInit });
    } finally {
      if (coverageEnabled) {
        const entries = await page.coverage.stopJSCoverage();
        const sourceMap = JSON.parse(fs.readFileSync(`${bundlePath}.map`, 'utf8'));
        const mapperEntries = entries.filter((entry) => entry.url === scriptUrl).map((entry) => ({ ...entry, sourceMap }));
        if (mapperEntries.length > 0) {
          await createCoverageReport().add(mapperEntries);
        }
      }
    }

    expect(pageErrors, 'webview logged uncaught errors or console errors').toEqual([]);
  },
});

export { expect };
