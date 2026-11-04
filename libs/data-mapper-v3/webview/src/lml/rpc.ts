import type { LmlEditorMethod, LmlEditorRequest, LmlEditorResponse, LmlSaveSnapshot } from '../../../src/lml/editorProtocol';

declare function acquireVsCodeApi(): { postMessage(message: LmlEditorRequest | LmlSaveSnapshot): void };

let vscode: ReturnType<typeof acquireVsCodeApi> | undefined;
const pending = new Map<string, { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
let sequence = 0;
let revision = 0;
let generation = 0;
let writes: Promise<unknown> = Promise.resolve();
let latestWrite: Promise<void> = Promise.resolve();

window.addEventListener('message', ({ data }: MessageEvent<LmlEditorResponse>) => {
  if (data?.type !== 'lmlResponse') {
    return;
  }
  const request = pending.get(data.id);
  if (!request) {
    return;
  }
  clearTimeout(request.timer);
  pending.delete(data.id);
  if (data.error) {
    request.reject(new Error(data.error));
  } else {
    request.resolve(data.result);
  }
});

export function request<T>(method: LmlEditorMethod, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = `lml-${++sequence}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`LML host request timed out: ${method}`));
    }, 120_000);
    pending.set(id, { resolve: (value) => resolve(value as T), reject, timer });
    try {
      vscode ??= acquireVsCodeApi();
      vscode.postMessage({ type: 'lmlRequest', id, method, params });
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    }
  });
}

export function resetRevision(value: number): void {
  generation++;
  revision = value;
  writes = Promise.resolve();
  latestWrite = Promise.resolve();
}

export function sendSaveSnapshot(snapshot: LmlSaveSnapshot): void {
  vscode ??= acquireVsCodeApi();
  vscode.postMessage(snapshot);
}

export function write(method: 'saveMapDefinition' | 'saveDraftState' | 'saveXslt', params: Record<string, unknown>): Promise<void> {
  const queuedGeneration = generation;
  const operation = writes.then(async () => {
    if (queuedGeneration !== generation) {
      throw new Error('The LML document changed. This outdated write was cancelled.');
    }
    const result = await request<{ revision: number }>(method, { ...params, revision });
    if (queuedGeneration === generation) {
      revision = result.revision;
    }
  });
  latestWrite = operation;
  writes = operation.catch(() => undefined);
  return operation;
}

export async function requestAfterWrites<T>(method: 'generateDataMapXslt' | 'testDataMap', params: Record<string, unknown>): Promise<T> {
  const requestGeneration = generation;
  await latestWrite;
  if (requestGeneration !== generation) {
    throw new Error('The LML document changed. This outdated operation was cancelled.');
  }
  return request<T>(method, { ...params, revision });
}

export function cancelPending(reason: string): void {
  generation++;
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(new Error(reason));
  }
  pending.clear();
}

window.addEventListener('pagehide', () => cancelPending('The LML editor was closed.'));
