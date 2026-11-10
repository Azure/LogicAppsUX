import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { afterEach, beforeEach, describe, expect, test, vi, type Mocked } from 'vitest';
import * as vscode from 'vscode';
import { create } from 'xmlbuilder2';
import { XsltCompiler, type CompileResult } from '../src/compiler/xsltCompiler';
import { disposeDataMapperLogger } from '../src/logger';
import { MapEditorProvider } from '../src/mapEditorProvider';
import type { MapDocument } from '../src/model';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { CompilerWorkerClient, type WorkerCompileMapRequest } from '../src/worker/compilerWorkerClient';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';
import { learningPathDirectory as fixtureRoot } from './e2etests/fixtures/learningPathCorpus.cjs';

vi.mock('../src/worker/compilerWorkerClient', () => ({
  CompilerWorkerClient: vi.fn(() => ({ compileMap: vi.fn(), testMap: vi.fn() })),
}));
vi.mock('vscode', async () => {
  const base = await vi.importActual<typeof vscode>('./__mocks__/vscode');
  return {
    ...base,
    ViewColumn: { Beside: 2 },
    window: { ...base.window, showTextDocument: vi.fn() },
    workspace: { ...base.workspace, openTextDocument: vi.fn() },
  };
});

const helperPath = path.resolve(
  __dirname,
  '../tools/compiler-worker/runtime/win-x64/framework-transform/BizTalk.DataMapper.FrameworkTransform.exe'
);
const testDotNet = process.platform === 'win32' && existsSync(helperPath) ? test : test.skip;
const serializer = new BtmSerializer();
const declaration = '<?xml version="1.0" encoding="utf-8"?>';
const namespace = 'http://www.w3.org/1999/XSL/Transform';
const literal = 'café 漢字 — encoding="UTF-16" and encoding=\'iso-8859-1\'';
const processingInstruction = '<?xml-stylesheet type="text/xsl" href="display.xsl" encoding="UTF-16"?>';
const body = `${processingInstruction}<xsl:stylesheet xmlns:xsl="${namespace}" version="1.0"><xsl:output method="xml" encoding='UTF-16'/><xsl:template match="/"><result>${literal}</result></xsl:template></xsl:stylesheet>`;
const extensionBody =
  '<ExtensionObjects><ExtensionObject Namespace="urn:café" AssemblyName="Example" ClassName="漢字" /></ExtensionObjects>';
const fixtures = [
  {
    caseId: '053',
    file: 'Content-Filter-Pattern-Data-Cleaning-Pattern/BizTalkMapperContentFilterPattern/RemoveDuplicates/LastRequest/XSLTFiles/mapUsingExternalXSLTFileAndTemplates.xsl',
    input:
      '<ns0:ApplicationForms xmlns:ns0="http://BizTalkMapperContentFilterPattern.ApplicationForms"><Form><FullName>Ada</FullName><RequestDate>2024-01-01</RequestDate></Form><Form><FullName>Ada</FullName><RequestDate>2024-02-01</RequestDate></Form></ns0:ApplicationForms>',
    root: 'ApplicationForms',
    resultElement: 'RequestDate',
    expected: '2024-02-01',
  },
  {
    caseId: '060',
    file: 'External-Custom-XSLT-vs-BizTalk-Mapper/ExternalCustomXSLTvsBizTalkMapper/XSLTResources/MapWithExternalXSLT-XSLTFile.xsl',
    input:
      '<s0:Order xmlns:s0="http://ExternalCustomXSLTvsBizTalkMapper.Order"><Orderheader><OrderNumber>order-060</OrderNumber></Orderheader></s0:Order>',
    root: 'SAPOrder',
    resultElement: 'OrderId',
    expected: 'order-060',
  },
  {
    caseId: '149',
    file: 'Working-With-Nillable-Values/WorkingWithNillableValues/MapNillValuesWithCustomXSLT.xsl',
    input:
      '<s0:InputSchema xmlns:s0="http://WorkingWithNillableValues.InputSchema"><NillValue>café</NillValue><AnotherNilValue>漢字</AnotherNilValue></s0:InputSchema>',
    root: 'OutputSchema',
    resultElement: 'AnotherNilValueOutput',
    expected: '漢字',
  },
] as const;

