import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, type MapFunctoid, type MapLink, ParameterType } from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
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
// Reuse the published FrameworkTransform helper; no build/download or report-file dependency.
const testDotNet = process.platform === 'win32' && existsSync(helperPath) ? test : test.skip;
const parser = new SchemaParser();
const source = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
    '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
    '<xs:element name="Enabled" type="xs:string"/><xs:element name="Value" type="xs:string" maxOccurs="unbounded"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'source.xsd'
);
const target = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Result"><xs:complexType><xs:sequence>' +
    '<xs:element name="Line" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
    '<xs:element name="V" type="xs:string" minOccurs="0"/><xs:element name="Marker" type="xs:string" minOccurs="0"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'target.xsd'
);
const input = '<Root><Items><Enabled>true</Enabled><Value>7</Value></Items><Items><Enabled>true</Enabled><Value>11</Value></Items></Root>';
const elements = (root: Element, name: string, namespace = '*') => Array.from(root.getElementsByTagNameNS(namespace, name));
const values = (root: Element, name: string) => elements(root, name).map((element) => element.textContent);

function expectSelectVariablesUnwrapped(xslt: string): void {
  const stylesheet = create(xslt).root().node as Element;
  for (const variable of elements(stylesheet, 'variable', xsltNamespace)) {
    if (variable.hasAttribute('select')) {
      expect(xslt).not.toContain(`msxsl:node-set($${variable.getAttribute('name')})`);
    }
  }
}

function functoid(id: string, functoidId: number, parameters: MapFunctoid['parameters'] = []): MapFunctoid {
  const definition = FunctoidRegistry.getInstance().getFunctoid(functoidId)!;
  return { id, functoidId, category: definition.category, name: definition.name, x: 0, y: 0, inputLinks: [], outputLinks: [], parameters };
}

const linked = (index: number, value: string) => ({ index, type: ParameterType.Link, value });
const constant = (index: number, value: string) => ({ index, type: ParameterType.Constant, value });
const sourceLink = (id: string, sourcePath: string, targetId: string): MapLink => ({
  id,
  sourceId: sourcePath,
  sourcePath,
  targetId,
  sourceType: LinkEndpointType.SchemaNode,
  targetType: LinkEndpointType.Functoid,
});
const functoidLink = (id: string, sourceId: string, targetId: string): MapLink => ({
  id,
  sourceId,
  targetId,
  sourceType: LinkEndpointType.Functoid,
  targetType: LinkEndpointType.Functoid,
});
const outputLink = (id: string, sourceId: string, targetPath: string): MapLink => ({
  id,
  sourceId,
  targetId: targetPath,
  targetPath,
  sourceType: LinkEndpointType.Functoid,
  targetType: LinkEndpointType.SchemaNode,
});

function valueMap(consumerId: number, preserveSequenceOrder: boolean, producerId = 375): MapDocument {
  return {
    name: 'Node-set values',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [
      {
        id: 'page',
        name: 'Values',
        functoids: [
          functoid('value', producerId, [linked(0, 'enabled'), linked(1, 'number')]),
          functoid('consumer', consumerId, [linked(0, 'consume')]),
          functoid('loop', 424, [linked(0, 'records')]),
        ],
        links: [
          sourceLink('enabled', '/Root/Items/Enabled', 'value'),
          sourceLink('number', '/Root/Items/Value', 'value'),
          functoidLink('consume', 'value', 'consumer'),
          outputLink('output', 'consumer', '/Result/Line/V'),
          sourceLink('records', '/Root/Items', 'loop'),
          outputLink('loop-output', 'loop', '/Result/Line'),
        ],
      },
    ],
  };
}

function compile(map: MapDocument): string {
  const result = new XsltCompiler().compile(map, source, target);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeDefined();
  return result.xslt!;
}

