import { describe, test, expect, beforeEach, afterEach, vi, type Mocked } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { CompilerWorkerClient } from '../src/worker/compilerWorkerClient';
import { disposeDataMapperLogger } from '../src/logger';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';

// ESM namespace exports can't be spied on, so the two fs functions the provider writes/reads are wrapped here and default to the real ones.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, default: actual, writeFileSync: vi.fn(actual.writeFileSync), readFileSync: vi.fn(actual.readFileSync) };
});
vi.mock('../src/worker/compilerWorkerClient', () => ({
  CompilerWorkerClient: vi.fn(() => ({ compileMap: vi.fn(), testMap: vi.fn() })),
}));
vi.mock('vscode', async () => {
  const base = await vi.importActual<typeof import('vscode')>('vscode');
  return {
    ...base,
    ViewColumn: { Beside: 2 },
    window: { ...base.window, showTextDocument: vi.fn() },
    workspace: {
      ...base.workspace,
      openTextDocument: vi.fn(),
      onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
});

async function setup() {
  const serializer = new BtmSerializer();
  const map = serializer.createNew('', '', 'Private map name');
  const uri = Object.assign(vscode.Uri.file('private.btm'), { with: () => vscode.Uri.file('private.xslt') });
  const document: vscode.TextDocument = {
    uri,
    version: 1,
    lineCount: 1,
    getText: () => serializer.serialize(map),
    fileName: 'private.btm',
    isUntitled: false,
    languageId: 'xml',
    encoding: 'utf8',
    isDirty: false,
    isClosed: false,
    eol: 1,
    save: async () => true,
    lineAt: vi.fn(),
    offsetAt: vi.fn(),
    positionAt: vi.fn(),
    getWordRangeAtPosition: vi.fn(),
    validateRange: vi.fn(),
    validatePosition: vi.fn(),
  };
  vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(document);
  const onDidReceiveMessage = vi.fn();
  const postMessage = vi.fn().mockResolvedValue(true);
  const panel = {
    webview: { options: {}, html: '', cspSource: '', onDidReceiveMessage, postMessage, asWebviewUri: () => vscode.Uri.file('script') },
    onDidDispose: vi.fn(),
  };
  const provider = new MapEditorProvider({ extensionUri: vscode.Uri.file('.') } as vscode.ExtensionContext);
  await provider.resolveCustomTextEditor(document, panel as unknown as vscode.WebviewPanel, {} as vscode.CancellationToken);
  const worker = vi.mocked(CompilerWorkerClient).mock.results.at(-1)?.value as Mocked<CompilerWorkerClient>;
  return { map, worker, postMessage, submit: (message: unknown) => onDidReceiveMessage.mock.calls[0][0](message) };
}

const logs = () =>
  JSON.stringify([
    ...outputChannel.info.mock.calls,
    ...outputChannel.warn.mock.calls,
    ...outputChannel.error.mock.calls,
    ...outputChannel.debug.mock.calls,
  ]);

describe('map compilation and Test Map logging', () => {
  beforeEach(() => {
    disposeDataMapperLogger();
    vi.clearAllMocks();
    mockWindow.createOutputChannel.mockReturnValue(outputChannel);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    disposeDataMapperLogger();
  });

  test('logs compiler diagnostics and opens the one shared channel without recording content', async () => {
    const host = await setup();
    host.worker.compileMap.mockResolvedValue({
      success: false,
      errors: [{ message: 'secret payload' }],
      warnings: [],
    });
    await host.submit({ type: 'compile', data: host.map });
    expect(outputChannel.show).toHaveBeenCalledWith(true);
    expect(outputChannel.error).toHaveBeenCalledWith(expect.stringContaining('1 errors, 0 warnings'));
    expect(logs()).toContain('Compilation: sending map to compiler worker');
    expect(logs()).not.toContain('secret payload');
    expect(logs()).not.toContain('Private map name');
    expect(host.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'compileResult' }));
  });

  test.each([true, false])('logs every compilation warning with its available location (success: %s)', async (success) => {
    const host = await setup();
    const warnings = [
      {
        message: '[Page 1] Looping has no output links and is not compiled',
        elementId: '3',
        pageId: 'page1',
        pageName: 'Page 1',
      },
      {
        message: "Target 'OrderForm' has multiple source loop paths; their common source ancestor will be used",
        elementId: '/Basket/OrderForms/OrderForm',
      },
      { message: 'Warning without a location' },
    ];
    const result = { success, errors: success ? [] : [{ message: 'private-error' }], warnings, xslt: '<stylesheet/>' };
    host.worker.compileMap.mockResolvedValue(result);

    await host.submit({ type: 'compile', data: host.map });

    for (const [index, warning] of warnings.entries()) {
      expect(outputChannel.warn).toHaveBeenCalledWith(`Compilation warning ${index + 1}/${warnings.length}: ${JSON.stringify(warning)}`);
    }
    expect(outputChannel.warn).toHaveBeenCalledTimes(warnings.length + (success ? 1 : 0));
    expect(logs()).not.toContain('private-error');
    expect(host.postMessage).toHaveBeenLastCalledWith({ type: 'compileResult', data: result });
  });

  test('logs transformation, saves and completion without XML or XSLT contents', async () => {
    const host = await setup();
    const warning = { message: 'Looping has no output links and is not compiled', elementId: '3' };
    host.worker.compileMap.mockResolvedValue({
      success: true,
      errors: [],
      warnings: [warning],
      xslt: '<stylesheet>private-script</stylesheet>',
    });
    host.worker.testMap.mockResolvedValue({ outputXml: '<Root>private-output</Root>', diagnostics: [] });
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('<stylesheet>private-script</stylesheet>');
    await host.submit({ type: 'testMapWithInput', data: { map: host.map, inputXml: '<Root>private-input</Root>' } });
    expect(logs()).toContain('parsing input XML');
    expect(logs()).toContain('compiled XSLT saved');
    expect(logs()).toContain('.NET transformation completed');
    expect(logs()).toContain('output XML saved');
    expect(logs()).toContain('Test Map succeeded');
    expect(logs()).not.toMatch(/private-input|private-output|private-script/);
    expect(outputChannel.warn).toHaveBeenCalledWith(`Compilation warning 1/1: ${JSON.stringify(warning)}`);
    expect(outputChannel.show).toHaveBeenCalledWith(true);
    expect(host.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'testMapResult' }));
  });

  test('logs and reports save failures that happen before transformation', async () => {
    const host = await setup();
    host.worker.compileMap.mockResolvedValue({ success: true, errors: [], warnings: [], xslt: '<stylesheet/>' });
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw Object.assign(new Error('private-path'), { code: 'EACCES' });
    });
    await host.submit({ type: 'testMapWithInput', data: { map: host.map, inputXml: '<Root/>' } });
    expect(logs()).toContain('EACCES');
    expect(logs()).not.toContain('private-path');
    expect(logs()).not.toContain('Test Map succeeded');
    expect(host.worker.testMap).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith({
      type: 'testMapResult',
      data: { output: '', error: 'private-path' },
    });
  });

  test('logs missing input rather than starting compilation', async () => {
    const host = await setup();
    await host.submit({ type: 'testMapWithInput', data: { map: host.map, inputXml: '' } });
    expect(outputChannel.warn).toHaveBeenCalledWith(expect.stringContaining('no input XML'));
    expect(host.worker.compileMap).not.toHaveBeenCalled();
  });
});