let root: string;
let disposeEditor: (() => void) | undefined;

function encoded(text: string, encoding: 'utf16le' | 'utf16be' | 'utf8'): Buffer {
  if (encoding === 'utf8') {
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);
  }
  const bytes = Buffer.from(text, 'utf16le');
  return encoding === 'utf16le'
    ? Buffer.concat([Buffer.from([0xff, 0xfe]), bytes])
    : Buffer.concat([Buffer.from([0xfe, 0xff]), bytes.swap16()]);
}

function uri(filePath: string): vscode.Uri {
  return Object.assign(vscode.Uri.file(filePath), {
    with: (change: { path: string }) => uri(change.path),
  });
}

async function setup(overrides: Partial<MapDocument> = {}) {
  const map = { ...serializer.createNew('', '', 'encoding'), ...overrides };
  const document = {
    uri: uri(path.join(root, 'encoding.btm')),
    version: 1,
    lineCount: 1,
    getText: () => serializer.serialize(map),
  } as vscode.TextDocument;
  const onDidReceiveMessage = vi.fn();
  const onDidDispose = vi.fn();
  const postMessage = vi.fn().mockResolvedValue(true);
  const panel = {
    webview: {
      options: {},
      html: '',
      cspSource: '',
      onDidReceiveMessage,
      postMessage,
      asWebviewUri: () => vscode.Uri.file('script'),
    },
    onDidDispose,
  } as unknown as vscode.WebviewPanel;
  const provider = new MapEditorProvider({ extensionUri: vscode.Uri.file('.') } as vscode.ExtensionContext);
  const worker = vi.mocked(CompilerWorkerClient).mock.results.at(-1)?.value as Mocked<CompilerWorkerClient>;
  // Exercise the real compiler's XML validation and custom transform handling, not a canned success result.
  worker.compileMap.mockImplementation(async ({ map, sourceSchema, targetSchema }: WorkerCompileMapRequest) =>
    new XsltCompiler().compile(map, sourceSchema, targetSchema)
  );
  await provider.resolveCustomTextEditor(document, panel, {} as vscode.CancellationToken);
  disposeEditor = () => onDidDispose.mock.calls[0][0]();
  const submit = (type: 'compile' | 'exportXslt' | 'testMapWithInput', data: unknown = map) =>
    onDidReceiveMessage.mock.calls[0][0]({ type, data });
  const compile = async (): Promise<CompileResult> => {
    await submit('compile');
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    const result = postMessage.mock.calls.at(-1)?.[0];
    expect(result?.type).toBe('compileResult');
    expect(result.data.success).toBe(true);
    expect(result.data.errors).toEqual([]);
    return result.data;
  };
  const exportFile = path.join(root, 'exported.xslt');
  vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(uri(exportFile));
  return { map, worker, postMessage, submit, compile, exportFile, generatedFile: path.join(root, '__generated/encoding.xslt') };
}

async function expectUtf8File(file: string, expected: string): Promise<void> {
  const bytes = await fs.readFile(file);
  expect(bytes).toEqual(Buffer.from(expected, 'utf8'));
  expect(bytes.subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  expect(bytes.includes(0)).toBe(false);
  expect(XMLValidator.validate(bytes.toString('utf8'))).toBe(true);
}

async function fixtureHost(fixture: (typeof fixtures)[number]) {
  const file = path.join(fixtureRoot, fixture.file);
  const original = await fs.readFile(file);
  expect(original.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xfe]));
  // Independent decoding gives a content-level oracle without sharing the production loader/normalizer.
  const decoded = original.subarray(2).toString('utf16le');
  expect(decoded.startsWith('<?xml version="1.0" encoding="UTF-16"?>')).toBe(true);
  await fs.writeFile(path.join(root, 'custom.xsl'), original);
  return { ...(await setup({ customXsltPath: 'custom.xsl' })), original, file, decoded };
}

async function transform(xsltFile: string, input: string, suffix: string): Promise<string> {
  const inputFile = path.join(root, `${suffix}-input.xml`);
  const outputFile = path.join(root, `${suffix}-output.xml`);
  await fs.writeFile(inputFile, input, 'utf8');
  const result = spawnSync(helperPath, [xsltFile, inputFile, outputFile], { encoding: 'utf8', timeout: 30_000 });
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
  const bytes = await fs.readFile(outputFile);
  return bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8').replace(/^\uFEFF/, '');
}

