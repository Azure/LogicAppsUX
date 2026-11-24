import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';
import type * as ReduxUndo from 'redux-undo';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { LmlEditorProvider } from '../src/lml/lmlEditorProvider';
import { LmlRuntimeClient } from '../src/lml/lmlRuntimeClient';
import type { LmlEditorInitialState, LmlEditorMethod, LmlEditorResponse } from '../src/lml/editorProtocol';
import type * as DataMapSlice from '../../data-mapper-v2/src/core/state/DataMapSlice';
import type * as EditorStore from '../webview/src/lml/store';
import type * as EditorServices from '../webview/src/lml/services';
import type * as EditorRpc from '../webview/src/lml/rpc';
import type * as MockVscode from './__mocks__/vscode';

async function evaluate(relative: string, resolve: (name: string) => unknown, globals: Record<string, unknown> = {}) {
  const source = await fs.readFile(path.resolve(__dirname, relative), 'utf8');
  const exports = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    { exports, require: resolve, ...globals }
  );
  return exports;
}

async function rpcHarness() {
  const listeners = new Map<string, (event: { data: unknown }) => void>();
  const postMessage = vi.fn();
  const rpc = (await evaluate('../webview/src/lml/rpc.ts', () => ({}), {
    window: { addEventListener: (event: string, callback: (event: { data: unknown }) => void) => listeners.set(event, callback) },
    acquireVsCodeApi: () => ({ postMessage }),
    setTimeout,
    clearTimeout,
  })) as typeof EditorRpc;
  rpcClients.push(rpc);
  rpc.resetRevision(1);
  const respond = (index: number, result?: unknown, error?: string) => {
    const request = postMessage.mock.calls[index][0];
    listeners.get('message')?.({ data: { type: 'lmlResponse', id: request.id, result, error } });
  };
  const schemaUtils = await evaluate('../../data-mapper-v2/src/utils/Schema.Utils.ts', () => ({}));
  const schemaQuery = await evaluate('../../data-mapper-v2/src/core/queries/schema.ts', () => ({
    DataMapperApiServiceInstance: () => services.apiService,
  }));
  const services = (await evaluate('../webview/src/lml/services.ts', (name) => {
    if (name === './rpc') {
      return rpc;
    }
    if (name === '@microsoft/logic-apps-data-mapper-v2') {
      return { ...schemaUtils, ...schemaQuery };
    }
    return { SchemaType: { Source: 'source', Target: 'target' } };
  })) as typeof EditorServices;
  return { rpc, services, postMessage, respond };
}

async function saveHarness(writeRequest: () => Promise<void> = () => Promise.resolve()) {
  const packageRequire = createRequire(path.resolve(__dirname, '../../data-mapper-v2/package.json'));
  const slice = (await evaluate('../../data-mapper-v2/src/core/state/DataMapSlice.ts', (name) => {
    if (name === '@reduxjs/toolkit') {
      return packageRequire(name);
    }
    if (name.endsWith('/Connection.Utils')) {
      return { createConnectionEntryIfNeeded: vi.fn() };
    }
    return name === '@microsoft/logic-apps-shared' ? { guid: () => 'test-guid' } : {};
  })) as typeof DataMapSlice;
  const initial = slice.default(undefined, { type: 'init' });
  const operation = {
    ...initial.curDataMapOperation,
    functionNodes: { fn: { key: 'fn', position: { x: 10, y: 20 } } },
  } as typeof initial.curDataMapOperation;
  const seed = { ...initial, curDataMapOperation: operation, sourceInEditState: false, targetInEditState: false, isDirty: true };
  const resolveStore = (name: string): unknown => {
    if (name === '@reduxjs/toolkit' || name === 'redux-undo') {
      return packageRequire(name);
    }
    if (name.endsWith('/DataMapSlice')) {
      return {
        ...slice,
        __esModule: true,
        default: (state = seed, action: Parameters<typeof slice.default>[1]) => slice.default(state, action),
      };
    }
    if (name.endsWith('/Store')) {
      return { includedActionsForUndo: ['dataMap/setInitialDataMap', 'dataMap/addFunctionNode'] };
    }
    return { __esModule: true, default: (state = {}) => state };
  };
  const wrapper = (await evaluate('../webview/src/lml/store.ts', resolveStore)) as typeof EditorStore;
  const store = wrapper.createEditorStore();
  const onError = vi.fn();
  const services = (await evaluate('../webview/src/lml/services.ts', (name) => {
    if (name === './rpc') {
      return { write: writeRequest };
    }
    return {};
  })) as typeof EditorServices;
  const service = services.createFileService(vi.fn(), onError, (_definition, metadata) => {
    const saved = store.getState().dataMap.present.curDataMapOperation;
    return () => {
      store.dispatch(wrapper.acknowledgeSave({ operation: saved, metadata: JSON.parse(metadata) }));
    };
  });
  const { ActionCreators } = packageRequire('redux-undo') as typeof ReduxUndo;
  return { store, slice, wrapper, service, onError, ActionCreators };
}

vi.mock('vscode', async () => {
  const base = await vi.importActual<typeof MockVscode>('./__mocks__/vscode');
  return {
    ...base,
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    TextDocumentSaveReason: { Manual: 1, AfterDelay: 2, FocusOut: 3 },
    Range: class {
      constructor(
        public start: unknown,
        public end: unknown
      ) {}
    },
    WorkspaceEdit: class {
      replace = vi.fn();
    },
    TextEdit: { replace: (range: unknown, newText: string) => ({ range, newText }) },
    window: {
      ...base.window,
      activeColorTheme: { kind: 2 },
      showQuickPick: vi.fn(),
    },
    workspace: {
      ...base.workspace,
      isTrusted: true,
      onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
      onWillSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
      onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
      applyEdit: vi.fn(),
    },
  };
});

let root: string;
const providers: LmlEditorProvider[] = [];
const rpcClients: (typeof EditorRpc)[] = [];
const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
const initialMap = '$sourceSchema: nested/source.xsd\r\n$targetSchema: target.json\r\n';

