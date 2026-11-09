import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi, type Mocked } from 'vitest';
import * as vscode from 'vscode';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from '../e2e/fixtures/learningPath';
import { XsltCompiler, type CompileResult } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { disposeDataMapperLogger } from '../src/logger';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, ParameterType, ScriptType } from '../src/model';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { readTextFileSync } from '../src/schema/schemaFileResolver';
import { SchemaParser } from '../src/schema/schemaParser';
import { CompilerWorkerClient, type WorkerCompileMapRequest } from '../src/worker/compilerWorkerClient';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';

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

const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
const sourceNamespace = 'http://BizTalk.CallingExternalAssemblyFromInlineXSLT.CarInfo';
const targetNamespace = 'http://BizTalk.CallingExternalAssemblyFromInlineXSLT.CarsOnSale';
const scriptNamespace = 'http://schemas.microsoft.com/BizTalk/2003/ScriptNS0';
const corpusRoot = path.resolve(__dirname, '../e2etests');
const case025 = path.join(
  'Calling-external-assembly-from-Custom-XSLT',
  'BizTalk.CallingExternalAssemblyFromInlineXSLT',
  'CarInfo_to_CarsOnSale.btm'
);
const caseDirectory = path.dirname(path.join(corpusRoot, case025));
const frameworkHelper = path.resolve(
  __dirname,
  '../tools/compiler-worker/runtime/win-x64/framework-transform/BizTalk.DataMapper.FrameworkTransform.exe'
);
const nativeAvailable = process.platform === 'win32' && existsSync(frameworkHelper);
const testDotNet = nativeAvailable ? test : test.skip;
const serializer = new BtmSerializer();

function extensionXml(assemblyName: string, namespace = scriptNamespace, className = 'MapperExtensionsFunctions.MappingFunctions'): string {
  return create()
    .ele('ExtensionObjects')
    .ele('ExtensionObject', { Namespace: namespace, AssemblyName: assemblyName, ClassName: className })
    .end({ headless: true });
}

function extensionEntries(content: string): Element[] {
  expect(XMLValidator.validate(content)).toBe(true);
  const root = create(content).root().node as Element;
  expect(root.localName).toBe('ExtensionObjects');
  return Array.from(root.getElementsByTagName('ExtensionObject'));
}

function children(element: Element, localName?: string): Element[] {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === 1)
    .map((node) => node as Element)
    .filter((node) => !localName || node.localName === localName);
}

function transform(xslt: string, input: string, descriptor?: string): Element {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'mapper-extension-transform-'));
  try {
    const xsltFile = path.join(directory, 'map.xslt');
    const inputFile = path.join(directory, 'input.xml');
    const outputFile = path.join(directory, 'output.xml');
    const descriptorFile = path.join(directory, 'map.extension.xml');
    writeFileSync(xsltFile, xslt, 'utf8');
    writeFileSync(inputFile, input, 'utf8');
    if (descriptor !== undefined) {
      writeFileSync(descriptorFile, descriptor, 'utf8');
    }
    const result = spawnSync(frameworkHelper, [xsltFile, inputFile, outputFile, ...(descriptor === undefined ? [] : [descriptorFile])], {
      encoding: 'utf8',
      timeout: 30_000,
      windowsHide: true,
    });
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stderr).toBe('');
    const bytes = readFileSync(outputFile);
    const output =
      bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8').replace(/^\uFEFF/, '');
    expect(output.trim(), 'Empty input must still produce the target root').not.toBe('');
    expect(XMLValidator.validate(output)).toBe(true);
    return create(output).root().node as Element;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function compileCase025(preserveSequenceOrder: boolean): Promise<CompileResult> {
  const payload = await loadLearningPathMap(case025);
  expect(payload.map.customXsltPath || '').toBe('');
  expect(payload.map.customXslt).toBeUndefined();
  expect(payload.map.customExtensionXmlPath).toBe('.\\ExternalAssembly.xml');
  const descriptor = readTextFileSync(path.join(caseDirectory, 'ExternalAssembly.xml'));
  expect(descriptor, 'The portable case025 descriptor must be present').toBeTruthy();
  const { resolveExtensionObjectAssemblyPaths } = await import('../src/schema/extensionObjectResolver');
  payload.map.customExtensionXml = resolveExtensionObjectAssemblyPaths(descriptor!, caseDirectory);
  payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
  const original = JSON.stringify(payload.map);
  const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  expect(JSON.stringify(payload.map)).toBe(original);
  const entries = extensionEntries(result.extensionObjectXml!);
  expect(entries).toHaveLength(1);
  expect(entries[0].getAttribute('Namespace')).toBe(scriptNamespace);
  expect(entries[0].getAttribute('ClassName')).toBe('MapperExtensionsFunctions.MappingFunctions');
  expect(entries[0].getAttribute('AssemblyName')).toBe(path.join(caseDirectory, 'MapperExtensionsFunctions.dll'));
  expect(result.xslt).toContain('ScriptNS0:ToDecimalPoint');
  return result;
}