describe('custom XSLT encoding at the extension host boundary', () => {
  beforeEach(async () => {
    disposeDataMapperLogger();
    vi.clearAllMocks();
    mockWindow.createOutputChannel.mockReturnValue(outputChannel);
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'custom-xslt-encoding-')));
    vi.mocked(vscode.workspace.fs.readFile).mockImplementation((file) => fs.readFile(file.fsPath));
    vi.mocked(vscode.workspace.fs.createDirectory).mockImplementation(async (directory) => {
      await fs.mkdir(directory.fsPath, { recursive: true });
    });
    vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (file, bytes) => {
      await fs.writeFile(file.fsPath, bytes);
    });
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({} as vscode.TextDocument);
  });

  afterEach(async () => {
    disposeEditor?.();
    disposeEditor = undefined;
    disposeDataMapperLogger();
    await fs.rm(root, { recursive: true, force: true });
  });

  test.each(fixtures)('loads case $caseId UTF-16LE custom XSLT and writes consistent generated/exported UTF-8', async (fixture) => {
    const host = await fixtureHost(fixture);
    const result = await host.compile();
    expect(host.worker.compileMap.mock.calls[0][0].map.customXslt).toBe(host.decoded);
    const expected = declaration + host.decoded.slice(host.decoded.indexOf('?>') + 2);
    expect(result.xslt).toBe(expected);
    expect(result.extensionObjectXml).toBe(`${declaration}\n<ExtensionObjects></ExtensionObjects>`);
    await expectUtf8File(host.generatedFile, expected);
    await host.submit('exportXslt');
    await expectUtf8File(host.exportFile, expected);
    expect(await fs.readFile(host.file)).toEqual(host.original);
  });

  test.each(['utf16be', 'utf8'] as const)(
    'decodes %s BOM without corrupting non-ASCII or changing output encoding/body text',
    async (encoding) => {
      const custom = `<?xml version='1.0' encoding='${encoding === 'utf8' ? 'UTF-8' : 'UTF-16'}'?>${body}`;
      await fs.writeFile(path.join(root, 'custom.xsl'), encoded(custom, encoding));
      const host = await setup({ customXsltPath: 'custom.xsl' });
      const result = await host.compile();
      expect(host.worker.compileMap.mock.calls[0][0].map.customXslt).toBe(custom);
      // Existing UTF-8 casing is preserved; only the document declaration's incorrect encoding changes.
      const expected = `<?xml version='1.0' encoding='${encoding === 'utf8' ? 'UTF-8' : 'utf-8'}'?>${body}`;
      expect(result.xslt).toBe(expected);
      const stylesheet = create(result.xslt!).root().node as Element;
      expect(stylesheet.getElementsByTagNameNS(namespace, 'output')[0].getAttribute('encoding')).toBe('UTF-16');
      expect(stylesheet.getElementsByTagName('result')[0].textContent).toBe(literal);
      await expectUtf8File(host.generatedFile, expected);
      await host.submit('exportXslt');
      await expectUtf8File(host.exportFile, expected);
    }
  );

  test.each([
    { name: 'absent declaration and a leading xml-stylesheet PI', custom: body },
    { name: 'normal UTF-8 declaration', custom: declaration + body },
  ])('preserves stylesheets with $name', async ({ custom }) => {
    await fs.writeFile(path.join(root, 'custom.xsl'), custom, 'utf8');
    const host = await setup({ customXsltPath: 'custom.xsl' });
    const result = await host.compile();
    expect(result.xslt).toBe(custom);
    expect(result.xslt).toContain(processingInstruction);
    await expectUtf8File(host.generatedFile, custom);
    await host.submit('exportXslt');
    await expectUtf8File(host.exportFile, custom);
  });

  test.each(['utf16le', 'utf16be'] as const)('loads %s extension XML BOM and exports its decoded non-ASCII sidecar', async (encoding) => {
    await fs.writeFile(path.join(root, 'custom.xsl'), declaration + body, 'utf8');
    const extension = `<?xml version="1.0" encoding="UTF-16"?>${extensionBody}`;
    await fs.writeFile(path.join(root, 'custom.extension.xml'), encoded(extension, encoding));
    const host = await setup({ customXsltPath: 'custom.xsl', customExtensionXmlPath: 'custom.extension.xml' });
    const result = await host.compile();
    expect(host.worker.compileMap.mock.calls[0][0].map.customExtensionXml).toBe(extension);
    const expected = `${declaration}\n<ExtensionObjects>\n<ExtensionObject Namespace="urn:café" AssemblyName="Example" ClassName="漢字" />\n</ExtensionObjects>`;
    expect(result.extensionObjectXml).toBe(expected);
    await host.submit('exportXslt');
    await expectUtf8File(path.join(root, 'exported.extension.xml'), expected);
  });

  test('normalizes BOM/declarations centrally on worker-returned XSLT and extension XML before compile/export consumers', async () => {
    const host = await setup();
    // A worker can return UTF-16-declared strings independently of custom file loading.
    host.worker.compileMap.mockResolvedValue({
      success: true,
      errors: [],
      warnings: [],
      xslt: `\uFEFF<?xml version="1.0" encoding="UTF-16"?>${body}`,
      extensionObjectXml: `\uFEFF<?xml version='1.0' encoding='iso-8859-1'?>${extensionBody}`,
    });
    const result = await host.compile();
    expect(result.xslt).toBe(declaration + body);
    expect(result.extensionObjectXml).toBe(`<?xml version='1.0' encoding='utf-8'?>${extensionBody}`);
    await expectUtf8File(host.generatedFile, result.xslt!);
    await host.submit('exportXslt');
    await expectUtf8File(host.exportFile, result.xslt!);
    await expectUtf8File(path.join(root, 'exported.extension.xml'), result.extensionObjectXml!);
  });

  testDotNet('directly loads all three corrected real fixture exports in FrameworkTransform', async () => {
    for (const fixture of fixtures) {
      const host = await fixtureHost(fixture);
      await host.submit('exportXslt');
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
      const output = await transform(host.exportFile, fixture.input, fixture.caseId);
      expect(XMLValidator.validate(output)).toBe(true);
      const result = create(output).root().node as Element;
      expect(result.localName).toBe(fixture.root);
      expect(result.getElementsByTagName(fixture.resultElement)).toHaveLength(1);
      expect(result.getElementsByTagName(fixture.resultElement)[0].textContent).toBe(fixture.expected);
      expect(await fs.readFile(host.file)).toEqual(host.original);
      disposeEditor?.();
      disposeEditor = undefined;
    }
  });

  testDotNet('Test Map and export files are directly executable UTF-8 while UTF-16-requested XML output is saved as UTF-8', async () => {
    await fs.writeFile(path.join(root, 'custom.xsl'), encoded(`<?xml version="1.0" encoding="UTF-16"?>${body}`, 'utf16le'));
    const host = await setup({ customXsltPath: 'custom.xsl' });
    const expected = declaration + body;
    host.worker.testMap.mockImplementation(async (request) => {
      expect(request.xslt).toBe(expected);
      const outputXml = await transform(host.generatedFile, request.inputXml, 'test-map');
      expect(outputXml).toContain('encoding="utf-16"');
      // Include a string BOM as a worker may return one after decoding a serialized document.
      return { outputXml: `\uFEFF${outputXml}`, diagnostics: [] };
    });
    await host.submit('testMapWithInput', { map: host.map, inputXml: '<input/>' });
    expect(host.worker.testMap).toHaveBeenCalledOnce();
    expect(host.postMessage).toHaveBeenLastCalledWith({
      type: 'testMapResult',
      data: { output: expect.stringContaining('✓ Output XML is well-formed') },
    });
    await expectUtf8File(host.generatedFile, expected);
    const outputFile = path.join(root, '__generated/encoding_output.xml');
    const output = await fs.readFile(outputFile, 'utf8');
    expect(output.startsWith(declaration)).toBe(true);
    expect((create(output).root().node as Element).textContent).toBe(literal);
    await expectUtf8File(outputFile, output);
    await host.submit('exportXslt');
    await expectUtf8File(host.exportFile, expected);
    const exportedOutput = await transform(host.exportFile, '<input/>', 'export');
    expect((create(exportedOutput).root().node as Element).textContent).toBe(literal);
  });
});