async function write(relative: string, contents: string): Promise<void> {
  const filename = path.join(root, relative);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, contents);
}

async function setup() {
  await write('orders.lml', initialMap);
  const ensureStarted = vi.fn().mockResolvedValue({
    baseUrl: 'http://127.0.0.1:8000',
    port: 8000,
    projectPath: root,
    runtimePath: path.join(root, 'workflow-designtime'),
  });
  let contents = initialMap;
  const document = {
    uri: vscode.Uri.file(path.join(root, 'orders.lml')),
    version: 1,
    isClosed: false,
    isDirty: false,
    getText: () => contents,
    positionAt: (offset: number) => ({ line: 0, character: offset }),
    save: vi.fn(async () => {
      const edits = await willSave();
      for (const edit of edits) {
        changeDocument(edit.newText);
      }
      await write('orders.lml', contents);
      document.isDirty = false;
      didSave?.(document as unknown as vscode.TextDocument);
      return true;
    }),
  };
  const postMessage = vi.fn().mockResolvedValue(true);
  const onDidReceiveMessage = vi.fn(() => ({ dispose: vi.fn() }));
  const onDidDispose = vi.fn(() => ({ dispose: vi.fn() }));
  const panel = {
    active: true,
    visible: true,
    onDidDispose,
    webview: {
      options: {},
      html: '',
      cspSource: 'https://local-webview.vscode-cdn.net',
      asWebviewUri: (uri: vscode.Uri) => uri,
      onDidReceiveMessage,
      postMessage,
    },
  };
  const context = { extensionUri: vscode.Uri.file(path.join(root, 'extension')), subscriptions: [] } as unknown as vscode.ExtensionContext;
  const provider = new LmlEditorProvider(context, { ensureStarted });
  providers.push(provider);
  await provider.resolveCustomTextEditor(document as unknown as vscode.TextDocument, panel as unknown as vscode.WebviewPanel);
  const changed = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls.at(-1)?.[0];
  const saving = vi.mocked(vscode.workspace.onWillSaveTextDocument).mock.calls.at(-1)?.[0];
  const didSave = vi.mocked(vscode.workspace.onDidSaveTextDocument).mock.calls.at(-1)?.[0];
  const willSave = (reason = vscode.TextDocumentSaveReason.Manual): Promise<readonly vscode.TextEdit[]> => {
    let edits = Promise.resolve<readonly vscode.TextEdit[]>([]);
    saving?.({
      document,
      reason,
      waitUntil: (value: PromiseLike<readonly vscode.TextEdit[]>) => {
        edits = Promise.resolve(value);
      },
    } as unknown as vscode.TextDocumentWillSaveEvent);
    return edits;
  };
  const changeDocument = (newText: string) => {
    contents = newText;
    document.version++;
    document.isDirty = true;
    changed?.({ document, contentChanges: [{}] } as unknown as vscode.TextDocumentChangeEvent);
  };
  vi.mocked(vscode.workspace.applyEdit).mockImplementation(async (edit) => {
    const replacements = vi.mocked(edit.replace).mock.calls;
    changeDocument(replacements[0][2]);
    return true;
  });
  let nextId = 0;
  const request = async (method: LmlEditorMethod, params?: Record<string, unknown>): Promise<LmlEditorResponse> => {
    const id = String(nextId++);
    await onDidReceiveMessage.mock.calls[0][0]({ type: 'lmlRequest', id, method, params });
    const response = postMessage.mock.calls
      .map(([message]) => message)
      .find((message) => message.type === 'lmlResponse' && message.id === id);
    expect(response).toBeDefined();
    return response;
  };
  const snapshot = (message: unknown) => onDidReceiveMessage.mock.calls[0][0](message);
  return {
    document,
    panel,
    provider,
    request,
    postMessage,
    ensureStarted,
    changeDocument,
    onDidDispose,
    context,
    willSave,
    snapshot,
    didSave,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'lml-editor-')));
  Object.assign(vscode.workspace, { isTrusted: true });
  vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
});

afterEach(async () => {
  for (const rpc of rpcClients.splice(0)) {
    rpc.cancelPending('Test completed');
  }
  for (const provider of providers.splice(0)) {
    provider.dispose();
  }
  if (platformDescriptor) {
    Object.defineProperty(process, 'platform', platformDescriptor);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await fs.rm(root, { force: true, recursive: true });
});

describe('LML webview RPC ordering', () => {
  it.each(['generate', 'test'] as const)('waits for Save before %s and sends the acknowledged revision', async (operation) => {
    const { rpc, services, postMessage, respond } = await rpcHarness();
    const onError = vi.fn();
    services.createFileService(vi.fn(), onError).saveMapDefinitionCall('saved definition', '{}');
    const result =
      operation === 'generate'
        ? services.apiService.generateDataMapXslt('saved definition')
        : services.apiService.testDataMap('orders.lml.xslt', '<input/>');
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage.mock.calls[0][0]).toMatchObject({ method: 'saveMapDefinition', params: { revision: 1 } });
    respond(0, { revision: 2 });
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(2));
    expect(postMessage.mock.calls[1][0]).toMatchObject({
      method: operation === 'generate' ? 'generateDataMapXslt' : 'testDataMap',
      params: { revision: 2 },
    });
    respond(1, { completed: true });
    expect(await result).toEqual({ completed: true });
    expect(onError).not.toHaveBeenCalled();
    rpc.cancelPending('Complete');
  });

  it.each(['generate', 'test'] as const)('does not send %s when the preceding Save fails', async (operation) => {
    const { services, postMessage, respond } = await rpcHarness();
    const onError = vi.fn();
    services.createFileService(vi.fn(), onError).saveMapDefinitionCall('definition', '{}');
    const result =
      operation === 'generate'
        ? services.apiService.generateDataMapXslt('definition')
        : services.apiService.testDataMap('orders.lml.xslt', '<input/>');
    const rejected = expect(result).rejects.toThrow('disk full');
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    respond(0, undefined, 'disk full');
    await rejected;
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk full' }));
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('cancels queued writes and generation after an external document revision without overwriting the new revision', async () => {
    const { rpc, postMessage, respond } = await rpcHarness();
    const first = rpc.write('saveDraftState', { dataMapDefinition: 'first' });
    const queued = rpc.write('saveXslt', { xslt: '<stale/>' });
    const generation = rpc.requestAfterWrites('generateDataMapXslt', { dataMapDefinition: 'stale' });
    const cancelledWrite = expect(queued).rejects.toThrow('outdated write');
    const cancelledGeneration = expect(generation).rejects.toThrow('outdated write');
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    rpc.resetRevision(9);
    respond(0, { revision: 2 });
    await first;
    await cancelledWrite;
    await cancelledGeneration;
    expect(postMessage).toHaveBeenCalledTimes(1);
    const fresh = rpc.write('saveDraftState', { dataMapDefinition: 'fresh' });
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(2));
    expect(postMessage.mock.calls[1][0]).toMatchObject({ params: { revision: 9, dataMapDefinition: 'fresh' } });
    respond(1, { revision: 10 });
    await fresh;
  });
});

