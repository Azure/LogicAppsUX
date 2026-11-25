import { describe, test, expect, beforeEach, afterEach, vi, type Mocked } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as disk from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { CompilerWorkerClient } from '../src/worker/compilerWorkerClient';
import { disposeDataMapperLogger } from '../src/logger';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';

// ESM namespace exports can't be spied on, so the two fs functions the provider writes/reads are wrapped here and default to the real ones.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return { ...actual, default: actual, writeFileSync: vi.fn(actual.writeFileSync), readFileSync: vi.fn(actual.readFileSync) };
});
vi.mock('../src/worker/compilerWorkerClient', () => ({
  CompilerWorkerClient: vi.fn(() => ({ compileMap: vi.fn(), testMap: vi.fn() })),
}));
vi.mock('vscode', async () => {
  const base = await vi.importActual<typeof vscode>('vscode');
  return {
    ...base,
    Position: class {
      constructor(
        public readonly line: number,
        public readonly character: number
      ) {}
    },
    Range: class {
      readonly start: vscode.Position;
      readonly end: vscode.Position;

      constructor(start: vscode.Position | number, end: vscode.Position | number, endLine?: number, endCharacter?: number) {
        if (typeof start === 'number' && typeof end === 'number') {
          this.start = { line: start, character: end } as vscode.Position;
          this.end = { line: endLine, character: endCharacter } as vscode.Position;
        } else {
          this.start = start as vscode.Position;
          this.end = end as vscode.Position;
        }
      }
    },
    EndOfLine: { LF: 1, CRLF: 2 },
    TextEdit: {
      replace: (range: vscode.Range, newText: string) => ({ range, newText }),
      setEndOfLine: (newEol: vscode.EndOfLine) => ({ newEol }),
    },
    WorkspaceEdit: class {
      readonly replacements: Replacement[] = [];

      replace(uri: vscode.Uri, range: vscode.Range, newText: string) {
        this.replacements.push({ uri, range, newText });
      }

      set(uri: vscode.Uri, edits: { range?: vscode.Range; newText?: string; newEol?: vscode.EndOfLine }[]) {
        const newEol = edits.find((edit) => edit.newEol !== undefined)?.newEol;
        for (const edit of edits) {
          if (edit.range && edit.newText !== undefined) {
            this.replacements.push({ uri, range: edit.range, newText: edit.newText, newEol });
          }
        }
      }
    },
    ViewColumn: { Beside: 2 },
    window: { ...base.window, showTextDocument: vi.fn() },
    workspace: {
      ...base.workspace,
      textDocuments: [] as vscode.TextDocument[],
      applyEdit: vi.fn(),
      openTextDocument: vi.fn(),
      onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
});

type Replacement = { uri: vscode.Uri; range: vscode.Range; newText: string; newEol?: vscode.EndOfLine };

async function setup(mapPath = 'private.btm') {
  const serializer = new BtmSerializer();
  const map = serializer.createNew('', '', 'Private map name');
  const uri = Object.assign(vscode.Uri.file(mapPath), { with: () => vscode.Uri.file(mapPath.replace(/\.btm$/, '.xslt')) });
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
  return { document, map, worker, postMessage, submit: (message: unknown) => onDidReceiveMessage.mock.calls[0][0](message) };
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
    (vscode.workspace.textDocuments as vscode.TextDocument[]).length = 0;
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

  type EditOutcome = 'accept' | 'return-false' | 'throw';
  type EditableDocument = vscode.TextDocument & {
    applyReplacement: (range: vscode.Range, newText: string, newEol?: vscode.EndOfLine) => void;
  };

  const previousOutput = '<Previous>last saved output</Previous>\n';
  const unsavedOutput = '<Previous>\r\n  <Draft>unsaved 😀</Draft>\r\n</Previous>\r\n<!-- unsaved tail -->';
  const transformedOutput = '<Result>new café 😀</Result>';
  const formattedOutput = `<?xml version="1.0" encoding="utf-8"?>\n${transformedOutput}\n`;
  let outputRoot: string;

  // Keep the editor buffer separate from the file: an external write must not
  // magically update a dirty VS Code document, and an edit is not persisted until save.
  function editableDocument(
    uri: vscode.Uri,
    filePath: string,
    initialText: string,
    initiallyDirty: boolean,
    saveOutcome: EditOutcome = 'accept'
  ) {
    let text = initialText;
    let dirty = initiallyDirty;
    let version = 1;
    let eol = initialText.includes('\r\n') ? '\r\n' : '\n';
    const parts = () => text.split(/(\r\n|\r|\n)/);
    const offsetAt = (position: vscode.Position) => {
      const lines = parts();
      const line = Math.max(0, Math.min(position.line, (lines.length - 1) / 2));
      let offset = 0;
      for (let index = 0; index < line; index++) {
        offset += lines[index * 2].length + lines[index * 2 + 1].length;
      }
      return offset + Math.max(0, Math.min(position.character, lines[line * 2].length));
    };
    const positionAt = (offset: number) => {
      const prefix = text.slice(0, Math.max(0, Math.min(offset, text.length)));
      const lines = prefix.split(/\r\n|\r|\n/);
      return new vscode.Position(lines.length - 1, lines.at(-1)?.length ?? 0);
    };
    const document = {
      uri,
      fileName: uri.fsPath,
      isClosed: false,
      isUntitled: uri.scheme === 'untitled',
      get isDirty() {
        return dirty;
      },
      get version() {
        return version;
      },
      get lineCount() {
        return (parts().length + 1) / 2;
      },
      getText: (range?: vscode.Range) => (range ? text.slice(offsetAt(range.start), offsetAt(range.end)) : text),
      positionAt,
      offsetAt,
      lineAt: (lineOrPosition: number | vscode.Position) => {
        const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
        const lines = parts();
        const lineText = lines[line * 2];
        if (lineText === undefined) {
          throw new RangeError('Line is outside the document');
        }
        const start = new vscode.Position(line, 0);
        const end = new vscode.Position(line, lineText.length);
        const followingLine = lines[line * 2 + 1] ? new vscode.Position(line + 1, 0) : end;
        const firstNonWhitespace = lineText.search(/\S/);
        return {
          lineNumber: line,
          text: lineText,
          range: new vscode.Range(start, end),
          rangeIncludingLineBreak: new vscode.Range(start, followingLine),
          firstNonWhitespaceCharacterIndex: firstNonWhitespace === -1 ? lineText.length : firstNonWhitespace,
          isEmptyOrWhitespace: firstNonWhitespace === -1,
        };
      },
      applyReplacement: (range: vscode.Range, newText: string, newEol?: vscode.EndOfLine) => {
        const start = offsetAt(range.start);
        const end = offsetAt(range.end);
        text = `${text.slice(0, start)}${newText.replace(/\r\n|\r|\n/g, eol)}${text.slice(end)}`;
        if (newEol !== undefined) {
          eol = newEol === vscode.EndOfLine.LF ? '\n' : '\r\n';
          text = text.replace(/\r\n|\r|\n/g, eol);
        }
        dirty = true;
        version++;
      },
      save: vi.fn(async () => {
        if (saveOutcome === 'throw') {
          throw new Error('Document save was rejected');
        }
        if (saveOutcome === 'return-false') {
          return false;
        }
        await disk.writeFile(filePath, text, 'utf8');
        dirty = false;
        return true;
      }),
    };
    return document as unknown as EditableDocument;
  }

  function sameResource(left: vscode.Uri, right: vscode.Uri) {
    if (left.scheme !== right.scheme) {
      return false;
    }
    if (left.scheme !== 'file') {
      return left.toString() === right.toString();
    }
    const leftPath = path.resolve(left.fsPath);
    const rightPath = path.resolve(right.fsPath);
    return process.platform === 'win32' ? leftPath.toLowerCase() === rightPath.toLowerCase() : leftPath === rightPath;
  }

  function configureWorkspaceEdit(outcome: EditOutcome) {
    vi.mocked(vscode.workspace.applyEdit).mockImplementation(async (edit) => {
      if (outcome === 'throw') {
        throw new Error('Workspace edit was rejected');
      }
      if (outcome === 'return-false') {
        return false;
      }
      const replacements = (edit as unknown as { replacements: Replacement[] }).replacements;
      const pending = replacements.map((replacement) => ({
        ...replacement,
        document: vscode.workspace.textDocuments.find((candidate) => sameResource(candidate.uri, replacement.uri)),
      }));
      if (pending.some(({ document }) => !document || !('applyReplacement' in document))) {
        return false;
      }
      for (const replacement of pending) {
        (replacement.document as EditableDocument).applyReplacement(replacement.range, replacement.newText, replacement.newEol);
      }
      return true;
    });
  }

  async function prepareOutputTest() {
    const host = await setup(path.join(outputRoot, 'private.btm'));
    const outputPath = path.join(outputRoot, '__generated', 'private_output.xml');
    await disk.mkdir(path.dirname(outputPath), { recursive: true });
    host.worker.compileMap.mockResolvedValue({ success: true, errors: [], warnings: [], xslt: '<stylesheet/>' });
    host.worker.testMap.mockResolvedValue({ outputXml: transformedOutput, diagnostics: [] });
    return {
      host,
      outputPath,
      submit: () => host.submit({ type: 'testMapWithInput', data: { map: host.map, inputXml: '<Root/>' } }),
    };
  }

  function resultOf(host: Awaited<ReturnType<typeof setup>>) {
    const results = host.postMessage.mock.calls
      .map(([message]) => message as { type: string; data: { output: string; error?: string } })
      .filter((message) => message.type === 'testMapResult');
    expect(results).toHaveLength(1);
    return results[0].data;
  }

  function expectSuccess(host: Awaited<ReturnType<typeof setup>>, outputPath: string) {
    const result = resultOf(host);
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('Output saved: private_output.xml');
    expect(result.output).toContain(formattedOutput);
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Test Map succeeded. Output: private_output.xml');
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
      expect.objectContaining({ scheme: 'file', fsPath: outputPath }),
      expect.objectContaining({ viewColumn: vscode.ViewColumn.Beside })
    );
  }

  function expectOutputSaveFailure(host: Awaited<ReturnType<typeof setup>>) {
    const result = resultOf(host);
    expect(result.output).toBe('');
    expect(result.error).toMatch(/output.*sav/i);
    expect(result.error).not.toMatch(/XSLT transformation failed/i);
    expect(mockWindow.showInformationMessage).not.toHaveBeenCalledWith(expect.stringContaining('Test Map succeeded'));
    expect(logs()).not.toContain('Test Map succeeded');
  }

  describe('Test Map output files', () => {
    beforeEach(async () => {
      disposeDataMapperLogger();
      vi.resetAllMocks();
      (vscode.workspace.textDocuments as vscode.TextDocument[]).length = 0;
      mockWindow.createOutputChannel.mockReturnValue(outputChannel);
      const actualFs = await vi.importActual<typeof fs>('fs');
      vi.mocked(fs.writeFileSync).mockImplementation(actualFs.writeFileSync);
      vi.mocked(fs.readFileSync).mockImplementation(actualFs.readFileSync);
      vi.mocked(vscode.workspace.fs.createDirectory).mockImplementation(async (uri) => {
        await disk.mkdir(uri.fsPath, { recursive: true });
      });
      configureWorkspaceEdit('accept');
      outputRoot = await disk.realpath(await disk.mkdtemp(path.join(os.tmpdir(), 'btm-test-map-output-')));
    });

    afterEach(async () => {
      (vscode.workspace.textDocuments as vscode.TextDocument[]).length = 0;
      vi.restoreAllMocks();
      disposeDataMapperLogger();
      await disk.rm(outputRoot, { recursive: true, force: true });
    });

    test.each(['dirty', 'clean'] as const)('replaces and saves an open %s output without changing other documents', async (state) => {
      const { host, outputPath, submit } = await prepareOutputTest();
      const otherPath = path.join(path.dirname(outputPath), 'other_output.xml');
      await disk.writeFile(outputPath, previousOutput, 'utf8');
      await disk.writeFile(otherPath, 'other saved output', 'utf8');
      const initialText = state === 'dirty' ? unsavedOutput : previousOutput;
      const output = editableDocument(vscode.Uri.file(outputPath), outputPath, initialText, state === 'dirty');
      const other = editableDocument(vscode.Uri.file(otherPath), otherPath, 'other unsaved edits', true);
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document, other, output);

      expect(output.getText()).toBe(initialText);
      expect(output.isDirty).toBe(state === 'dirty');
      expect(await disk.readFile(outputPath, 'utf8')).toBe(previousOutput);
      await submit();

      expect(output.getText()).toBe(formattedOutput);
      expect(output.isDirty).toBe(false);
      expect(await disk.readFile(outputPath, 'utf8')).toBe(formattedOutput);
      expect(other.getText()).toBe('other unsaved edits');
      expect(other.isDirty).toBe(true);
      expect(await disk.readFile(otherPath, 'utf8')).toBe('other saved output');
      expectSuccess(host, outputPath);
    });

    async function checkOpenPathAlias(alias: (outputPath: string) => string) {
      const { host, outputPath, submit } = await prepareOutputTest();
      await disk.writeFile(outputPath, previousOutput, 'utf8');
      const output = editableDocument(vscode.Uri.file(alias(outputPath)), outputPath, unsavedOutput, true);
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document, output);

      await submit();

      expect(output.getText()).toBe(formattedOutput);
      expect(output.isDirty).toBe(false);
      expect(await disk.readFile(outputPath, 'utf8')).toBe(formattedOutput);
      expectSuccess(host, outputPath);
    }

    test('matches an open file URI after normalizing its path', async () => {
      await checkOpenPathAlias(
        (outputPath) => `${path.dirname(outputPath)}${path.sep}..${path.sep}__generated${path.sep}${path.basename(outputPath)}`
      );
    });

    test.runIf(process.platform === 'win32')('matches file paths case-insensitively on Windows', async () => {
      await checkOpenPathAlias((outputPath) => path.join(path.dirname(outputPath), 'PRIVATE_OUTPUT.XML'));
    });

    test.each(['existing', 'missing'] as const)('writes a %s closed output file', async (state) => {
      const { host, outputPath, submit } = await prepareOutputTest();
      if (state === 'existing') {
        await disk.writeFile(outputPath, previousOutput, 'utf8');
      } else {
        await expect(disk.stat(outputPath)).rejects.toMatchObject({ code: 'ENOENT' });
      }
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document);

      await submit();

      expect(await disk.readFile(outputPath, 'utf8')).toBe(formattedOutput);
      expectSuccess(host, outputPath);
    });

    test('does not replace an unrelated non-file document with the same path', async () => {
      const { host, outputPath, submit } = await prepareOutputTest();
      await disk.writeFile(outputPath, previousOutput, 'utf8');
      const untitledUri = vscode.Uri.parse(`untitled:${outputPath.replace(/\\/g, '/')}`);
      const unrelated = editableDocument(untitledUri, outputPath, 'untitled unsaved edits', true);
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document, unrelated);

      await submit();

      expect(unrelated.getText()).toBe('untitled unsaved edits');
      expect(unrelated.isDirty).toBe(true);
      expect(await disk.readFile(outputPath, 'utf8')).toBe(formattedOutput);
      expectSuccess(host, outputPath);
    });

    test.each([
      ['edit returns false', 'return-false', 'accept', false],
      ['edit rejects', 'throw', 'accept', false],
      ['save returns false', 'accept', 'return-false', true],
      ['save rejects', 'accept', 'throw', true],
    ] as const)('reports an output-save failure when %s', async (_description, editOutcome, saveOutcome, wasEdited) => {
      const { host, outputPath, submit } = await prepareOutputTest();
      await disk.writeFile(outputPath, previousOutput, 'utf8');
      const output = editableDocument(vscode.Uri.file(outputPath), outputPath, unsavedOutput, true, saveOutcome);
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document, output);
      configureWorkspaceEdit(editOutcome);

      await submit();

      expect(output.getText()).toBe(wasEdited ? formattedOutput : unsavedOutput);
      expect(output.isDirty).toBe(true);
      expect(await disk.readFile(outputPath, 'utf8')).toBe(previousOutput);
      expectOutputSaveFailure(host);
    });

    test('reports an output-save failure when writing a closed output fails', async () => {
      const { host, outputPath, submit } = await prepareOutputTest();
      await disk.writeFile(outputPath, previousOutput, 'utf8');
      (vscode.workspace.textDocuments as vscode.TextDocument[]).push(host.document);
      const actualFs = await vi.importActual<typeof fs>('fs');
      vi.mocked(fs.writeFileSync).mockImplementation((file, data, options) => {
        if (typeof file === 'string' && path.resolve(file) === outputPath) {
          throw Object.assign(new Error('Output disk is full'), { code: 'ENOSPC' });
        }
        actualFs.writeFileSync(file, data, options);
      });

      await submit();

      expect(await disk.readFile(outputPath, 'utf8')).toBe(previousOutput);
      expectOutputSaveFailure(host);
    });
  });

  test('logs missing input rather than starting compilation', async () => {
    const host = await setup();
    await host.submit({ type: 'testMapWithInput', data: { map: host.map, inputXml: '' } });
    expect(outputChannel.warn).toHaveBeenCalledWith(expect.stringContaining('no input XML'));
    expect(host.worker.compileMap).not.toHaveBeenCalled();
  });
});
