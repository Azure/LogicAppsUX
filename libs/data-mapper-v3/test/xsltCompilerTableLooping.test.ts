import { describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { create } from 'xmlbuilder2';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, type MapLink, ParameterType } from '../src/model';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { SchemaParser } from '../src/schema/schemaParser';

const parser = new SchemaParser();
const source = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
    '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence><xs:element name="Value" type="xs:string"/>' +
    '</xs:sequence></xs:complexType></xs:element><xs:element name="Other" type="xs:string" maxOccurs="unbounded"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:schema>',
  'source.xsd'
);
const target = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Result"><xs:complexType><xs:sequence>' +
    '<xs:element name="Line" maxOccurs="unbounded"><xs:complexType><xs:sequence><xs:element name="V" type="xs:string"/>' +
    '</xs:sequence></xs:complexType></xs:element><xs:element name="OtherLine" maxOccurs="unbounded">' +
    '<xs:complexType><xs:sequence><xs:element name="V" type="xs:string"/></xs:sequence></xs:complexType></xs:element>' +
    '</xs:sequence></xs:complexType></xs:element></xs:schema>',
  'target.xsd'
);
const helperPath = path.resolve(
  __dirname,
  '..',
  'tools',
  'compiler-worker',
  'runtime',
  'win-x64',
  'framework-transform',
  'BizTalk.DataMapper.FrameworkTransform.exe'
);
const testDotNet = process.platform === 'win32' && fs.existsSync(helperPath) ? test : test.skip;
const sourceLink = (id: string, sourcePath: string, targetId: string): MapLink => ({
  id,
  sourceId: sourcePath,
  sourcePath,
  targetId,
  sourceType: LinkEndpointType.SchemaNode,
  targetType: LinkEndpointType.Functoid,
});
const targetLink = (id: string, sourceId: string, targetPath: string): MapLink => ({
  id,
  sourceId,
  targetId: targetPath,
  targetPath,
  sourceType: LinkEndpointType.Functoid,
  targetType: LinkEndpointType.SchemaNode,
});

function tableMap(scope: string | undefined, preserveSequenceOrder: boolean): MapDocument {
  const definition = FunctoidRegistry.getInstance().getFunctoid(703)!;
  const extractor = FunctoidRegistry.getInstance().getFunctoid(704)!;
  return {
    name: 'Table scopes',
    version: '1',
    sourceSchema: { location: '' },
    targetSchema: { location: '' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [
      {
        id: 'page',
        name: 'Page',
        functoids: [
          {
            id: 'table',
            functoidId: 703,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
              { index: 0, type: scope === undefined ? ParameterType.Link : ParameterType.Constant, value: scope ?? 'scope' },
              { index: 1, type: ParameterType.Constant, value: '1' },
              { index: 2, type: ParameterType.Link, value: 'cell', guid: 'value' },
              { index: 3, type: ParameterType.Constant, value: 'fixed', guid: 'fixed' },
            ],
            tableLooping: { columns: 1, gated: false, rows: [['value'], ['fixed']] },
          },
          {
            id: 'extractor',
            functoidId: 704,
            category: extractor.category,
            name: extractor.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
              { index: 0, type: ParameterType.Link, value: 'extract' },
              { index: 1, type: ParameterType.Constant, value: '1' },
            ],
          },
        ],
        links: [
          ...(scope === undefined ? [sourceLink('scope', '/Root/Items', 'table')] : []),
          sourceLink('cell', '/Root/Items/Value', 'table'),
          targetLink('rows', 'table', '/Result/Line'),
          {
            id: 'extract',
            sourceId: 'table',
            targetId: 'extractor',
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.Functoid,
          },
          targetLink('value', 'extractor', '/Result/Line/V'),
          {
            id: 'other',
            sourceId: '/Root/Other',
            sourcePath: '/Root/Other',
            targetId: '/Result/OtherLine/V',
            targetPath: '/Result/OtherLine/V',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode,
          },
        ],
      },
    ],
  };
}