describe('LML schema-selection adapter', () => {
  it.each(['source', 'target'] as const)('roundtrips a selected nested schema through the v2 query and host into only %s', async (type) => {
    const host = await setup();
    await write('Schemas/nested/source.xsd', '<schema/>');
    await write('Schemas/target.json', '{}');
    await write('Schemas/nested/selected.xsd', '<schema/>');
    const schema = { name: 'selected.xsd', schemaTreeRoot: { name: 'Root' } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(schema)));
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce('nested/selected.xsd' as never);
    const { services, postMessage, respond } = await rpcHarness();
    const update = vi.fn();
    const onError = vi.fn();
    services.createFileService(update, onError).getSchemaFromFile(type as never);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    const selection = await host.request('selectSchema', postMessage.mock.calls[0][0].params);
    expect(selection.error).toBeUndefined();
    respond(0, selection.result);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(2));
    expect(postMessage.mock.calls[1][0]).toMatchObject({
      method: 'getSchemaFile',
      params: { schemaName: 'selected.xsd', schemaFilePath: 'nested/selected.xsd' },
    });
    const tree = await host.request('getSchemaFile', postMessage.mock.calls[1][0].params);
    expect(tree.error).toBeUndefined();
    respond(1, tree.result);
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith(type === 'source' ? { sourceSchema: schema } : { targetSchema: schema }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(['nested/', 'nested\\', 'nested/source.xsd', 'nested\\source.xsd'])(
    'normalizes the v2 schema path %s without duplicating the filename',
    async (schemaPath) => {
      const { services, postMessage, respond } = await rpcHarness();
      const schema = services.apiService.getSchemaFile('source.xsd', schemaPath);
      expect(postMessage.mock.calls[0][0]).toMatchObject({
        method: 'getSchemaFile',
        params: { schemaName: 'source.xsd', schemaFilePath: 'nested/source.xsd' },
      });
      respond(0, { name: 'source.xsd' });
      expect(await schema).toEqual({ name: 'source.xsd' });
    }
  );

  it('leaves schemas unchanged on selection cancellation and reports schema-load failures', async () => {
    const { services, postMessage, respond } = await rpcHarness();
    const update = vi.fn();
    const onError = vi.fn();
    const service = services.createFileService(update, onError);
    service.getSchemaFromFile('source' as never);
    respond(0, undefined);
    await Promise.resolve();
    expect(update).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledTimes(1);
    service.addSchemaFromFile({ name: 'source.xsd', path: 'nested/source.xsd', type: 'source' as never });
    expect(postMessage).toHaveBeenCalledTimes(2);
    respond(1, undefined, 'Schema could not be loaded');
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Schema could not be loaded' })));
    expect(update).not.toHaveBeenCalled();
  });
});

describe('LML session save acknowledgement', () => {
  const metadata = { canvasRect: { x: 0, y: 0, width: 800, height: 600 }, functionNodes: [] };

  it('ignores the toolbar save action until the async host save succeeds', async () => {
    let finish!: () => void;
    const hostSave = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { store, slice, service } = await saveHarness(() => hostSave);
    const before = store.getState().dataMap.present;
    service.saveMapDefinitionCall('definition', JSON.stringify(metadata));
    store.dispatch(slice.saveDataMap({ sourceSchemaExtended: undefined, targetSchemaExtended: undefined }));
    expect(store.getState().dataMap.present).toBe(before);
    expect(store.getState().dataMap.present.isDirty).toBe(true);
    finish();
    await hostSave;
    await Promise.resolve();
    const saved = store.getState().dataMap.present;
    expect(saved.isDirty).toBe(false);
    expect(saved.pristineDataMap.loadedMapMetadata).toEqual(metadata);
    expect(saved.curDataMapOperation.loadedMapMetadata).toEqual(metadata);
  });

  it('preserves dirty state and the previous pristine baseline when Save fails', async () => {
    const failure = new Error('disk full');
    const { store, slice, service, onError } = await saveHarness(() => Promise.reject(failure));
    const before = store.getState().dataMap.present;
    service.saveMapDefinitionCall('definition', JSON.stringify(metadata));
    store.dispatch(slice.saveDataMap({ sourceSchemaExtended: undefined, targetSchemaExtended: undefined }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(failure);
    expect(store.getState().dataMap.present.isDirty).toBe(true);
    expect(store.getState().dataMap.present.pristineDataMap).toBe(before.pristineDataMap);
  });

  it('acknowledges the saved layout without clearing or replacing a newer drag', async () => {
    let finish!: () => void;
    const hostSave = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { store, slice, service } = await saveHarness(() => hostSave);
    service.saveMapDefinitionCall('definition', JSON.stringify(metadata));
    store.dispatch(slice.updateFunctionPosition({ id: 'fn', position: { x: 90, y: 100 } }));
    const currentNodes = store.getState().dataMap.present.curDataMapOperation.functionNodes;
    finish();
    await hostSave;
    await Promise.resolve();
    const saved = store.getState().dataMap;
    expect(saved.present.isDirty).toBe(true);
    expect(saved.present.curDataMapOperation.functionNodes).toBe(currentNodes);
    expect(saved.present.curDataMapOperation.functionNodes.fn.position).toEqual({ x: 90, y: 100 });
    expect(saved.present.pristineDataMap.functionNodes.fn.position).toEqual({ x: 10, y: 20 });
    expect(saved.present.pristineDataMap.loadedMapMetadata).toEqual(metadata);
    expect(saved.present.curDataMapOperation.loadedMapMetadata).toEqual(metadata);
    expect(saved._latestUnfiltered?.pristineDataMap.loadedMapMetadata).toEqual(metadata);
  });

  it('makes a layout-only drag dirty after a successful save', async () => {
    const { store, slice, wrapper } = await saveHarness();
    store.dispatch(wrapper.acknowledgeSave({ operation: store.getState().dataMap.present.curDataMapOperation, metadata }));
    expect(store.getState().dataMap.present.isDirty).toBe(false);
    store.dispatch(slice.updateFunctionPosition({ id: 'fn', position: { x: 90, y: 100 } }));
    expect(store.getState().dataMap.present.isDirty).toBe(true);
  });

  it('preserves undo/redo history and the saved metadata baseline when acknowledging a save with a future edit', async () => {
    const { store, slice, wrapper, ActionCreators } = await saveHarness();
    const node = store.getState().dataMap.present.curDataMapOperation.functionNodes.fn;
    store.dispatch(slice.addFunctionNode({ functionData: { ...node, key: 'second' }, newReactFlowKey: 'second' }));
    store.dispatch(slice.addFunctionNode({ functionData: { ...node, key: 'third' }, newReactFlowKey: 'third' }));
    store.dispatch(ActionCreators.undo());
    const before = store.getState().dataMap;
    expect(before.future).toHaveLength(1);
    expect(before.present.curDataMapOperation.functionNodes.third).toBeUndefined();
    store.dispatch(wrapper.acknowledgeSave({ operation: before.present.curDataMapOperation, metadata }));
    const saved = store.getState().dataMap;
    expect(saved.past).toHaveLength(before.past.length);
    expect(saved.future).toHaveLength(1);
    expect(saved.present.isDirty).toBe(false);
    for (const state of [...saved.past, ...saved.future, saved._latestUnfiltered!]) {
      expect(state.pristineDataMap.loadedMapMetadata).toEqual(metadata);
      expect(state.curDataMapOperation.loadedMapMetadata).toEqual(metadata);
    }
    store.dispatch(ActionCreators.redo());
    expect(store.getState().dataMap.present.curDataMapOperation.functionNodes.third.position).toEqual(node.position);
    expect(store.getState().dataMap.present.isDirty).toBe(true);
    store.dispatch(ActionCreators.undo());
    expect(store.getState().dataMap.present.curDataMapOperation.functionNodes.third).toBeUndefined();
    expect(store.getState().dataMap.present.isDirty).toBe(false);
    expect(store.getState().dataMap.present.pristineDataMap.loadedMapMetadata).toEqual(metadata);
  });

  it('preserves undo/redo history and its previous saved baseline when a save fails', async () => {
    const { store, slice, service, onError, ActionCreators } = await saveHarness(() => Promise.reject(new Error('disk full')));
    const node = store.getState().dataMap.present.curDataMapOperation.functionNodes.fn;
    store.dispatch(slice.addFunctionNode({ functionData: { ...node, key: 'second' }, newReactFlowKey: 'second' }));
    store.dispatch(ActionCreators.undo());
    const before = store.getState().dataMap;
    service.saveMapDefinitionCall('definition', JSON.stringify(metadata));
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    const failed = store.getState().dataMap;
    expect(failed.past).toBe(before.past);
    expect(failed.future).toBe(before.future);
    expect(failed.present.pristineDataMap).toBe(before.present.pristineDataMap);
    store.dispatch(ActionCreators.redo());
    expect(store.getState().dataMap.present.curDataMapOperation.functionNodes.second.position).toEqual(node.position);
    expect(store.getState().dataMap.present.isDirty).toBe(true);
  });
});

describe('LML editor host', () => {
  it.each([1, 2, 3])(
    'flushes the visual snapshot and metadata for native save reason %s and acknowledges only did-save',
    async (reason) => {
      const host = await setup();
      host.changeDocument(`${initialMap}old: draft\n`);
      const definition = `${initialMap}new: visual\n`;
      const metadata = '{"functionNodes":[],"canvasRect":{"width":800,"height":600}}';
      host.postMessage.mockImplementation(async (message) => {
        if (message.type === 'lmlSaveRequested') {
          host.snapshot({
            type: 'lmlSaveSnapshot',
            id: message.id,
            revision: message.revision,
            dataMapDefinition: definition,
            mapMetadata: metadata,
          });
        }
        return true;
      });
      const edits = await host.willSave(reason);
      expect(edits.map((edit) => edit.newText)).toEqual([definition]);
      expect(await fs.readFile(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'), 'utf8')).toBe(metadata);
      await expect(fs.stat(path.join(root, 'orders.lml.metadata.json'))).rejects.toMatchObject({ code: 'ENOENT' });
      expect(host.document.getText()).not.toBe(definition);
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
      expect(host.document.save).not.toHaveBeenCalled();
      expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlDocumentSaved')).toBe(false);
      host.changeDocument(definition);
      expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlDocumentChanged' && message.revision === 3)).toBe(false);
      host.didSave?.(host.document as unknown as vscode.TextDocument);
      expect(host.postMessage).toHaveBeenLastCalledWith({ type: 'lmlDocumentSaved', id: expect.any(String), revision: 3 });
    }
  );

  it.each([true, false])('acknowledges native saves with unchanged visual text (dirty text: %s)', async (dirty) => {
    const host = await setup();
    if (dirty) {
      host.changeDocument(`${initialMap}external: text\n`);
    }
    host.postMessage.mockImplementation(async (message) => {
      if (message.type === 'lmlSaveRequested') {
        host.snapshot({ type: 'lmlSaveSnapshot', id: message.id, revision: message.revision, dataMapDefinition: message.mapText });
      }
      return true;
    });
    await host.document.save();
    expect(host.postMessage).toHaveBeenLastCalledWith({ type: 'lmlDocumentSaved', id: expect.any(String), revision: dirty ? 2 : 1 });
    expect(await fs.readFile(path.join(root, 'orders.lml'), 'utf8')).toBe(host.document.getText());
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it('does not request another snapshot during explicit Save Map', async () => {
    const host = await setup();
    expect(
      (await host.request('saveMapDefinition', { dataMapDefinition: initialMap, mapMetadata: '{}', revision: 1 })).error
    ).toBeUndefined();
    expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlSaveRequested')).toBe(false);
  });

  it('expires missing and late native snapshots within one second without acknowledging a save', async () => {
    const host = await setup();
    vi.useFakeTimers();
    const saving = host.willSave();
    const requested = host.postMessage.mock.calls.at(-1)?.[0];
    await vi.advanceTimersByTimeAsync(1000);
    expect(await saving).toEqual([]);
    host.snapshot({ type: 'lmlSaveSnapshot', id: requested.id, revision: 1, dataMapDefinition: 'late', mapMetadata: '{}' });
    host.didSave?.(host.document as unknown as vscode.TextDocument);
    expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlDocumentSaved')).toBe(false);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    await expect(fs.stat(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['revision', 'metadata', 'io', 'webview'])('does not acknowledge native snapshot failure: %s', async (failure) => {
    const host = await setup();
    if (failure === 'io') {
      await fs.mkdir(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'), { recursive: true });
    }
    host.postMessage.mockImplementation(async (message) => {
      if (message.type === 'lmlSaveRequested') {
        if (failure === 'revision') {
          host.changeDocument('newer text');
        }
        host.snapshot({
          type: 'lmlSaveSnapshot',
          id: message.id,
          revision: message.revision,
          dataMapDefinition: 'visual',
          mapMetadata: failure === 'metadata' ? 'null' : '{}',
          error: failure === 'webview' ? 'Serialization failed' : undefined,
        });
      }
      return true;
    });
    expect(await host.willSave()).toEqual([]);
    host.didSave?.(host.document as unknown as vscode.TextDocument);
    expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlDocumentSaved')).toBe(false);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });

  it('accepts native snapshots outside the busy project RPC queue', async () => {
    const host = await setup();
    let release!: () => void;
    host.ensureStarted.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ baseUrl: 'http://127.0.0.1:8000', port: 8000, projectPath: root, runtimePath: root });
        })
    );
    const runtimeRequest = host.request('getFunctionsManifest');
    await vi.waitFor(() => expect(host.ensureStarted).toHaveBeenCalled());
    host.postMessage.mockImplementation(async (message) => {
      if (message.type === 'lmlSaveRequested') {
        host.snapshot({
          type: 'lmlSaveSnapshot',
          id: message.id,
          revision: message.revision,
          dataMapDefinition: 'visual',
          mapMetadata: '{}',
        });
      }
      return true;
    });
    expect((await host.willSave())[0].newText).toBe('visual');
    release();
    await runtimeRequest;
  });

  it('rejects pre-save queued drafts even when native saving does not change the document revision', async () => {
    const host = await setup();
    let release!: () => void;
    host.ensureStarted.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ baseUrl: 'http://127.0.0.1:8000', port: 8000, projectPath: root, runtimePath: root });
        })
    );
    const runtimeRequest = host.request('getFunctionsManifest');
    await vi.waitFor(() => expect(host.ensureStarted).toHaveBeenCalled());
    const draft = host.request('saveDraftState', { dataMapDefinition: 'obsolete queued draft', revision: 1 });
    host.postMessage.mockImplementation(async (message) => {
      if (message.type === 'lmlSaveRequested') {
        host.snapshot({ type: 'lmlSaveSnapshot', id: message.id, revision: message.revision, dataMapDefinition: message.mapText });
      }
      return true;
    });
    await host.document.save();
    release();
    await runtimeRequest;
    expect((await draft).error).toContain('superseded');
    expect(host.document.getText()).toBe(initialMap);
    expect(host.document.version).toBe(1);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it('initializes raw v2 map/metadata, qualified XSLT, recursive project assets and platform state without starting the runtime', async () => {
    const host = await setup();
    const metadata = '{ "functionPositions": { "id": { "x": 12, "y": 34 } } }\r\n';
    await write('.vscode/ordersDataMapMetadata-v2.json', metadata);
    await write('__generated/orders.lml.xslt', '<lml/>');
    await write('__generated/orders.btm.xslt', '<btm/>');
    await write('Schemas/nested/source.xsd', '<schema/>');
    await write('Schemas/target.json', '{}');
    await write('Schemas/excluded.xml', '<xml/>');
    await write('Artifacts/DataMapper/Extensions/InlineXslt/nested/custom.xslt', '<custom/>');
    await write('Artifacts/DataMapper/Extensions/InlineXslt/nested/custom.xml', '<custom/>');
    await write('Artifacts/DataMapper/Extensions/InlineXslt/custom.dll', 'excluded');
    const response = await host.request('initialize');
    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({
      mapText: initialMap,
      metadataText: metadata,
      xsltFilename: 'orders.lml.xslt',
      xsltContent: '<lml/>',
      schemaPaths: ['nested/source.xsd', 'target.json'],
      customXsltPaths: ['nested/custom.xml', 'nested/custom.xslt'],
      isTestDisabledForOS: process.platform !== 'win32',
      isDark: true,
      revision: 1,
    });
    expect(host.ensureStarted).not.toHaveBeenCalled();
  });

  it('returns empty optional assets and uses an isolated bundle, root and CSP', async () => {
    const host = await setup();
    const initial = (await host.request('initialize')).result as LmlEditorInitialState;
    expect(initial.metadataText).toBeUndefined();
    expect(initial.customXsltPaths).toEqual([]);
    expect(initial.schemaPaths).toEqual([]);
    expect(initial.xsltContent).toBe('');
    expect(host.panel.webview.html).toContain('id="root"');
    expect(host.panel.webview.html).toMatch(/nonce="[A-Za-z0-9+/=]+" src="[^"]*lml\.js"/);
    expect(host.panel.webview.html).toContain("connect-src 'none'");
    expect(host.panel.webview.html).toContain("'unsafe-inline'");
    expect(host.panel.webview.html).toContain("'self' data: blob:");
    expect(host.panel.webview.html).not.toContain('map.js');
    expect(host.panel.webview.options).toEqual(expect.objectContaining({ enableScripts: true }));
  });

  it('keeps drafts dirty and undoable, suppresses its own edits, and notifies external edits', async () => {
    const host = await setup();
    const draft = `${initialMap}field: value\n`;
    expect((await host.request('saveDraftState', { dataMapDefinition: draft, revision: 1 })).result).toEqual({ revision: 2 });
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    expect(host.document.getText()).toBe(draft);
    expect(host.document.isDirty).toBe(true);
    expect(host.document.save).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, 'orders.lml'), 'utf8')).toBe(initialMap);
    expect(host.postMessage.mock.calls.some(([message]) => message.type === 'lmlDocumentChanged')).toBe(false);
    host.changeDocument(initialMap);
    expect(host.postMessage).toHaveBeenLastCalledWith({ type: 'lmlDocumentChanged', revision: 3 });
    const response = await host.request('saveDraftState', { dataMapDefinition: draft, revision: 2 });
    expect(response.error).toContain('document changed');
    expect(host.document.getText()).toBe(initialMap);
  });

  it('saves through the document and awaits .vscode metadata without flattening v2 layout state', async () => {
    const host = await setup();
    const metadata = '{ "functionNodes": [{"id":"sum","position":{"x":24,"y":48}}] }\r\n';
    const savedMap = `${initialMap}total: $sum\n`;
    expect((await host.request('saveMapDefinition', { dataMapDefinition: savedMap, mapMetadata: metadata, revision: 1 })).result).toEqual({
      revision: 2,
    });
    expect(host.document.save).toHaveBeenCalledTimes(1);
    expect(host.document.isDirty).toBe(false);
    expect(await fs.readFile(path.join(root, 'orders.lml'), 'utf8')).toBe(savedMap);
    expect(await fs.readFile(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'), 'utf8')).toBe(metadata);
    await expect(fs.stat(path.join(root, 'orders.lml.metadata.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await host.request('initialize')).result).toEqual(expect.objectContaining({ metadataText: metadata, mapText: savedMap }));
  });

  it('loads legacy adjacent metadata but prefers .vscode metadata after saving', async () => {
    const host = await setup();
    const legacy = '{"functionNodes":[]}';
    const updated = '{"functionNodes":[],"canvasRect":{"width":800,"height":600}}';
    await write('orders.lml.metadata.json', legacy);
    expect((await host.request('initialize')).result).toEqual(expect.objectContaining({ metadataText: legacy }));
    expect(
      (await host.request('saveMapDefinition', { dataMapDefinition: initialMap, mapMetadata: updated, revision: 1 })).error
    ).toBeUndefined();
    expect(await fs.readFile(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'), 'utf8')).toBe(updated);
    expect(await fs.readFile(path.join(root, 'orders.lml.metadata.json'), 'utf8')).toBe(legacy);
    expect((await host.request('initialize')).result).toEqual(expect.objectContaining({ metadataText: updated }));
  });

  it('surfaces invalid or missing metadata, document-save failures and metadata I/O failures', async () => {
    const host = await setup();
    for (const mapMetadata of [undefined, '{invalid', 'null']) {
      expect((await host.request('saveMapDefinition', { dataMapDefinition: 'new', mapMetadata, revision: 1 })).error).toBeDefined();
    }
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    host.document.save.mockResolvedValueOnce(false);
    expect((await host.request('saveMapDefinition', { dataMapDefinition: initialMap, mapMetadata: '{}', revision: 1 })).error).toContain(
      'could not save'
    );
    await expect(fs.stat(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    await fs.mkdir(path.join(root, '.vscode/ordersDataMapMetadata-v2.json'), { recursive: true });
    expect(
      (await host.request('saveMapDefinition', { dataMapDefinition: initialMap, mapMetadata: '{}', revision: 1 })).error
    ).toBeDefined();
  });

  it.each(['saveDraftState', 'saveMapDefinition', 'saveXslt'] as const)(
    'rejects missing and stale revisions for %s without writing',
    async (method) => {
      const host = await setup();
      const params = { dataMapDefinition: 'new', mapMetadata: '{}', xslt: '<new/>' };
      expect((await host.request(method, params)).error).toContain('document changed');
      host.changeDocument('external');
      expect((await host.request(method, { ...params, revision: 1 })).error).toContain('document changed');
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
      expect(await fs.readdir(root)).toEqual(['orders.lml']);
    }
  );

  it('saves only the qualified LML output without changing the map revision or touching BTM output', async () => {
    const host = await setup();
    await write('__generated/orders.btm.xslt', '<btm/>');
    await write('__generated/orders.xslt', '<legacy/>');
    expect((await host.request('saveXslt', { xslt: '<lml/>', revision: 1 })).result).toEqual({ revision: 1 });
    expect(await fs.readFile(path.join(root, '__generated/orders.lml.xslt'), 'utf8')).toBe('<lml/>');
    expect(await fs.readFile(path.join(root, '__generated/orders.btm.xslt'), 'utf8')).toBe('<btm/>');
    expect(await fs.readFile(path.join(root, '__generated/orders.xslt'), 'utf8')).toBe('<legacy/>');
    expect(host.document.version).toBe(1);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it('blocks runtime starts, API calls and writes in an untrusted workspace', async () => {
    const host = await setup();
    Object.assign(vscode.workspace, { isTrusted: false });
    for (const method of [
      'initialize',
      'getFunctionsManifest',
      'getSchemaFile',
      'generateDataMapXslt',
      'saveDraftState',
      'saveMapDefinition',
      'saveXslt',
    ] as const) {
      const response = await host.request(method, { dataMapDefinition: 'new', mapMetadata: '{}', xslt: '<new/>', revision: 1 });
      expect(response.error).toContain('Trust this workspace');
    }
    expect(host.ensureStarted).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(await fs.readdir(root)).toEqual(['orders.lml']);
  });

  it('refreshes recursive schema staging before each schema or generation request and compiles the provided draft', async () => {
    const host = await setup();
    await write('Schemas/nested/source.xsd', '<schema version="first"/>');
    await write('Schemas/target.json', '{}');
    await write('Schemas/unused.xsd', '<schema/>');
    await write('host.json', '{"canonical":true}');
    vi.mocked(fetch).mockImplementation(async (url, options) => {
      if (String(url).includes('/schemas/')) {
        expect(await fs.readFile(path.join(root, 'workflow-designtime/Artifacts/Schemas/nested/source.xsd'), 'utf8')).toBe(
          '<schema version="first"/>'
        );
        return new Response('{"schemaTreeRoot":{}}');
      }
      expect(await fs.readFile(path.join(root, 'workflow-designtime/Artifacts/Schemas/nested/source.xsd'), 'utf8')).toBe(
        '<schema version="second"/>'
      );
      await expect(fs.stat(path.join(root, 'workflow-designtime/Artifacts/Schemas/unused.xsd'))).rejects.toMatchObject({ code: 'ENOENT' });
      expect(JSON.parse(String(options?.body))).toEqual({ MapContent: 'draft supplied by original v2 editor' });
      return new Response('{"xsltContent":"<generated/>"}');
    });
    const schema = await host.request('getSchemaFile', { schemaName: 'source.xsd', schemaFilePath: 'nested/source.xsd' });
    expect(schema.result).toEqual({ schemaTreeRoot: {} });
    const schemaUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(schemaUrl.pathname).toBe('/runtime/webhooks/workflow/api/management/schemas/source/contents/schemaTree');
    expect(schemaUrl.searchParams.get('relativePath')).toBe('nested/');
    await write('Schemas/nested/source.xsd', '<schema version="second"/>');
    const generated = await host.request('generateDataMapXslt', { dataMapDefinition: 'draft supplied by original v2 editor' });
    expect(generated.result).toBe('<generated/>');
    expect(host.ensureStarted).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(path.join(root, 'orders.lml'), 'utf8')).toBe(initialMap);
    expect(await fs.readFile(path.join(root, 'host.json'), 'utf8')).toBe('{"canonical":true}');
    expect(host.document.version).toBe(1);
  });

  it('does not deliver generated output after an external document revision changes', async () => {
    const host = await setup();
    await write('Schemas/nested/source.xsd', '<schema/>');
    await write('Schemas/target.json', '{}');
    vi.mocked(fetch).mockImplementation(async () => {
      host.changeDocument('external edit during generation');
      return new Response('{"xsltContent":"<stale/>"}');
    });
    const response = await host.request('generateDataMapXslt', { dataMapDefinition: initialMap });
    expect(response.error).toContain('document changed');
    expect(response.result).toBeUndefined();
    await expect(fs.stat(path.join(root, '__generated'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('tests the qualified output using a map identifier without the runtime-appended XSLT extension', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    const host = await setup();
    await write('Schemas/nested/source.xsd', '<schema/>');
    await write('Schemas/target.json', '{}');
    await write('__generated/orders.lml.xslt', '<fresh/>');
    vi.mocked(fetch).mockImplementation(async (_url, options) => {
      const mapName = decodeURIComponent(new URL(String(_url)).pathname.split('/').at(-2)!);
      expect(mapName).toBe('orders.lml');
      expect(await fs.readFile(path.join(root, 'workflow-designtime/Artifacts/Maps', `${mapName}.xslt`), 'utf8')).toBe('<fresh/>');
      expect(JSON.parse(String(options?.body))).toEqual({
        InputInstanceMessage: { '$content-type': 'application/xml', $content: Buffer.from('<input/>').toString('base64') },
      });
      return new Response(
        JSON.stringify({ outputInstance: { '$content-type': 'application/xml', $content: Buffer.from('<output/>').toString('base64') } })
      );
    });
    const response = await host.request('testDataMap', { dataMapXsltFilename: 'orders.lml.xslt', schemaInputValue: '<input/>' });
    expect(response.result).toEqual({
      statusCode: 200,
      statusText: '',
      outputInstance: { '$content-type': 'application/xml', $content: '<output/>' },
    });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/maps/orders.lml/testMap?api-version=2019-10-01-edge-preview');
    for (const dataMapXsltFilename of ['orders.btm.xslt', 'orders.xslt', '../other.lml.xslt', 'http://elsewhere/']) {
      expect((await host.request('testDataMap', { dataMapXsltFilename, schemaInputValue: '' })).error).toContain('only run');
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('disables Test Map on non-Windows without starting a runtime', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    const host = await setup();
    expect(((await host.request('initialize')).result as LmlEditorInitialState).isTestDisabledForOS).toBe(true);
    expect((await host.request('testDataMap', { dataMapXsltFilename: 'orders.lml.xslt', schemaInputValue: '' })).error).toContain(
      'only on Windows'
    );
    expect(host.ensureStarted).not.toHaveBeenCalled();
  });

  it.each(['../outside.xsd', 'nested/../../outside.xsd', 'https://example.com/source.xsd', 'C:\\outside.xsd'])(
    'rejects unsafe schema path %s',
    async (schemaFilePath) => {
      const host = await setup();
      const schemaName = path.posix.basename(schemaFilePath.replace(/\\/g, '/'));
      expect((await host.request('getSchemaFile', { schemaName, schemaFilePath })).error).toBeDefined();
      expect(host.ensureStarted).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('rejects linked schema/output directories and hard-linked metadata before writes', async () => {
    const host = await setup();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'lml-host-outside-'));
    try {
      for (const folder of ['Schemas', '__generated']) {
        await fs.symlink(outside, path.join(root, folder), process.platform === 'win32' ? 'junction' : 'dir');
      }
      expect((await host.request('readSchemas')).error).toContain('linked');
      expect((await host.request('saveXslt', { xslt: '<new/>', revision: 1 })).error).toContain('linked');
      expect(await fs.readdir(outside)).toEqual([]);
      await write('original.json', '{}');
      await fs.mkdir(path.join(root, '.vscode'), { recursive: true });
      await fs.link(path.join(root, 'original.json'), path.join(root, '.vscode/ordersDataMapMetadata-v2.json'));
      expect((await host.request('saveMapDefinition', { dataMapDefinition: 'changed', mapMetadata: '{}', revision: 1 })).error).toContain(
        'linked'
      );
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
      expect(await fs.readFile(path.join(root, 'original.json'), 'utf8')).toBe('{}');
    } finally {
      await fs.rm(outside, { force: true, recursive: true });
    }
  });

  it('selects only existing project schemas, returns the v2 SchemaFile shape, and handles cancellation', async () => {
    const host = await setup();
    await write('Schemas/nested/source.xsd', '<schema/>');
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce('nested/source.xsd' as never);
    expect((await host.request('selectSchema', { schemaType: 'source' })).result).toEqual({
      name: 'source.xsd',
      path: 'nested/source.xsd',
      type: 'source',
    });
    expect((await host.request('selectSchema', { schemaType: 'target' })).result).toBeUndefined();
    expect((await host.request('selectSchema', { schemaType: 'invalid' })).error).toBeDefined();
    expect(host.ensureStarted).not.toHaveBeenCalled();
  });

  it('routes notifications and reports unsupported RPC instead of hiding errors', async () => {
    const host = await setup();
    await host.request('notify', { title: 'Map', text: 'Compilation failed', level: 2 });
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Map: Compilation failed');
    expect((await host.request('unexpected' as LmlEditorMethod)).error).toContain('Unsupported');
  });

  it('registers the dedicated editor and forwards commands only to an active, visible owned panel', async () => {
    const host = await setup();
    expect(await LmlEditorProvider.executeActiveEditorCommand('compile')).toBe(true);
    expect(host.postMessage).toHaveBeenLastCalledWith({ type: 'lmlCommand', command: 'compile' });
    host.panel.active = false;
    expect(await LmlEditorProvider.executeActiveEditorCommand('test')).toBe(false);
    host.panel.active = true;
    host.panel.visible = false;
    expect(await LmlEditorProvider.executeActiveEditorCommand('test')).toBe(false);
    host.panel.visible = true;
    host.onDidDispose.mock.calls[0][0]();
    expect(await LmlEditorProvider.executeActiveEditorCommand('test')).toBe(false);
    const registration = LmlEditorProvider.register(host.context, { ensureStarted: host.ensureStarted } as never);
    expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
      'biztalkDataMapper.lmlEditor',
      expect.any(LmlEditorProvider),
      expect.any(Object)
    );
    registration.dispose();
  });
});

describe('LML v2 runtime client', () => {
  it('checks authorization at the fetch boundary and rejects unsafe endpoint identifiers', async () => {
    const authorize = vi.fn(() => {
      throw new Error('Workspace trust was revoked');
    });
    await expect(new LmlRuntimeClient('http://127.0.0.1:8000', authorize).getFunctionsManifest()).rejects.toThrow('trust was revoked');
    const client = new LmlRuntimeClient('http://127.0.0.1:8000');
    await expect(client.getSchemaFile('..xsd', '..xsd')).rejects.toThrow('local filenames');
    await expect(client.testDataMap('../other.lml.xslt', '')).rejects.toThrow('local filenames');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['connection', 'body'])('aborts a stalled %s within the request deadline', async (phase) => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_url, options) => {
      if (phase === 'connection') {
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('deadline aborted')), { once: true });
        });
      }
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              options?.signal?.addEventListener('abort', () => controller.error(new Error('deadline aborted')), { once: true });
            },
          })
        )
      );
    });
    const result = new LmlRuntimeClient('http://127.0.0.1:8000').getFunctionsManifest().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30000);
    expect(await result).toEqual(expect.objectContaining({ message: 'deadline aborted' }));
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it.each(['https://example.com', 'http://localhost:8000', 'http://127.0.0.1:8000/untrusted', 'http://user:secret@127.0.0.1:8000'])(
    'rejects non-owned runtime URL %s',
    (url) => {
      expect(() => new LmlRuntimeClient(url)).toThrow('owned loopback');
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('uses the v2 manifest headers, forbids redirects and sets an abort deadline', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"functions":[]}'));
    expect(await new LmlRuntimeClient('http://127.0.0.1:8000').getFunctionsManifest()).toEqual({ functions: [] });
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/runtime/webhooks/workflow/api/management/mapTransformations?api-version=2019-10-01-edge-preview',
      expect.objectContaining({
        method: 'GET',
        redirect: 'error',
        signal: expect.any(AbortSignal),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-version': '2019-10-01-edge-preview' },
      })
    );
  });

  it('surfaces v2 service errors, test failures and malformed successful responses', async () => {
    const client = new LmlRuntimeClient('http://127.0.0.1:8000');
    const error = JSON.stringify({ error: { code: 'InvalidMap', message: 'Compilation failed' } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(error, { status: 400 }));
    await expect(client.generateDataMapXslt('invalid')).rejects.toThrow('400 - InvalidMap: Compilation failed');
    vi.mocked(fetch).mockResolvedValueOnce(new Response(error, { status: 400 }));
    expect(await client.testDataMap('orders.lml.xslt', '')).toEqual({
      statusCode: 400,
      statusText: '400 - InvalidMap: Compilation failed',
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}'));
    await expect(client.generateDataMapXslt('map')).rejects.toThrow('xsltContent');
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}'));
    await expect(client.testDataMap('orders.lml.xslt', '')).rejects.toThrow('output instance');
    vi.mocked(fetch).mockResolvedValueOnce(new Response('invalid json'));
    await expect(client.getFunctionsManifest()).rejects.toThrow('invalid JSON');
  });

  it('bounds response body size and aborts the request when exceeded', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('x'.repeat(16 * 1024 * 1024 + 1)));
    await expect(new LmlRuntimeClient('http://127.0.0.1:8000').getFunctionsManifest()).rejects.toThrow('exceeded 16 MiB');
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
