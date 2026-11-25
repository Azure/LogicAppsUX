import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, type MapLink, type SchemaTree, SourceLinkOption } from '../src/model';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { SchemaParser } from '../src/schema/schemaParser';

const namespace = 'http://BizTalkMapperSemanticTranslatorPattern.POByName';
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
// Match xsltCompilerNodeSetValues: use the already-published helper, never build/download it.
const testDotNet = process.platform === 'win32' && existsSync(helperPath) ? test : test.skip;
const parser = new SchemaParser();
const fields = ['Product', 'Description', 'Quantity', 'Price'] as const;
const identityPaths = [
  '/PO/LineItems',
  '/PO/LineItems/Item',
  ...fields.map((field) => `/PO/LineItems/Item/${field}`),
  '/PO/To',
  '/PO/From',
];

function poSchema(mixed = false, qualified = false): string {
  // Default variant omits elementFormDefault; qualified variant overrides Description locally.
  return `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${namespace}"
    ${qualified ? 'elementFormDefault="qualified"' : ''}>
    <xs:element name="PO"><xs:complexType><xs:sequence>
      <xs:element name="LineItems" maxOccurs="unbounded"><xs:complexType mixed="${mixed}"><xs:sequence>
        <xs:element name="Item" maxOccurs="unbounded"><xs:complexType mixed="${mixed}"><xs:sequence>
          <xs:element name="Product" type="xs:string"/>
          <xs:element name="Description" type="xs:string" ${qualified ? 'form="unqualified"' : ''}/>
          <xs:element name="Quantity" type="xs:decimal"/>
          <xs:element name="Price" type="xs:decimal"/>
        </xs:sequence></xs:complexType></xs:element>
      </xs:sequence></xs:complexType></xs:element>
      <xs:element name="To" type="xs:string"/><xs:element name="From" type="xs:string"/>
    </xs:sequence></xs:complexType></xs:element>
  </xs:schema>`;
}

const source = parser.parse(poSchema(), 'source.xsd');
const target = parser.parse(poSchema(), 'target.xsd');
const mixedSource = parser.parse(poSchema(true), 'source.xsd');
const mixedTarget = parser.parse(poSchema(true), 'target.xsd');
const qualifiedSource = parser.parse(poSchema(false, true), 'source.xsd');
const qualifiedTarget = parser.parse(poSchema(false, true), 'target.xsd');
const attributeSource = parser.parse(
  `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${namespace}">
    <xs:element name="PO"><xs:complexType><xs:attribute name="Code" type="xs:string"/></xs:complexType></xs:element>
  </xs:schema>`,
  'source.xsd'
);
const scalarTarget = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Result"><xs:complexType><xs:sequence>' +
    '<xs:element name="Value" type="xs:string" maxOccurs="unbounded"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:schema>',
  'target.xsd'
);

const firstItem = ['Product_0', 'Description_0', '10', '10'] as const;
const secondItem = ['Product_1', 'Description_1', '20', '30'] as const;
type ItemValues = readonly [string, string, string, string];

function itemXml(values: ItemValues, directText = '', qualified = false): string {
  const recordName = qualified ? 'ns0:Item' : 'Item';
  const leaves = fields
    .map((field, index) => {
      const name = qualified && field !== 'Description' ? `ns0:${field}` : field;
      return `<${name}>${values[index]}</${name}>`;
    })
    .join('');
  return `<${recordName}>${directText}${leaves}</${recordName}>`;
}

function poInput(groups: readonly (readonly ItemValues[])[], mixed = false, qualified = false): string {
  const prefix = qualified ? 'ns0:' : '';
  const lines = groups
    .map(
      (items, groupIndex) =>
        `<${prefix}LineItems>${mixed ? `lines_${groupIndex}` : ''}${items
          .map((values, itemIndex) => itemXml(values, mixed ? `item_${groupIndex}_${itemIndex}` : '', qualified))
          .join('')}</${prefix}LineItems>`
    )
    .join('');
  return `<ns0:PO xmlns:ns0="${namespace}">${lines}<${prefix}To>To_0</${prefix}To><${prefix}From>From_0</${prefix}From></ns0:PO>`;
}

