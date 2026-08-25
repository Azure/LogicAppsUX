import * as assert from 'assert';
import { randomBytes } from 'crypto';
import * as net from 'net';

interface CdpTarget {
  id?: string;
  type: string;
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

interface CdpResponse {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { message?: string };
}

interface CdpExecutionContext {
  id: number;
  origin?: string;
  name?: string;
}

export class CdpConnection {
  private nextId = 1;
  private buffer = Buffer.alloc(0);
  private readonly pending = new Map<number, { resolve: (value: CdpResponse) => void; reject: (error: Error) => void }>();
  private readonly contextListeners: Array<(context: CdpExecutionContext) => void> = [];

  private constructor(private readonly socket: net.Socket) {
    socket.on('data', (chunk) => this.onData(chunk));
    socket.on('error', (error) => this.rejectAll(error));
    socket.on('close', () => this.rejectAll(new Error('CDP WebSocket closed')));
  }

  static async connect(webSocketUrl: string): Promise<CdpConnection> {
    const url = new URL(webSocketUrl);
    const port = Number(url.port || '80');
    const key = randomBytes(16).toString('base64');
    const socket = net.connect(port, url.hostname);

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });

    socket.write(
      [
        `GET ${url.pathname}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n')
    );

    await waitForHandshake(socket);
    return new CdpConnection(socket);
  }

  async send(method: string, params?: Record<string, unknown>): Promise<CdpResponse> {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });

    const promise = new Promise<CdpResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.socket.write(encodeClientFrame(message));
    return promise;
  }

  async evaluate<T>(contextId: number | undefined, expression: string): Promise<T> {
    const response = await this.send('Runtime.evaluate', {
      ...(contextId ? { contextId } : {}),
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (response.result?.exceptionDetails) {
      throw new Error(`CDP evaluation failed: ${JSON.stringify(response.result.exceptionDetails)}`);
    }

    return response.result?.result?.value as T;
  }

  onExecutionContextCreated(listener: (context: CdpExecutionContext) => void): void {
    this.contextListeners.push(listener);
  }

  dispose(): void {
    this.socket.end();
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const frame = tryDecodeServerFrame(this.buffer);
      if (!frame) {
        return;
      }

      this.buffer = this.buffer.subarray(frame.consumed);

      if (frame.opcode === 8) {
        this.socket.end();
        return;
      }

      if (frame.opcode !== 1) {
        continue;
      }

      const message = JSON.parse(frame.payload.toString('utf8')) as CdpResponse;
      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
          } else {
            pending.resolve(message);
          }
        }
      } else if (message.method === 'Runtime.executionContextCreated') {
        for (const listener of this.contextListeners) {
          listener(message.params.context);
        }
      }
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export async function connectToVsCodeCdp(
  options: { targetName?: string; urlIncludes?: string; titleIncludes?: string } = {}
): Promise<CdpConnection> {
  const port = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  assert.ok(port, 'LA_E2E_CLI_REMOTE_DEBUGGING_PORT must be set for webview DOM smoke tests');

  const targetName = options.targetName ?? 'Logic Apps webview';
  const urlIncludes = options.urlIncludes ?? 'extensionId=ms-azuretools.vscode-azurelogicapps';
  const titleIncludes = options.titleIncludes;
  const deadline = Date.now() + 15000;
  let targets: CdpTarget[] = [];

  while (Date.now() < deadline) {
    targets = (await fetchJson(`http://127.0.0.1:${port}/json/list`)) as CdpTarget[];
    const webviewTarget = [...targets]
      .reverse()
      .find(
        (target) =>
          target.type === 'iframe' &&
          target.webSocketDebuggerUrl &&
          target.url?.startsWith('vscode-webview://') &&
          target.url.includes(urlIncludes) &&
          (!titleIncludes || target.title?.includes(titleIncludes))
      );

    if (webviewTarget?.webSocketDebuggerUrl) {
      if (webviewTarget.id) {
        await fetch(`http://127.0.0.1:${port}/json/activate/${webviewTarget.id}`).catch(() => undefined);
      }

      return CdpConnection.connect(webviewTarget.webSocketDebuggerUrl);
    }

    await delay(250);
  }

  assert.fail(`Unable to find ${targetName} CDP target. Targets: ${JSON.stringify(targets)}`);
}

export async function connectToVsCodeWorkbenchCdp(): Promise<CdpConnection> {
  const port = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  assert.ok(port, 'LA_E2E_CLI_REMOTE_DEBUGGING_PORT must be set for workbench DOM smoke tests');

  const deadline = Date.now() + 15000;
  let targets: CdpTarget[] = [];

  while (Date.now() < deadline) {
    targets = (await fetchJson(`http://127.0.0.1:${port}/json/list`)) as CdpTarget[];
    const workbenchTarget = targets.find(
      (target) =>
        target.type === 'page' &&
        target.webSocketDebuggerUrl &&
        target.url?.includes('/workbench/workbench.html') &&
        target.title?.includes('[Extension Development Host]')
    );

    if (workbenchTarget?.webSocketDebuggerUrl) {
      if (workbenchTarget.id) {
        await fetch(`http://127.0.0.1:${port}/json/activate/${workbenchTarget.id}`).catch(() => undefined);
      }
      return CdpConnection.connect(workbenchTarget.webSocketDebuggerUrl);
    }

    await delay(250);
  }

  assert.fail(`Unable to find VS Code workbench CDP target. Targets: ${JSON.stringify(targets)}`);
}

export async function waitForCreateWorkspaceFrameContext(cdp: CdpConnection, timeoutMs = 15000): Promise<number> {
  return waitForWebviewFrameContext(cdp, {
    allTextIncludes: ['Create logic app workspace', 'Workspace parent folder path', 'Workspace name'],
    description: 'Create Workspace webview DOM context',
    timeoutMs,
  });
}

export async function waitForWebviewFrameContext(
  cdp: CdpConnection,
  options: { allTextIncludes: string[]; description: string; timeoutMs?: number }
): Promise<number> {
  const contexts = new Map<number, CdpExecutionContext>();
  const lastTexts = new Map<number, string>();
  const lastDiagnostics = new Map<number, unknown>();
  cdp.onExecutionContextCreated((context) => contexts.set(context.id, context));

  await cdp.send('Runtime.enable');

  const deadline = Date.now() + (options.timeoutMs ?? 15000);
  while (Date.now() < deadline) {
    for (const context of contexts.values()) {
      const diagnostics = await cdp
        .evaluate<{
          ownText: string;
          text: string;
          readyState: string;
          location: string;
          html: string;
          scripts: string[];
          links: string[];
          frames: Array<{ id: string; src: string; location: string; readyState: string; text: string; html: string }>;
        }>(
          context.id,
          `(() => {
            const collectText = (root) => {
              let text = '';
              const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
              let node = walker.currentNode;
              while (node) {
                if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) {
                  node = walker.nextSibling() || walker.nextNode();
                  continue;
                }
                if (node.parentElement instanceof HTMLScriptElement || node.parentElement instanceof HTMLStyleElement) {
                  node = walker.nextNode();
                  continue;
                }
                if (node.nodeType === Node.TEXT_NODE) {
                  text += node.textContent || '';
                }
                if (node.shadowRoot) {
                  text += collectText(node.shadowRoot);
                }
                if (node instanceof HTMLIFrameElement && node.contentDocument) {
                  text += collectText(node.contentDocument);
                }
                node = walker.nextNode();
              }
              return text;
            };
            const frameDocuments = Array.from(document.querySelectorAll('iframe'))
              .map((frame) => frame.contentDocument)
              .filter(Boolean);
            const frames = Array.from(document.querySelectorAll('iframe')).map((frame) => ({
              id: frame.id || '',
              src: frame.src || '',
              location: frame.contentDocument?.location.href || '',
              readyState: frame.contentDocument?.readyState || '',
              text: frame.contentDocument ? collectText(frame.contentDocument).slice(0, 1000) : '',
              html: frame.contentDocument?.documentElement?.outerHTML?.slice(0, 1000) || '',
            }));
            const frameText = frameDocuments.map((frameDocument) => collectText(frameDocument)).join('\\n');
            const ownText = document.body?.innerText || collectText(document) || '';
            return {
              ownText: ownText.trim(),
              text: [ownText, frameText].join('\\n').trim(),
              readyState: document.readyState,
              location: document.location.href,
              html: [
                document.documentElement?.outerHTML?.slice(0, 2000) || '',
                ...frameDocuments.map((frameDocument) => frameDocument.documentElement?.outerHTML?.slice(0, 2000) || ''),
              ].join('\\n---FRAME---\\n'),
              scripts: Array.from(document.scripts).map((script) => script.src || script.textContent?.slice(0, 120) || ''),
              links: Array.from(document.querySelectorAll('link')).map((link) => link.href || ''),
              frames,
            };
          })()`
        )
        .catch((error) => ({
          text: '',
          ownText: '',
          readyState: 'unknown',
          location: 'unknown',
          html: String(error),
          scripts: [],
          links: [],
        }));
      const text = diagnostics.text;
      const ownText = diagnostics.ownText;
      lastTexts.set(context.id, ownText || text);
      lastDiagnostics.set(context.id, diagnostics);

      if (options.allTextIncludes.every((expected) => ownText.includes(expected))) {
        return context.id;
      }
    }

    await delay(250);
  }

  assert.fail(
    `Timed out waiting for ${options.description}. Contexts: ${JSON.stringify([...contexts.values()])}. Last text: ${JSON.stringify(
      [...lastTexts.entries()].map(([contextId, text]) => ({
        contextId,
        text: text.slice(0, 1000),
        diagnostics: lastDiagnostics.get(contextId),
      }))
    )}`
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function waitForHandshake(socket: net.Socket): Promise<void> {
  let buffer = Buffer.alloc(0);

  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        return;
      }

      const header = buffer.subarray(0, headerEnd).toString('utf8');
      socket.off('data', onData);
      socket.off('error', reject);

      if (!header.startsWith('HTTP/1.1 101')) {
        reject(new Error(`CDP WebSocket upgrade failed: ${header}`));
        return;
      }

      resolve();
    };

    socket.on('data', onData);
    socket.once('error', reject);
  });
}

function encodeClientFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;
  const lengthBytes = length < 126 ? 0 : length <= 0xffff ? 2 : 8;
  const header = Buffer.alloc(2 + lengthBytes + 4);
  header[0] = 0x81;

  if (lengthBytes === 0) {
    header[1] = 0x80 | length;
  } else if (lengthBytes === 2) {
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  const maskOffset = 2 + lengthBytes;
  const mask = randomBytes(4);
  mask.copy(header, maskOffset);

  const maskedPayload = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index++) {
    maskedPayload[index] = payload[index] ^ mask[index % 4];
  }

  return Buffer.concat([header, maskedPayload]);
}

function tryDecodeServerFrame(buffer: Buffer): { opcode: number; payload: Buffer; consumed: number } | undefined {
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  let length = secondByte & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < offset + 2) {
      return undefined;
    }
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) {
      return undefined;
    }
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const masked = (secondByte & 0x80) !== 0;
  const maskOffset = offset;
  if (masked) {
    offset += 4;
  }

  if (buffer.length < offset + length) {
    return undefined;
  }

  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (masked) {
    const mask = buffer.subarray(maskOffset, maskOffset + 4);
    for (let index = 0; index < payload.length; index++) {
      payload[index] ^= mask[index % 4];
    }
  }

  return { opcode: firstByte & 0x0f, payload, consumed: offset + length };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