interface Car {
  brand: string;
  model: string;
  market: string;
  owner: string;
}
const cars: Car[] = [
  { brand: 'FirstBrand', model: 'ModelA', market: '10', owner: '20' },
  { brand: 'SecondBrand', model: 'ModelB', market: '190000', owner: '189600' },
];

function carInput(records: Car[], ownerName = 'Ada Owner', ownerAddress = '42 Regression Road'): string {
  const root = create().ele('s:CarProperty', { 'xmlns:s': sourceNamespace });
  for (const car of records) {
    const record = root.ele('Car');
    for (const [name, value] of Object.entries({
      Brand: car.brand,
      Model: car.model,
      Year: '2024',
      FuelType: 'Electric',
      HP: '100',
      Color: 'Blue',
      Observations: `${car.brand} notes`,
      MarketPrice: car.market,
      OwnerPrice: car.owner,
    })) {
      record.ele(name).txt(value);
    }
  }
  root.ele('OwnerName').txt(ownerName);
  root.ele('OwnerAddress').txt(ownerAddress);
  root.ele('OwnerProfession').txt('Engineer');
  root.ele('OwnerAge').txt('40');
  return root.end({ headless: true });
}

function assertCars(root: Element, records: Car[], prices: string[][], ownerName = 'Ada Owner', ownerAddress = '42 Regression Road'): void {
  expect(root.localName).toBe('CarsOnSale');
  expect(root.namespaceURI).toBe(targetNamespace);
  expect(children(root).map((record) => record.localName)).toEqual(records.map(() => 'Car'));
  const actual = children(root, 'Car');
  for (const [index, record] of actual.entries()) {
    expect(children(record, 'Brand').map((field) => field.textContent)).toEqual([records[index].brand]);
    expect(children(record, 'Model').map((field) => field.textContent)).toEqual([records[index].model]);
    const price = children(record, 'Price');
    expect(price, `${records[index].brand} must have one Price, not Price/Price`).toHaveLength(1);
    expect(children(price[0]).map((field) => field.localName)).toEqual(['PriceMarket', 'PriceOwner']);
    expect(children(price[0]).map((field) => field.textContent)).toEqual(prices[index]);
    expect(record.getElementsByTagNameNS('*', 'Price')).toHaveLength(1);
    const owner = children(record, 'OwnerInfo');
    expect(owner).toHaveLength(1);
    expect(children(owner[0]).map((field) => [field.localName, field.textContent])).toEqual([
      ['Name', ownerName],
      ['Address', ownerAddress],
    ]);
  }
}