function identityMap(preserveSequenceOrder: boolean): MapDocument {
  // Native LinkFrom/LinkTo TOM selectors exercise the imported Link By Name identity map.
  const tomPath = (schemaPath: string) =>
    `/*[local-name()='&lt;Schema&gt;']${schemaPath
      .split('/')
      .filter(Boolean)
      .map((name) => `/*[local-name()='${name}']`)
      .join('')}`;
  const map = new BtmSerializer().deserialize(`<mapsource Name="PO By Name" Version="2">
    <SrcTree RootNode_Name="PO"><Reference Location="source.xsd"/></SrcTree>
    <TrgTree RootNode_Name="PO"><Reference Location="target.xsd"/></TrgTree>
    <Pages><Page Name="Page 1"><Links>${identityPaths
      .map((schemaPath, index) => `<Link LinkID="${index + 1}" LinkFrom="${tomPath(schemaPath)}" LinkTo="${tomPath(schemaPath)}"/>`)
      .join('')}</Links><Functoids/></Page></Pages>
  </mapsource>`);
  map.options = { ...DEFAULT_MAP_OPTIONS, ...map.options, preserveSequenceOrder };
  expect(map.pages[0].links.map((link) => [link.sourcePath, link.targetPath])).toEqual(identityPaths.map((value) => [value, value]));
  expect(map.pages[0].links.every((link) => link.sourceType === LinkEndpointType.SchemaNode)).toBe(true);
  return map;
}

function recordToLeafMap(preserveSequenceOrder: boolean, sourceLinkOption?: SourceLinkOption): MapDocument {
  const link: MapLink = {
    id: 'record-value',
    sourceId: '/PO/LineItems/Item',
    sourcePath: '/PO/LineItems/Item',
    targetId: '/Result/Value',
    targetPath: '/Result/Value',
    sourceType: LinkEndpointType.SchemaNode,
    targetType: LinkEndpointType.SchemaNode,
    sourceLinkOption,
  };
  return {
    name: 'Record to leaf copy directives',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [{ id: 'page', name: 'Page 1', functoids: [], links: [link] }],
  };
}

function compile(map: MapDocument, sourceTree = source, targetTree: SchemaTree = target): string {
  const result = new XsltCompiler().compile(map, sourceTree, targetTree);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeDefined();
  return result.xslt!;
}

function transform(xslt: string, xml: string): Element {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-record-links-'));
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

const children = (element: Element): Element[] => Array.from(element.childNodes).filter((node) => node.nodeType === 1) as Element[];
const directText = (element: Element): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3 || node.nodeType === 4)
    .map((node) => node.nodeValue || '')
    .join('');

function expectIdentity(output: Element, groups: readonly (readonly ItemValues[])[], qualified = false): void {
  expect.soft(output.localName).toBe('PO');
  expect.soft(output.namespaceURI).toBe(namespace);
  expect.soft(children(output).map((child) => child.localName)).toEqual([...groups.map(() => 'LineItems'), 'To', 'From']);
  // Soft assertions expose both bad namespaces and descendant flattening in the same execution.
  for (const element of Array.from(output.getElementsByTagNameNS('*', '*'))) {
    const expectedNamespace = qualified && element.localName !== 'Description' ? namespace : '';
    expect.soft(element.namespaceURI || '', `${element.localName} namespace`).toBe(expectedNamespace);
  }
  for (const container of [output, ...Array.from(output.getElementsByTagNameNS('*', '*')).filter((element) => children(element).length)]) {
    expect.soft(directText(container).trim(), `${container.localName} must not flatten descendant text`).toBe('');
  }
  const lineItems = children(output).filter((element) => element.localName === 'LineItems');
  const allItems = lineItems.flatMap(children);
  expect.soft(allItems.map((record) => record.localName)).toEqual(groups.flat().map(() => 'Item'));
  expect.soft(allItems.map((record) => children(record).map((leaf) => leaf.textContent))).toEqual(groups.flat());
  expect(lineItems).toHaveLength(groups.length);
  groups.forEach((items, index) => {
    const records = children(lineItems[index]);
    expect.soft(records.map((record) => record.localName)).toEqual(items.map(() => 'Item'));
    expect.soft(records.map((record) => children(record).map((leaf) => leaf.localName))).toEqual(items.map(() => [...fields]));
    expect.soft(records.map((record) => children(record).map((leaf) => leaf.textContent))).toEqual(items);
  });
  for (const [name, value] of [
    ['To', 'To_0'],
    ['From', 'From_0'],
  ]) {
    const values = children(output)
      .filter((element) => element.localName === name)
      .map((element) => element.textContent);
    expect.soft(values).toEqual([value]);
  }
}

describe.each([false, true])('direct record links (preserve sequence: %s)', (preserveSequenceOrder) => {
  test('generates record-level loops and unqualified local elements', () => {
    const xslt = compile(identityMap(preserveSequenceOrder));
    expect(xslt).toContain('<xsl:for-each select="LineItems">');
    expect(xslt).toContain('<xsl:for-each select="Item">');
    expect(xslt).toContain('<xsl:value-of select="./text()" />');
    expect(xslt).toContain('<LineItems>');
    expect(xslt).toContain('<Item>');
    expect(xslt).toContain('<Product>');
    expect(xslt).not.toContain('<ns0:LineItems>');
  });

  testDotNet.each([
    { name: 'exact one-item sample', groups: [[firstItem]] },
    { name: 'two items in one LineItems record', groups: [[firstItem, secondItem]] },
    { name: 'two LineItems records with distinct item contexts', groups: [[firstItem], [secondItem]] },
  ])('imports the identity map without duplicating descendant values: $name', ({ groups }) => {
    const xslt = compile(identityMap(preserveSequenceOrder));
    expectIdentity(transform(xslt, poInput(groups)), groups);
  });

  testDotNet('preserves the formatted PO input', () => {
    const xml = `<ns0:PO xmlns:ns0="${namespace}">
  <LineItems>
    <Item>
      <Product>Product_0</Product>
      <Description>Description_0</Description>
      <Quantity>10</Quantity>
      <Price>10</Price>
    </Item>
  </LineItems>
  <To>To_0</To>
  <From>From_0</From>
</ns0:PO>`;
    expectIdentity(transform(compile(identityMap(preserveSequenceOrder)), xml), [[firstItem]]);
  });

  testDotNet('preserves qualified local elements while honoring an explicit unqualified Description', () => {
    const xslt = compile(identityMap(preserveSequenceOrder), qualifiedSource, qualifiedTarget);
    expectIdentity(transform(xslt, poInput([[firstItem]], false, true)), [[firstItem]], true);
  });

  testDotNet.each([
    { name: 'default ValueCopy', option: undefined },
    { name: 'explicit ValueCopy', option: SourceLinkOption.ValueCopy },
  ])('$name copies a source attribute value without selecting child text nodes', ({ option }) => {
    const map = recordToLeafMap(preserveSequenceOrder, option);
    const link = map.pages[0].links[0];
    link.sourceId = '/PO/@Code';
    link.sourcePath = '/PO/@Code';
    const xslt = compile(map, attributeSource, scalarTarget);
    const output = transform(xslt, `<ns0:PO xmlns:ns0="${namespace}" Code="attribute_0"/>`);
    expect(children(output).map((element) => [element.localName, element.textContent])).toEqual([['Value', 'attribute_0']]);
  });

  testDotNet('copies legitimate direct text on record-to-record links without flattening their children', () => {
    const output = transform(compile(identityMap(preserveSequenceOrder), mixedSource, mixedTarget), poInput([[firstItem]], true));
    const lines = children(output).filter((element) => element.localName === 'LineItems');
    expect(lines).toHaveLength(1);
    expect(directText(lines[0]).trim()).toBe('lines_0');
    const items = children(lines[0]);
    expect(items.map((item) => directText(item).trim())).toEqual(['item_0_0']);
    expect(items.map((item) => children(item).map((leaf) => leaf.textContent))).toEqual([firstItem]);
  });

  testDotNet.each([
    { name: 'default ValueCopy', option: undefined, descendantString: false, copyName: false },
    { name: 'explicit ValueCopy', option: SourceLinkOption.ValueCopy, descendantString: false, copyName: false },
    { name: 'MixedCopy', option: SourceLinkOption.MixedCopy, descendantString: true, copyName: false },
    { name: 'NameCopy', option: SourceLinkOption.NameCopy, descendantString: false, copyName: true },
  ])('$name record-to-leaf obeys its copy directive for empty direct text and mixed content', ({ option, descendantString, copyName }) => {
    for (const mixed of [false, true]) {
      const xslt = compile(recordToLeafMap(preserveSequenceOrder, option), mixed ? mixedSource : source, scalarTarget);
      const output = transform(xslt, poInput([[firstItem]], mixed));
      expect(children(output).map((element) => element.localName)).toEqual(['Value']);
      expect(
        children(output).map((element) => element.textContent),
        `mixed content: ${mixed}`
      ).toEqual(
        [firstItem].map((values, index) =>
          copyName ? 'Item' : `${mixed ? `item_0_${index}` : ''}${descendantString ? values.join('') : ''}`
        )
      );
      expect(children(output).every((element) => children(element).length === 0)).toBe(true);
    }
  });
});