function transform(xslt: string, xml: string): Element {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-node-set-values-'));
  try {
    const xsltPath = path.join(directory, 'map.xslt');
    const inputPath = path.join(directory, 'input.xml');
    const outputPath = path.join(directory, 'output.xml');
    writeFileSync(xsltPath, xslt);
    writeFileSync(inputPath, xml);
    const result = spawnSync(helperPath, [xsltPath, inputPath, outputPath], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    return create(readFileSync(outputPath, 'utf8')).root().node as Element;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe.each([false, true])('RTF node-set inputs (preserve sequence: %s)', (preserveSequenceOrder) => {
  testDotNet.each([
    [324, 'Sum', '18'],
    [325, 'Average', '9'],
    [326, 'Minimum', '7'],
    [327, 'Maximum', '11'],
    [328, 'Concatenate', '711'],
  ] as const)(
    'accumulates accepted records for Cumulative %s (%s), including first false then later true',
    (consumerId, _name, expected) => {
      const scopes = consumerId === 324 ? [undefined, '0', '-1', 'invalid', '99', '1.5'] : [undefined];
      for (const scope of scopes) {
        const map = valueMap(consumerId, preserveSequenceOrder);
        if (scope !== undefined) {
          map.pages[0].functoids[1].parameters.push(constant(1, scope));
        }
        const xslt = compile(map);
        const output = transform(
          xslt,
          '<Root><Items><Enabled>false</Enabled><Value>99</Value></Items>' +
            '<Items><Enabled>true</Enabled><Value>7</Value></Items>' +
            '<Items><Enabled>false</Enabled><Value>100</Value></Items>' +
            '<Items><Enabled>true</Enabled><Value>11</Value></Items></Root>'
        );
        expect(
          elements(output, 'Line').map((line) => values(line, 'V')),
          `scope ${scope ?? 'default'}`
        ).toEqual([[expected], [expected], [expected], [expected]]);
      }
    }
  );

  testDotNet('emits zero for an empty accepted sequence rather than inheriting a rejected-record guard', () => {
    const xslt = compile(valueMap(324, preserveSequenceOrder, 374));
    const output = transform(
      xslt,
      '<Root><Items><Enabled>true</Enabled><Value/></Items><Items><Enabled>false</Enabled><Value>99</Value></Items></Root>'
    );
    expect(elements(output, 'Line').map((line) => values(line, 'V'))).toEqual([['0'], ['0']]);
    const rejected = transform(xslt, input.replaceAll('<Enabled>true</Enabled>', '<Enabled>false</Enabled>'));
    expect(elements(rejected, 'Line').map((line) => values(line, 'V'))).toEqual([['0'], ['0']]);
  });

  testDotNet('keeps ordinary conditional value-of and select-based scalar string consumers unchanged', () => {
    const map = valueMap(107, preserveSequenceOrder);
    map.pages[0].functoids[1].parameters.push(constant(1, '!'));
    // An unconditional sibling isolates the leaf guard from the compiler's existing root-wide omission rule.
    map.pages[0].links.push({
      id: 'marker',
      sourceId: '/Root/Items/Enabled',
      sourcePath: '/Root/Items/Enabled',
      targetId: '/Result/Line/Marker',
      targetPath: '/Result/Line/Marker',
      sourceType: LinkEndpointType.SchemaNode,
      targetType: LinkEndpointType.SchemaNode,
    });
    const xslt = compile(map);
    expect(values(transform(xslt, input), 'V')).toEqual(['7!', '11!']);
    const mixed = transform(xslt, input.replace('<Enabled>true</Enabled>', '<Enabled>false</Enabled>'));
    expect(elements(mixed, 'Line').map((line) => values(line, 'V'))).toEqual([[], ['11!']]);
    expect(xslt).not.toContain('msxsl:node-set(');

    const scalarMap = valueMap(107, preserveSequenceOrder, 107);
    scalarMap.pages[0].functoids[0].parameters = [linked(0, 'number'), constant(1, '?')];
    scalarMap.pages[0].links = scalarMap.pages[0].links.filter((link) => link.id !== 'enabled');
    scalarMap.pages[0].functoids[1].parameters.push(constant(1, '!'));
    const scalarXslt = compile(scalarMap);
    expect(values(transform(scalarXslt, input), 'V')).toEqual(['7?!', '11?!']);
    expect(scalarXslt).not.toContain('msxsl:node-set(');
  });

  testDotNet('preserves all direct schema nodes and linked select-based node-sets without wrapping select variables', () => {
    const xml =
      '<Root><Items><Enabled>true</Enabled><Value>7</Value><Value>11</Value></Items>' +
      '<Items><Enabled>true</Enabled><Value>3</Value><Value>5</Value></Items></Root>';
    const map = valueMap(324, preserveSequenceOrder);
    map.pages[0].functoids[1].parameters.push(constant(1, '1'));
    map.pages[0].functoids = map.pages[0].functoids.filter((item) => item.id !== 'value');
    map.pages[0].links = map.pages[0].links.filter((link) => !['enabled', 'number', 'consume'].includes(link.id));
    map.pages[0].links.push(sourceLink('consume', '/Root/Items/Value', 'consumer'));
    const directXslt = compile(map);
    expect(values(transform(directXslt, xml), 'V')).toEqual(['18', '8']);
    expectSelectVariablesUnwrapped(directXslt);
    map.pages[0].functoids.unshift(functoid('nodes', 424, [linked(0, 'node-input')]));
    map.pages[0].links = map.pages[0].links.filter((link) => link.id !== 'consume');
    map.pages[0].links.push(sourceLink('node-input', '/Root/Items/Value', 'nodes'));
    map.pages[0].links.push(functoidLink('consume', 'nodes', 'consumer'));
    const selectedXslt = compile(map);
    expect(values(transform(selectedXslt, xml), 'V')).toEqual(['18', '8']);
    expectSelectVariablesUnwrapped(selectedXslt);
  });
  testDotNet('resets scoped aggregates within nested families instead of leaking values from adjacent groups', () => {
    const groupedSource = parser.parse(
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
        '<xs:element name="Family" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
        '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
        '<xs:element name="Enabled" type="xs:string"/><xs:element name="Value" type="xs:string"/>' +
        '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element>' +
        '</xs:sequence></xs:complexType></xs:element></xs:schema>',
      'source.xsd'
    );
    const xml =
      '<Root><Family><Items><Enabled>false</Enabled><Value>99</Value></Items>' +
      '<Items><Enabled>true</Enabled><Value>7</Value></Items><Items><Enabled>true</Enabled><Value>11</Value></Items></Family>' +
      '<Family><Items><Enabled>true</Enabled><Value>3</Value></Items>' +
      '<Items><Enabled>false</Enabled><Value>100</Value></Items><Items><Enabled>true</Enabled><Value>5</Value></Items></Family>' +
      '<Family><Items><Enabled>false</Enabled><Value>200</Value></Items></Family></Root>';
    for (const [scope, expected] of [
      // Value is a non-repeated simple field: the default record base is Items, so level 1 selects Family.
      ['1', ['18', '8', '0']],
      ['0', ['26', '26', '26']],
      ['99', ['26', '26', '26']],
    ] as const) {
      const map = valueMap(324, preserveSequenceOrder);
      map.pages[0].functoids[1].parameters.push(constant(1, scope));
      for (const link of map.pages[0].links) {
        if (link.sourcePath) {
          link.sourcePath = link.id === 'records' ? '/Root/Family' : link.sourcePath.replace('/Root/Items', '/Root/Family/Items');
          link.sourceId = link.sourcePath;
        }
      }
      const result = new XsltCompiler().compile(map, groupedSource, target);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      const output = transform(result.xslt!, xml);
      expect(
        elements(output, 'Line').map((line) => values(line, 'V')),
        `scope ${scope}`
      ).toEqual(expected.map((value) => [value]));
    }
  });

  testDotNet.each([
    ['attribute', false, ['18', '18', '8', '8']],
    ['attribute', true, ['18', '18', '8', '8']],
    ['simple element', false, ['18', '18', '8', '8']],
    ['simple element', true, ['7', '11', '3', '5']],
    ['linked simple element', false, ['18', '18', '8', '8']],
  ] as const)(
    'counts scope 1 from the qualified %s record base (treat elements as records: %s)',
    (kind, treatElementsAsRecords, expected) => {
      const namespace = 'urn:mapper:grouped-costs';
      const groupedSource = parser.parse(
        `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${namespace}"
          elementFormDefault="qualified" attributeFormDefault="qualified">
          <xs:element name="Root"><xs:complexType><xs:sequence>
          <xs:element name="Group" maxOccurs="unbounded"><xs:complexType><xs:sequence>
          <xs:element name="Item" maxOccurs="unbounded"><xs:complexType><xs:sequence>
          <xs:element name="Value" type="xs:decimal" maxOccurs="1"/>
          </xs:sequence><xs:attribute name="Cost" type="xs:decimal"/></xs:complexType></xs:element>
          </xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>`,
        'source.xsd'
      );
      const map = valueMap(324, preserveSequenceOrder);
      map.options.treatElementsAsRecords = treatElementsAsRecords;
      map.pages[0].functoids = map.pages[0].functoids.filter((item) => item.id !== 'value');
      map.pages[0].functoids.find((item) => item.id === 'consumer')!.parameters.push(constant(1, '1'));
      map.pages[0].links = [
        sourceLink('consume', `/Root/Group/Item/${kind === 'attribute' ? '@Cost' : 'Value'}`, 'consumer'),
        outputLink('output', 'consumer', '/Result/Line/V'),
        sourceLink('records', '/Root/Group/Item', 'loop'),
        outputLink('loop-output', 'loop', '/Result/Line'),
      ];
      if (kind === 'linked simple element') {
        map.pages[0].functoids.unshift(functoid('nodes', 424, [linked(0, 'node-input')]));
        map.pages[0].links = map.pages[0].links.filter((link) => link.id !== 'consume');
        map.pages[0].links.push(sourceLink('node-input', '/Root/Group/Item/Value', 'nodes'));
        map.pages[0].links.push(functoidLink('consume', 'nodes', 'consumer'));
      }
      const xml = `<q:Root xmlns:q="${namespace}"><q:Group>
          <q:Item q:Cost="7"><q:Value>7</q:Value></q:Item><q:Item q:Cost="11"><q:Value>11</q:Value></q:Item>
          </q:Group><q:Group><q:Item q:Cost="3"><q:Value>3</q:Value></q:Item>
          <q:Item q:Cost="5"><q:Value>5</q:Value></q:Item></q:Group></q:Root>`;
      const scopes = kind === 'linked simple element' || (kind === 'attribute' && !treatElementsAsRecords) ? ['1', '0', '99'] : ['1'];
      for (const scope of scopes) {
        map.pages[0].functoids.find((item) => item.id === 'consumer')!.parameters[1] = constant(1, scope);
        const result = new XsltCompiler().compile(map, groupedSource, target);
        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        const output = transform(result.xslt!, xml);
        const expectedValues = scope === '1' ? expected : ['26', '26', '26', '26'];
        expect(
          elements(output, 'Line').map((line) => values(line, 'V')),
          `scope ${scope}`
        ).toEqual(expectedValues.map((value) => [value]));
        expectSelectVariablesUnwrapped(result.xslt!);
      }
    }
  );
});