describe('case025 generated XSLT with independent extension objects', () => {
  beforeAll(async () => {
    if (nativeAvailable) {
      const require = createRequire(path.join(__dirname, 'extensionObjectCompatibility.test.ts'));
      const { buildLearningPathHelpers } = require('./native/buildLearningPathHelpers.cjs') as {
        buildLearningPathHelpers: (root: string) => void | Promise<void>;
      };
      await buildLearningPathHelpers(corpusRoot);
    }
  });

  test('compiles the portable map without a custom stylesheet and retains its descriptor entry', async () => {
    await compileCase025(false);
  });

  test.each([
    { label: 'malformed XML', content: '<ExtensionObjects><ExtensionObject></ExtensionObjects>', diagnostic: /malformed XML/i },
    { label: 'wrong root', content: '<NotExtensionObjects/>', diagnostic: /ExtensionObjects/ },
    {
      label: 'entry missing ClassName',
      content: '<ExtensionObjects><ExtensionObject Namespace="urn:test" AssemblyName="Example"/></ExtensionObjects>',
      diagnostic: /ClassName/,
    },
  ])('rejects $label without reinstating the custom-XSLT-only guard', ({ content, diagnostic }) => {
    const map = serializer.createNew('', '', 'Invalid descriptor');
    map.customExtensionXml = content;
    const result = new XsltCompiler().compile(map);
    expect(result.success).toBe(false);
    const errors = result.errors.map((error) => error.message).join('\n');
    expect(errors).toMatch(diagnostic);
    expect(errors).not.toMatch(/requires custom XSLT/i);
  });

  testDotNet.each([false, true])('executes external CLR prices per car (preserve sequence: %s)', async (preserveSequenceOrder) => {
    const result = await compileCase025(preserveSequenceOrder);
    assertCars(transform(result.xslt!, carInput(cars), result.extensionObjectXml), cars, [
      ['10.000', '20.000'],
      ['190000.000', '189600.000'],
    ]);
  });

  testDotNet('keeps a single car and parent owner values in the current input', async () => {
    const result = await compileCase025(true);
    assertCars(
      transform(result.xslt!, carInput([cars[1]], 'Second Owner', 'Single Record Street'), result.extensionObjectXml),
      [cars[1]],
      [['190000.000', '189600.000']],
      'Second Owner',
      'Single Record Street'
    );
  });

  testDotNet('retains the target root without fabricating cars for empty input', async () => {
    const result = await compileCase025(false);
    assertCars(transform(result.xslt!, carInput([]), result.extensionObjectXml), [], []);
  });
});