function transform(xslt: string, input: string): Element {
  const root = path.resolve(__dirname, '..', 'test-results');
  fs.mkdirSync(root, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, 'table-looping-'));
  try {
    const xsltPath = path.join(directory, 'map.xslt');
    const inputPath = path.join(directory, 'input.xml');
    const outputPath = path.join(directory, 'output.xml');
    fs.writeFileSync(xsltPath, xslt);
    fs.writeFileSync(inputPath, input);
    const result = spawnSync(helperPath, [xsltPath, inputPath, outputPath], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    return create(fs.readFileSync(outputPath, 'utf8')).root().node as Element;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const values = (root: Element, element: string) =>
  Array.from(root.getElementsByTagNameNS('*', element)).map((node) => (node.textContent || '').trim());
const input = '<Root><Items><Value>A</Value></Items><Other>X</Other><Items><Value>B</Value></Items><Other>Y</Other></Root>';

describe.each([false, true])('Table Looping scopes (preserve sequence: %s)', (preserveSequenceOrder) => {
  test.each(['SimpleScope', '1', '6', 'true', 'false'])('uses grid-source context, not literal scope %j as a count or gate', (scope) => {
    const result = new XsltCompiler().compile(tableMap(scope, preserveSequenceOrder), source, target);
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.xslt?.match(/<Line>/g)).toHaveLength(2);
    const stylesheet = create(result.xslt!).root().node as Element;
    const valueExpression = stylesheet.getElementsByTagNameNS('http://www.w3.org/1999/XSL/Transform', 'variable')[0].getAttribute('select');
    expect(valueExpression).toContain('Value');
    expect(valueExpression).not.toContain('Items');
  });

  testDotNet.each(['SimpleScope', '6', 'true', 'false', undefined])(
    'transforms two source records times two rows with scope %j',
    (scope) => {
      const result = new XsltCompiler().compile(tableMap(scope, preserveSequenceOrder), source, target);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      const output = transform(result.xslt!, input);
      expect(values(output, 'Line')).toEqual(['A', 'fixed', 'B', 'fixed']);
      expect(values(output, 'OtherLine')).toEqual(['X', 'Y']);
      expect(values(transform(result.xslt!, '<Root><Other>X</Other></Root>'), 'Line')).toEqual([]);
    }
  );

  testDotNet('keeps linked parameter 0 exclusive even when a grid-cell input repeats', () => {
    const map = tableMap(undefined, preserveSequenceOrder);
    const scope = map.pages[0].links.find((link) => link.id === 'scope')!;
    scope.sourceId = '/Root';
    scope.sourcePath = '/Root';
    const result = new XsltCompiler().compile(map, source, target);
    expect(result.errors).toEqual([]);
    expect(values(transform(result.xslt!, input), 'Line')).toEqual(['A', 'fixed']);
  });

  testDotNet('selects the first cell dependency in parameter order, not graphical link order', () => {
    const map = tableMap('scope', preserveSequenceOrder);
    map.pages[0].functoids[0].parameters.push({ index: 4, type: ParameterType.Link, value: 'later', guid: 'later' });
    map.pages[0].links.unshift(sourceLink('later', '/Root/Other', 'table'));
    const result = new XsltCompiler().compile(map, source, target);
    expect(result.errors).toEqual([]);
    expect(values(transform(result.xslt!, input), 'Line')).toEqual(['A', 'fixed', 'B', 'fixed']);
  });

  testDotNet('retains the independent source context when the first cell is computed by a functoid', () => {
    const map = tableMap('scope', preserveSequenceOrder);
    const definition = FunctoidRegistry.getInstance().getFunctoid(107)!;
    map.pages[0].functoids.push({
      id: 'format',
      functoidId: definition.id,
      category: definition.category,
      name: definition.name,
      x: 0,
      y: 0,
      inputLinks: [],
      outputLinks: [],
      parameters: [
        { index: 0, type: ParameterType.Link, value: 'dependency' },
        { index: 1, type: ParameterType.Constant, value: '!' },
      ],
    });
    const cell = map.pages[0].links.find((link) => link.id === 'cell')!;
    cell.sourceType = LinkEndpointType.Functoid;
    cell.sourceId = 'format';
    delete cell.sourcePath;
    map.pages[0].links.push(sourceLink('dependency', '/Root/Items/Value', 'format'));
    const result = new XsltCompiler().compile(map, source, target);
    expect(result.errors).toEqual([]);
    expect(values(transform(result.xslt!, input), 'Line')).toEqual(['A!', 'fixed', 'B!', 'fixed']);
  });

  testDotNet('preserves gated rows and emits every configured row even without any source links', () => {
    const map = tableMap('scope', preserveSequenceOrder);
    const table = map.pages[0].functoids[0];
    table.parameters[2] = { index: 2, type: ParameterType.Constant, value: 'true', guid: 'value' };
    table.parameters[3].value = 'false';
    table.tableLooping = { columns: 1, gated: true, rows: [['value'], ['fixed'], ['value']] };
    map.pages[0].links = map.pages[0].links.filter((link) => link.id !== 'cell' && link.id !== 'other');
    const result = new XsltCompiler().compile(map, source, target);
    expect(result.errors).toEqual([]);
    expect(values(transform(result.xslt!, input), 'Line')).toEqual(['true', 'true']);
  });
});

test.each([
  ['missing scope', (map: MapDocument) => map.pages[0].functoids[0].parameters.shift(), /first input/],
  [
    'unbound scope link',
    (map: MapDocument) => (map.pages[0].links = map.pages[0].links.filter((link) => link.id !== 'scope')),
    /first input/,
  ],
  ['wrong columns', (map: MapDocument) => (map.pages[0].functoids[0].parameters[1].value = '2'), /column input/],
  ['zero extractor column', (map: MapDocument) => (map.pages[0].functoids[1].parameters[1].value = '0'), /column/],
  ['out-of-range extractor column', (map: MapDocument) => (map.pages[0].functoids[1].parameters[1].value = '2'), /column/],
  ['missing grid input', (map: MapDocument) => (map.pages[0].functoids[0].tableLooping!.rows[0][0] = 'missing'), /no matching input/],
] as const)('rejects %s', (_name, mutate, message) => {
  const map = tableMap(undefined, false);
  mutate(map);
  const result = new XsltCompiler().compile(map, source, target);
  expect(result.success).toBe(false);
  expect(result.errors.some((error) => message.test(error.message))).toBe(true);
});

const samples = [
  ['scope marker', 'Looping-Pattern/LoopingPattern/FlatStructureToRepeatStructure/ScopeTableFunctoid/MapScopeTableFunctoid.btm', 3],
  [
    'numeric scope',
    'Name-Value-Transformation-Pattern-Hierarchical-Schema-to-Name-Value-Pair/SandroPereira.MappingToNameValueRecord/Solution4/NameValueSolution4.btm',
    6,
  ],
  ['enrollment scope', 'Looping-Pattern/LoopingPattern/X1EDISample/Maps/Enrollment_to_5010_834.btm', 2],
] as const;

function readXml(filename: string): string {
  const bytes = fs.readFileSync(filename);
  return bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8');
}

function loadSample(relative: string) {
  const filename = path.resolve(__dirname, '..', 'e2etests', ...relative.split('/'));
  const map = new BtmSerializer().deserialize(readXml(filename));
  const sourceTree = parser.parse(readXml(path.resolve(path.dirname(filename), map.sourceSchema.location)), 'source');
  const targetTree = parser.parse(readXml(path.resolve(path.dirname(filename), map.targetSchema.location)), 'target');
  return { map, sourceTree, targetTree };
}

test.each(samples)('imports the public LearningPath %s table without a scope validation failure', (_name, relative, rows) => {
  const { map, sourceTree, targetTree } = loadSample(relative);
  const table = map.pages.flatMap((page) => page.functoids).find((functoid) => functoid.functoidId === 703)!;
  expect(table.tableLooping?.rows).toHaveLength(rows);
  const result = new XsltCompiler().compile(map, sourceTree, targetTree);
  if (relative.includes('Enrollment_to_5010_834')) {
    // Structural schema resolution is tested separately; it must not mask table scope regressions.
    expect(
      result.errors.every((error) => /Unresolved or ambiguous source schema path '.*\/<Sequence>\[1\]\/MemberId'/.test(error.message))
    ).toBe(true);
  } else {
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
  }
});

describe.each([false, true])('public Table Looping maps (.NET, preserve sequence: %s)', (preserveSequenceOrder) => {
  testDotNet('emits the three rows configured by MapScopeTableFunctoid, including its duplicated first cell', () => {
    const { map, sourceTree, targetTree } = loadSample(samples[0][1]);
    map.options.preserveSequenceOrder = preserveSequenceOrder;
    const result = new XsltCompiler().compile(map, sourceTree, targetTree);
    expect(result.errors).toEqual([]);
    const output = transform(
      result.xslt!,
      '<Input><PropertyName1>First</PropertyName1><PropertyValue1>A</PropertyValue1>' +
        '<PropertyName2>Second</PropertyName2><PropertyValue2>B</PropertyValue2>' +
        '<PropertyName3>Third</PropertyName3><PropertyValue3>C</PropertyValue3>' +
        '<JustToAnnoy>X</JustToAnnoy><JustToAnnoy>Y</JustToAnnoy></Input>'
    );
    // The original public map selects PropertyValue1 for both columns of row 1.
    expect(values(output, 'Name')).toEqual(['A', 'Second', 'Third']);
    expect(values(output, 'Value')).toEqual(['A', 'B', 'C']);
    expect(output.getElementsByTagNameNS('*', 'Properties').length).toBe(3);
  });

  testDotNet('emits six name/value rows, not six copies of the grid, for NameValueSolution4', () => {
    const { map, sourceTree, targetTree } = loadSample(samples[1][1]);
    map.options.preserveSequenceOrder = preserveSequenceOrder;
    const result = new XsltCompiler().compile(map, sourceTree, targetTree);
    expect(result.errors).toEqual([]);
    const names = ['Type', 'Protocol', 'Pool', 'VPNName', 'IPAddress', 'IPNetmask'];
    const output = transform(
      result.xslt!,
      `<s:Request xmlns:s="http://SandroPereira.MappingToNameValueRecord.Request"><Header>
        <Nprocesso>1</Nprocesso><Tipo_Operacao>create</Tipo_Operacao></Header><Body><ServiceName>service</ServiceName>
        ${names.map((name, index) => `<${name}>V${index}</${name}>`).join('')}</Body></s:Request>`
    );
    expect(values(output, 'Name')).toEqual(names);
    expect(values(output, 'Value')).toEqual(names.map((_name, index) => `V${index}`));
    expect(output.getElementsByTagNameNS('*', 'Property').length).toBe(6);
  });
});