describe('extension object loading at the mocked VS Code host boundary', () => {
  let directory: string;
  let disposeEditor: (() => void) | undefined;

  beforeEach(async () => {
    disposeDataMapperLogger();
    vi.clearAllMocks();
    mockWindow.createOutputChannel.mockReturnValue(outputChannel);
    directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mapper-extension-host-')));
    vi.mocked(vscode.workspace.fs.readFile).mockImplementation((file) => fs.readFile(file.fsPath));
    vi.mocked(vscode.workspace.fs.createDirectory).mockImplementation(async (file) => {
      await fs.mkdir(file.fsPath, { recursive: true });
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
    await fs.rm(directory, { recursive: true, force: true });
  });

  function uri(file: string): vscode.Uri {
    return Object.assign(vscode.Uri.file(file), { with: (change: { path: string }) => uri(change.path) });
  }

  async function host(overrides: Partial<MapDocument>) {
    const map = { ...serializer.createNew('', '', 'Independent extensions'), ...overrides };
    const document = {
      uri: uri(path.join(directory, 'map.btm')),
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
    worker.compileMap.mockImplementation(async ({ map, sourceSchema, targetSchema }: WorkerCompileMapRequest) =>
      new XsltCompiler().compile(map, sourceSchema, targetSchema)
    );
    await provider.resolveCustomTextEditor(document, panel, {} as vscode.CancellationToken);
    disposeEditor = () => onDidDispose.mock.calls[0][0]();
    return {
      map,
      worker,
      compile: async (): Promise<CompileResult> => {
        await onDidReceiveMessage.mock.calls[0][0]({ type: 'compile', data: map });
        const response = postMessage.mock.calls.at(-1)?.[0];
        expect(response?.type).toBe('compileResult');
        return response.data;
      },
      testMap: async () => {
        await onDidReceiveMessage.mock.calls[0][0]({ type: 'testMapWithInput', data: { map, inputXml: '<Root/>' } });
        const response = postMessage.mock.calls.at(-1)?.[0];
        expect(response?.type).toBe('testMapResult');
        return response.data as { output: string; error?: string };
      },
    };
  }

  test.each(['utf8', 'utf16le', 'utf16be'] as const)(
    'loads an independent %s BOM descriptor, resolving files relative to its nested directory but not identities',
    async (encoding) => {
      const nested = path.join(directory, 'descriptors', 'nested');
      await fs.mkdir(nested, { recursive: true });
      const absolute = path.join(directory, 'absolute', 'AbsoluteFunctions.dll');
      const identity = 'Contoso.Extensions, Version=1.2.3.4, Culture=neutral, PublicKeyToken=0123456789abcdef';
      const content = create()
        .ele('ExtensionObjects')
        .ele('ExtensionObject', { Namespace: 'urn:café', AssemblyName: '.\\bin\\Functions.dll', ClassName: 'Example.漢字' })
        .up()
        .ele('ExtensionObject', { Namespace: 'urn:absolute', AssemblyName: absolute, ClassName: 'Example.Absolute' })
        .up()
        .ele('ExtensionObject', { Namespace: 'urn:identity', AssemblyName: identity, ClassName: 'Example.Identity' })
        .end({ headless: true });
      const declaration = `<?xml version="1.0" encoding="${encoding === 'utf8' ? 'UTF-8' : 'UTF-16'}"?>`;
      const text = declaration + content;
      const bytes = Buffer.from(text, encoding === 'utf8' ? 'utf8' : 'utf16le');
      const bom = encoding === 'utf8' ? [0xef, 0xbb, 0xbf] : encoding === 'utf16le' ? [0xff, 0xfe] : [0xfe, 0xff];
      await fs.writeFile(
        path.join(nested, 'ExternalAssembly.xml'),
        Buffer.concat([Buffer.from(bom), encoding === 'utf16be' ? bytes.swap16() : bytes])
      );
      expect(readTextFileSync(path.join(nested, 'ExternalAssembly.xml'))).toBe(text);
      const editor = await host({ customExtensionXmlPath: path.join('descriptors', 'nested', 'ExternalAssembly.xml') });
      const original = JSON.stringify(editor.map);
      const result = await editor.compile();
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
      const hydrated = editor.worker.compileMap.mock.calls[0][0].map;
      expect(hydrated.customXslt).toBeUndefined();
      const entries = extensionEntries(result.extensionObjectXml!);
      expect(entries.map((entry) => entry.getAttribute('AssemblyName'))).toEqual([
        path.join(nested, 'bin', 'Functions.dll'),
        absolute,
        identity,
      ]);
      expect(entries[0].getAttribute('Namespace')).toBe('urn:café');
      expect(entries[0].getAttribute('ClassName')).toBe('Example.漢字');
      expect(JSON.stringify(editor.map)).toBe(original);
    }
  );

  test('resolves in-memory descriptor file paths against the BTM directory', async () => {
    const editor = await host({ customExtensionXml: extensionXml('.\\helpers\\MappingFunctions.dll') });
    const result = await editor.compile();
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(extensionEntries(result.extensionObjectXml!)[0].getAttribute('AssemblyName')).toBe(
      path.join(directory, 'helpers', 'MappingFunctions.dll')
    );
    expect(editor.map.customExtensionXml).toBe(extensionXml('.\\helpers\\MappingFunctions.dll'));
  });

  test('returns a path-specific Test Map error before invoking the worker for a missing descriptor', async () => {
    const editor = await host({ customExtensionXmlPath: 'missing.extension.xml' });
    const result = await editor.testMap();
    expect(result.output).toBe('');
    expect(result.error).toContain(path.join(directory, 'missing.extension.xml'));
    expect(result.error).toMatch(/could not be read/i);
    expect(result.error).not.toMatch(/requires custom XSLT/i);
    expect(editor.worker.compileMap).not.toHaveBeenCalled();
    expect(editor.worker.testMap).not.toHaveBeenCalled();
  });

  test.each([
    { label: 'missing file', content: undefined, diagnostic: /not found|does not exist|missing|could not (?:be )?(?:read|load)/i },
    { label: 'malformed XML', content: '<ExtensionObjects><ExtensionObject></ExtensionObjects>', diagnostic: /malformed XML/i },
    { label: 'wrong root shape', content: '<WrongRoot/>', diagnostic: /ExtensionObjects/ },
  ])('reports $label with the descriptor path, not a generic custom XSLT requirement', async ({ content, diagnostic }) => {
    const descriptor = path.join(directory, 'invalid.extension.xml');
    if (content !== undefined) {
      await fs.writeFile(descriptor, content, 'utf8');
    }
    const editor = await host({ customExtensionXmlPath: 'invalid.extension.xml' });
    const result = await editor.compile();
    expect(result.success).toBe(false);
    const errors = result.errors.map((error) => error.message).join('\n');
    expect(errors).toContain(descriptor);
    expect(errors).toMatch(diagnostic);
    expect(errors).not.toMatch(/requires custom XSLT/i);
    if (content === undefined) {
      expect(editor.worker.compileMap).not.toHaveBeenCalled();
    }
  });
});

const schemaParser = new SchemaParser();
const source = schemaParser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
    '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
    '<xs:element name="Value" type="xs:string"/><xs:element name="Other" type="xs:string"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'source.xsd'
);

function templateTarget(namespace = '') {
  return schemaParser.parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${namespace ? ` targetNamespace="${namespace}" elementFormDefault="qualified"` : ''}>
      <xs:element name="Result"><xs:complexType><xs:sequence><xs:element name="Line" maxOccurs="unbounded">
      <xs:complexType><xs:sequence><xs:element name="V"><xs:complexType><xs:sequence>
      <xs:element name="Part" type="xs:string" maxOccurs="unbounded"/>
      </xs:sequence></xs:complexType></xs:element></xs:sequence><xs:attribute name="value" type="xs:string"/>
      </xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>`,
    'target.xsd'
  );
}

function templateMap(content: string, preserveSequenceOrder: boolean, targetPath = '/Result/Line/V'): MapDocument {
  const script = FunctoidRegistry.getInstance().getFunctoid(260)!;
  const loop = FunctoidRegistry.getInstance().getFunctoid(424)!;
  return {
    name: 'Named template target compatibility',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [
      {
        id: 'page',
        name: 'Template targets',
        functoids: [
          {
            id: 'script',
            functoidId: script.id,
            name: script.name,
            category: script.category,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [{ index: 0, type: ParameterType.Link, value: 'value' }],
            scriptType: ScriptType.InlineXsltCallTemplate,
            scriptContent: content,
          },
          {
            id: 'loop',
            functoidId: loop.id,
            name: loop.name,
            category: loop.category,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [{ index: 0, type: ParameterType.Link, value: 'records' }],
          },
        ],
        links: [
          {
            id: 'value',
            sourceId: '/Root/Items/Value',
            sourcePath: '/Root/Items/Value',
            targetId: 'script',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid,
          },
          {
            id: 'records',
            sourceId: '/Root/Items',
            sourcePath: '/Root/Items',
            targetId: 'loop',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid,
          },
          {
            id: 'output',
            sourceId: 'script',
            targetId: targetPath,
            targetPath,
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.SchemaNode,
          },
          {
            id: 'loop-output',
            sourceId: 'loop',
            targetId: '/Result/Line',
            targetPath: '/Result/Line',
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.SchemaNode,
          },
        ],
      },
    ],
  };
}

const templateInput = '<Root><Items><Value>A</Value><Other>one</Other></Items><Items><Value>B</Value><Other>two</Other></Items></Root>';
const part = '<Part><xsl:value-of select="concat($id, \':\', Other)"/></Part>';
const namedTemplate = (body: string) => `<xsl:template name="emit"><xsl:param name="id"/>${body}</xsl:template>`;

function compileTemplate(content: string, preserveSequenceOrder: boolean, namespace = '', targetPath?: string) {
  const map = templateMap(content, preserveSequenceOrder, targetPath);
  const original = JSON.stringify(map);
  const result = new XsltCompiler().compile(map, source, templateTarget(namespace));
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(JSON.stringify(map)).toBe(original);
  const stylesheet = create(result.xslt!).root().node as Element;
  const templates = Array.from(stylesheet.getElementsByTagNameNS(xsltNamespace, 'template'));
  expect(templates.filter((template) => template.getAttribute('name') === 'emit')).toHaveLength(1);
  expect(templates.every((template) => template.parentNode === stylesheet)).toBe(true);
  const calls = Array.from(stylesheet.getElementsByTagNameNS(xsltNamespace, 'call-template'));
  expect(calls).toHaveLength(1);
  return { xslt: result.xslt!, call: calls[0] };
}

describe.each([false, true])('named template target replacement (preserve sequence: %s)', (preserveSequenceOrder) => {
  test.each([
    { label: 'literal target root', body: `<V>${part}</V>`, namespace: '' },
    { label: 'static xsl:element target root', body: `<xsl:element name="V">${part}</xsl:element>`, namespace: '' },
    {
      label: 'locally bound static QName target root',
      body: `<xsl:element xmlns:q="urn:target" name="q:V">${part}</xsl:element>`,
      namespace: 'urn:target',
    },
  ])('emits a $label at the target position without duplicating its wrapper', ({ body, namespace }) => {
    const { xslt, call } = compileTemplate(namedTemplate(body), preserveSequenceOrder, namespace);
    // A direct call belongs at the target position, not inside a V or a captured result-tree fragment.
    expect((call.parentNode as Element).localName).toBe('Line');
    expect((call.parentNode as Element).namespaceURI || '').toBe(namespace);
    if (nativeAvailable) {
      const output = transform(xslt, templateInput);
      const lines = children(output, 'Line');
      expect(lines).toHaveLength(2);
      expect(
        lines.map((line) => {
          const values = children(line, 'V');
          expect(values).toHaveLength(1);
          expect(values[0].namespaceURI || '').toBe(namespace);
          expect(values[0].getElementsByTagNameNS('*', 'V')).toHaveLength(0);
          return children(values[0]).map((field) => [field.localName, field.textContent]);
        })
      ).toEqual([[['Part', 'A:one']], [['Part', 'B:two']]]);
    }
  });

  test('retains node capture when the template emits only children of the target container', () => {
    const { xslt, call } = compileTemplate(namedTemplate(part), preserveSequenceOrder);
    expect((call.parentNode as Element).localName).toBe('variable');
    if (nativeAvailable) {
      const output = transform(xslt, templateInput);
      expect(children(output, 'Line').map((line) => children(line, 'V').map((value) => value.textContent))).toEqual([['A:one'], ['B:two']]);
      expect(Array.from(output.getElementsByTagNameNS('*', 'Part')).map((field) => field.textContent)).toEqual(['A:one', 'B:two']);
    }
  });

  test('retains scalar attribute capture instead of treating a named template as a target element', () => {
    const { xslt, call } = compileTemplate(
      namedTemplate('<xsl:value-of select="concat($id, \':\', Other)"/>'),
      preserveSequenceOrder,
      '',
      '/Result/Line/@value'
    );
    expect((call.parentNode as Element).localName).toBe('variable');
    if (nativeAvailable) {
      expect(children(transform(xslt, templateInput), 'Line').map((line) => line.getAttribute('value'))).toEqual(['A:one', 'B:two']);
    }
  });
});

test('does not replace a qualified target with a same-local-name element in a different namespace', () => {
  const { xslt, call } = compileTemplate(
    namedTemplate(`<xsl:element xmlns:q="urn:not-target" name="q:V">${part}</xsl:element>`),
    true,
    'urn:target'
  );
  expect((call.parentNode as Element).localName).toBe('variable');
  if (nativeAvailable) {
    const lines = children(transform(xslt, templateInput), 'Line');
    expect(
      lines.map((line) => {
        const values = children(line, 'V');
        expect(values).toHaveLength(1);
        expect(values[0].namespaceURI).toBe('urn:target');
        const nested = children(values[0], 'V');
        expect(nested).toHaveLength(1);
        expect(nested[0].namespaceURI).toBe('urn:not-target');
        return nested[0].textContent;
      })
    ).toEqual(['A:one', 'B:two']);
  }
});

test('keeps the target container when it also has an independently mapped descendant', () => {
  const map = templateMap(namedTemplate(`<V>${part}</V>`), true);
  map.pages[0].links.push({
    id: 'mapped-part',
    sourceId: '/Root/Items/Other',
    sourcePath: '/Root/Items/Other',
    targetId: '/Result/Line/V/Part',
    targetPath: '/Result/Line/V/Part',
    sourceType: LinkEndpointType.SchemaNode,
    targetType: LinkEndpointType.SchemaNode,
  });
  const result = new XsltCompiler().compile(map, source, templateTarget());
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  const stylesheet = create(result.xslt!).root().node as Element;
  const calls = Array.from(stylesheet.getElementsByTagNameNS(xsltNamespace, 'call-template'));
  expect(calls).toHaveLength(1);
  expect((calls[0].parentNode as Element).localName).toBe('variable');
  if (nativeAvailable) {
    const lines = children(transform(result.xslt!, templateInput), 'Line');
    expect(
      lines.map((line) => {
        const values = children(line, 'V');
        expect(values).toHaveLength(1);
        return children(values[0]).map((field) => [field.localName, field.textContent]);
      })
    ).toEqual([
      [
        ['V', 'A:one'],
        ['Part', 'one'],
      ],
      [
        ['V', 'B:two'],
        ['Part', 'two'],
      ],
    ]);
  }
});
